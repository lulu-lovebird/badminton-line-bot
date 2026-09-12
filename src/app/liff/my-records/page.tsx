'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Registration } from '@/types/database';
import { initLiff } from '@/lib/liff-client';

type RecordWithConflict = Registration & { hasConflict?: boolean };

export default function MyRecordsPage() {
  const [records, setRecords] = useState<RecordWithConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ userId: string; displayName: string } | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = '📋 我的報名記錄';
    async function setup() {
      try {
        const liff = await initLiff();
        let token = '';
        if (liff && liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          token = liff.getIDToken() || '';
          setIdToken(token);
          setUserProfile({
            userId: profile.userId,
            displayName: profile.displayName,
          });
        } else {
          // 本地開發模擬測試帳號
          const demoUserId = 'U_demo_player_001';
          setUserProfile({
            userId: demoUserId,
            displayName: '測試球友小明',
          });
        }
        fetchRecords(token);
      } catch (err) {
        console.error(err);
      }
    }
    setup();
  }, []);

  async function fetchRecords(token?: string) {
    setLoading(true);
    try {
      const currentToken = token || idToken;
      const headers: Record<string, string> = {};
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      } else {
        headers['x-test-user-id'] = 'U_demo_player_001';
      }

      const res = await fetch('/api/registrations', { headers });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (recordId: string, sessionTitle: string) => {
    const ok = window.confirm(`確定要取消「${sessionTitle}」的報名嗎？\n若已逾取消期限可能仍需支付費用。`);
    if (!ok) return;

    setCancellingId(recordId);
    setMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else headers['x-test-user-id'] = 'U_demo_player_001';

      const res = await fetch('/api/registrations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          registration_id: recordId,
          action: 'cancel',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取消失敗');

      setMsg('已成功取消報名，名額已自動遞補！');
      fetchRecords();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '取消失敗';
      alert(errorMsg);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-20 max-w-md mx-auto">
      {/* 頁頭 */}
      <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          📋 我的報名紀錄
        </h1>
        <p className="text-slate-300 text-xs mt-1">
          僅顯示您個人的報名紀錄與繳費狀態。若時段衝突將以紅色警示。
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs mb-4">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">載入紀錄中...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
          目前尚無任何報名紀錄
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const session = rec.session;
            if (!session) return null;

            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const isMain = rec.status === 'main';

            return (
              <div
                key={rec.id}
                className={`rounded-2xl p-4 shadow-sm border transition-all ${
                  rec.hasConflict
                    ? 'bg-red-50 border-red-300 ring-2 ring-red-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* 頂部衝突警示條 */}
                {rec.hasConflict && (
                  <div className="flex items-center gap-1.5 text-xs text-red-700 font-bold mb-2 pb-2 border-b border-red-200">
                    <AlertTriangle size={15} />
                    <span>⚠️ 此場次與其他已報名場次時間重疊衝突！</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      isMain
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isMain ? '正取名額' : `備取第 ${rec.waitlist_order} 位`}
                  </span>

                  {/* 繳費狀態標籤 (橘色未付 / 綠色已付) */}
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      rec.payment_status === 'paid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {rec.payment_status === 'paid' ? '已付款' : '未付款'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-2">
                  {session.title}
                </h3>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span>
                      {start.toLocaleDateString('zh-TW', { weekday: 'short', month: 'numeric', day: 'numeric' })}{' '}
                      {start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })} -{' '}
                      {end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{session.location}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span>
                      應付費用：${session.fee * (rec.party_size || 1)} ({rec.party_size} 人)
                    </span>
                  </div>
                </div>

                {/* 取消報名操作按鈕 */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleCancel(rec.id, session.title)}
                    disabled={cancellingId === rec.id}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    {cancellingId === rec.id ? '取消中...' : '取消報名'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
