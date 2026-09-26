import { supabaseAdmin } from './supabase';
import { isSuperAdmin, verifyLineIdToken } from './auth';

export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const verified = await verifyLineIdToken(header.slice(7));
    if (verified) return verified.sub;
  }
  const testId = req.headers.get('x-test-user-id');
  return process.env.NODE_ENV !== 'production' && testId ? testId : null;
}

export async function isGlobalAdmin(userId: string): Promise<boolean> {
  if (isSuperAdmin(userId)) return true;
  const { data, error } = await supabaseAdmin
    .from('users').select('role').eq('line_user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role === 'admin';
}

export async function hasHostGroupPermission(userId: string, groupId: string): Promise<boolean> {
  if (await isGlobalAdmin(userId)) return true;
  const { data, error } = await supabaseAdmin
    .from('host_group_permissions').select('id')
    .eq('user_id', userId).eq('group_id', groupId).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}
