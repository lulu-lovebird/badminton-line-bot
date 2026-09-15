import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient, createSessionFlexMessage } from '@/lib/line';

// 團主通知 API：支援推播群組開團卡片 或 向場次球友發送私訊通知
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, message, action, target_group_id } = body;

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

    // 動作 A: 將該場次的 Flex Card 推播 / 補發到指定的 LINE 群組
    if (action === 'push_card_to_group') {
      const destinationGroupId = target_group_id || session.group_id;
      if (!destinationGroupId) {
        return NextResponse.json({ error: '請指定要推播的目標 LINE 群組' }, { status: 400 });
      }

      // 取得團主姓名與頭像
      const { data: hostUser } = await supabaseAdmin
        .from('users')
        .select('display_name, picture_url')
        .eq('line_user_id', session.host_user_id)
        .maybeSingle();

      let hostName = hostUser?.display_name;
      let hostPic = hostUser?.picture_url;
      if (!hostName || hostName === '團主' || hostName === '球友') {
        try {
          const profile = await lineClient.getProfile(session.host_user_id);
          if (profile?.displayName) {
            hostName = profile.displayName;
            hostPic = profile.pictureUrl || null;
          }
        } catch {}
      }

      const sessionWithHost = {
        ...session,
        host_name: hostName || '球團主揪',
        host_picture_url: hostPic || null,
      };

      const liffUrl = process.env.LINE_LIFF_URL || process.env.NEXT_PUBLIC_LIFF_URL || '';
      const flexMsg = createSessionFlexMessage(sessionWithHost, liffUrl);

      await lineClient.pushMessage({
        to: destinationGroupId,
        messages: [flexMsg],
      });

      // 同步更新 session.group_id
      if (session.group_id !== destinationGroupId) {
        await supabaseAdmin
          .from('match_sessions')
          .update({ group_id: destinationGroupId })
          .eq('id', session.id);
      }

      return NextResponse.json({ success: true, message: '🎉 開團卡片已成功推播至群組！' });
    }

    // 動作 B: 緊急通知場次所有球友 (一對一私訊)
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
