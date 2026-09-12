'use client';

import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { initLiff } from '@/lib/liff-client';

export default function MyIdPage() {
  const [profile, setProfile] = useState<{ userId: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function getProfile() {
      try {
        const liff = await initLiff();
        if (liff) {
          if (!liff.isLoggedIn()) {
            liff.login();
            return;
          }
          const p = await liff.getProfile();
          setProfile({ userId: p.userId, displayName: p.displayName });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, []);

  const handleCopy = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw size={32} className="animate-spin text-emerald-600 mb-2" />
        <p className="text-xs text-slate-500 font-bold">正在讀取您的 LINE 資料...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-sm">
        <ShieldCheck size={36} />
      </div>

      <h1 className="text-lg font-bold text-slate-800">您的 LINE 帳號資料</h1>
      <p className="text-xs text-slate-500 mt-1 mb-6">
        將此 ID 填入 Vercel 的 SUPER_ADMIN_LINE_IDS 即擁有最高管理權限！
      </p>

      {profile && (
        <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left space-y-3 mb-6">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">LINE 暱稱</span>
            <span className="text-sm font-bold text-slate-800">{profile.displayName}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 block">LINE User ID</span>
            <span className="text-xs font-mono font-bold text-emerald-700 break-all bg-emerald-50 p-2 rounded-lg block mt-1 border border-emerald-200 select-all">
              {profile.userId}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleCopy}
        className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
          copied ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
        {copied ? '已成功複製到剪貼簿！' : '一鍵複製 LINE User ID'}
      </button>
    </main>
  );
}
