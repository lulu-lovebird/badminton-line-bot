import { supabaseAdmin } from './supabase';
import { lineClient } from './line';
import { MatchSession, Registration } from '@/types/database';
import { invalidateSessionCache } from './session-cache';
import { choosePromotions, countPeople, registrationSessionStatus } from './registration-rules';

// 取消與擴額共用同一套嚴格順位規則：整組遞補，不跳過排在前面的多人組。
async function reconcileWaitlist(session: MatchSession, notificationType: 'cancel' | 'capacity') {
  const { data: mainRegs, error: mainError } = await supabaseAdmin
    .from('registrations')
    .select('party_size')
    .eq('session_id', session.id)
    .eq('status', 'main');
  if (mainError) throw new Error(mainError.message);

  const { data: waitlist, error: waitlistError } = await supabaseAdmin
    .from('registrations')
    .select('*')
    .eq('session_id', session.id)
    .eq('status', 'waitlist')
    .order('waitlist_order', { ascending: true })
    .order('registered_at', { ascending: true });
  if (waitlistError) throw new Error(waitlistError.message);

  let mainCount = countPeople(mainRegs || []);
  const orderedWaitlist = (waitlist || []) as Registration[];
  const isActive = session.status !== 'cancelled' && session.status !== 'closed' &&
    session.status !== 'deleted' && new Date(session.start_time).getTime() > Date.now();
  const promotedIds = isActive
    ? choosePromotions(orderedWaitlist, session.max_players - mainCount)
    : [];
  const promoted = new Set(promotedIds);

  for (const registration of orderedWaitlist) {
    if (!promoted.has(registration.id)) continue;
    const { data, error } = await supabaseAdmin
      .from('registrations')
      .update({ status: 'main', waitlist_order: null })
      .eq('id', registration.id)
      .eq('status', 'waitlist')
      .select('id')
      .maybeSingle();
    if (error || !data) throw new Error(error?.message || '備取遞補狀態已變更，請重新整理');
    mainCount += countPeople([registration]);
  }

  const remaining = orderedWaitlist.filter((registration) => !promoted.has(registration.id));
  for (const [index, registration] of remaining.entries()) {
    if (registration.waitlist_order === index + 1) continue;
    const { error } = await supabaseAdmin
      .from('registrations')
      .update({ waitlist_order: index + 1 })
      .eq('id', registration.id)
      .eq('status', 'waitlist');
    if (error) throw new Error(error.message);
  }

  if (isActive) {
    const nextStatus = registrationSessionStatus(mainCount, session.max_players, remaining.length);
    if (nextStatus !== session.status) {
      const { error } = await supabaseAdmin.from('match_sessions')
        .update({ status: nextStatus }).eq('id', session.id);
      if (error) throw new Error(error.message);
    }
  }

  invalidateSessionCache();

  // 僅在資料庫更新成功後通知實際遞補者；不觸發群組推播。
  for (const registration of orderedWaitlist) {
    if (!promoted.has(registration.id)) continue;
    try {
      await lineClient.pushMessage({
        to: registration.user_id,
        messages: [{
          type: 'text',
          text: `${notificationType === 'cancel' ? '🎉【遞補成功通知】' : '🎉【加開名額遞補成功通知】'}\n您在「${session.title}」已成功由備取遞補為【正取名額】！\n時間：${new Date(session.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n地點：${session.location}\n期待您的出席！🏸`,
        }],
      });
    } catch (lineErr) {
      console.error('發送遞補通知失敗:', lineErr);
    }
  }
}

/** 取消報名，按整組人數與原順位遞補，並重新編排剩餘備取順位。 */
export async function cancelRegistrationAndPromote(registrationId: string) {
  const { data: reg, error: fetchError } = await supabaseAdmin
    .from('registrations')
    .select('*, match_sessions(*)')
    .eq('id', registrationId)
    .single();
  if (fetchError || !reg) throw new Error('找不到該報名紀錄');
  if (reg.status === 'cancelled') return { success: true };

  const { data: cancelled, error: cancelError } = await supabaseAdmin
    .from('registrations')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', registrationId)
    .eq('status', reg.status)
    .select('id')
    .maybeSingle();
  if (cancelError) throw new Error(cancelError.message);
  if (!cancelled) return { success: true };

  await reconcileWaitlist(reg.match_sessions as MatchSession, 'cancel');
  return { success: true };
}

/** 團主擴大正取名額後，按同樣的嚴格順位規則遞補備取。 */
export async function promoteWaitlistOnCapacityIncrease(sessionId: string, newMaxPlayers: number) {
  const { data: session, error } = await supabaseAdmin
    .from('match_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (error || !session) throw new Error(error?.message || '找不到該場次');
  await reconcileWaitlist({ ...session, max_players: newMaxPlayers }, 'capacity');
}
