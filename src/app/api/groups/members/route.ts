import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getCallerIdentity(req: NextRequest): Promise<{ userId: string; role: string; isSuperAdmin: boolean } | null> {
  const authHeader = req.headers.get('authorization');
  let lineUserId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const verified = await verifyLineIdToken(token);
    if (verified) {
      lineUserId = verified.sub;
    }
  }

  const testUserId = req.headers.get('x-test-user-id');
  if (!lineUserId && process.env.NODE_ENV !== 'production' && testUserId) {
    lineUserId = testUserId;
  }

  if (!lineUserId) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  return {
    userId: lineUserId,
    role: user?.role || 'member',
    isSuperAdmin: isSuperAdmin(lineUserId) || user?.role === 'admin',
  };
}

// 取得群組固定咖名單 (供開團預載或管理設定)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId')?.trim();
    const regularOnly = searchParams.get('regularOnly') === 'true';

    if (!groupId) {
      return NextResponse.json({ error: '缺少 groupId 參數' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('group_memberships')
      .select(`
        id,
        group_id,
        user_id,
        is_regular,
        has_seasonal_discount,
        seasonal_fee,
        valid_from,
        valid_until,
        notes,
        created_at,
        updated_at,
        user:users!group_memberships_user_id_fkey(line_user_id, display_name, picture_url)
      `)
      .eq('group_id', groupId);

    if (regularOnly) {
      query = query.eq('is_regular', true);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      // 容錯降級：若資料表尚未執行遷移，回傳空清單避免前端開團失敗
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 團主或管理員設定/更新群組固定咖與季打優惠
export async function POST(req: NextRequest) {
  try {
    const caller = await getCallerIdentity(req);
    if (!caller || (caller.role !== 'host' && caller.role !== 'admin' && !caller.isSuperAdmin)) {
      return NextResponse.json({ error: '無權限執行此操作 (需團主或管理員身分)' }, { status: 403 });
    }

    const body = await req.json();
    const {
      group_id,
      user_id,
      is_regular = true,
      has_seasonal_discount = false,
      seasonal_fee = null,
      valid_from = null,
      valid_until = null,
      notes = null,
    } = body;

    if (!group_id || !user_id) {
      return NextResponse.json({ error: '缺少必要欄位 (group_id, user_id)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('group_memberships')
      .upsert(
        {
          group_id,
          user_id,
          is_regular: Boolean(is_regular),
          has_seasonal_discount: Boolean(has_seasonal_discount),
          seasonal_fee: has_seasonal_discount && seasonal_fee ? Number(seasonal_fee) : null,
          valid_from: valid_from || null,
          valid_until: valid_until || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'group_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 刪除或移除固定咖身分
export async function DELETE(req: NextRequest) {
  try {
    const caller = await getCallerIdentity(req);
    if (!caller || (caller.role !== 'host' && caller.role !== 'admin' && !caller.isSuperAdmin)) {
      return NextResponse.json({ error: '無權限執行此操作' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');

    let query = supabaseAdmin.from('group_memberships').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (groupId && userId) {
      query = query.eq('group_id', groupId).eq('user_id', userId);
    } else {
      return NextResponse.json({ error: '缺少識別參數 (id 或 groupId + userId)' }, { status: 400 });
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '內部伺服器錯誤';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
