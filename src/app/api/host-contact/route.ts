import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId, isGlobalAdmin } from '@/lib/host-permissions';
import { getEmailConfiguration, isEmailNotificationsEnabled, isHostLineNotificationsEnabled, normalizeNotificationEmail } from '@/lib/email-notifications';
import { requestEmailVerification, verifyHostEmail } from '@/lib/host-email-contact';

export const dynamic = 'force-dynamic';

async function canManageContact(userId: string): Promise<boolean> {
  if (await isGlobalAdmin(userId)) return true;
  const [permissions, applications] = await Promise.all([
    supabaseAdmin.from('host_group_permissions').select('id').eq('user_id', userId).limit(1),
    supabaseAdmin.from('host_applications').select('id').eq('user_id', userId).eq('status', 'pending').limit(1),
  ]);
  if (permissions.error || applications.error) throw new Error('無法確認團主權限');
  return Boolean(permissions.data?.length || applications.data?.length);
}

export async function GET(req: NextRequest) {
  const enabled = isEmailNotificationsEnabled();
  if (!enabled) return NextResponse.json({ email_enabled: false, line_enabled: isHostLineNotificationsEnabled() });
  try {
    getEmailConfiguration();
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    if (!(await canManageContact(caller))) return NextResponse.json({ email_enabled: true, line_enabled: isHostLineNotificationsEnabled(), email: null, verified: false });
    const { data, error } = await supabaseAdmin.from('host_notification_contacts')
      .select('email, verified_at').eq('user_id', caller).maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ email_enabled: true, line_enabled: isHostLineNotificationsEnabled(), email: data?.email || null, verified: Boolean(data?.verified_at) },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Email 設定不可用' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!isEmailNotificationsEnabled()) return NextResponse.json({ error: 'Email 功能未啟用' }, { status: 410 });
  try {
    getEmailConfiguration();
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    if (!(await canManageContact(caller))) return NextResponse.json({ error: '僅團主或待審核申請者可設定通知信箱' }, { status: 403 });
    const { email: requestedEmail } = await req.json();
    const email = normalizeNotificationEmail(requestedEmail);
    if (!email) return NextResponse.json({ error: '請輸入有效的 Email 地址' }, { status: 400 });
    const result = await requestEmailVerification(caller, email);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '寄送驗證信失敗' }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isEmailNotificationsEnabled()) return NextResponse.json({ error: 'Email 功能未啟用' }, { status: 410 });
  try {
    getEmailConfiguration();
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    const { code } = await req.json();
    if (typeof code !== 'string' || !/^[a-f0-9]{24}$/.test(code.trim().toLowerCase())) {
      return NextResponse.json({ error: '驗證碼格式錯誤' }, { status: 400 });
    }
    const verified = await verifyHostEmail(caller, code.trim().toLowerCase());
    if (!verified) return NextResponse.json({ error: '驗證碼錯誤、已過期或嘗試次數過多，請重新取得' }, { status: 400 });
    return NextResponse.json({ verified: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '驗證失敗' }, { status: 503 });
  }
}
