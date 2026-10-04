import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEmailConfiguration,
  isEmailNotificationsEnabled,
  normalizeNotificationEmail,
  sendNotificationEmail,
} from '../src/lib/email-notifications.ts';

const originals = {
  enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED,
  key: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
};

function restore() {
  for (const [key, name] of [['enabled', 'EMAIL_NOTIFICATIONS_ENABLED'], ['key', 'RESEND_API_KEY'], ['from', 'EMAIL_FROM']]) {
    if (originals[key] === undefined) delete process.env[name];
    else process.env[name] = originals[key];
  }
}

test('Lite 預設不啟用 Email，也不需要 Resend 金鑰', () => {
  try {
    delete process.env.EMAIL_NOTIFICATIONS_ENABLED;
    delete process.env.RESEND_API_KEY;
    assert.equal(isEmailNotificationsEnabled(), false);
    assert.throws(() => getEmailConfiguration(), /未啟用/);
  } finally { restore(); }
});

test('Full 啟用時缺設定須明確失敗，Email 格式須先驗證', () => {
  try {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true';
    delete process.env.RESEND_API_KEY;
    assert.throws(() => getEmailConfiguration(), /設定不完整/);
    assert.equal(normalizeNotificationEmail('  HOST@Example.com  '), 'host@example.com');
    assert.equal(normalizeNotificationEmail('no-address'), null);
    assert.equal(normalizeNotificationEmail('evil\r\nBcc:foo@example.com'), null);
  } finally { restore(); }
});

test('Full 使用 HTTP API 寄信，不將 API key 放進郵件內容', async () => {
  const originalFetch = globalThis.fetch;
  try {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true';
    process.env.RESEND_API_KEY = 'test-key-not-real';
    process.env.EMAIL_FROM = 'JuJu <notify@example.com>';
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.method, 'POST');
      const body = JSON.parse(options.body);
      assert.deepEqual(body.to, ['host@example.com']);
      assert.equal(body.text, '一筆新的正取報名');
      assert.equal(body.html, '<strong>已正取</strong>');
      assert.equal(body.text.includes('test-key-not-real'), false);
      return { ok: true };
    };
    await sendNotificationEmail('host@example.com', '報名通知', '一筆新的正取報名', '<strong>已正取</strong>');
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test('驗證信保持純文字，不附加 HTML', async () => {
  const originalFetch = globalThis.fetch;
  try {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true';
    process.env.RESEND_API_KEY = 'test-key-not-real';
    process.env.EMAIL_FROM = 'JuJu <notify@example.com>';
    globalThis.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.text, '您的驗證碼');
      assert.equal(Object.hasOwn(body, 'html'), false);
      return { ok: true };
    };
    await sendNotificationEmail('host@example.com', '驗證通知', '您的驗證碼');
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
