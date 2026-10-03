import { supabaseAdmin } from './supabase';
import { lineClient } from './line';
import { hasHostGroupPermission } from './host-permissions';
import { getEmailConfiguration, isEmailNotificationsEnabled, isHostLineNotificationsEnabled, sendNotificationEmail } from './email-notifications';

type HostEvent = 'registered' | 'cancelled';

/** 僅通知該場原始主揪；寄送失敗不回滾報名。Lite 模式不查詢任何 Email 資料表。 */
export async function notifyHostOfRegistration(registrationId: string, eventType: HostEvent, actorUserId: string): Promise<void> {
  const emailEnabled = isEmailNotificationsEnabled();
  const lineEnabled = isHostLineNotificationsEnabled();
  if (!emailEnabled && !lineEnabled) return;

  try {
    const { data: registration, error } = await supabaseAdmin.from('registrations')
      .select('id, user_id, player_name, party_size, status, session_id, match_sessions(id, group_id, host_user_id, title, start_time)')
      .eq('id', registrationId).maybeSingle();
    if (error || !registration) throw new Error(error?.message || '找不到報名紀錄');
    const session = registration.match_sessions as unknown as {
      id: string; group_id: string | null; host_user_id: string; title: string; start_time: string;
    } | null;
    if (!session?.group_id || actorUserId === session.host_user_id || registration.user_id.startsWith('proxy_')) return;
    if (!(await hasHostGroupPermission(session.host_user_id, session.group_id))) return;

    let eventId: string | null = null;
    let email: string | null = null;
    if (emailEnabled) {
      getEmailConfiguration();
      const { data: contact, error: contactError } = await supabaseAdmin.from('host_notification_contacts')
        .select('email, verified_at').eq('user_id', session.host_user_id).maybeSingle();
      if (contactError) throw new Error(contactError.message);
      email = contact?.verified_at ? contact.email : null;
      const { data: event, error: eventError } = await supabaseAdmin.from('host_notification_events')
        .insert({
          registration_id: registrationId, event_type: eventType, host_user_id: session.host_user_id,
          email_state: email ? 'pending' : 'skipped', line_state: lineEnabled ? 'pending' : 'skipped',
        }).select('id').maybeSingle();
      if (eventError?.code === '23505') return;
      if (eventError || !event) throw new Error(eventError?.message || '通知事件寫入失敗');
      eventId = event.id;
    }

    const action = eventType === 'registered'
      ? (registration.status === 'waitlist' ? '登記備取' : '報名正取')
      : '取消報名';
    const text = `【羽球零打小幫手】${action}\n場次：${session.title}\n時間：${new Date(session.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}\n球友：${registration.player_name}\n人數：${registration.party_size}`;
    let emailState: 'sent' | 'failed' | 'skipped' = 'skipped';
    let lineState: 'sent' | 'failed' | 'skipped' = 'skipped';

    if (email) {
      try {
        await sendNotificationEmail(email, `零打通知：${action}－${session.title}`, text);
        emailState = 'sent';
      } catch (sendError) {
        emailState = 'failed';
        console.warn('團主 Email 通知失敗:', sendError instanceof Error ? sendError.message : '未知錯誤');
      }
    }
    if (lineEnabled) {
      try {
        // LINE 額度由同一官方帳號共享；預留至少 50 則給遞補與緊急通知。
        const [quota, usage] = await Promise.all([lineClient.getMessageQuota(), lineClient.getMessageQuotaConsumption()]);
        if (quota.type === 'limited' && typeof quota.value === 'number' && usage.totalUsage < quota.value - 50) {
          await lineClient.pushMessage({ to: session.host_user_id, messages: [{ type: 'text', text }] });
          lineState = 'sent';
        } else {
          lineState = 'skipped';
        }
      } catch (sendError) {
        lineState = 'failed';
        console.warn('團主 LINE 通知失敗:', sendError instanceof Error ? sendError.message : '未知錯誤');
      }
    }
    if (eventId) {
      const { error: stateError } = await supabaseAdmin.from('host_notification_events')
        .update({ email_state: emailState, line_state: lineState, updated_at: new Date().toISOString() }).eq('id', eventId);
      if (stateError) console.warn('團主通知事件狀態更新失敗:', stateError.message);
    }
  } catch (error) {
    console.warn('團主通知處理失敗（報名狀態不受影響）:', error instanceof Error ? error.message : '未知錯誤');
  }
}
