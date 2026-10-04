import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelRegistrationAndPromote } from '@/lib/registration-service';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';
import { isUserInGroup } from '@/lib/line-group-auth';
import { hasHostGroupPermission, isGlobalAdmin } from '@/lib/host-permissions';
import { lineClient } from '@/lib/line';
import { invalidateSessionCache } from '@/lib/session-cache';
import { chooseRegistrationPlacement, countPeople, isValidPartySize, registrationSessionStatus } from '@/lib/registration-rules';
import { notifyHostOfRegistration } from '@/lib/host-notifications';

async function getCallerIdentity(req: NextRequest): Promise<{ userId: string; role: string; isSuperAdmin: boolean } | null> {
  const authHeader = req.headers.get('authorization');
  let lineUserId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const verified = await verifyLineIdToken(token);
    if (verified) {
      lineUserId = verified.sub;
    }
  }

  const testUserId = req.headers.get('x-test-user-id');
  if (!lineUserId && process.env.NODE_ENV !== 'production' && testUserId) {
    lineUserId = testUserId;
  }

  if (!lineUserId) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  return {
    userId: lineUserId,
    role: user?.role || 'member',
    isSuperAdmin: isSuperAdmin(lineUserId) || user?.role === 'admin',
  };
}

// 取得報名紀錄
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const caller = await getCallerIdentity(req);

  // 1. 查詢特定場次名單
  if (sessionId) {
    // 查詢該場次資訊 (含 host_user_id, group_id, is_roster_public)
    const { data: session } = await supabaseAdmin
      .from('match_sessions')
      .select('id, host_user_id, group_id, is_roster_public')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: '找不到該場次' }, { status: 404 });
    }

    const isHostOwner = Boolean(
      session.host_user_id &&
      caller?.userId &&
      session.host_user_id === caller.userId &&
      session.group_id &&
      await hasHostGroupPermission(caller.userId, session.group_id)
    );
    const isSuper = Boolean(caller?.isSuperAdmin);
    const canSeeFullRoster = isHostOwner || isSuper;

    // 群組名冊（包含公開名冊）需先驗證 LINE 身分與實際群組成員資格；
    // 沒登入時不可跳過檢查而讀取其他球友的報名姓名。
    if (session.group_id && !canSeeFullRoster) {
      if (!caller) {
        return NextResponse.json({ error: '請先登入以驗證群組成員身分' }, { status: 401 });
      }
      const isMember = await isUserInGroup(session.group_id, caller.userId);
      if (!isMember) {
        return NextResponse.json({ error: '非該群組成員，無法查看名單' }, { status: 403 });
      }
    }

    const { data: regs, error } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('session_id', sessionId)
      .neq('status', 'cancelled')
      .order('registered_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const isRosterPublic = session.is_roster_public ?? true;

    // 🔒 私密名單 (is_roster_public === false)：
    // 只有本場主揪或 Super Admin 可看完整名單！
    // 若為一般球友或其他團主，嚴格於後端防護：僅回傳該使用者自身的報名項目，完全不洩漏其他球友名單
    if (!isRosterPublic && !canSeeFullRoster) {
      const myRegs = caller?.userId
        ? (regs || []).filter((r) => r.user_id === caller.userId).map((r) => ({
            id: r.id,
            session_id: r.session_id,
            player_name: r.player_name,
            attendee_name: r.attendee_name,
            party_size: r.party_size,
            status: r.status,
            waitlist_order: r.waitlist_order,
            is_mine: true,
          }))
        : [];

      return NextResponse.json(myRegs, {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Roster-Visibility': 'private',
        },
      });
    }

    // 🌐 公開名單 (或主揪 / Admin 檢視)：
    const sanitized = (regs || []).map((r) => {
      const isMine = caller ? r.user_id === caller.userId : false;
      if (canSeeFullRoster || isMine) {
        return {
          ...r,
          is_mine: isMine,
        };
      }
      return {
        id: r.id,
        session_id: r.session_id,
        player_name: r.player_name,
        party_size: r.party_size,
        status: r.status,
        waitlist_order: r.waitlist_order,
        is_mine: false,
      };
    });

    return NextResponse.json(sanitized, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Roster-Visibility': isRosterPublic ? 'public' : 'private',
      },
    });
  }

  // 2. 查詢個人報名紀錄
  if (!caller) {
    return NextResponse.json({ error: '請登入以查看個人紀錄' }, { status: 401 });
  }

  const { data: records, error } = await supabaseAdmin
    .from('registrations')
    .select(`
      *,
      session:match_sessions(*)
    `)
    .eq('user_id', caller.userId)
    .neq('status', 'cancelled')
    .order('registered_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 🛡️ 排除已刪除場次的報名紀錄 (match_sessions 關聯為 null 或 status 為 deleted)
  const activeRecords = (records || []).filter(
    (r) => r.session && r.session.status !== 'deleted'
  );

  const hostUserIds = Array.from(new Set(activeRecords.map((r) => r.session?.host_user_id).filter(Boolean)));
  const { data: hostUsers } = await supabaseAdmin
    .from('users')
    .select('line_user_id, display_name')
    .in('line_user_id', hostUserIds);
  const hostMap = new Map((hostUsers || []).map((u) => [u.line_user_id, u.display_name]));

  // 取得場次所屬群組資料以附加群組標籤
  const groupIds = Array.from(new Set(activeRecords.map((r) => r.session?.group_id).filter(Boolean)));
  let groupMap = new Map<string, string>();
  if (groupIds.length > 0) {
    const { data: dbGroups } = await supabaseAdmin
      .from('groups')
      .select('group_id, group_name')
      .in('group_id', groupIds);
    groupMap = new Map((dbGroups || []).map((g) => [g.group_id, g.group_name || '羽球社團']));
  }

  // 檢查是否有舊的預設名稱 '團主' / '球友'，自動補齊真實 LINE 暱稱
  for (const u of (hostUsers || [])) {
    if (u.display_name === '團主' || u.display_name === '球友' || !u.display_name) {
      try {
        const p = await lineClient.getProfile(u.line_user_id);
        if (p?.displayName) {
          hostMap.set(u.line_user_id, p.displayName);
          supabaseAdmin
            .from('users')
            .update({
              display_name: p.displayName,
              picture_url: p.pictureUrl || null,
              updated_at: new Date().toISOString(),
            })
            .eq('line_user_id', u.line_user_id)
            .then();
        }
      } catch {}
    }
  }

  const recordsWithConflict = activeRecords.map((rec, i, arr) => {
    let hasConflict = false;
    if (rec.session && rec.status === 'main') {
      const startA = new Date(rec.session.start_time).getTime();
      const endA = new Date(rec.session.end_time).getTime();

      for (let j = 0; j < arr.length; j++) {
        if (i !== j && arr[j].session && arr[j].status === 'main') {
          const startB = new Date(arr[j].session.start_time).getTime();
          const endB = new Date(arr[j].session.end_time).getTime();

          if (startA < endB && endA > startB) {
            hasConflict = true;
            break;
          }
        }
      }
    }

    const sessionWithHost = rec.session
      ? {
          ...rec.session,
          host_name: hostMap.get(rec.session.host_user_id) || '球團主揪',
          group_name: rec.session.group_id ? (groupMap.get(rec.session.group_id) || '羽球社團') : '全域公開場次',
        }
      : undefined;

    return {
      ...rec,
      session: sessionWithHost,
      hasConflict,
    };
  });

  return NextResponse.json(recordsWithConflict);
}

