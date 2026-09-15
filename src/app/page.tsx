import React from 'react';
import Link from 'next/link';
import { Calendar, Users, ShieldCheck, FileText, ArrowRight, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '羽球零打小幫手 JuJu 🏸 | 專屬羽球社團報名小助手',
  description: '專為羽球愛好者打造的 LINE 零打報名、候補遞補、開團管理與現場對帳小幫手。',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* 頂部導航 */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏸</span>
            <span className="font-black text-base text-slate-900 tracking-tight">羽球零打小幫手 JuJu</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <Link href="/privacy" className="hover:text-emerald-600 transition-colors">隱私權政策</Link>
            <Link href="/terms" className="hover:text-emerald-600 transition-colors">服務條款</Link>
          </div>
        </div>
      </header>

      {/* 主視覺 Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-2xl mx-auto">
        <div className="w-24 h-24 rounded-3xl bg-emerald-100 border-4 border-emerald-500 shadow-xl flex items-center justify-center overflow-hidden mb-6 relative">
          <img
            src="/images/juju_badminton.jpg"
            alt="JuJu"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-4">
          <Sparkles size={14} className="text-emerald-600" />
          <span>專屬羽球社團 • 智慧開團報名</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          零打卡位秒速搞定<br />候補遞補自動到位 🏸
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mb-8">
          告別群組 +1 混亂刷屏！JuJu 整合 LINE LIFF，提供即時報名名額、自動遞補通知與團主開團後台，讓打球更輕鬆、開團更有效率。
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
          <Link
            href="/liff"
            className="w-full sm:flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <span>進入 JuJu LIFF 大廳</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/host-guide"
            className="w-full sm:flex-1 py-3.5 px-5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-sm shadow-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5"
          >
            <span>📖 團主使用手冊</span>
          </Link>
        </div>
      </section>

      {/* 底部頁尾 */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-xs text-slate-500 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} 羽球零打小幫手 JuJu • Developed with ❤️ by Bean, Bird & Badminton Tech Consulting.
          </div>
          <div className="flex items-center gap-4 font-medium flex-wrap justify-center">
            <Link href="/host-guide" className="hover:text-emerald-600 transition-colors font-semibold text-emerald-700">團主使用手冊 (Host Guide)</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-emerald-600 transition-colors">隱私權政策 (Privacy Policy)</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-emerald-600 transition-colors">服務條款 (Terms of Use)</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
