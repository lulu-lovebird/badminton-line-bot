import { supabaseAdmin } from '@/lib/supabase';
import { invalidateSessionCache } from '@/lib/session-cache';

let lastCleanupTimestamp = 0;
const CLEANUP_THROTTLE_MS = 10 * 60 * 1000; // 每 10 分鐘至多執行一次檢查

/**
 * 取得過期場次保留天數設定
 * 預設為 7 天；若設為 0 或小於 0 則不自動清理
 */
export function getExpiredSessionCleanupDays(): number {
  const raw = process.env.EXPIRED_SESSION_CLEANUP_DAYS;
  if (raw === undefined || raw === null || raw.trim() === '') {
    return 7; // 預設 7 天
  }
  const parsed = parseInt(raw.trim(), 10);
  return isNaN(parsed) ? 7 : parsed;
}

/**
 * 自動清理過期場次 (節省 Supabase 免費額度)
 * - 依 end_time 小於 (now - cleanupDays) 進行清理
 * - match_sessions 刪除時會藉由 ON DELETE CASCADE 自動連帶清理 registrations
 */
export async function cleanupExpiredSessions(force = false): Promise<{
  enabled: boolean;
  cleanupDays: number;
  deletedCount: number;
}> {
  const cleanupDays = getExpiredSessionCleanupDays();

  // 若設定為 0 或負數，代表不自動刪除已過期場次
  if (cleanupDays <= 0) {
    return { enabled: false, cleanupDays, deletedCount: 0 };
  }

  const now = Date.now();
  if (!force && now - lastCleanupTimestamp < CLEANUP_THROTTLE_MS) {
    return { enabled: true, cleanupDays, deletedCount: 0 };
  }
  lastCleanupTimestamp = now;

  try {
    const cutoffDate = new Date(now - cleanupDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: deleted, error } = await supabaseAdmin
      .from('match_sessions')
      .delete()
      .lt('end_time', cutoffDate)
      .select('id, title');

    if (error) {
      console.error('[Session Cleanup] 清理過期場次失敗:', error.message);
      return { enabled: true, cleanupDays, deletedCount: 0 };
    }

    const count = deleted?.length || 0;
    if (count > 0) {
      console.log(`[Session Cleanup] 成功自動清除 ${count} 個超過 ${cleanupDays} 天的過期場次`);
      invalidateSessionCache();
    }

    return { enabled: true, cleanupDays, deletedCount: count };
  } catch (err) {
    console.error('[Session Cleanup] 例外錯誤:', err);
    return { enabled: true, cleanupDays, deletedCount: 0 };
  }
}
