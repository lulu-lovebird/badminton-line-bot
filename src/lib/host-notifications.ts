import { supabaseAdmin } from './supabase';
import { lineClient } from './line';
import { hasHostGroupPermission } from './host-permissions';
import { getEmailConfiguration, isEmailNotificationsEnabled, isHostLineNotificationsEnabled, sendNotificationEmail } from './email-notifications';
import { countPeople } from './registration-rules';
import { formatHostNotificationHtml, formatHostNotificationText, formatHostRegistrationProgress } from './host-notification-content';

type HostEvent = 'registered' | 'cancelled';

/** 僅通知該場原始主揪；寄送失敗不回滾報名。Lite 模式不查詢任何 Email 資料表。 */
export async function notifyHostOfRegistration(registrationId: string, eventType: HostEvent, actorUserId: string): Promise<void> {
  const emailEnabled = isEmailNotificationsEnabled();
  const lineEnabled = isHostLineNotificationsEnabled();
  if (!emailEnabled && !lineEnabled) return;

  try {
    const { data: registration, error } = await supabaseAdmin.from('registrations')
      .select('id, user_id, player_name, party_size, status, session_id, match_sessions(id, group_id, host_user_id, title, start_time, max_players, max_waitlist)')
      .eq('id', registrationId).maybeSingle();
    if (error || !registration) throw new Error(error?.message || '找不到報名紀錄');
    const session = registration.match_sessions as unknown as {
      id: string; group_id: string | null; host_user_id: string; title: string; start_time: string;
      max_players: number; max_waitlist: number;
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

    let groupName: string | null = null;
    try {
      const { data: group, error: groupError } = await supabaseAdmin.from('groups')
        .select('group_name').eq('group_id', session.group_id).maybeSingle();
      if (groupError) throw new Error(groupError.message);
      groupName = group?.group_name || null;
    } catch (lookupError) {
      console.warn('團主通知查詢球團名稱失敗:', lookupError instanceof Error ? lookupError.message : '未知錯誤');
    }

    let progress: string | null = null;
    try {
      const { data: active, error: progressError } = await supabaseAdmin.from('registrations')
        .select('party_size, status').eq('session_id', session.id).in('status', ['main', 'waitlist']);
      if (progressError) throw new Error(progressError.message);
      const registrations = active || [];
      progress = formatHostRegistrationProgress(
        countPeople(registrations.filter((item) => item.status === 'main')), session.max_players,
        countPeople(registrations.filter((item) => item.status === 'waitlist')), session.max_waitlist
      );
    } catch (lookupError) {
      console.warn('團主通知查詢報名進度失敗:', lookupError instanceof Error ? lookupError.message : '未知錯誤');
    }

    const action = eventType === 'registered'
      ? (registration.status === 'waitlist' ? '登記備取' : '報名正取')
      : '取消報名';
    const details = {
      action, groupName, sessionTitle: session.title, startTime: session.start_time,
      playerName: registration.player_name, partySize: registration.party_size, progress,
    };
    const text = formatHostNotificationText(details);
    let emailState: 'sent' | 'failed' | 'skipped' = 'skipped';
    let lineState: 'sent' | 'failed' | 'skipped' = 'skipped';

    if (email) {
      try {
        await sendNotificationEmail(email, `零打通知：${action}－${session.title}`, text, formatHostNotificationHtml(details));
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
