import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId, isGlobalAdmin } from '@/lib/host-permissions';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  return userId && await isGlobalAdmin(userId);
}

async function validatePair(userId: unknown, groupId: unknown) {
  if (typeof userId !== 'string' || !userId.trim() || typeof groupId !== 'string' || !groupId.trim()) {
    return '請選擇團主與群組';
  }
  const [{ data: user, error: userError }, { data: group, error: groupError }] = await Promise.all([
    supabaseAdmin.from('users').select('line_user_id, role').eq('line_user_id', userId).maybeSingle(),
    supabaseAdmin.from('groups').select('group_id, is_active').eq('group_id', groupId).maybeSingle(),
  ]);
  if (userError || groupError) return userError?.message || groupError?.message || '查詢失敗';
  if (!user || !group?.is_active) return '團主不存在或群組未啟用';
  return null;
}

async function syncHostRole(userId: string) {
  const { count, error } = await supabaseAdmin.from('host_group_permissions')
    .select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw new Error(error.message);
  const { data: user } = await supabaseAdmin.from('users').select('role').eq('line_user_id', userId).maybeSingle();
  if (user?.role === 'admin') return;
  const { error: roleError } = await supabaseAdmin.from('users')
    .update({ role: count ? 'host' : 'member' }).eq('line_user_id', userId);
  if (roleError) throw new Error(roleError.message);
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) return NextResponse.json({ error: '無權限存取' }, { status: 403 });
    const [{ data: permissions, error }, { data: users, error: usersError }, { data: groups, error: groupsError }] = await Promise.all([
      supabaseAdmin.from('host_group_permissions').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('users').select('line_user_id, display_name'),
      supabaseAdmin.from('groups').select('group_id, group_name'),
    ]);
    if (error || usersError || groupsError) throw new Error(error?.message || usersError?.message || groupsError?.message);
    const userNames = new Map((users || []).map((u) => [u.line_user_id, u.display_name]));
    const groupNames = new Map((groups || []).map((g) => [g.group_id, g.group_name]));
    return NextResponse.json((permissions || []).map((p) => ({
      ...p,
      display_name: userNames.get(p.user_id) || p.user_id,
      group_name: groupNames.get(p.group_id) || p.group_id,
    })));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '查詢失敗' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) return NextResponse.json({ error: '無權限存取' }, { status: 403 });
    const { user_id, group_id } = await req.json();
    const invalid = await validatePair(user_id, group_id);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('host_group_permissions')
      .insert({ user_id, group_id }).select().single();
    if (error?.code === '23505') return NextResponse.json({ error: '該團主已取得此群組權限' }, { status: 409 });
    if (error) throw new Error(error.message);
    await syncHostRole(user_id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '新增失敗' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) return NextResponse.json({ error: '無權限存取' }, { status: 403 });
    const { id, user_id, group_id } = await req.json();
    if (typeof id !== 'string') return NextResponse.json({ error: '缺少授權 ID' }, { status: 400 });
    const invalid = await validatePair(user_id, group_id);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    const { data: old } = await supabaseAdmin.from('host_group_permissions')
      .select('user_id').eq('id', id).maybeSingle();
    if (!old) return NextResponse.json({ error: '找不到授權' }, { status: 404 });
    const { data, error } = await supabaseAdmin.from('host_group_permissions')
      .update({ user_id, group_id }).eq('id', id).select().single();
    if (error?.code === '23505') return NextResponse.json({ error: '目標授權已存在' }, { status: 409 });
    if (error) throw new Error(error.message);
    await syncHostRole(old.user_id);
    if (old.user_id !== user_id) await syncHostRole(user_id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '修改失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await requireAdmin(req))) return NextResponse.json({ error: '無權限存取' }, { status: 403 });
    const { id } = await req.json();
    if (typeof id !== 'string') return NextResponse.json({ error: '缺少授權 ID' }, { status: 400 });
    const { data, error } = await supabaseAdmin.from('host_group_permissions')
      .delete().eq('id', id).select('user_id').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: '找不到授權' }, { status: 404 });
    await syncHostRole(data.user_id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '刪除失敗' }, { status: 500 });
  }
}
