// 全部旗標僅在伺服器端判斷；Lite 模式不要求 Email 設定或資料庫遷移。
export function isEmailNotificationsEnabled(): boolean {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
}

export function isHostLineNotificationsEnabled(): boolean {
  return process.env.HOST_LINE_NOTIFICATIONS_ENABLED === 'true';
}

export function normalizeNotificationEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}

export function getEmailConfiguration(): { apiKey: string; from: string } {
  if (!isEmailNotificationsEnabled()) throw new Error('Email 通知未啟用');
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from || !/^[^\r\n]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(from)) {
    throw new Error('Email 通知設定不完整：請設定 RESEND_API_KEY 與 EMAIL_FROM');
  }
  return { apiKey, from };
}

export async function sendNotificationEmail(to: string, subject: string, text: string): Promise<void> {
  const { apiKey, from } = getEmailConfiguration();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Email 服務寄送失敗（HTTP ${response.status}）`);
}
