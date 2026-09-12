import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient } from '@/lib/line';

// 團主向某個場次的所有球友推播緊急訊息
export async function POST(req: NextRequest) {
  try {
    const { session_id, message } = await req.json();

    if (!session_id || !message) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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
