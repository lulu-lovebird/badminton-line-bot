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

function logAuthDiagnostic(
  stage: string,
  details: { httpStatus?: number; channelMatches?: boolean; identityPresent?: boolean; unexpired?: boolean } = {}
): void {
  const debug = (process.env.DEBUG || process.env.NEXT_PUBLIC_DEBUG || 'off').trim().toLowerCase();
  if (process.env.VERCEL_ENV !== 'preview' || debug !== 'on') return;
  // 僅記錄固定階段及布林／狀態碼，禁止傳入 Token、個資或請求 URL。
  console.info('[LINE auth diagnostic]', { stage, ...details });
}

/**
 * 驗證前端傳來的 LINE ID Token
 * 僅接受 LINE 官方驗證通過的 ID Token；未驗證的 JWT payload 不得作為身分依據
 */
export async function verifyLineIdToken(idToken: string): Promise<LineTokenVerifyResponse | null> {
  // Token 屬於 LIFF 所在的 LINE Login Channel，不能用 Messaging API Channel ID 驗證。
  const liffId = process.env.LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || '';
  const channelId = liffId.split('-')[0];
  if (!idToken) {
    logAuthDiagnostic('credential_missing');
    return null;
  }
  if (!/^\d+$/.test(channelId) || !liffId.includes('-')) {
    logAuthDiagnostic('channel_configuration_invalid');
    return null;
  }

  // 1. 優先嘗試作為 LINE ID Token 向官方驗證 (標準 OpenID Connect 流程)
  try {
    const params = new URLSearchParams();
    params.append('id_token', idToken);
    params.append('client_id', channelId);

    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    logAuthDiagnostic('id_token_verify_response', { httpStatus: res.status });
    if (res.ok) {
      const data: LineTokenVerifyResponse = await res.json();
      logAuthDiagnostic('id_token_claims', {
        channelMatches: data.aud === channelId,
        identityPresent: Boolean(data.sub),
      });
      if (data.aud === channelId && data.sub) {
        return data;
      }
    }
  } catch {
    logAuthDiagnostic('id_token_request_or_parse_failed');
  }

  // 2. 容錯降級：若前端提供的是 Access Token (例如 LIFF Channel 尚未勾選 openid scope)
  try {
    const verifyRes = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(idToken)}`
    );
    logAuthDiagnostic('access_token_verify_response', { httpStatus: verifyRes.status });
    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      logAuthDiagnostic('access_token_claims', {
        channelMatches: verifyData.client_id === channelId,
        unexpired: verifyData.expires_in > 0,
      });
      if (verifyData.client_id === channelId && verifyData.expires_in > 0) {
        const profileRes = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        logAuthDiagnostic('profile_response', { httpStatus: profileRes.status });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          logAuthDiagnostic('profile_identity', { identityPresent: Boolean(profileData.userId) });
          if (profileData.userId) {
            return {
              iss: 'https://access.line.me',
              sub: profileData.userId,
              aud: channelId,
              exp: Math.floor(Date.now() / 1000) + (verifyData.expires_in || 3600),
              iat: Math.floor(Date.now() / 1000),
              name: profileData.displayName,
              picture: profileData.pictureUrl,
            };
          }
        }
      }
    }
  } catch {
    logAuthDiagnostic('access_token_request_or_parse_failed');
  }

  logAuthDiagnostic('credential_rejected');
  return null;
}
