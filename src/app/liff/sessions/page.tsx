'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, MapPin, DollarSign, Award, CheckCircle, AlertCircle, Clock, RefreshCw, Globe } from 'lucide-react';
import { MatchSession } from '@/types/database';
import { useLiff } from '@/components/liff-provider';

function SessionListContent() {
  const searchParams = useSearchParams();
  const [currentGroupId, setCurrentGroupId] = useState<string>(searchParams.get('groupId') || '');

  const [sessions, setSessions] = useState<MatchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(1);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { userProfile, idToken } = useLiff();

  // 取得場次 (強制 no-store 杜絕快取問題)
  async function fetchSessions(dateFilter = selectedDate, groupFilter = currentGroupId) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (groupFilter) params.append('groupId', groupFilter);
      if (dateFilter) params.append('date', dateFilter);
      // 加入隨機時間戳徹底打碎瀏覽器與 CDN 快取
      params.append('_t', Date.now().toString());

      const res = await fetch(`/api/sessions?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('查詢場次異常:', res.status, errData);
      }
    } catch (err) {
      console.error('查詢場次網路錯誤:', err);
    } finally {
      setLoading(false);
    }
  }

  // 首次載入
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchSessions();
  }, []);

  const handleRegister = async (session: MatchSession) => {
    if (!userProfile) {
      alert('請先在 LINE 中開啟或登入！');
      return;
    }

    setSubmittingId(session.id);
    setMessage(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else headers['x-test-user-id'] = userProfile.userId;

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: session.id,
          player_name: userProfile.displayName,
          party_size: partySize,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '報名失敗');
      }

      if (data.status === 'waitlist') {
        setMessage({
          type: 'success',
          text: `正取已滿，您已排入【備取順位第 ${data.waitlist_order} 位】！`,
        });
      } else {
        setMessage({
          type: 'success',
          text: '🎉 恭喜！報名成功（正取名額）！',
        });
      }

      fetchSessions();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '報名時發生錯誤';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 max-w-md mx-auto">
      {/* 頁頭 */}
      <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            🏸 開放零打場次報名
          </h1>
          <button
            onClick={() => fetchSessions()}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-xs flex items-center gap-1"
            title="重新整理場次"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>重新整理</span>
          </button>
        </div>
        <p className="text-emerald-100 text-xs mt-1">
          {currentGroupId ? '本群專屬與公開零打場次' : '近期開放零打場次'}
        </p>
        {userProfile && (
          <div className="mt-2 text-xs bg-emerald-700/60 px-2 py-1 rounded inline-block">
            球友：{userProfile.displayName}
          </div>
        )}
      </div>

      {/* 提示訊息 */}
      {message && (
        <div
          className={`p-3 rounded-xl mb-4 text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 日期篩選器 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Calendar size={14} /> 依日期篩選：
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            className="text-xs border rounded p-1.5 outline-none focus:border-emerald-500"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              fetchSessions(e.target.value);
            }}
          />
          {selectedDate && (
            <button
              onClick={() => {
                setSelectedDate('');
                fetchSessions('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              全部
            </button>
          )}
        </div>
      </div>

      {/* 場次列表 */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
          <RefreshCw size={22} className="animate-spin text-emerald-500" />
          <span>正在即時載入場次列表...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <div className="text-sm font-medium">目前暫無開放中的零打場次</div>
          <p className="text-xs text-slate-400">
            {selectedDate ? `日期 ${selectedDate} 當日無開團` : '近期尚無團主開團'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => fetchSessions()}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw size={13} />
              重新整理
            </button>
            {currentGroupId && (
              <button
                onClick={() => {
                  setCurrentGroupId('');
                  fetchSessions(selectedDate, '');
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Globe size={13} />
                查看全域所有場次
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const isFull = (s.current_players || 0) >= s.max_players;
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition-all relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {s.match_type === 'single' ? '單打' : '雙打'}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      isFull
                        ? 'bg-emerald-900 text-emerald-100'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isFull ? '額滿 (可備取)' : `招募中 (${s.current_players || 0}/${s.max_players})`}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-2">{s.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-600">
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
                    <span>
                      {s.location} {s.court_info ? `(${s.court_info})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-amber-500 shrink-0" />
                    <span className="font-semibold text-amber-700">${s.fee} / 人</span>
                    {s.shuttlecock && (
                      <span className="ml-2 text-slate-500">🏸 {s.shuttlecock}</span>
                    )}
                  </div>

                  {s.level_requirement && (
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-blue-500 shrink-0" />
                      <span>程度：{s.level_requirement}</span>
                    </div>
                  )}
                </div>

                {s.notes && (
                  <div className="mt-3 p-2 rounded bg-slate-50 text-[11px] text-slate-500 border border-slate-100">
                    ℹ️ {s.notes}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>人數:</span>
                    <select
                      value={partySize}
                      onChange={(e) => setPartySize(Number(e.target.value))}
                      className="border rounded px-1.5 py-0.5 bg-white text-xs outline-none"
                    >
                      <option value={1}>1 人 (+1)</option>
                      <option value={2}>2 人 (+2)</option>
                      <option value={3}>3 人 (+3)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleRegister(s)}
                    disabled={submittingId === s.id}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                      isFull
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    } disabled:opacity-50`}
                  >
                    {submittingId === s.id
                      ? '處理中...'
                      : isFull
                      ? `登記備取 (目前備取 ${s.waitlist_count || 0})`
                      : '立即報名'}
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

export default function SessionListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">載入場次中...</div>}>
      <SessionListContent />
    </Suspense>
  );
}
