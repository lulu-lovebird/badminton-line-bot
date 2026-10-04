import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient } from '@/lib/line';
import { getAuthenticatedUserId, hasHostGroupPermission, isGlobalAdmin } from '@/lib/host-permissions';
import { isUserInGroup } from '@/lib/line-group-auth';
import { getEmailConfiguration, isEmailNotificationsEnabled, normalizeNotificationEmail } from '@/lib/email-notifications';
import { requestEmailVerification } from '@/lib/host-email-contact';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    const admin = await isGlobalAdmin(caller);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const groupId = searchParams.get('groupId');
    if (!admin && userId !== caller) {
      return NextResponse.json({ error: '無權限檢視申請記錄' }, { status: 403 });
    }

    let query = supabaseAdmin.from('host_applications').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    if (groupId) query = query.eq('group_id', groupId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: groups, error: groupError } = await supabaseAdmin.from('groups').select('group_id, group_name');
    if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
    const names = new Map((groups || []).map((g) => [g.group_id, g.group_name]));
    const applications = (data || []).map((a) => ({ ...a, group_name: a.group_id ? names.get(a.group_id) || '未命名群組' : null }));
    return NextResponse.json({ applications, pending_count: applications.filter((a) => a.status === 'pending').length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '查詢失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    const { group_id, reason, email: requestedEmail } = await req.json();
    const email = isEmailNotificationsEnabled() ? normalizeNotificationEmail(requestedEmail) : null;
    if (isEmailNotificationsEnabled()) {
      getEmailConfiguration();
      if (!email) return NextResponse.json({ error: '申請團主需填寫有效的通知 Email' }, { status: 400 });
      // 啟用 Full 模式前須先執行 migration；未就緒時不可建立無法設定信箱的新申請。
      const { error: contactError } = await supabaseAdmin.from('host_notification_contacts').select('user_id').limit(0);
      if (contactError) return NextResponse.json({ error: 'Email 資料表未就緒，請先執行 Full migration' }, { status: 503 });
    }
    if (typeof group_id !== 'string' || !group_id.trim()) {
      return NextResponse.json({ error: '請選擇申請的群組' }, { status: 400 });
    }
    const { data: group, error: groupError } = await supabaseAdmin.from('groups')
      .select('group_id, group_name, is_active').eq('group_id', group_id).maybeSingle();
    if (groupError) throw new Error(groupError.message);
    if (!group?.is_active) return NextResponse.json({ error: '群組不存在或已停用' }, { status: 404 });
    if (!(await isUserInGroup(group_id, caller))) {
      return NextResponse.json({ error: '您必須是該 LINE 群組成員才能申請' }, { status: 403 });
    }
    if (await hasHostGroupPermission(caller, group_id)) {
      return NextResponse.json({ error: '您已擁有此群組的開團權限' }, { status: 409 });
    }
    const { data: user, error: userError } = await supabaseAdmin.from('users')
      .select('display_name, picture_url').eq('line_user_id', caller).maybeSingle();
    if (userError || !user) return NextResponse.json({ error: '請先完成 LINE 帳號登入' }, { status: 400 });
    const { data: app, error } = await supabaseAdmin.from('host_applications').insert({
      user_id: caller,
      group_id,
      display_name: user.display_name,
      picture_url: user.picture_url,
      reason: typeof reason === 'string' ? reason.trim() : '',
      status: 'pending',
    }).select().single();
    if (error?.code === '23505') return NextResponse.json({ error: '此群組已有待審核申請' }, { status: 409 });
    if (error) throw new Error(error.message);

    let emailVerification: 'sent' | 'verified' | 'failed' | null = null;
    if (email) {
      try {
        emailVerification = await requestEmailVerification(caller, email);
      } catch (verificationError) {
        emailVerification = 'failed';
        console.warn('團主申請成功，但 Email 驗證信未寄出:', verificationError instanceof Error ? verificationError.message : '未知錯誤');
      }
    }

    for (const adminId of (process.env.SUPER_ADMIN_LINE_IDS || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      try {
        await lineClient.pushMessage({
          to: adminId,
          messages: [{ type: 'text', text: `📢【團主審核申請】\n申請人：${user.display_name}\n群組：${group.group_name || group_id}\n說明：${app.reason || '無'}\n請至最高管理後台審核。` }],
        });
      } catch (err) {
        console.warn('發送管理員申請通知失敗:', err);
      }
    }
    return NextResponse.json({ success: true, application: app, email_verification: emailVerification });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '申請失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });
    if (!(await isGlobalAdmin(caller))) return NextResponse.json({ error: '僅限最高管理員' }, { status: 403 });
    const { application_id, action, review_notes } = await req.json();
    if (typeof application_id !== 'string' || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '無效的審核請求' }, { status: 400 });
    }
    const { data: app, error: appError } = await supabaseAdmin.from('host_applications')
      .select('id, user_id, group_id, status').eq('id', application_id).maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!app || app.status !== 'pending' || (action === 'approve' && !app.group_id)) {
      return NextResponse.json({ error: '申請不存在、已審核或缺少群組' }, { status: 409 });
    }
    if (action === 'approve' && app.group_id) {
      const { data: group } = await supabaseAdmin.from('groups')
        .select('is_active').eq('group_id', app.group_id).maybeSingle();
      if (!group?.is_active) return NextResponse.json({ error: '群組已停用' }, { status: 409 });
      const { error } = await supabaseAdmin.from('host_group_permissions')
        .upsert({ user_id: app.user_id, group_id: app.group_id }, { onConflict: 'user_id,group_id' });
      if (error) throw new Error(error.message);
    }
    const { data: reviewed, error: reviewError } = await supabaseAdmin.from('host_applications')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        review_notes: typeof review_notes === 'string' ? review_notes : null,
        reviewed_by: caller,
        reviewed_at: new Date().toISOString(),
      }).eq('id', app.id).eq('status', 'pending').select().maybeSingle();
    if (reviewError) throw new Error(reviewError.message);
    if (!reviewed) return NextResponse.json({ error: '申請已由其他管理員審核' }, { status: 409 });
    if (action === 'approve') {
      const { error } = await supabaseAdmin.from('users').update({ role: 'host' })
        .eq('line_user_id', app.user_id).in('role', ['member', 'pending_host']);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from('users').update({ role: 'member' })
        .eq('line_user_id', app.user_id).eq('role', 'pending_host');
      if (error) throw new Error(error.message);
    }
    try {
      await lineClient.pushMessage({
        to: app.user_id,
        messages: [{ type: 'text', text: action === 'approve'
          ? '🎉【團主申請通過】您已取得申請群組的開團權限！'
          : `ℹ️【團主申請未通過】${review_notes || '未符合資格'}` }],
      });
    } catch (err) {
      console.warn('團主審核通知失敗:', err);
    }
    return NextResponse.json({ success: true, application: reviewed });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '審核失敗' }, { status: 500 });
  }
}
