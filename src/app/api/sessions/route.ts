import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient, createSessionFlexMessage } from '@/lib/line';
import { verifyLineIdToken } from '@/lib/auth';
import { isUserInGroup } from '@/lib/line-group-auth';

// 取得場次清單 (加強群組成員身分過濾)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const groupId = searchParams.get('groupId');

    // 解析當前請求的使用者
    let currentUserId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const verified = await verifyLineIdToken(authHeader.split(' ')[1]);
      if (verified) currentUserId = verified.sub;
    }
    const testUserId = req.headers.get('x-test-user-id');
    if (!currentUserId && process.env.NODE_ENV !== 'production' && testUserId) {
      currentUserId = testUserId;
    }

    // 🛡️ 隱私與成員檢查：若指定了群組，驗證當前使用者是否為該群成員
    if (groupId && currentUserId) {
      const member = await isUserInGroup(groupId, currentUserId);
      if (!member) {
        return NextResponse.json(
          { error: '您尚未加入此羽球群組，無法查看該群的專屬零打場次！' },
          { status: 403 }
        );
      }
    }

    let query = supabaseAdmin
      .from('match_sessions')
      .select('*')
      .order('start_time', { ascending: true });

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
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

    const computed = sessions.map((session) => {
      const sessionRegs = (regs || []).filter((r) => r.session_id === session.id);
      const mainCount = sessionRegs
        .filter((r) => r.status === 'main')
        .reduce((sum, r) => sum + (r.party_size || 1), 0);
      const waitlistCount = sessionRegs
        .filter((r) => r.status === 'waitlist')
        .reduce((sum, r) => sum + (r.party_size || 1), 0);

      return {
        ...session,
        current_players: mainCount,
        waitlist_count: waitlistCount,
      };
    });

    return NextResponse.json(computed);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
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
    } = body;

    // 1. 確保團主使用者存在
    await supabaseAdmin.from('users').upsert({
      line_user_id: host_user_id,
      display_name: '團主',
      role: 'host',
    });

    // 2. 如果有 group_id，確保群組記錄存在
    if (group_id) {
      await supabaseAdmin.from('groups').upsert({
        group_id,
        is_active: true,
      });
    }

    // 3. 建立場次
    const { data: session, error } = await supabaseAdmin
      .from('match_sessions')
      .insert({
        host_user_id,
        group_id: group_id || null,
        title,
        match_type: match_type || 'double',
        start_time,
        end_time,
        location,
        court_info,
        max_players: Number(max_players) || 8,
        max_waitlist: Number(max_waitlist) || 5,
        level_requirement,
        shuttlecock,
        fee: Number(fee) || 200,
        notes,
        cancel_deadline,
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
      const liffUrl = process.env.NEXT_PUBLIC_LIFF_URL || '';
      const flexMsg = createSessionFlexMessage(session, liffUrl);
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
