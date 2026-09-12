import { lineClient } from './line';

/**
 * 檢查使用者是否為指定 LINE 群組的成員
 * 透過 LINE 官方 Messaging API: getGroupMemberProfile(groupId, userId)
 */
export async function isUserInGroup(groupId: string, userId: string): Promise<boolean> {
  // 開發測試環境或未指定群組時放行
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
