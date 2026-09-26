/**
 * LINE ID Token 驗證與使用者權限防護模組
 */
export interface LineTokenVerifyResponse {
  iss: string;
  sub: string; // LINE User ID
  aud: string; // Channel ID
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
}

/**
 * 檢查指定的 LINE User ID 是否在 .env 的超級管理員清單中
 */
export function isSuperAdmin(lineUserId?: string | null): boolean {
  if (!lineUserId) return false;
  const envAdmins = (process.env.SUPER_ADMIN_LINE_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return envAdmins.includes(lineUserId);
}

/**
 * 驗證前端傳來的 LINE ID Token
 * 僅接受 LINE 官方驗證通過的 ID Token；未驗證的 JWT payload 不得作為身分依據
 */
export async function verifyLineIdToken(idToken: string): Promise<LineTokenVerifyResponse | null> {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!idToken) return null;

  // 1. 優先嘗試 LINE 官方驗證端點
  if (channelId) {
    try {
      const params = new URLSearchParams();
      params.append('id_token', idToken);
      params.append('client_id', channelId);

      const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (res.ok) {
        const data: LineTokenVerifyResponse = await res.json();
        return data;
      } else {
        console.warn('LINE 官方 ID Token 驗證未通過');
      }
    } catch (error) {
      console.warn('verifyLineIdToken 網路請求異常:', error);
    }
  }

  return null;
}
