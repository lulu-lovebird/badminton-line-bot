import crypto from 'crypto';
import { lineClient } from './line';
import { supabaseAdmin } from './supabase';

function safeTimingCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.trim());
    const bufB = Buffer.from(b.trim());
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * 檢查使用者是否具有該群組或社群之存取/報名權限
 * - 一般 LINE 群組 (group)：直接呼叫 LINE 官方 API getGroupMemberProfile 驗證（100% 保持既有邏輯，零 DB 依賴回歸）
 * - LINE 社群 (openchat)：即時查詢 DB 比對 join_token 是否相符（不使用本地記憶體快取以防 Serverless 不一致）
 */
export async function checkGroupAccess(params: {
  groupId: string;
  userId: string;
  token?: string | null;
}): Promise<{ allowed: boolean; reason?: string; is_openchat?: boolean }> {
  const { groupId, userId, token } = params;

  // 開發測試環境放行
  if (process.env.NODE_ENV !== 'production' && userId.startsWith('U_demo')) {
    return { allowed: true };
  }

  // 1. 若為 LINE 社群 (以 openchat_ 前綴識別)
  if (groupId.startsWith('openchat_')) {
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('group_id, group_type, join_token, is_active')
      .eq('group_id', groupId)
      .maybeSingle();

    if (!group || !group.is_active || group.group_type !== 'openchat') {
      return { allowed: false, reason: '此 LINE 社群不存在或已停用', is_openchat: true };
    }

    if (!token || !group.join_token || !safeTimingCompare(token, group.join_token)) {
      return {
        allowed: false,
        reason: '缺少有效社群通行憑證 (Token)，請由社群公告專屬連結進入',
        is_openchat: true,
      };
    }

    return { allowed: true, is_openchat: true };
  }

  // 2. 一般 LINE 群組：直接透過 LINE Messaging API 驗證成員身分 (完全與既有行為一致)
  const inGroup = await isUserInGroup(groupId, userId);
  return { allowed: inGroup, reason: inGroup ? undefined : '非該群組成員' };
}

/**
 * 檢查使用者是否為指定 LINE 群組的成員
 * 透過 LINE 官方 Messaging API: getGroupMemberProfile(groupId, userId)
 */
export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  // 開發測試環境放行
  if (process.env.NODE_ENV !== 'production' && userId.startsWith('U_demo')) {
    return true;
  }

  try {
    const memberProfile = await lineClient.getGroupMemberProfile(groupId, userId);
    return !!memberProfile?.userId;
  } catch (err: unknown) {
    // 若使用者不在群組內，LINE API 會回傳 404 Not Found
    console.warn(`[群組成員檢查失敗] User ${userId} 不在群組 ${groupId} 內:`, (err as Error).message);
    return false;
  }
}