// 球友報名 (🛡️ 嚴格檢查是否為該場次群組之成員)
export async function POST(req: NextRequest) {
  try {
    const caller = await getCallerIdentity(req);
    const body = await req.json();
    const { session_id, player_name, party_size = 1 } = body;

    let targetUserId = caller?.userId;

    if (!targetUserId) {
      return NextResponse.json({ error: '身分驗證未通過，無法報名' }, { status: 401 });
    }
    if (!isValidPartySize(party_size)) {
      return NextResponse.json({ error: '報名人數須為 1 至 3 人的整數' }, { status: 400 });
    }

    // 1. 取得該場次
    const { data: session, error: sErr } = await supabaseAdmin
      .from('match_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: '場次不存在' }, { status: 404 });
    }
    if (typeof body.user_id === 'string' && body.user_id.startsWith('proxy_')) {
      if (!caller || !(session.group_id
        ? await hasHostGroupPermission(caller.userId, session.group_id)
        : await isGlobalAdmin(caller.userId))) {
        return NextResponse.json({ error: '無權代此群組球友報名' }, { status: 403 });
      }
      targetUserId = body.user_id;
    }
    if (!targetUserId) return NextResponse.json({ error: '身分驗證未通過' }, { status: 401 });

    if (session.status === 'cancelled' || session.status === 'closed' || session.status === 'deleted') {
      return NextResponse.json({ error: '此場次已停用或已取消，無法報名' }, { status: 400 });
    }

    // 🛡️ 關鍵防護：場次開始時間比現在時間還早 (已過開始時間)，不得報名
    if (new Date(session.start_time).getTime() <= Date.now()) {
      return NextResponse.json({ error: '此場次已超過開始時間，已截止報名！' }, { status: 400 });
    }

    // 🛡️ 核心防護：若本場次有綁定群組，且報名者不是團主代報名，必須驗證是否為該群組成員
    if (session.group_id && !targetUserId.startsWith('proxy_')) {
      const inGroup = await isUserInGroup(session.group_id, targetUserId);
      if (!inGroup) {
        return NextResponse.json(
          { error: '您尚未加入此羽球社團群組，無法報名該場次！' },
          { status: 403 }
        );
      }
    }

    if (party_size > session.max_players) {
      return NextResponse.json({ error: '報名人數超過此場次正取上限，無法整組報名' }, { status: 400 });
    }

    // 一般球友同一場次不可同時佔有多筆有效名額；代報名使用各自的 proxy ID。
    if (!targetUserId.startsWith('proxy_')) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('registrations')
        .select('id')
        .eq('session_id', session_id)
        .eq('user_id', targetUserId)
        .in('status', ['main', 'waitlist'])
        .limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      if (existing?.length) return NextResponse.json({ error: '您已報名或登記備取此場次，請勿重複報名' }, { status: 409 });
    }

    const { data: mainRegs, error: mainError } = await supabaseAdmin
      .from('registrations')
      .select('party_size')
      .eq('session_id', session_id)
      .eq('status', 'main');
    if (mainError) return NextResponse.json({ error: mainError.message }, { status: 500 });

    const { data: waitlistRegs, error: waitlistError } = await supabaseAdmin
      .from('registrations')
      .select('id, party_size, waitlist_order')
      .eq('session_id', session_id)
      .eq('status', 'waitlist');
    if (waitlistError) return NextResponse.json({ error: waitlistError.message }, { status: 500 });

    const currentMainCount = countPeople(mainRegs || []);
    const placement = chooseRegistrationPlacement(
      currentMainCount, waitlistRegs || [], party_size, session.max_players, session.max_waitlist
    );
    if (!placement) {
      return NextResponse.json({ error: '此場次正取與備取名額皆已額滿！' }, { status: 400 });
    }
    const { status, waitlist_order } = placement;

    // 確保使用者在 users 表中有紀錄（外鍵約束防護）
    await supabaseAdmin.from('users').upsert(
      {
        line_user_id: targetUserId,
        display_name: player_name || '球友',
        role: 'member',
      },
      { onConflict: 'line_user_id', ignoreDuplicates: true }
    );

    // 2. 插入報名紀錄
    const { data: newReg, error: rErr } = await supabaseAdmin
      .from('registrations')
      .insert({
        session_id,
        user_id: targetUserId,
        player_name: player_name || '球友',
        party_size,
        status,
        waitlist_order,
        payment_status: 'unpaid',
      })
      .select()
      .single();

    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    // 插入成功後才更新場次狀態，避免報名失敗卻被誤標為額滿。
    const nextStatus = registrationSessionStatus(
      currentMainCount + (status === 'main' ? party_size : 0), session.max_players,
      (waitlistRegs || []).length + (status === 'waitlist' ? 1 : 0)
    );
    if (nextStatus !== session.status) {
      const { error: statusError } = await supabaseAdmin.from('match_sessions')
        .update({ status: nextStatus }).eq('id', session_id);
      if (statusError) console.error('更新場次報名狀態失敗:', statusError);
    }

    // 🔄 立即失效場次快取，確保球友報名後名額即時扣除
    invalidateSessionCache();
    await notifyHostOfRegistration(newReg.id, 'registered', caller?.userId || targetUserId);

    return NextResponse.json(newReg, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '報名處理失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// 取消報名 或 修改付款狀態
export async function PATCH(req: NextRequest) {
  try {
    const caller = await getCallerIdentity(req);
    if (!caller) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const body = await req.json();
    const { registration_id, action, payment_status } = body;

    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .single();

    if (!reg) {
      return NextResponse.json({ error: '找不到該報名紀錄' }, { status: 404 });
    }

    const { data: session } = await supabaseAdmin.from('match_sessions')
      .select('group_id, host_user_id').eq('id', reg.session_id).maybeSingle();
    const isHostOrAdmin = await isGlobalAdmin(caller.userId) || Boolean(
      session?.host_user_id === caller.userId && session.group_id &&
      await hasHostGroupPermission(caller.userId, session.group_id)
    );
    const isOwner = reg.user_id === caller.userId;

    if (action === 'cancel') {
      if (!isOwner && !isHostOrAdmin) {
        return NextResponse.json({ error: '無權取消他人報名' }, { status: 403 });
      }

      // 檢查場次開打時間：一般球友不得取消已開始或已過期之場次
      if (!isHostOrAdmin) {
        const { data: sData } = await supabaseAdmin
          .from('match_sessions')
          .select('start_time')
          .eq('id', reg.session_id)
          .single();

        if (sData && new Date(sData.start_time).getTime() <= Date.now()) {
          return NextResponse.json({ error: '此場次開打時間已過，無法線上取消報名！' }, { status: 400 });
        }
      }

      await cancelRegistrationAndPromote(registration_id, () =>
        notifyHostOfRegistration(registration_id, 'cancelled', caller.userId)
      );
      // 🔄 立即失效場次快取，確保遞補與釋出名額即時呈現
      invalidateSessionCache();
      return NextResponse.json({ message: '已取消報名並完成遞補程序' });
    }

    if (action === 'update_attendee') {
      if (!isHostOrAdmin) {
        return NextResponse.json({ error: '僅本場主揪或超級管理員可編輯出席者註記' }, { status: 403 });
      }
      if (typeof body.attendee_name !== 'string' || body.attendee_name.trim().length > 200) {
        return NextResponse.json({ error: '出席者註記須為 200 字以內的文字（清除時請傳空字串）' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('registrations')
        .update({ attendee_name: body.attendee_name.trim() || null })
        .eq('id', registration_id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === 'update_payment') {
      if (!isHostOrAdmin) {
        return NextResponse.json({ error: '僅團主具備收款標記權限' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .from('registrations')
        .update({ payment_status })
        .eq('id', registration_id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '更新失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
