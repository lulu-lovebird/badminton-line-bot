'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ClipboardList, Settings, Terminal, Shield } from 'lucide-react';

export default function LiffHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center max-w-md mx-auto text-center pb-24">
      {/* 可愛小幫手 JuJu 形象 */}
      <div className="relative mb-4">
        <div className="w-28 h-28 rounded-full bg-emerald-100 border-4 border-emerald-500 shadow-md flex items-center justify-center overflow-hidden">
          <img
            src="/images/juju_badminton.jpg"
            alt="JuJu"
            className="w-full h-full object-cover"
            onError={(e) => {
              // 圖片載入回退
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <span className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1 rounded-full text-xs shadow">
          🏸
        </span>
      </div>

      <h1 className="text-xl font-black text-slate-800 tracking-wide">
        🏸 羽球零打小幫手 JuJu
      </h1>
      <p className="text-xs text-slate-500 mt-1 mb-8">
        啾～歡迎來到羽球社團！請選擇您要使用的服務：
      </p>

      {/* 4 大核心功能捷徑卡片 (純靜態 Link，絕無跳轉循環) */}
      <div className="w-full space-y-3.5">
        <Link
          href="/liff/sessions"
          className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md flex items-center justify-between transition-transform active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar size={22} />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">我要報名</div>
              <div className="text-[11px] text-emerald-100">查看開放場次 • 一秒卡位</div>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">前往 →</span>
        </Link>

        <Link
          href="/liff/my-records"
          className="w-full p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-md flex items-center justify-between transition-transform active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ClipboardList size={22} />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">我的報名記錄</div>
              <div className="text-[11px] text-amber-100">個人打球行程 • 撞期提醒</div>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">前往 →</span>
        </Link>

        <Link
          href="/liff/admin"
          className="w-full p-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl shadow-md flex items-center justify-between transition-transform active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Settings size={22} />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">團主管理後台</div>
              <div className="text-[11px] text-sky-100">新增零打場次 • 現場對帳</div>
            </div>
          </div>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">前往 →</span>
        </Link>

        {/* 系統除錯終端機 */}
        <Link
          href="/liff/debug"
          className="w-full p-3 bg-slate-800 hover:bg-slate-900 text-slate-200 rounded-xl flex items-center justify-between transition-all text-xs border border-slate-700 mt-4"
        >
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-emerald-400" />
            <span>連線診斷控制台 (Debug Terminal)</span>
          </div>
          <span className="text-[10px] text-slate-400">檢測 →</span>
        </Link>
      </div>
    </main>
  );
}
