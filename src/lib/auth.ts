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
 * 驗證前端傳來的 LINE ID Token (利用 LINE 官方驗證端點)
 */
export async function verifyLineIdToken(idToken: string): Promise<LineTokenVerifyResponse | null> {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId || !idToken) return null;

  try {
    const params = new URLSearchParams();
    params.append('id_token', idToken);
    params.append('client_id', channelId);

    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error('LINE ID Token 驗證失敗:', await res.text());
      return null;
    }

    const data: LineTokenVerifyResponse = await res.json();
    return data;
  } catch (error) {
    console.error('verifyLineIdToken 異常:', error);
    return null;
  }
}
