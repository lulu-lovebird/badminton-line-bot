'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

function LiffDispatcher() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 檢查目前網址是否已在目標路徑，避免重複 replace 造成循環
    const currentPath = window.location.pathname;
    if (currentPath !== '/liff') {
      return;
    }

    const target = searchParams.get('target') || searchParams.get('page');
    const groupId = searchParams.get('groupId');
    const groupParam = groupId ? `?groupId=${groupId}` : '';

    if (target === 'admin') {
      window.location.replace(`/liff/admin${groupParam}`);
    } else if (target === 'my-records') {
      window.location.replace(`/liff/my-records${groupParam}`);
    } else {
      window.location.replace(`/liff/sessions${groupParam}`);
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
      <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2" />
      <span>正在載入羽球小幫手...</span>
    </div>
  );
}

export default function LiffRootPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">載入中...</div>}>
      <LiffDispatcher />
    </Suspense>
  );
}
