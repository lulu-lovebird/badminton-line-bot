'use client';

let liffInstance: any = null;
let initPromise: Promise<any> | null = null;

/**
 * 徹底防跳閃的 LIFF 客戶端初始化模組
 */
export async function initLiff() {
  if (typeof window === 'undefined') return null;

  if (liffInstance) return liffInstance;
  if (initPromise) return initPromise;

  const liffId =
    process.env.NEXT_PUBLIC_LIFF_ID ||
    process.env.LINE_LIFF_ID ||
    '';

  if (!liffId) {
    console.warn('LIFF ID 未設定');
    return null;
  }

  initPromise = (async () => {
    try {
      // 動態引入 @line/liff，避免 SSR 時發生衝突
      const liffModule = await import('@line/liff');
      const liff = liffModule.default || liffModule;

      await liff.init({ liffId });
      liffInstance = liff;
      return liff;
    } catch (error) {
      console.error('LIFF 初始化失敗:', error);
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}
