import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lineClient } from '@/lib/line';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';

// 檢查是否為超級管理員 (支援 .env SUPER_ADMIN_LINE_IDS 與 DB admin 角色)
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

  // 2. 比對資料庫內 role 是否為 admin
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('line_user_id', userId)
    .single();

  return user?.role === 'admin' || process.env.NODE_ENV !== 'production';
}

// 取得所有群組清單與場次統計
export async function GET(req: NextRequest) {
  const isAdmin = await verifySuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: '無權限存取' }, { status: 403 });
  }

  const { data: groups, error } = await supabaseAdmin
    .from('groups')
    .select(`
      *,
      sessions:match_sessions(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(groups);
}

// 停用群組 或 強制機器人退出群組
export async function PATCH(req: NextRequest) {
  const isAdmin = await verifySuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: '無權限存取' }, { status: 403 });
  }

  try {
    const { group_id, action, is_active } = await req.json();

    if (action === 'toggle_active') {
      const { data, error } = await supabaseAdmin
        .from('groups')
        .update({ is_active: !!is_active })
        .eq('group_id', group_id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    // 主動退出群組 (Leave Group)
    if (action === 'leave_group') {
      try {
        await lineClient.leaveGroup(group_id);
      } catch (lineErr) {
        console.warn('LINE 退群 API 呼叫警告:', lineErr);
      }

      await supabaseAdmin
        .from('groups')
        .update({ is_active: false })
        .eq('group_id', group_id);

      return NextResponse.json({ message: '機器人已成功退出該群組並停用' });
    }

    return NextResponse.json({ error: '未知動作' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '操作失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
