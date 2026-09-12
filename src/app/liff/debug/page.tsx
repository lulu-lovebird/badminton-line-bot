'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function LiffDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [liffState, setLiffState] = useState<any>({});

  function addLog(msg: string) {
    console.log(msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  }

  useEffect(() => {
    addLog(`當前完整 URL: ${window.location.href}`);
    addLog(`路徑 Pathname: ${window.location.pathname}`);
    addLog(`查詢參數 Query: ${window.location.search || '(無)'}`);

    async function runDiagnostic() {
      try {
        addLog('正在動態引入 @line/liff...');
        const liffModule = await import('@line/liff');
        const liff = liffModule.default || liffModule;
        addLog('成功載入 @line/liff 模組！');

        const liffId =
          process.env.NEXT_PUBLIC_LIFF_ID ||
          process.env.LINE_LIFF_ID ||
          '';

        addLog(`讀取到 LIFF ID: ${liffId ? liffId : '❌ (未設定空值！)'}`);

        if (!liffId) {
          addLog('❌ 錯誤：找不到 LIFF ID，無法繼續初始化！');
          return;
        }

        addLog('開始呼叫 liff.init()... (請觀察是否在此步跳轉)');
        await liff.init({ liffId });
        addLog('✅ liff.init() 初始化完成！');

        const inClient = liff.isInClient();
        const loggedIn = liff.isLoggedIn();
        addLog(`liff.isInClient() (在LINE手機內): ${inClient ? '是 (true)' : '否 (false)'}`);
        addLog(`liff.isLoggedIn() (已登入狀態): ${loggedIn ? '是 (true)' : '否 (false)'}`);

        let profile: any = null;
        if (loggedIn) {
          try {
            profile = await liff.getProfile();
            addLog(`✅ 成功取得個人檔案：${profile.displayName} (ID: ${profile.userId})`);
          } catch (pe: any) {
            addLog(`⚠️ getProfile 失敗: ${pe.message}`);
          }
        }

        const idToken = liff.getIDToken();
        addLog(`ID Token 取得狀況: ${idToken ? '✅ 有 Token (長度: ' + idToken.length + ')' : '❌ 無 Token'}`);

        setLiffState({
          liffId,
          inClient,
          loggedIn,
          profile,
        });

      } catch (err: any) {
        addLog(`💥 拋出異常錯誤 (Exception): ${err?.message || JSON.stringify(err)}`);
      }
    }

    runDiagnostic();
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 font-mono text-xs max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-700 pb-3 mb-3">
        <Terminal size={18} />
        <span>🏸 LIFF 即時連線診斷控制台 (Debug Terminal)</span>
      </div>

      <div className="bg-black/50 rounded-xl p-3 border border-slate-800 space-y-2 mb-4">
        <div className="text-[11px] text-slate-400 font-bold">執行日誌 (Live Logs):</div>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`break-all leading-relaxed ${
                log.includes('❌') || log.includes('💥')
                  ? 'text-red-400 bg-red-950/30 p-1 rounded'
                  : log.includes('✅')
                  ? 'text-emerald-300'
                  : log.includes('⚠️')
                  ? 'text-amber-300'
                  : 'text-slate-300'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <RefreshCw size={15} />
        重新整理診斷 (Reload)
      </button>
    </main>
  );
}
