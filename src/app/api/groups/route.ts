import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 取得目前所有啟用的羽球群組 (供團主開團時選取發布目標群組)
export async function GET() {
  try {
    const { data: groups, error } = await supabaseAdmin
      .from('groups')
      .select('group_id, group_name, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(groups || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
