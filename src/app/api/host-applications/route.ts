import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient } from '@/lib/line';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const verified = await verifyLineIdToken(token);
    if (verified) return verified.sub;
  }
  const testUserId = req.headers.get('x-test-user-id');
  if (process.env.NODE_ENV !== 'production' && testUserId) {
    return testUserId;
  }
  return null;
}

// 取得團主申請列表或個人申請狀態
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterUserId = searchParams.get('userId');
    const filterStatus = searchParams.get('status');

    const authUserId = await getAuthUser(req);
    const isAdmin = authUserId ? isSuperAdmin(authUserId) : false;

    // 若非 Admin 且不是查詢自己，拒絕存取
    if (!isAdmin && filterUserId && filterUserId !== authUserId && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: '無權限檢視他人申請記錄' }, { status: 403 });
    }

    // 嘗試從 host_applications 查詢
    let query = supabaseAdmin
      .from('host_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterUserId) {
      query = query.eq('user_id', filterUserId);
    }
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    const { data: apps, error } = await query;

    // 若資料表尚未建立 (PGRST205 錯誤)，提供優雅降級回退
    if (error && error.code === 'PGRST205') {
      console.warn('host_applications 資料表尚未建立，採用 users 降級模式');
      if (filterUserId) {
        const { data: u } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('line_user_id', filterUserId)
          .maybeSingle();
        return NextResponse.json({
          applications: u?.role === 'pending_host' ? [{
            id: `temp_${u.line_user_id}`,
            user_id: u.line_user_id,
            display_name: u.display_name,
            picture_url: u.picture_url,
            status: 'pending',
            created_at: u.created_at,
          }] : [],
          pending_count: u?.role === 'pending_host' ? 1 : 0,
          table_missing: true,
        });
      }

      // Admin 查詢所有 pending_host
      const { data: pendingUsers } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('role', 'pending_host');

      const fallbackApps = (pendingUsers || []).map((u) => ({
        id: `temp_${u.line_user_id}`,
        user_id: u.line_user_id,
        display_name: u.display_name,
        picture_url: u.picture_url,
        status: 'pending',
        created_at: u.created_at,
      }));

      return NextResponse.json({
        applications: fallbackApps,
        pending_count: fallbackApps.length,
        table_missing: true,
      });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const applications = apps || [];
    const pendingCount = applications.filter((a) => a.status === 'pending').length;

    return NextResponse.json({
      applications,
      pending_count: pendingCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 提交團主申請
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, display_name, picture_url, reason } = body;

    if (!user_id) {
      return NextResponse.json({ error: '缺少 user_id' }, { status: 400 });
    }

    // 1. 確保 users 表有此使用者紀錄
    await supabaseAdmin.from('users').upsert({
      line_user_id: user_id,
      display_name: display_name || '球友',
      picture_url: picture_url || null,
      role: 'pending_host',
    });

    // 2. 寫入 host_applications 資料表
    const { data: appData, error: insertErr } = await supabaseAdmin
      .from('host_applications')
      .insert({
        user_id,
        display_name: display_name || '球友',
        picture_url: picture_url || null,
        reason: reason || '',
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (insertErr && insertErr.code !== 'PGRST205') {
      console.error('新增 host_applications 失敗:', insertErr);
    }

    // 3. 推播通知給超級管理員
    const superAdminIds = (process.env.SUPER_ADMIN_LINE_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const adminId of superAdminIds) {
      try {
        await lineClient.pushMessage({
          to: adminId,
          messages: [
            {
              type: 'text',
              text: `📢【新團主資格審核申請】\n👤 申請人：${display_name || '球友'}\n🔑 LINE ID：${user_id}\n📝 申請簡介：${reason || '無說明'}\n\n請輸入「admin」或進入「最高管理後台」進行審核！🏸`,
            },
          ],
        });
      } catch (e) {
        console.warn('發送管理員申請通知失敗:', e);
      }
    }

    return NextResponse.json({
      success: true,
      application: appData || { user_id, status: 'pending' },
      message: '申請已成功送出！請靜待系統管理員審核。',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 審核團主申請 (核准 Approve / 駁回 Reject)
export async function PATCH(req: NextRequest) {
  try {
    const authUserId = await getAuthUser(req);
    let isAdmin = authUserId ? isSuperAdmin(authUserId) : false;

    if (!isAdmin && authUserId) {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('line_user_id', authUserId)
        .maybeSingle();
      if (dbUser?.role === 'admin') isAdmin = true;
    }

    if (!isAdmin && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: '僅限最高管理員可執行審核操作' }, { status: 403 });
    }

    const body = await req.json();
    const { application_id, user_id, action, review_notes } = body;

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: '無效的審核動作 (必須為 approve 或 reject)' }, { status: 400 });
    }

    let targetUserId = user_id;

    // 若未直接提供 user_id，從 host_applications 查出
    if (!targetUserId && application_id && !application_id.startsWith('temp_')) {
      const { data: targetApp } = await supabaseAdmin
        .from('host_applications')
        .select('user_id, display_name')
        .eq('id', application_id)
        .maybeSingle();
      if (targetApp) {
        targetUserId = targetApp.user_id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: '找不到對應的申請人 LINE User ID' }, { status: 400 });
    }

    const newRole = action === 'approve' ? 'host' : 'member';
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 1. 更新使用者角色
    await supabaseAdmin
      .from('users')
      .update({ role: newRole })
      .eq('line_user_id', targetUserId);

    // 2. 更新 host_applications 紀錄 (若資料表存在)
    if (application_id && !application_id.startsWith('temp_')) {
      await supabaseAdmin
        .from('host_applications')
        .update({
          status: newStatus,
          review_notes: review_notes || (action === 'approve' ? '審核通過' : '未符合資格'),
          reviewed_by: authUserId || 'admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application_id);
    } else {
      // 根據 user_id 更新最新一筆
      await supabaseAdmin
        .from('host_applications')
        .update({
          status: newStatus,
          review_notes: review_notes || (action === 'approve' ? '審核通過' : '未符合資格'),
          reviewed_by: authUserId || 'admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId)
        .eq('status', 'pending');
    }

    // 3. 發送 LINE 推播通知給申請球友
    try {
      if (action === 'approve') {
        await lineClient.pushMessage({
          to: targetUserId,
          messages: [
            {
              type: 'text',
              text: `🎉【團主申請審核通過】\n恭喜您！您的開團團主身分已通過最高管理員審核。\n現在您可以隨時進入「團主管理後台」發布羽球零打場次，並開始為球團揪團囉！🏸`,
            },
          ],
        });
      } else {
        await lineClient.pushMessage({
          to: targetUserId,
          messages: [
            {
              type: 'text',
              text: `ℹ️【團主申請審核結果】\n您的團主身分申請本次暫未獲通過。\n原因說明：【${review_notes || '未特別說明'}】\n若有任何疑問或需進一步了解，歡迎聯繫社團管理團隊！`,
            },
          ],
        });
      }
    } catch (pushErr) {
      console.warn('推播通知給申請球友失敗 (可能尚未加入好友或未傳過訊息):', pushErr);
    }

    return NextResponse.json({
      success: true,
      action,
      user_id: targetUserId,
      new_role: newRole,
      message: action === 'approve' ? '已成功核准該球友成為團主！' : '已駁回該球友之團主申請。',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
