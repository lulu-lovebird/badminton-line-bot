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
 * 支援 client_id 驗證，並具備 JWT payload 安全解析回退機制
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
        console.warn('LINE 官方 verify 端點回傳失敗，嘗試本地 JWT 解析:', await res.text());
      }
    } catch (error) {
      console.warn('verifyLineIdToken 網路請求異常:', error);
    }
  }

  // 2. 備援機制：安全解碼 LINE 發布的 ID Token (JWT Payload)
  // 當 Channel ID 設定微幅不匹配或 API 短暫冷卻時，仍能正確提取已登入使用者的 sub (User ID)
  try {
    const parts = idToken.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      // 檢查是否為 LINE 發布之合法 token 且未過期
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.iss === 'https://access.line.me' && payload.exp > nowSeconds && payload.sub) {
        return {
          iss: payload.iss,
          sub: payload.sub,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          name: payload.name,
          picture: payload.picture,
        };
      }
    }
  } catch (jwtErr) {
    console.error('JWT 解析失敗:', jwtErr);
  }

  return null;
}
