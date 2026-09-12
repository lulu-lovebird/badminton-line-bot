import { NextRequest, NextResponse } from 'next/server';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let lineUserId: string | null = null;
  let userName: string | undefined;
  let userPic: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split(' ')[1];
    const tokenData = await verifyLineIdToken(idToken);
    if (tokenData) {
      lineUserId = tokenData.sub;
      userName = tokenData.name;
      userPic = tokenData.picture;
    }
  }

  // 允許本地測試模式
  const testUserId = req.headers.get('x-test-user-id');
  if (!lineUserId && process.env.NODE_ENV !== 'production' && testUserId) {
    lineUserId = testUserId;
    userName = '測試管理員';
  }

  if (!lineUserId) {
    return NextResponse.json({ error: '無法解析 LINE 身分 (未提供 Token 或 Token 已失效)' }, { status: 401 });
  }

  // 1. 檢查是否在 .env 的 SUPER_ADMIN_LINE_IDS 白名單中
  const envIsAdmin = isSuperAdmin(lineUserId);

  try {
    // 2. 取得使用者資料與資料庫角色
    let { data: user, error: selectErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    if (selectErr) {
      console.warn('Supabase users 查詢警示 (可能為短暫冷啟動或連線逾時):', selectErr.message);
      // 🛡️ 容錯保護：若為 Super Admin，在資料庫短暫逾時下依然認可管理者身分，不中斷操作
      if (envIsAdmin) {
        return NextResponse.json({
          line_user_id: lineUserId,
          display_name: userName || '超級管理員',
          role: 'admin',
          is_super_admin: true,
        });
      }
      return NextResponse.json(
        { error: `資料庫連線逾時，請點擊下方按鈕重試: ${selectErr.message}` },
        { status: 504 }
      );
    }

    if (!user) {
      // 第一次登入自動註冊 (採用原子 upsert，防範並行並發造成的 row lock 與 504 逾時)
      const { data: newUser, error: upsertErr } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            line_user_id: lineUserId,
            display_name: userName || '球友',
            picture_url: userPic,
            role: envIsAdmin ? 'admin' : 'member',
          },
          { onConflict: 'line_user_id' }
        )
        .select()
        .single();

      if (upsertErr) {
        console.error('Supabase 建立使用者錯誤:', upsertErr);
      }
      user = newUser || {
        line_user_id: lineUserId,
        display_name: userName || '球友',
        role: envIsAdmin ? 'admin' : 'member',
      };
    } else if (envIsAdmin && user.role !== 'admin') {
      // 若在 .env 中被指定為 super admin，自動同步更新資料庫角色為 admin
      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('line_user_id', lineUserId)
        .select()
        .single();
      if (updatedUser) user = updatedUser;
    }

    return NextResponse.json(
      {
        ...user,
        is_super_admin: envIsAdmin || user?.role === 'admin',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部伺服器錯誤';
    if (envIsAdmin) {
      return NextResponse.json({
        line_user_id: lineUserId,
        display_name: userName || '管理員',
        role: 'admin',
        is_super_admin: true,
      });
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
