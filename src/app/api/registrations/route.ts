import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelRegistrationAndPromote } from '@/lib/registration-service';
import { verifyLineIdToken } from '@/lib/auth';
import { isUserInGroup } from '@/lib/line-group-auth';
import { lineClient } from '@/lib/line';

async function getCallerIdentity(req: NextRequest): Promise<{ userId: string; role: string } | null> {
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
    .single();

  return {
    userId: lineUserId,
    role: user?.role || 'member',
  };
}

// 取得報名紀錄
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const caller = await getCallerIdentity(req);

  // 1. 查詢特定場次名單
  if (sessionId) {
    const isHostOrAdmin = caller?.role === 'host' || caller?.role === 'admin';

    // 檢查該場次是否有綁定群組，若有且非管理員，檢查是否為該群成員
    const { data: session } = await supabaseAdmin
      .from('match_sessions')
      .select('group_id')
      .eq('id', sessionId)
      .single();

    if (session?.group_id && caller && !isHostOrAdmin) {
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

    const sanitized = (regs || []).map((r) => {
      if (isHostOrAdmin || (caller && r.user_id === caller.userId)) {
        return r;
      }
      return {
        id: r.id,
        session_id: r.session_id,
        player_name: r.player_name,
        party_size: r.party_size,
        status: r.status,
        waitlist_order: r.waitlist_order,
        user_id: undefined,
        payment_status: undefined,
        notes: undefined,
      };
    });

    return NextResponse.json(sanitized);
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

  const hostUserIds = Array.from(new Set((records || []).map((r) => r.session?.host_user_id).filter(Boolean)));
  const { data: hostUsers } = await supabaseAdmin
    .from('users')
    .select('line_user_id, display_name')
    .in('line_user_id', hostUserIds);
  const hostMap = new Map((hostUsers || []).map((u) => [u.line_user_id, u.display_name]));

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

  const recordsWithConflict = (records || []).map((rec, i, arr) => {
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
    const isHostOrAdmin = caller?.role === 'host' || caller?.role === 'admin';

    if (isHostOrAdmin && body.user_id?.startsWith('proxy_')) {
      targetUserId = body.user_id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: '身分驗證未通過，無法報名' }, { status: 401 });
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

    // 計算目前正取人數
    const { data: mainRegs } = await supabaseAdmin
      .from('registrations')
      .select('party_size')
      .eq('session_id', session_id)
      .eq('status', 'main');

    const currentMainCount = (mainRegs || []).reduce((sum, r) => sum + (r.party_size || 1), 0);

    let status = 'main';
    let waitlist_order = null;

    if (currentMainCount + party_size > session.max_players) {
      status = 'waitlist';

      const { data: waitlistRegs } = await supabaseAdmin
        .from('registrations')
        .select('waitlist_order')
        .eq('session_id', session_id)
        .eq('status', 'waitlist')
        .order('waitlist_order', { ascending: false })
        .limit(1);

      const maxOrder = waitlistRegs?.[0]?.waitlist_order || 0;
      waitlist_order = maxOrder + 1;

      if (waitlist_order > session.max_waitlist) {
        return NextResponse.json({ error: '此場次正取與備取名額皆已額滿！' }, { status: 400 });
      }

      await supabaseAdmin
        .from('match_sessions')
        .update({ status: 'full' })
        .eq('id', session_id);
    }

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

    const isHostOrAdmin = caller.role === 'host' || caller.role === 'admin';
    const isOwner = reg.user_id === caller.userId;

    if (action === 'cancel') {
      if (!isOwner && !isHostOrAdmin) {
        return NextResponse.json({ error: '無權取消他人報名' }, { status: 403 });
      }

      await cancelRegistrationAndPromote(registration_id);
      return NextResponse.json({ message: '已取消報名並完成遞補程序' });
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
