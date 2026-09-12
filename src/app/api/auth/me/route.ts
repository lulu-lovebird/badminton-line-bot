import { NextRequest, NextResponse } from 'next/server';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

  // 允許本地開發環境繞過測試
  const testUserId = req.headers.get('x-test-user-id');
  if (!lineUserId && process.env.NODE_ENV !== 'production' && testUserId) {
    lineUserId = testUserId;
    userName = '測試管理員';
  }

  if (!lineUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. 檢查是否在 .env 的 SUPER_ADMIN_LINE_IDS 白名單中
  const envIsAdmin = isSuperAdmin(lineUserId);

  // 2. 取得使用者資料與資料庫角色
  let { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();

  if (!user) {
    // 第一次登入自動註冊
    const { data: newUser } = await supabaseAdmin
      .from('users')
      .insert({
        line_user_id: lineUserId,
        display_name: userName || '球友',
        picture_url: userPic,
        role: envIsAdmin ? 'admin' : 'member',
      })
      .select()
      .single();
    user = newUser;
  } else if (envIsAdmin && user.role !== 'admin') {
    // 若在 .env 中被指定為 super admin，自動同步更新資料庫角色為 admin
    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('line_user_id', lineUserId)
      .select()
      .single();
    user = updatedUser;
  }

  return NextResponse.json({
    ...user,
    is_super_admin: envIsAdmin || user?.role === 'admin',
  });
}
