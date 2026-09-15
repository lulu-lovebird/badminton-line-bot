'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, MapPin, DollarSign, Award, CheckCircle, AlertCircle, Clock, RefreshCw, Globe, User, Users } from 'lucide-react';
import { MatchSession } from '@/types/database';
import { useLiff } from '@/components/liff-provider';

interface RosterItem {
  id: string;
  player_name: string;
  party_size: number;
  status: 'main' | 'waitlist' | 'cancelled';
  waitlist_order?: number | null;
  is_mine?: boolean;
}

function SessionListContent() {
  const searchParams = useSearchParams();
  const targetSessionId = searchParams.get('sessionId') || '';
  const [currentGroupId, setCurrentGroupId] = useState<string>(searchParams.get('groupId') || '');

  const [sessions, setSessions] = useState<MatchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [partySize, setPartySize] = useState<number>(1);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedRosters, setExpandedRosters] = useState<Record<string, boolean>>({});
  const [rosterData, setRosterData] = useState<Record<string, { loading: boolean; list: RosterItem[]; error?: string }>>({});

  const { userProfile, idToken } = useLiff();

  // 取得場次 (支援智慧快取與強制刷新)
  async function fetchSessions(dateFilter = selectedDate, groupFilter = currentGroupId, isManualRefresh = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (groupFilter) params.append('groupId', groupFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (isManualRefresh) {
        params.append('refresh', 'true');
        params.append('_t', Date.now().toString());
      }

      const res = await fetch(`/api/sessions?${params.toString()}`, {
        cache: isManualRefresh ? 'no-store' : 'default',
        headers: isManualRefresh ? { 'Cache-Control': 'no-cache' } : {},
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
    document.title = '🏸 我要報名零打';
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchSessions();
  }, []);

  const fetchRoster = async (sessionId: string) => {
    setRosterData((prev) => ({
      ...prev,
      [sessionId]: { loading: true, list: prev[sessionId]?.list || [] },
    }));

    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.userId) headers['x-test-user-id'] = userProfile.userId;

      const res = await fetch(`/api/registrations?sessionId=${sessionId}`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('無法載入名單');
      }
      const data = await res.json();
      setRosterData((prev) => ({
        ...prev,
        [sessionId]: { loading: false, list: Array.isArray(data) ? data : [] },
      }));
    } catch (err: unknown) {
      setRosterData((prev) => ({
        ...prev,
        [sessionId]: {
          loading: false,
          list: [],
          error: err instanceof Error ? err.message : '載入失敗',
        },
      }));
    }
  };

  const toggleRoster = (sessionId: string) => {
    const willExpand = !expandedRosters[sessionId];
    setExpandedRosters((prev) => ({ ...prev, [sessionId]: willExpand }));
    if (willExpand && !rosterData[sessionId]?.list?.length) {
      fetchRoster(sessionId);
    }
  };

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

      fetchSessions(selectedDate, currentGroupId, true);
      if (expandedRosters[session.id]) {
        fetchRoster(session.id);
      }
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
            onClick={() => fetchSessions(selectedDate, currentGroupId, true)}
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
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-xs space-y-2.5 p-6 shadow-sm">
          <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
          <div className="text-sm font-bold text-slate-800">正在讀取資料中，請稍候...</div>
          <div className="text-slate-400 text-[11px]">正在連線伺服器，即時同步最新開團與報名名單</div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3 shadow-sm">
          <div className="text-sm font-bold text-slate-700">目前尚無開放中的零打場次</div>
          <p className="text-xs text-slate-400">
            {selectedDate ? `日期 ${selectedDate} 當日無開團` : '近期尚無團主開團，若剛建立可點擊下方重新整理'}
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => fetchSessions(selectedDate, currentGroupId, true)}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            >
              <RefreshCw size={13} />
              重新整理
            </button>
            {currentGroupId && (
              <button
                onClick={() => {
                  setCurrentGroupId('');
                  fetchSessions(selectedDate, '', true);
                }}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95"
              >
                <Globe size={13} />
                查看全域所有場次
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(targetSessionId
            ? [...sessions].sort((a, b) => (a.id === targetSessionId ? -1 : b.id === targetSessionId ? 1 : 0))
            : sessions
          ).map((s) => {
            const isTarget = s.id === targetSessionId;
            const isFull = (s.current_players || 0) >= s.max_players;
            const start = new Date(s.start_time);
            const end = new Date(s.end_time);

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow transition-all relative overflow-hidden ${
                  isTarget
                    ? 'border-2 border-emerald-500 ring-4 ring-emerald-100 shadow-md'
                    : 'border-slate-200'
                }`}
              >
                {isTarget && (
                  <div className="mb-2.5 -mt-1 -mx-1 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center justify-between">
                    <span>🎯 您正在查看由團主分享的指定場次</span>
                    <span className="text-[10px] text-emerald-100">直接於下方報名</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {s.match_type === 'single' ? '單打' : s.match_type === 'any' ? '不限' : '雙打'}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      👤 團主：{s.host_name || '球團團主'}
                    </span>
                    {s.status === 'cancelled' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                        🚫 場次已停用
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        s.is_roster_public === false
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {s.is_roster_public === false ? '🔒 私密名單' : '🌐 公開名單'}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      s.status === 'cancelled'
                        ? 'bg-slate-200 text-slate-600'
                        : isFull
                        ? 'bg-emerald-900 text-emerald-100'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {s.status === 'cancelled'
                      ? '已停用'
                      : isFull
                      ? '額滿 (可備取)'
                      : `招募中 (${s.current_players || 0}/${s.max_players})`}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-base mb-2">{s.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-emerald-600 shrink-0" />
                    <span>主揪團主：<strong className="text-slate-800">{s.host_name || '球團團主'}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span>
                      {start.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short', month: 'numeric', day: 'numeric' })}{' '}
                      {start.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })} -{' '}
                      {end.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })}
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

                {/* 報名名單顯示區塊 */}
                <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200">
                  {s.is_roster_public === false ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          🔒 私密名單（名冊不公開，僅統計人數）
                        </span>
                        {userProfile && (
                          <button
                            type="button"
                            onClick={() => toggleRoster(s.id)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 py-0.5 px-2 rounded hover:bg-emerald-50 transition-colors"
                          >
                            <span>{expandedRosters[s.id] ? '收合狀態' : '查詢我的狀態'}</span>
                          </button>
                        )}
                      </div>
                      {expandedRosters[s.id] && (
                        <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          {rosterData[s.id]?.loading ? (
                            <div className="text-slate-400 py-1 flex items-center gap-1.5">
                              <RefreshCw size={12} className="animate-spin text-emerald-600" />
                              <span>查詢中...</span>
                            </div>
                          ) : rosterData[s.id]?.error ? (
                            <div className="text-red-500 py-1">{rosterData[s.id]?.error}</div>
                          ) : (rosterData[s.id]?.list || []).length > 0 ? (
                            <div className="space-y-1.5">
                              {(rosterData[s.id]?.list || []).map((r, idx) => (
                                <div
                                  key={r.id || idx}
                                  className="flex items-center justify-between text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-sm"
                                >
                                  <span className="font-bold text-emerald-700">
                                    ✓ {r.player_name || userProfile?.displayName}{' '}
                                    {r.party_size > 1 ? `(+${r.party_size - 1})` : ''}
                                  </span>
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                      r.status === 'main'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {r.status === 'main'
                                      ? '正取名額'
                                      : `備取第 ${r.waitlist_order || 1} 位`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-slate-400 py-1">您尚未報名此場次</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleRoster(s.id)}
                          className="text-xs text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Users size={14} className="text-emerald-600" />
                          <span>
                            {expandedRosters[s.id]
                              ? '收合球友名單'
                              : `查看已報名名單 (${s.current_players || 0}人)`}
                          </span>
                        </button>
                      </div>
                      {expandedRosters[s.id] && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          {rosterData[s.id]?.loading ? (
                            <div className="text-slate-400 py-2 flex items-center justify-center gap-1.5">
                              <RefreshCw size={13} className="animate-spin text-emerald-600" />
                              <span>載入球友名單中...</span>
                            </div>
                          ) : rosterData[s.id]?.error ? (
                            <div className="text-red-500 py-1">{rosterData[s.id]?.error}</div>
                          ) : (rosterData[s.id]?.list || []).length === 0 ? (
                            <div className="text-slate-400 text-center py-2">目前尚無球友報名，搶先報名吧！</div>
                          ) : (
                            <div className="space-y-2.5">
                              {/* 正取名單 */}
                              {(() => {
                                const mainList = (rosterData[s.id]?.list || []).filter((r) => r.status === 'main');
                                const waitList = (rosterData[s.id]?.list || []).filter((r) => r.status === 'waitlist');
                                return (
                                  <>
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                                        <span>🟢 正取球友 ({mainList.reduce((acc, r) => acc + (r.party_size || 1), 0)}/{s.max_players}人)</span>
                                      </div>
                                      {mainList.length === 0 ? (
                                        <div className="text-slate-400 text-xs py-1">尚無正取</div>
                                      ) : (
                                        <div className="grid grid-cols-2 gap-1.5">
                                          {mainList.map((r, idx) => (
                                            <div
                                              key={r.id || idx}
                                              className={`px-2 py-1 rounded-lg border text-xs flex items-center justify-between ${
                                                r.is_mine
                                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                                  : 'bg-white border-slate-200 text-slate-700'
                                              }`}
                                            >
                                              <span className="truncate">
                                                {idx + 1}. {r.player_name}
                                                {r.is_mine && <span className="ml-1 text-[10px] text-emerald-600">(您)</span>}
                                              </span>
                                              {r.party_size > 1 && (
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded ml-1 shrink-0">
                                                  +{r.party_size - 1}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* 備取名單 (若有) */}
                                    {waitList.length > 0 && (
                                      <div className="pt-2 border-t border-slate-200">
                                        <div className="text-[11px] font-bold text-amber-700 mb-1.5">
                                          🟡 候補球友 ({waitList.reduce((acc, r) => acc + (r.party_size || 1), 0)}人)
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          {waitList.map((r, idx) => (
                                            <div
                                              key={r.id || idx}
                                              className={`px-2 py-1 rounded-lg border text-xs flex items-center justify-between ${
                                                r.is_mine
                                                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                                  : 'bg-white border-slate-200 text-slate-700'
                                              }`}
                                            >
                                              <span className="truncate">
                                                備{r.waitlist_order || idx + 1}. {r.player_name}
                                                {r.is_mine && <span className="ml-1 text-[10px] text-amber-700">(您)</span>}
                                              </span>
                                              {r.party_size > 1 && (
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded ml-1 shrink-0">
                                                  +{r.party_size - 1}
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

                  {s.status === 'cancelled' ? (
                    <button
                      disabled
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                    >
                      🚫 場次已暫停報名
                    </button>
                  ) : (
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
                  )}
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">正在讀取資料中，請稍候...</div>}>
      <SessionListContent />
    </Suspense>
  );
}
