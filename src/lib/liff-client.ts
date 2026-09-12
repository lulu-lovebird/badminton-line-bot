'use client';

import liff from '@line/liff';

let isInitialized = false;

export async function initLiff() {
  // 同時支援 LINE_LIFF_ID 與 NEXT_PUBLIC_LIFF_ID
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || process.env.LINE_LIFF_ID || '';
  if (!liffId) {
    console.warn('LIFF ID 未設定，請在環境變數填寫 LINE_LIFF_ID');
    return null;
  }

  if (isInitialized) return liff;

  try {
    await liff.init({ liffId });
    isInitialized = true;
    return liff;
  } catch (error) {
    console.error('LIFF initialization failed', error);
    return null;
  }
}
