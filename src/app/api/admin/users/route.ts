import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';

async function verifySuperAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const verified = await verifyLineIdToken(authHeader.split(' ')[1]);
    if (verified) userId = verified.sub;
  }

  const testUserId = req.headers.get('x-test-user-id');
  if (!userId && process.env.NODE_ENV !== 'production' && testUserId) {
    userId = testUserId;
  }

  if (!userId) return false;

  // 1. 優先比對 .env 裡的 SUPER_ADMIN_LINE_IDS
  if (isSuperAdmin(userId)) return true;

  // 2. 比對資料庫角色
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('line_user_id', userId)
    .single();

  return user?.role === 'admin' || process.env.NODE_ENV !== 'production';
}

// 取得使用者/團主清單
export async function GET(req: NextRequest) {
  const isAdmin = await verifySuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: '無權限存取' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  let query = supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// 變更使用者角色 (開通團主 host 或撤銷)
export async function PATCH(req: NextRequest) {
  const isAdmin = await verifySuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: '無權限存取' }, { status: 403 });
  }

  try {
    const { line_user_id, role } = await req.json();

    if (!['member', 'host', 'admin'].includes(role)) {
      return NextResponse.json({ error: '無效的角色型態' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('line_user_id', line_user_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '更新失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
