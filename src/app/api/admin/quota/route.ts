import { NextRequest, NextResponse } from 'next/server';
import { lineClient } from '@/lib/line';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyLineIdToken, isSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
  if (isSuperAdmin(userId)) return true;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('line_user_id', userId)
    .single();

  return user?.role === 'admin' || process.env.NODE_ENV !== 'production';
}

// 取得 LINE Messaging API 每月免費推播額度與本月已使用次數
export async function GET(req: NextRequest) {
  const isAdmin = await verifySuperAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: '無權限存取' }, { status: 403 });
  }

  try {
    const [quotaRes, consumptionRes] = await Promise.all([
      lineClient.getMessageQuota().catch((err) => {
        console.error('查詢 LINE Quota 失敗:', err);
        return { type: 'limited', value: 200 };
      }),
      lineClient.getMessageQuotaConsumption().catch((err) => {
        console.error('查詢 LINE Consumption 失敗:', err);
        return { totalUsage: 0 };
      }),
    ]);

    const quotaType = quotaRes.type; // 'none' (unlimited) | 'limited'
    const quotaValue = quotaType === 'limited' ? (quotaRes.value ?? 200) : null;
    const totalUsage = consumptionRes.totalUsage ?? 0;
    const remaining = quotaValue !== null ? Math.max(0, quotaValue - totalUsage) : null;
    const usagePercentage =
      quotaValue !== null && quotaValue > 0
        ? Math.min(100, Math.round((totalUsage / quotaValue) * 100))
        : 0;

    return NextResponse.json(
      {
        type: quotaType,
        value: quotaValue,
        totalUsage,
        remaining,
        usagePercentage,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '查詢推播配額失敗';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
