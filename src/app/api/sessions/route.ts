import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient, createSessionFlexMessage } from '@/lib/line';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';
import { isUserInGroup } from '@/lib/line-group-auth';
import {
  generateSessionCacheKey,
  getSessionCache,
  setSessionCache,
  invalidateSessionCache,
  getCacheTTLSeconds,
} from '@/lib/session-cache';
import { promoteWaitlistOnCapacityIncrease } from '@/lib/registration-service';
import { cleanupExpiredSessions } from '@/lib/session-cleanup';

export const dynamic = 'force-dynamic';

// 取得場次清單 (支援快取、自動過期清理、群組場次與全域公開場次)
export async function GET(req: NextRequest) {
  // 背景防抖執行過期場次自動清理 (依 EXPIRED_SESSION_CLEANUP_DAYS，預設 7 天；若為 0 則不清理)
  cleanupExpiredSessions().catch((err) => console.warn('[Auto Cleanup] 執行異常:', err));

  const { searchParams } = new URL(req.url);
  // 1. 參數正規化 (去除多餘空白以防 Cache Key 碰撞)
  const groupId = searchParams.get('groupId')?.trim() || null;
  const sessionId = searchParams.get('sessionId')?.trim() || null;
  const date = searchParams.get('date')?.trim() || null;
  const status = searchParams.get('status')?.trim() || null;
  const hostId = searchParams.get('hostId')?.trim() || null;
  const upcomingOnly = searchParams.get('upcomingOnly') === 'true';
  const isRefresh =
    searchParams.get('refresh') === 'true' ||
    req.headers.get('cache-control')?.includes('no-cache');

  const allowCrossGroup =
    (process.env.ALLOW_CROSS_GROUP_SESSIONS || process.env.NEXT_PUBLIC_ALLOW_CROSS_GROUP_SESSIONS || 'false').toLowerCase().trim() === 'true';

  const cacheKey = generateSessionCacheKey({ groupId, sessionId, date, status, hostId, upcomingOnly, allowCrossGroup });
  const ttl = getCacheTTLSeconds();

  // 2. 若非強制刷新，優先檢查記憶體快取 (命中時 0 次 Supabase 連線)
  if (!isRefresh) {
    const cached = getSessionCache(cacheKey, false);
    if (cached.hit && cached.data) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Age': `${cached.ageSeconds}s`,
          'X-Cache-TTL': `${ttl}s`,
          'X-Allow-Cross-Group': allowCrossGroup ? 'true' : 'false',
          // 🛡️ 關鍵修正：對外標明 private, no-cache，快取完全由後端控制，確保 mutation 後即時生效不被瀏覽器/CDN 攔截
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }
  }

  try {
    let query = supabaseAdmin
      .from('match_sessions')
      .select('*')
      .neq('status', 'deleted')
      .order('start_time', { ascending: true });

    // 若指定團主 ID (例如團主後台僅看自己建立之場次)
    if (hostId) {
      query = query.eq('host_user_id', hostId);
    }

    // 若為球友報名模式 (upcomingOnly)：
    if (upcomingOnly) {
      if (allowCrossGroup) {
        // 🌟 全域開放模式 (ALLOW_CROSS_GROUP_SESSIONS=true)：
        // 若帶有 groupId 則顯示本群 + 全域，若無帶 groupId 則顯示全站所有社團之開放場次
        if (groupId) {
          query = query.or(`group_id.eq.${groupId},group_id.is.null`);
        }
      } else {
        // 🛡️ 嚴格社團隔離模式 (預設 ALLOW_CROSS_GROUP_SESSIONS=false)：
        if (sessionId && groupId) {
          // 既有特定場次 ID 又在特定群組
          query = query.or(`group_id.eq.${groupId},group_id.is.null,id.eq.${sessionId}`);
        } else if (sessionId) {
          // 球友持有特定場次分享連結點入 (即使無 groupId 亦放行該場次與全域場次)
          query = query.or(`group_id.is.null,id.eq.${sessionId}`);
        } else if (groupId) {
          // 在特定群組中，僅顯示該群專屬場次 + 全域公開場次 (group_id 為 null)
          query = query.or(`group_id.eq.${groupId},group_id.is.null`);
        } else {
          // 🛡️ 嚴格隔離破口修補：若無提供 groupId 且無特定 sessionId，
          // 絕對不洩漏任何特定群組的專屬場次，僅顯示全域公開場次 (group_id 為 null)
          query = query.is('group_id', null);
        }
      }

      query = query.gt('start_time', new Date().toISOString());
      if (!status) {
        query = query.in('status', ['open', 'full']);
      }
    } else {
      // 團主後台管理模式
      if (groupId) {
        query = query.or(`group_id.eq.${groupId},group_id.is.null`);
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      // 依台灣時區 (UTC+8) 計算當天的起訖時間
      const startOfDay = new Date(`${date}T00:00:00+08:00`).toISOString();
      const endOfDay = new Date(`${date}T23:59:59+08:00`).toISOString();
      query = query.gte('start_time', startOfDay).lte('start_time', endOfDay);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('查詢 match_sessions 錯誤:', error);
      // 🛡️ 容錯降級：若 Supabase 發生 502/503 短暫故障，嘗試使用 Stale 快取回傳，避免球友白畫面
      const stale = getSessionCache(cacheKey, true);
      if (stale.hit && stale.data) {
        console.warn(`[Cache Fallback] Supabase 查詢異常 (${error.message})，使用 Stale 快取降級回傳`);
        return NextResponse.json(stale.data, {
          headers: {
            'X-Cache': 'STALE-FALLBACK',
            'X-Cache-Age': `${stale.ageSeconds}s`,
            'X-Warning': 'Supabase temporary error, served from stale cache',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 🛡️ 關鍵修正：空陣列亦正常寫入快取，防止查無場次時重複穿透打庫
    if (!sessions || sessions.length === 0) {
      setSessionCache(cacheKey, []);
      return NextResponse.json([], {
        headers: {
          'X-Cache': isRefresh ? 'BYPASS' : 'MISS',
          'X-Cache-TTL': `${ttl}s`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // 取得所有報名資訊進行人數計算
    const sessionIds = sessions.map((s) => s.id);
    const { data: regs, error: regsError } = await supabaseAdmin
      .from('registrations')
      .select('session_id, status, party_size')
      .in('session_id', sessionIds)
      .neq('status', 'cancelled');

    // 🛡️ 關鍵修正：檢查 registrations 查詢錯誤，失敗時不可寫入假 0 人快取
    if (regsError) {
      console.error('查詢 registrations 錯誤:', regsError);
      const stale = getSessionCache(cacheKey, true);
      if (stale.hit && stale.data) {
        return NextResponse.json(stale.data, {
          headers: {
            'X-Cache': 'STALE-FALLBACK',
            'X-Cache-Age': `${stale.ageSeconds}s`,
            'X-Warning': 'Registrations error, served from stale cache',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        });
      }
      return NextResponse.json({ error: regsError.message }, { status: 500 });
    }

    // 取得所有團主使用者資料以附加姓名與頭像
    const hostUserIds = Array.from(new Set(sessions.map((s) => s.host_user_id).filter(Boolean)));
    const { data: hostUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('line_user_id, display_name, picture_url')
      .in('line_user_id', hostUserIds);

    // 🛡️ 關鍵修正：檢查 users 查詢錯誤
    if (usersError) {
      console.error('查詢 users 錯誤:', usersError);
      const stale = getSessionCache(cacheKey, true);
      if (stale.hit && stale.data) {
        return NextResponse.json(stale.data, {
          headers: {
            'X-Cache': 'STALE-FALLBACK',
            'X-Cache-Age': `${stale.ageSeconds}s`,
            'X-Warning': 'Users error, served from stale cache',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        });
      }
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const hostMap = new Map((hostUsers || []).map((u) => [u.line_user_id, u]));

    // 取得所有場次所屬之群組資料以附加群組名稱標籤
    const groupIds = Array.from(new Set(sessions.map((s) => s.group_id).filter(Boolean)));
    let groupMap = new Map<string, string>();
    if (groupIds.length > 0) {
      const { data: dbGroups } = await supabaseAdmin
        .from('groups')
        .select('group_id, group_name')
        .in('group_id', groupIds);
      groupMap = new Map((dbGroups || []).map((g) => [g.group_id, g.group_name || '羽球社團']));
    }

    // 檢查是否有舊的預設名稱 '團主' / '球友'，自動補齊真實 LINE 暱稱並回寫
    for (const u of (hostUsers || [])) {
      if (u.display_name === '團主' || u.display_name === '球友' || !u.display_name) {
        try {
          const p = await lineClient.getProfile(u.line_user_id);
          if (p?.displayName) {
            u.display_name = p.displayName;
            if (p.pictureUrl) u.picture_url = p.pictureUrl;
            supabaseAdmin
              .from('users')
              .update({
                display_name: p.displayName,
                picture_url: p.pictureUrl || u.picture_url,
                updated_at: new Date().toISOString(),
              })
              .eq('line_user_id', u.line_user_id)
              .then();
          }
        } catch {}
      }
    }

    let computed = sessions.map((session) => {
      const sessionRegs = (regs || []).filter((r) => r.session_id === session.id);
      const mainCount = sessionRegs
        .filter((r) => r.status === 'main')
        .reduce((sum, r) => sum + (r.party_size || 1), 0);
      const waitlistCount = sessionRegs
        .filter((r) => r.status === 'waitlist')
        .reduce((sum, r) => sum + (r.party_size || 1), 0);
      const host = hostMap.get(session.host_user_id);
      const groupName = session.group_id ? (groupMap.get(session.group_id) || '羽球社團') : undefined;

      return {
        ...session,
        is_roster_public: session.is_roster_public ?? true,
        host_name: host?.display_name || '球團主揪',
        host_picture_url: host?.picture_url || null,
        group_name: groupName,
        current_players: mainCount,
        waitlist_count: waitlistCount,
      };
    });

    // 雙重防護過濾：徹底排除已刪除場次，若為 upcomingOnly 則僅保留尚未開打且未停用之場次
    if (upcomingOnly) {
      const nowMs = Date.now();
      computed = computed.filter(
        (s) =>
          new Date(s.start_time).getTime() > nowMs &&
          s.status !== 'deleted' &&
          s.status !== 'cancelled'
      );
    } else {
      computed = computed.filter((s) => s.status !== 'deleted');
    }

    // 寫入智慧快取
    setSessionCache(cacheKey, computed);

    return NextResponse.json(computed, {
      headers: {
        'X-Cache': isRefresh ? 'BYPASS' : 'MISS',
        'X-Cache-TTL': `${ttl}s`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部伺服器錯誤';
    console.error('場次處理例外錯誤:', err);
    // 🛡️ 容錯降級：伺服器處理例外時嘗試 Stale 快取
    const stale = getSessionCache(cacheKey, true);
    if (stale.hit && stale.data) {
      console.warn(`[Cache Fallback] 例外錯誤 (${errorMsg})，使用 Stale 快取降級回傳`);
      return NextResponse.json(stale.data, {
        headers: {
          'X-Cache': 'STALE-FALLBACK',
          'X-Cache-Age': `${stale.ageSeconds}s`,
          'X-Warning': 'Server exception, served from stale cache',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// 將台灣時間 YYYY-MM-DDTHH:mm 或未具備時區之字串標準化為帶時區的標準 ISO 字串 (假設台灣時區 +08:00)
function toTaipeiISOString(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (/[Z+-]\d{2}(:\d{2})?$/.test(dateStr) || dateStr.endsWith('Z')) {
    return new Date(dateStr).toISOString();
  }
  const normalized = dateStr.length === 16 ? `${dateStr}:00+08:00` : `${dateStr}+08:00`;
  return new Date(normalized).toISOString();
}

// 團主建立新場次
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      host_user_id,
      group_id,
      title,
      match_type,
      start_time,
      end_time,
      location,
      court_info,
      max_players,
      max_waitlist,
      level_requirement,
      shuttlecock,
      fee,
      notes,
      cancel_deadline,
      notify_group_id,
      host_name,
      is_roster_public,
    } = body;

    // 1. 確保團主使用者存在且記錄真實 LINE 暱稱與頭像（絕不覆蓋為「團主」）
    let hostDisplayName = host_name?.trim();
    let hostPicUrl: string | null = null;

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('display_name, picture_url, role')
      .eq('line_user_id', host_user_id)
      .maybeSingle();

    if (!hostDisplayName || hostDisplayName === '團主' || hostDisplayName === '球友') {
      if (existingUser?.display_name && existingUser.display_name !== '團主' && existingUser.display_name !== '球友') {
        hostDisplayName = existingUser.display_name;
        hostPicUrl = existingUser.picture_url;
      } else {
        try {
          const profile = await lineClient.getProfile(host_user_id);
          if (profile?.displayName) {
            hostDisplayName = profile.displayName;
            hostPicUrl = profile.pictureUrl || null;
          }
        } catch (err) {
          console.warn('向 LINE 查詢團主暱稱失敗:', err);
        }
      }
    }

    const finalDisplayName = hostDisplayName || existingUser?.display_name || '球團主揪';
    const finalPictureUrl = hostPicUrl || existingUser?.picture_url || null;
    const finalRole = existingUser?.role === 'admin' ? 'admin' : (existingUser?.role || 'host');

    await supabaseAdmin.from('users').upsert(
      {
        line_user_id: host_user_id,
        display_name: finalDisplayName,
        picture_url: finalPictureUrl,
        role: finalRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'line_user_id' }
    );

    // 2. 如果有 group_id，確保群組記錄存在
    if (group_id) {
      await supabaseAdmin.from('groups').upsert({
        group_id,
        is_active: true,
      });
    }

    // 3. 建立場次 (確保日期時間以台灣時區標準化存入 TIMESTAMPTZ)
    const insertPayload: Record<string, unknown> = {
      host_user_id,
      group_id: group_id || null,
      title,
      match_type: match_type || 'double',
      start_time: toTaipeiISOString(start_time),
      end_time: toTaipeiISOString(end_time),
      location,
      court_info,
      max_players: max_players !== undefined && !isNaN(Number(max_players)) ? Math.max(1, Number(max_players)) : 8,
      max_waitlist: max_waitlist !== undefined && !isNaN(Number(max_waitlist)) ? Math.max(0, Number(max_waitlist)) : 2,
      level_requirement,
      shuttlecock,
      fee: Number(fee) || 200,
      notes,
      cancel_deadline: cancel_deadline ? toTaipeiISOString(cancel_deadline) : null,
      is_roster_public: is_roster_public !== undefined ? Boolean(is_roster_public) : true,
      status: 'open',
    };

    let { data: session, error } = await supabaseAdmin
      .from('match_sessions')
      .insert(insertPayload)
      .select()
      .single();

    // 🛡️ 容錯回退：若資料庫尚未執行 is_roster_public 遷移腳本，剔除該欄位重試
    if (error && error.code === 'PGRST204') {
      delete insertPayload.is_roster_public;
      const retry = await supabaseAdmin
        .from('match_sessions')
        .insert(insertPayload)
        .select()
        .single();
      session = retry.data;
      error = retry.error;
    }

    if (error || !session) {
      return NextResponse.json({ error: error?.message || '建立失敗' }, { status: 500 });
    }

    // 4. 若有設定推播群組，自動發送 Flex Message
    const targetGroupId = notify_group_id || group_id;
    if (targetGroupId) {
      const sessionWithHost = {
        ...session,
        host_name: finalDisplayName,
        host_picture_url: finalPictureUrl,
      };

      const liffUrl = process.env.LINE_LIFF_URL || process.env.NEXT_PUBLIC_LIFF_URL || '';
      const flexMsg = createSessionFlexMessage(sessionWithHost, liffUrl);
      try {
        await lineClient.pushMessage({
          to: targetGroupId,
          messages: [flexMsg],
        });
      } catch (pushErr) {
        console.error('推播至群組失敗:', pushErr);
      }
    }

    // 🔄 立即失效場次快取，確保新建立的場次秒級呈現在前端
    invalidateSessionCache();

    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部錯誤';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// 團主修改場次內容 (限尚未開始之場次)
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    let callerUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const verified = await verifyLineIdToken(token);
      if (verified) {
        callerUserId = verified.sub;
      }
    }

    const testUserId = req.headers.get('x-test-user-id');
    if (!callerUserId && process.env.NODE_ENV !== 'production' && testUserId) {
      callerUserId = testUserId;
    }

    if (!callerUserId) {
      return NextResponse.json({ error: '身分驗證未通過，請重新登入' }, { status: 401 });
    }

    // 取得使用者角色
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('line_user_id', callerUserId)
      .maybeSingle();

    const isSuperAdminUser = isSuperAdmin(callerUserId) || user?.role === 'admin';

    const body = await req.json();
    const {
      id,
      action,
      status: targetStatus,
      title,
      match_type,
      start_time,
      end_time,
      location,
      court_info,
      max_players,
      max_waitlist,
      level_requirement,
      shuttlecock,
      fee,
      notes,
      is_roster_public,
    } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少場次 ID' }, { status: 400 });
    }

    // 1. 查詢目標場次
    const { data: existingSession, error: fetchErr } = await supabaseAdmin
      .from('match_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingSession) {
      return NextResponse.json({ error: '找不到該場次' }, { status: 404 });
    }

    // 2. 權限檢查：只有原始主揪團主本人或 Super Admin 可修改或停用該場次
    const isHostOwner = Boolean(
      existingSession.host_user_id &&
      callerUserId &&
      existingSession.host_user_id === callerUserId
    );

    if (!isHostOwner && !isSuperAdminUser) {
      return NextResponse.json(
        { error: '權限不足：只有此場次的原始主揪團主或超級管理員可以管理該場次' },
        { status: 403 }
      );
    }

    // 3. 處理「停用場次 (disable / cancel)」或「重新啟用 (enable / open)」操作
    if (action === 'disable' || targetStatus === 'cancelled' || targetStatus === 'closed') {
      const newStatus = targetStatus || 'cancelled';
      const { data: disabledSession, error: dErr } = await supabaseAdmin
        .from('match_sessions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (dErr) {
        return NextResponse.json({ error: dErr.message }, { status: 500 });
      }
      invalidateSessionCache();
      return NextResponse.json(disabledSession);
    }

    // 4. 時效檢查：只有時間尚未開始之場次可以修改內容或重新啟用
    const now = new Date();
    const sessionStartTime = new Date(existingSession.start_time);
    if (sessionStartTime.getTime() <= now.getTime()) {
      return NextResponse.json({ error: '此場次已開始或已結束，無法再修改或重啟' }, { status: 400 });
    }

    // 5. 正取人數下限檢查：不可小於目前已報名之正取人數
    const { data: mainRegs } = await supabaseAdmin
      .from('registrations')
      .select('party_size')
      .eq('session_id', id)
      .eq('status', 'main');

    const currentMainCount = (mainRegs || []).reduce((sum, r) => sum + (r.party_size || 1), 0);
    const newMaxPlayers = Number(max_players) || existingSession.max_players;

    if (newMaxPlayers < currentMainCount) {
      return NextResponse.json(
        { error: `正取人數上限 (${newMaxPlayers}人) 不可小於目前已報名正取人數 (${currentMainCount}人)` },
        { status: 400 }
      );
    }

    // 6. 執行更新
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title.trim();
    if (match_type !== undefined) updatePayload.match_type = match_type;
    if (start_time !== undefined) updatePayload.start_time = toTaipeiISOString(start_time);
    if (end_time !== undefined) updatePayload.end_time = toTaipeiISOString(end_time);
    if (location !== undefined) updatePayload.location = location.trim();
    if (court_info !== undefined) updatePayload.court_info = court_info.trim();
    if (max_players !== undefined) updatePayload.max_players = newMaxPlayers;
    if (max_waitlist !== undefined && !isNaN(Number(max_waitlist))) {
      updatePayload.max_waitlist = Math.max(0, Number(max_waitlist));
    }
    if (level_requirement !== undefined) updatePayload.level_requirement = level_requirement.trim();
    if (shuttlecock !== undefined) updatePayload.shuttlecock = shuttlecock.trim();
    if (fee !== undefined) updatePayload.fee = Number(fee) || 0;
    if (notes !== undefined) updatePayload.notes = notes.trim();
    if (is_roster_public !== undefined) updatePayload.is_roster_public = Boolean(is_roster_public);

    // 更新狀態
    if (action === 'enable' || targetStatus === 'open') {
      updatePayload.status = newMaxPlayers > currentMainCount ? 'open' : 'full';
    } else if (newMaxPlayers > currentMainCount && existingSession.status !== 'cancelled') {
      updatePayload.status = 'open';
    } else if (newMaxPlayers === currentMainCount && existingSession.status !== 'cancelled') {
      updatePayload.status = 'full';
    }

    let { data: updatedSession, error: updateErr } = await supabaseAdmin
      .from('match_sessions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    // 🛡️ 容錯回退：若資料庫尚未執行 is_roster_public 遷移腳本，剔除該欄位重試
    if (updateErr && updateErr.code === 'PGRST204') {
      delete updatePayload.is_roster_public;
      const retry = await supabaseAdmin
        .from('match_sessions')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      updatedSession = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 7. 若正取人數上限調高，自動依序遞補備取球友至正取
    if (newMaxPlayers > existingSession.max_players) {
      try {
        await promoteWaitlistOnCapacityIncrease(id, newMaxPlayers);
      } catch (promoteErr) {
        console.error('名額擴增遞補處理錯誤:', promoteErr);
      }
    }

    // 8. 🔄 立即失效場次快取
    invalidateSessionCache();

    return NextResponse.json(updatedSession);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '修改場次失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

// 刪除場次 (限原始主揪團主或 Super Admin)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id')?.trim();

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: '缺少場次 ID' }, { status: 400 });
    }

    // 驗證身分
    let callerUserId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const verified = await verifyLineIdToken(token);
      if (verified) callerUserId = verified.sub;
    }

    const testUserId = req.headers.get('x-test-user-id');
    if (!callerUserId && process.env.NODE_ENV !== 'production' && testUserId) {
      callerUserId = testUserId;
    }

    if (!callerUserId) {
      return NextResponse.json({ error: '身分驗證未通過，請重新登入' }, { status: 401 });
    }

    // 查詢使用者角色
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('line_user_id', callerUserId)
      .maybeSingle();

    const isSuperAdminUser = isSuperAdmin(callerUserId) || user?.role === 'admin';

    // 查詢目標場次
    const { data: session, error: sErr } = await supabaseAdmin
      .from('match_sessions')
      .select('id, title, host_user_id')
      .eq('id', id)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: '找不到該場次或已先行刪除' }, { status: 404 });
    }

    // 權限檢查：只有原始主揪團主本人或 Super Admin 可以刪除場次
    const isHostOwner = Boolean(
      session.host_user_id &&
      callerUserId &&
      session.host_user_id === callerUserId
    );

    if (!isHostOwner && !isSuperAdminUser) {
      return NextResponse.json(
        { error: '權限不足：只有此場次的原始主揪團主或超級管理員可以刪除場次' },
        { status: 403 }
      );
    }

    // 執行刪除 (依據資料庫外鍵 ON DELETE CASCADE，相關 registrations 會由資料庫自動連帶清除)
    const { error: delErr } = await supabaseAdmin
      .from('match_sessions')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('刪除 match_sessions 錯誤:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 立即失效快取
    invalidateSessionCache();

    return NextResponse.json({
      success: true,
      message: `場次「${session.title}」已永久刪除`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '刪除場次失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
