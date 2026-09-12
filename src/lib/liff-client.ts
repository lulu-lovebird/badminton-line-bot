'use client';

import liff from '@line/liff';

let isInitialized = false;

export async function initLiff() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';
  if (!liffId) {
    console.warn('NEXT_PUBLIC_LIFF_ID is not configured');
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
