import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 記憶體快取群組清單 (預設 60 秒)
interface GroupItem {
  group_id: string;
  group_name?: string;
  is_active: boolean;
}

let cachedGroups: GroupItem[] | null = null;
let cacheExpiresAt = 0;
const GROUPS_CACHE_TTL_MS = 60 * 1000;

// 取得目前所有啟用的羽球群組 (供團主開團時選取發布目標群組)
export async function GET() {
  const now = Date.now();

  // 若快取仍在效期內，直接回傳 (0 次 Supabase 連線)
  if (cachedGroups && now < cacheExpiresAt) {
    return NextResponse.json(cachedGroups, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    });
  }

  try {
    const { data: groups, error } = await supabaseAdmin
      .from('groups')
      .select('group_id, group_name, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      // 🛡️ 容錯降級：若 Supabase 短暫 502，若有舊快取則降級回傳
      if (cachedGroups) {
        console.warn(`[Groups Cache Fallback] 查詢 groups 異常 (${error.message})，使用 Stale 快取回傳`);
        return NextResponse.json(cachedGroups, {
          headers: {
            'X-Cache': 'STALE-FALLBACK',
            'X-Warning': 'Supabase temporary error, served from stale cache',
          },
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    cachedGroups = groups || [];
    cacheExpiresAt = now + GROUPS_CACHE_TTL_MS;

    return NextResponse.json(cachedGroups, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部伺服器錯誤';
    if (cachedGroups) {
      return NextResponse.json(cachedGroups, {
        headers: { 'X-Cache': 'STALE-FALLBACK' },
      });
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
