import { supabaseAdmin } from './supabase';
import { lineClient } from './line';
import { MatchSession, Registration } from '@/types/database';
import { invalidateSessionCache } from './session-cache';

/**
 * 處理球友取消報名，並自動將備取 1 號遞補為正取
 */
export async function cancelRegistrationAndPromote(registrationId: string) {
  // 1. 取得該筆報名資訊
  const { data: reg, error: fetchErr } = await supabaseAdmin
    .from('registrations')
    .select('*, match_sessions(*)')
    .eq('id', registrationId)
    .single();

  if (fetchErr || !reg) {
    throw new Error('找不到該報名紀錄');
  }

  const session = reg.match_sessions as MatchSession;
  const wasMain = reg.status === 'main';

  // 2. 將該球友標記為 cancelled
  await supabaseAdmin
    .from('registrations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', registrationId);

  // 3. 如果原本是正取，啟動「備取 1 自動遞補機制」
  if (wasMain) {
    // 找出目前排第一位的備取球友
    const { data: waitlist } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('session_id', reg.session_id)
      .eq('status', 'waitlist')
      .order('waitlist_order', { ascending: true })
      .limit(1);

    if (waitlist && waitlist.length > 0) {
      const luckyPlayer = waitlist[0];

      // 晉升為正取
      await supabaseAdmin
        .from('registrations')
        .update({
          status: 'main',
          waitlist_order: null,
        })
        .eq('id', luckyPlayer.id);

      // 發送 LINE 私訊通知遞補成功！
      try {
        await lineClient.pushMessage({
          to: luckyPlayer.user_id,
          messages: [
            {
              type: 'text',
              text: `🎉【遞補成功通知】\n您在「${session.title}」已成功由備取遞補為【正取名額】！\n時間：${new Date(session.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n地點：${session.location}\n期待您的出席！🏸`,
            },
          ],
        });
      } catch (lineErr) {
        console.error('發送遞補通知失敗:', lineErr);
      }
    }

    // 重新檢查並更新場次狀態（若正取人數小於上限，將 status 設回 open）
    const { count: mainCount } = await supabaseAdmin
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', reg.session_id)
      .eq('status', 'main');

    if ((mainCount || 0) < session.max_players) {
      await supabaseAdmin
        .from('match_sessions')
        .update({ status: 'open' })
        .eq('id', reg.session_id);
    }
  }

  // 🔄 遞補完成，立即失效場次快取
  invalidateSessionCache();

  return { success: true };
}

/**
 * 當團主增加正取人數上限時，自動依序遞補備取球友至正取
 */
export async function promoteWaitlistOnCapacityIncrease(sessionId: string, newMaxPlayers: number) {
  // 1. 取得該場次
  const { data: session } = await supabaseAdmin
    .from('match_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  // 2. 統計目前正取人數
  const { data: mainRegs } = await supabaseAdmin
    .from('registrations')
    .select('party_size')
    .eq('session_id', sessionId)
    .eq('status', 'main');

  let currentMainCount = (mainRegs || []).reduce((sum, r) => sum + (r.party_size || 1), 0);
  let availableSlots = newMaxPlayers - currentMainCount;

  if (availableSlots <= 0) return;

  // 3. 依序遞補備取球友
  const { data: waitlist } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'waitlist')
    .order('waitlist_order', { ascending: true });

  if (waitlist && waitlist.length > 0) {
    for (const player of waitlist) {
      const party = player.party_size || 1;
      if (party <= availableSlots) {
        // 晉升為正取
        await supabaseAdmin
          .from('registrations')
          .update({
            status: 'main',
            waitlist_order: null,
          })
          .eq('id', player.id);

        availableSlots -= party;
        currentMainCount += party;

        // 發送 LINE 私訊通知遞補成功
        try {
          await lineClient.pushMessage({
            to: player.user_id,
            messages: [
              {
                type: 'text',
                text: `🎉【加開名額遞補成功通知】\n您在「${session.title}」已成功由備取遞補為【正取名額】！\n時間：${new Date(session.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n地點：${session.location}\n期待您的出席！🏸`,
              },
            ],
          });
        } catch (lineErr) {
          console.error('發送擴額遞補通知失敗:', lineErr);
        }
      }
      if (availableSlots <= 0) break;
    }
  }

  // 4. 更新場次狀態
  const finalStatus = currentMainCount >= newMaxPlayers ? 'full' : 'open';
  await supabaseAdmin
    .from('match_sessions')
    .update({ status: finalStatus })
    .eq('id', sessionId);

  invalidateSessionCache();
}
