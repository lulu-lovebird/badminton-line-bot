import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId, isGlobalAdmin } from '@/lib/host-permissions';
import { isUserInGroup } from '@/lib/line-group-auth';

export const dynamic = 'force-dynamic';

// 只回傳目前使用者能開團的群組；管理員可選所有啟用群組。
export async function GET(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    // 我所屬的球隊：以 LINE 官方 API 逐一驗證目前使用者實際所在的啟用群組，
    // 只回 group_id 與 group_name，不洩漏該群任何場次資料。
    if (req.nextUrl.searchParams.get('mine') === 'true') {
      const { data: activeGroups, error } = await supabaseAdmin.from('groups')
        .select('group_id, group_name').eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      const myGroups = [];
      for (const g of activeGroups || []) {
        if (await isUserInGroup(g.group_id, caller)) {
          myGroups.push({ group_id: g.group_id, group_name: g.group_name });
        }
      }
      return NextResponse.json(myGroups, {
        headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' },
      });
    }

    if (req.nextUrl.searchParams.get('forApplication') === 'true') {
      const { data, error } = await supabaseAdmin.from('groups')
        .select('group_id, group_name, is_active').eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return NextResponse.json(data || []);
    }
    const admin = await isGlobalAdmin(caller);
    if (!admin) {
      const { data: permissions, error } = await supabaseAdmin.from('host_group_permissions')
        .select('group_id').eq('user_id', caller);
      if (error) throw new Error(error.message);
      const ids = (permissions || []).map((p) => p.group_id);
      if (!ids.length) return NextResponse.json([]);
      const { data, error: groupError } = await supabaseAdmin.from('groups')
        .select('group_id, group_name, is_active').eq('is_active', true)
        .in('group_id', ids).order('created_at', { ascending: true });
      if (groupError) throw new Error(groupError.message);
      return NextResponse.json(data || []);
    }
    const { data, error } = await supabaseAdmin.from('groups')
      .select('group_id, group_name, is_active').eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '讀取群組失敗' }, { status: 500 });
  }
}
