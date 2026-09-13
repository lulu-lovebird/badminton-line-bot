import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient, createSessionFlexMessage } from '@/lib/line';
import { verifyLineIdToken } from '@/lib/auth';
import { isUserInGroup } from '@/lib/line-group-auth';

export const dynamic = 'force-dynamic';

// 取得場次清單 (支援群組場次與全域公開場次)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const groupId = searchParams.get('groupId');

    let query = supabaseAdmin
      .from('match_sessions')
      .select('*')
      .order('start_time', { ascending: true });

    // 若有提供群組，顯示該群專屬場次 + 全域公開場次 (group_id 為 null)
    if (groupId) {
      query = query.or(`group_id.eq.${groupId},group_id.is.null`);
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json([]);
    }

    // 取得所有報名資訊進行人數計算
    const sessionIds = sessions.map((s) => s.id);
    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('session_id, status, party_size')
      .in('session_id', sessionIds)
      .neq('status', 'cancelled');

    // 取得所有團主使用者資料以附加姓名與頭像
    const hostUserIds = Array.from(new Set(sessions.map((s) => s.host_user_id).filter(Boolean)));
    const { data: hostUsers } = await supabaseAdmin
      .from('users')
      .select('line_user_id, display_name, picture_url')
      .in('line_user_id', hostUserIds);
    const hostMap = new Map((hostUsers || []).map((u) => [u.line_user_id, u]));

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

    const computed = sessions.map((session) => {
      const sessionRegs = (regs || []).filter((r) => r.session_id === session.id);
      const mainCount = sessionRegs
        .filter((r) => r.status === 'main')
        .reduce((sum, r) => sum + (r.party_size || 1), 0);
      const waitlistCount = sessionRegs
        .filter((r) => r.status === 'waitlist')
        .reduce((sum, r) => sum + (r.party_size || 1), 0);
      const host = hostMap.get(session.host_user_id);

      return {
        ...session,
        host_name: host?.display_name || '球團主揪',
        host_picture_url: host?.picture_url || null,
        current_players: mainCount,
        waitlist_count: waitlistCount,
      };
    });

    return NextResponse.json(computed, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部伺服器錯誤';
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
    const { data: session, error } = await supabaseAdmin
      .from('match_sessions')
      .insert({
        host_user_id,
        group_id: group_id || null,
        title,
        match_type: match_type || 'double',
        start_time: toTaipeiISOString(start_time),
        end_time: toTaipeiISOString(end_time),
        location,
        court_info,
        max_players: Number(max_players) || 8,
        max_waitlist: Number(max_waitlist) || 5,
        level_requirement,
        shuttlecock,
        fee: Number(fee) || 200,
        notes,
        cancel_deadline: cancel_deadline ? toTaipeiISOString(cancel_deadline) : null,
        status: 'open',
      })
      .select()
      .single();

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

      const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || '';
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

    return NextResponse.json(session, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部錯誤';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
