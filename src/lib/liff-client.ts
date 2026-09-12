'use client';

import liff from '@line/liff';

let initPromise: Promise<typeof liff | null> | null = null;

export async function initLiff() {
  if (typeof window === 'undefined') return null;

  const liffId =
    process.env.NEXT_PUBLIC_LIFF_ID ||
    process.env.LINE_LIFF_ID ||
    '';

  if (!liffId) {
    console.warn('LIFF ID 未設定');
    return null;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await liff.init({ liffId });

      // 🛡️ 防無限迴圈機制：
      // 只有在「非 LINE 內部瀏覽器 (例如外部 Safari/Chrome)」且未登入時才呼叫 login
      if (!liff.isInClient() && !liff.isLoggedIn()) {
        liff.login();
        return null;
      }

      return liff;
    } catch (error) {
      console.error('LIFF 初始化失敗:', error);
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}
