import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from './supabase';
import { getEmailConfiguration, sendNotificationEmail } from './email-notifications';

const hashCode = (userId: string, code: string) =>
  createHash('sha256').update(`${userId}:${code}`).digest('hex');

export async function requestEmailVerification(userId: string, email: string): Promise<'sent' | 'verified'> {
  getEmailConfiguration();
  const { data: current, error: readError } = await supabaseAdmin.from('host_notification_contacts')
    .select('email, verified_at, code_sent_at').eq('user_id', userId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (current?.email === email && current.verified_at) return 'verified';
  if (current?.code_sent_at && Date.now() - new Date(current.code_sent_at).getTime() < 60000) {
    throw new Error('請稍候 60 秒再重新寄送驗證信');
  }

  const code = randomBytes(12).toString('hex');
  const { error } = await supabaseAdmin.from('host_notification_contacts').upsert({
    user_id: userId,
    email,
    verified_at: null,
    code_hash: hashCode(userId, code),
    code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    code_sent_at: new Date().toISOString(),
    code_attempts: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);

  try {
    await sendNotificationEmail(email, '羽球零打小幫手：驗證團主通知信箱',
      `請回到團主後台輸入以下驗證碼（10 分鐘內有效）：\n\n${code}\n\n若非您提出申請，請忽略此信。`);
  } catch (sendError) {
    await supabaseAdmin.from('host_notification_contacts').update({ code_sent_at: null })
      .eq('user_id', userId).eq('code_hash', hashCode(userId, code));
    throw sendError;
  }
  return 'sent';
}

export async function verifyHostEmail(userId: string, code: string): Promise<boolean> {
  const { data: contact, error } = await supabaseAdmin.from('host_notification_contacts')
    .select('code_hash, code_expires_at, code_attempts').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!contact?.code_hash || !contact.code_expires_at ||
      new Date(contact.code_expires_at).getTime() <= Date.now() || contact.code_attempts >= 5) return false;

  const expected = Buffer.from(contact.code_hash, 'hex');
  const actual = Buffer.from(hashCode(userId, code), 'hex');
  if (!timingSafeEqual(expected, actual)) {
    const { error: attemptError } = await supabaseAdmin.from('host_notification_contacts')
      .update({ code_attempts: contact.code_attempts + 1 }).eq('user_id', userId).eq('code_hash', contact.code_hash);
    if (attemptError) throw new Error(attemptError.message);
    return false;
  }
  const { data: verified, error: updateError } = await supabaseAdmin.from('host_notification_contacts')
    .update({ verified_at: new Date().toISOString(), code_hash: null, code_expires_at: null, code_attempts: 0, updated_at: new Date().toISOString() })
    .eq('user_id', userId).eq('code_hash', contact.code_hash).select('user_id').maybeSingle();
  if (updateError) throw new Error(updateError.message);
  return !!verified;
}
