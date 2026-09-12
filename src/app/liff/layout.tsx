'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Calendar, ClipboardList, Settings } from 'lucide-react';
import { LiffProvider } from '@/components/liff-provider';

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiffProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        {/* 頁面主要內容 */}
        <div className="flex-1 pb-16">
          {children}
        </div>

        {/* 底部常駐導航 Bar (Next.js Link 客戶端路由，保持 LIFF Session 不中斷) */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2 flex justify-around items-center z-50 shadow-lg">
          <Link
            href="/liff"
            className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-emerald-600 active:text-emerald-600"
          >
            <Home size={19} />
            <span>首頁大廳</span>
          </Link>

          <Link
            href="/liff/sessions"
            className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-emerald-600 active:text-emerald-600"
          >
            <Calendar size={19} />
            <span>我要報名</span>
          </Link>

          <Link
            href="/liff/my-records"
            className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-amber-600 active:text-amber-600"
          >
            <ClipboardList size={19} />
            <span>報名記錄</span>
          </Link>

          <Link
            href="/liff/admin"
            className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-sky-600 active:text-sky-600"
          >
            <Settings size={19} />
            <span>團主後台</span>
          </Link>
        </nav>
      </div>
    </LiffProvider>
  );
}
