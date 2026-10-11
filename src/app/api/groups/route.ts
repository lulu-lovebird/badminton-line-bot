import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUserId, isGlobalAdmin } from '@/lib/host-permissions';
import { isUserInGroup } from '@/lib/line-group-auth';

export const dynamic = 'force-dynamic';

interface GroupRow {
  group_id: string;
  group_name: string;
  is_active: boolean;
  group_type?: 'group' | 'openchat';
  join_token?: string | null;
}

// 支援資料庫遷移過渡期的向後相容查詢：若 group_type 欄位尚未建立，自動降級避免拋出 500
async function fetchGroupsWithFallback(filter?: {
  ids?: string[];
  forApplication?: boolean;
  mine?: boolean;
}): Promise<GroupRow[]> {
  try {
    let query = supabaseAdmin
      .from('groups')
      .select('group_id, group_name, is_active, group_type, join_token')
      .eq('is_active', true);

    if (filter?.ids) query = query.in('group_id', filter.ids);
    if (filter?.forApplication || filter?.mine) query = query.neq('group_type', 'openchat');
    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (!error) return (data as GroupRow[]) || [];
    if (error.code !== '42703') throw new Error(error.message);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      !err.message.includes('group_type') &&
      !err.message.includes('join_token')
    ) {
      throw err;
    }
  }

  // 降級查詢既有欄位
  let fallbackQuery = supabaseAdmin
    .from('groups')
    .select('group_id, group_name, is_active')
    .eq('is_active', true);

  if (filter?.ids) fallbackQuery = fallbackQuery.in('group_id', filter.ids);
  fallbackQuery = fallbackQuery.order('created_at', { ascending: true });
  const { data: fbData, error: fbError } = await fallbackQuery;
  if (fbError) throw new Error(fbError.message);

  return (fbData || []).map((g) => ({
    group_id: g.group_id,
    group_name: g.group_name || '羽球社團',
    is_active: g.is_active ?? true,
    group_type: 'group' as const,
    join_token: null,
  }));
}

// 只回傳目前使用者能開團的群組；管理員可選所有啟用群組。
export async function GET(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUserId(req);
    if (!caller) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    // 我所屬的球隊：以 LINE 官方 API 逐一驗證目前使用者實際所在的啟用群組（排除 OpenChat 社群），
    // 只回 group_id 與 group_name，不洩漏該群任何場次資料。
    if (req.nextUrl.searchParams.get('mine') === 'true') {
      const activeGroups = await fetchGroupsWithFallback({ mine: true });
      const myGroups: { group_id: string; group_name: string }[] = [];
      for (const g of activeGroups) {
        if (await isUserInGroup(g.group_id, caller)) {
          myGroups.push({ group_id: g.group_id, group_name: g.group_name });
        }
      }
      return NextResponse.json(myGroups, {
        headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' },
      });
    }

    if (req.nextUrl.searchParams.get('forApplication') === 'true') {
      const candidateGroups = await fetchGroupsWithFallback({ forApplication: true });
      return NextResponse.json(candidateGroups);
    }

    const admin = await isGlobalAdmin(caller);
    if (!admin) {
      const { data: permissions, error } = await supabaseAdmin
        .from('host_group_permissions')
        .select('group_id')
        .eq('user_id', caller);
      if (error) throw new Error(error.message);

      const ids = (permissions || []).map((p) => p.group_id);
      if (!ids.length) return NextResponse.json([]);

      const userGroups = await fetchGroupsWithFallback({ ids });
      return NextResponse.json(userGroups);
    }

    const allGroups = await fetchGroupsWithFallback();
    return NextResponse.json(allGroups);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '讀取群組失敗' },
      { status: 500 }
    );
  }
}
