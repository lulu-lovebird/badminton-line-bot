import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient } from '@/lib/line';
import { getAuthenticatedUserId, hasHostGroupPermission, isGlobalAdmin } from '@/lib/host-permissions';

// 團主通知 API：支援推播群組開團卡片 或 向場次球友發送私訊通知
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, message, action } = body;

    if (action === 'push_card_to_group') {
      return NextResponse.json({ error: 'Bot 群組開團推播已停用，請由團主使用 LIFF 分享卡片' }, { status: 410 });
    }

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // 1. 取得該場次資料
    const { data: session } = await supabaseAdmin
      .from('match_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (!session) {
      return NextResponse.json({ error: '場次不存在' }, { status: 404 });
    }
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    const admin = await isGlobalAdmin(caller);
    if (!admin && (session.host_user_id !== caller || !session.group_id ||
      !(await hasHostGroupPermission(caller, session.group_id)))) {
      return NextResponse.json({ error: '無權通知此場次球友' }, { status: 403 });
    }

    // 緊急通知場次所有球友 (一對一私訊，不向群組推播開團卡片)
    if (!message) {
      return NextResponse.json({ error: '請輸入通知訊息內容' }, { status: 400 });
    }

    // 2. 取得所有正取球友 (包含備取)
    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('user_id, player_name')
      .eq('session_id', session_id)
      .in('status', ['main', 'waitlist']);

    if (!regs || regs.length === 0) {
      return NextResponse.json({ message: '此場次目前無報名球友' });
    }

    // 3. 去除重複的 Line User ID
    const uniqueUserIds = Array.from(new Set(regs.map((r) => r.user_id)));

    // 4. 批次發送訊息 (推播)
    const noticeText = `📢【羽球場次緊急通知】\n場次：${session.title}\n地點：${session.location}\n\n訊息內容：\n${message}`;

    const sendPromises = uniqueUserIds.map((userId) =>
      lineClient.pushMessage({
        to: userId,
        messages: [{ type: 'text', text: noticeText }],
      }).catch((e) => console.error(`推播給 ${userId} 失敗:`, e))
    );

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, count: uniqueUserIds.length });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '推播失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
