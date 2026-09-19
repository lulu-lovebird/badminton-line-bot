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

// 取得群組固定咖名單或歷史球友 (供開團預載、管理設定、方案 A 下拉選單)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId')?.trim();
    const action = searchParams.get('action')?.trim();
    const regularOnly = searchParams.get('regularOnly') === 'true';

    if (!groupId) {
      return NextResponse.json({ error: '缺少 groupId 參數' }, { status: 400 });
    }

    // 方案 A: 查詢該群組歷史所有曾報名過的球友名單（依出席/報名次數排序）
    if (action === 'history_players') {
      // 1. 找出屬於該群組的所有場次 ID
      const { data: groupSessions, error: sessionErr } = await supabaseAdmin
        .from('match_sessions')
        .select('id')
        .eq('group_id', groupId);

      if (sessionErr) {
        return NextResponse.json({ error: sessionErr.message }, { status: 500 });
      }

      const sessionIds = (groupSessions || []).map((s) => s.id);

      // 若該群組尚未開過場次，降級回傳所有已登記過的使用者或空陣列
      if (sessionIds.length === 0) {
        const { data: allUsers } = await supabaseAdmin
          .from('users')
          .select('line_user_id, display_name, picture_url')
          .limit(20);

        const list = (allUsers || []).map((u) => ({
          user_id: u.line_user_id,
          display_name: u.display_name,
          picture_url: u.picture_url,
          count: 0,
        }));
        return NextResponse.json(list);
      }

      // 2. 查詢這些場次中所有有效報名紀錄 (排除代報名 proxy_)
      const { data: regList, error: regErr } = await supabaseAdmin
        .from('registrations')
        .select('user_id, player_name, users:user_id(line_user_id, display_name, picture_url)')
        .in('session_id', sessionIds)
        .neq('status', 'cancelled');

      if (regErr) {
        return NextResponse.json({ error: regErr.message }, { status: 500 });
      }

      // 3. 聚合統計每位球友報名次數與最新姓名
      const playerMap = new Map<string, { user_id: string; display_name: string; picture_url?: string; count: number }>();

      for (const r of regList || []) {
        if (!r.user_id || r.user_id.startsWith('proxy_')) continue;
        const existing = playerMap.get(r.user_id);
        const u = r.users as unknown as { line_user_id: string; display_name: string; picture_url?: string } | null;
        const name = u?.display_name || r.player_name || '球友';
        const pic = u?.picture_url;

        if (existing) {
          existing.count += 1;
        } else {
          playerMap.set(r.user_id, {
            user_id: r.user_id,
            display_name: name,
            picture_url: pic,
            count: 1,
          });
        }
      }

      const sorted = Array.from(playerMap.values()).sort((a, b) => b.count - a.count);
      return NextResponse.json(sorted);
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

// 團主設定/更新群組固定咖，或球友透過方案 C 專屬連結自主登記
export async function POST(req: NextRequest) {
  try {
    const caller = await getCallerIdentity(req);
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
      display_name = null,
      picture_url = null,
    } = body;

    if (!group_id || !user_id) {
      return NextResponse.json({ error: '缺少必要欄位 (group_id, user_id)' }, { status: 400 });
    }

    // 權限檢查：
    // 1. 團主或管理員可替任何人設定
    // 2. 一般球友若持有本人身分 (caller.userId === user_id)，可透過方案 C 自主登記成為固定咖 (is_regular=true, 無季打優惠)
    const isSelfRegistration = caller && caller.userId === user_id;
    const isHostOrAdmin = caller && (caller.role === 'host' || caller.role === 'admin' || caller.isSuperAdmin);

    if (!isHostOrAdmin && !isSelfRegistration) {
      return NextResponse.json({ error: '無權限執行此操作' }, { status: 403 });
    }

    // 若使用者尚未建立在 users 表，且有提供 display_name，順道 upsert user
    if (display_name) {
      await supabaseAdmin.from('users').upsert({
        line_user_id: user_id,
        display_name,
        picture_url: picture_url || null,
        role: 'member',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'line_user_id' });
    }

    // 自主登記球友預設為固定咖，但不具備季打優惠權限（優惠需由團主審核設定）
    const effectiveIsRegular = isHostOrAdmin ? Boolean(is_regular) : true;
    const effectiveHasDiscount = isHostOrAdmin ? Boolean(has_seasonal_discount) : false;
    const effectiveSeasonalFee = isHostOrAdmin && effectiveHasDiscount && seasonal_fee ? Number(seasonal_fee) : null;

    const { data, error } = await supabaseAdmin
      .from('group_memberships')
      .upsert(
        {
          group_id,
          user_id,
          is_regular: effectiveIsRegular,
          has_seasonal_discount: effectiveHasDiscount,
          seasonal_fee: effectiveSeasonalFee,
          valid_from: isHostOrAdmin ? valid_from || null : null,
          valid_until: isHostOrAdmin ? valid_until || null : null,
          notes: isHostOrAdmin ? notes || null : '球友自邀請連結登記',
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
