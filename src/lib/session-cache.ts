/**
 * 🏸 零打場次智慧快取模組 (Session Smart Cache)
 * 
 * 功能特點：
 * 1. 預設 TTL 為 30 秒，可由環境變數 SESSION_CACHE_TTL_SECONDS 動態覆寫
 * 2. 支援事件驅動即時失效 (On-Demand Invalidation)：開團、報名、取消時立即清除，確保名額零時差
 * 3. 容錯降級 (Stale-While-Revalidate Fallback)：當 Supabase 發生 502/503 或網路抖動時，自動回傳舊快取平滑過渡
 * 4. 支援強制刷新 (Bypass Cache)：透過 ?refresh=true 或 Cache-Control: no-cache 繞過快取重查
 */

export interface CacheEntry<T> {
  data: T;
  cachedAt: number; // 時間戳 (毫秒)
  expiresAt: number; // 到期時間 (毫秒)
}

// 預設快取時效：30 秒
const DEFAULT_TTL_SECONDS = 30;

/**
 * 取得快取 TTL 秒數 (優先讀取環境變數 SESSION_CACHE_TTL_SECONDS)
 */
export function getCacheTTLSeconds(): number {
  const envVal = process.env.SESSION_CACHE_TTL_SECONDS;
  if (envVal !== undefined && envVal !== '') {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_TTL_SECONDS;
}

// 記憶體快取容器 (在同一 Serverless/Node 實例內共享)
const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * 產生標準化場次快取 Key
 */
export function generateSessionCacheKey(params: {
  groupId?: string | null;
  date?: string | null;
  status?: string | null;
}): string {
  const g = params.groupId?.trim() || 'all';
  const d = params.date?.trim() || 'all';
  const s = params.status?.trim() || 'all';
  return `sessions:g=${g}:d=${d}:s=${s}`;
}

export interface CacheLookupResult<T> {
  hit: boolean;
  data?: T;
  isStale: boolean;
  ageSeconds: number;
}

/**
 * 查詢快取
 * @param key 快取鍵值
 * @param allowStale 是否允許回傳過期舊資料 (用於 Supabase 連線異常時降級)
 */
export function getSessionCache<T>(key: string, allowStale = false): CacheLookupResult<T> {
  const ttl = getCacheTTLSeconds();
  // 若 TTL 設為 0，視為停用快取
  if (ttl === 0) {
    return { hit: false, isStale: false, ageSeconds: 0 };
  }

  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return { hit: false, isStale: false, ageSeconds: 0 };
  }

  const now = Date.now();
  const ageSeconds = Math.max(0, Math.round((now - entry.cachedAt) / 1000));

  // 資料仍在有效期內 (Cache HIT)
  if (now <= entry.expiresAt) {
    return {
      hit: true,
      data: entry.data,
      isStale: false,
      ageSeconds,
    };
  }

  // 資料已過期，但若允許過期降級且在合理容忍期 (15 分鐘內) 內
  const maxStaleWindowMs = 15 * 60 * 1000;
  if (allowStale && now - entry.expiresAt <= maxStaleWindowMs) {
    return {
      hit: true,
      data: entry.data,
      isStale: true,
      ageSeconds,
    };
  }

  return { hit: false, isStale: true, ageSeconds };
}

/**
 * 寫入快取
 * @param key 快取鍵值
 * @param data 要儲存的資料
 * @param customTTL 可選自訂 TTL (秒)，未指定則依環境變數或預設值
 */
export function setSessionCache<T>(key: string, data: T, customTTL?: number): void {
  const ttlSeconds = customTTL !== undefined ? customTTL : getCacheTTLSeconds();
  if (ttlSeconds <= 0) return;

  const now = Date.now();
  cacheStore.set(key, {
    data,
    cachedAt: now,
    expiresAt: now + ttlSeconds * 1000,
  });
}

/**
 * 清除/失效快取 (事件驅動主動失效)
 * @param keyPrefix 可指定特定開頭的前綴；若未指定則清除所有 session 快取
 */
export function invalidateSessionCache(keyPrefix?: string): number {
  if (!keyPrefix) {
    const count = cacheStore.size;
    cacheStore.clear();
    return count;
  }

  let removed = 0;
  for (const key of Array.from(cacheStore.keys())) {
    if (key.startsWith(keyPrefix) || key.includes(keyPrefix)) {
      cacheStore.delete(key);
      removed++;
    }
  }
  return removed;
}

/**
 * 取得目前快取統計狀態 (供除錯與監控)
 */
export function getSessionCacheStats() {
  const now = Date.now();
  const keys = Array.from(cacheStore.keys());
  const activeCount = keys.filter((k) => (cacheStore.get(k)?.expiresAt || 0) >= now).length;
  return {
    totalEntries: cacheStore.size,
    activeEntries: activeCount,
    ttlSeconds: getCacheTTLSeconds(),
    keys,
  };
}
