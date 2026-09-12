'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PlusCircle, Users, CheckCircle, Clock, MapPin, Send, AlertCircle, RefreshCw, ShieldAlert, Key, Copy, Shield } from 'lucide-react';
import { MatchSession, Registration } from '@/types/database';
import { initLiff } from '@/lib/liff-client';

// 輔助函式：計算時間順延天數並輸出 datetime-local 格式 (YYYY-MM-DDTHH:mm) - 強制以台灣時區 Asia/Taipei 轉換
function toDatetimeLocalString(dateStr: string | Date, addDays = 0): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const targetDate = new Date(d.getTime() + addDays * 24 * 60 * 60 * 1000);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(targetDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  let hour = get('hour');
  if (hour === '24') hour = '00';
  const minute = get('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get('groupId') || '';

  const [activeTab, setActiveTab] = useState<'sessions' | 'create'>('sessions');
  const [sessions, setSessions] = useState<MatchSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<MatchSession | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<{ line_user_id: string; display_name: string; role: string } | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  // 緊急廣播訊息狀態
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // 代報名表單狀態
  const [proxyName, setProxyName] = useState('');
  const [proxySize, setProxySize] = useState(1);

  // 新開場次表單狀態
  const [form, setForm] = useState({
    group_id: urlGroupId,
    title: '',
    match_type: 'double',
    start_time: '',
    end_time: '',
    location: '',
    court_info: '',
    max_players: 8,
    max_waitlist: 4,
    level_requirement: '初中級 (4~7級)',
    shuttlecock: '勝利比賽球 (綠標)',
    fee: 200,
    notes: '含空調，請自備球拍與乾淨球鞋',
  });

  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  // 沿用舊場次並自動順延 7 天（名單全新清空）
  function handleCopySessionToNextWeek(s: MatchSession) {
    const newStart = toDatetimeLocalString(s.start_time, 7);
    const newEnd = toDatetimeLocalString(s.end_time, 7);

    setForm({
      group_id: s.group_id || urlGroupId || '',
      title: s.title,
      match_type: s.match_type || 'double',
      start_time: newStart,
      end_time: newEnd,
      location: s.location || '',
      court_info: s.court_info || '',
      max_players: s.max_players || 8,
      max_waitlist: s.max_waitlist || 4,
      level_requirement: s.level_requirement || '初中級 (4~7級)',
      shuttlecock: s.shuttlecock || '勝利比賽球 (綠標)',
      fee: s.fee || 200,
      notes: s.notes || '含空調，請自備球拍與乾淨球鞋',
    });

    setCopyNotice(`已成功為您帶入「${s.title}」並自動順延 7 天至下週！報名名單已全新清空。`);
    setActiveTab('create');
    setSelectedSession(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    document.title = '⚙️ 團主管理後台';
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    setLoading(true);
    setAuthError('');
    try {
      const liff = await initLiff();
      let token = '';
      let lineProfile: { userId: string; displayName: string } | null = null;

      if (liff) {
        token = liff.getIDToken() || '';
        setIdToken(token);
        try {
          const p = await liff.getProfile();
          lineProfile = { userId: p.userId, displayName: p.displayName };
        } catch {
          // 在部分環境 getProfile 可能稍慢
        }
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (lineProfile) {
        headers['x-test-user-id'] = lineProfile.userId;
      } else {
        headers['x-test-user-id'] = 'host_admin_001';
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const user = await res.json();
        setUserProfile(user);
        if (user.role === 'host' || user.role === 'admin' || user.is_super_admin) {
          setIsAuthorized(true);
          fetchSessions(token, user.line_user_id);
          return;
        } else {
          setAuthError(`您的身分目前是【一般球友】(ID: ${user.line_user_id})，尚未取得團主權限。`);
          setIsAuthorized(false);
          return;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAuthError(errJson.error || '身分驗證失敗');
        setIsAuthorized(false);
      }
    } catch (e: unknown) {
      console.error(e);
      setAuthError((e as Error).message || '連線錯誤');
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessions(token?: string, userId?: string) {
    setLoading(true);
    try {
      const currentToken = token || idToken;
      const headers: Record<string, string> = {};
      if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
      else if (userId) headers['x-test-user-id'] = userId;
      else headers['x-test-user-id'] = 'host_admin_001';

      const qs = urlGroupId ? `?groupId=${urlGroupId}` : '';
      const res = await fetch(`/api/sessions${qs}`, { headers });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function openSessionDetail(session: MatchSession) {
    setSelectedSession(session);
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch(`/api/registrations?sessionId=${session.id}`, { headers });
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }

  async function togglePayment(reg: Registration) {
    const nextStatus = reg.payment_status === 'paid' ? 'unpaid' : 'paid';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/registrations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          registration_id: reg.id,
          action: 'update_payment',
          payment_status: nextStatus,
        }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, payment_status: nextStatus } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRemovePlayer(regId: string) {
    if (!window.confirm('確定要取消該球友的報名嗎？名額將自動遞補給備取！')) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/registrations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ registration_id: regId, action: 'cancel' }),
      });
      if (res.ok && selectedSession) {
        openSessionDetail(selectedSession);
        fetchSessions(idToken, userProfile?.line_user_id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleProxyRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!proxyName.trim() || !selectedSession) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: selectedSession.id,
          user_id: `proxy_${Date.now()}`,
          player_name: proxyName.trim(),
          party_size: proxySize,
        }),
      });
      if (res.ok) {
        setProxyName('');
        openSessionDetail(selectedSession);
        fetchSessions(idToken, userProfile?.line_user_id);
      } else {
        const err = await res.json();
        alert(err.error || '代報名失敗');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleBroadcast() {
    if (!broadcastMsg.trim() || !selectedSession) return;
    setIsBroadcasting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/notify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: selectedSession.id,
          message: broadcastMsg,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`已成功發送緊急通知給 ${data.count} 位球友！`);
        setBroadcastMsg('');
      } else {
        alert(data.error || '發送失敗');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBroadcasting(false);
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          host_user_id: userProfile?.line_user_id || 'host_admin_001',
          notify_group_id: form.group_id || undefined,
        }),
      });
      if (res.ok) {
        alert('🎉 場次建立成功！已同步發送卡片！');
        setActiveTab('sessions');
        fetchSessions(idToken, userProfile?.line_user_id);
      } else {
        const err = await res.json();
        alert(err.error || '建立失敗');
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center text-center">
        <RefreshCw size={36} className="animate-spin text-emerald-600 mb-3" />
        <p className="text-xs text-slate-500 font-bold">驗證團主身分中，請稍候...</p>
      </main>
    );
  }

  if (isAuthorized === false) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center text-center">
        <ShieldAlert size={52} className="text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">尚未開通團主權限</h2>
        <p className="text-xs text-slate-600 mt-2 max-w-xs leading-relaxed">
          {authError || '此頁面僅限零打團主與社團管理員進入。'}
        </p>

        {userProfile && (
          <div className="mt-4 p-3.5 bg-white rounded-2xl border border-slate-200 text-left text-xs max-w-xs w-full shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1.5 border-b pb-1.5">
              <Key size={14} className="text-emerald-600" />
              <span>您的目前 LINE 帳號資料</span>
            </div>
            <div className="text-slate-500 space-y-1 text-[11px]">
              <div>暱稱：<span className="text-slate-800 font-bold">{userProfile.display_name}</span></div>
              <div>身分角色：<span className="text-amber-600 font-bold">{userProfile.role}</span></div>
              <div className="break-all font-mono text-[10px] text-slate-400 mt-1">
                LINE ID: {userProfile.line_user_id}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={() => checkAdminAuth()}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            重新整理並驗證
          </button>
          <a
            href="/liff/super-admin"
            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            前往系統最高管理後台 (開通團主)
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-20 max-w-lg mx-auto text-slate-800">
      {/* 頂部快速導航列 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <Link
          href={`/liff${urlGroupId ? `?groupId=${urlGroupId}` : ''}`}
          className="text-xs text-slate-500 hover:text-slate-850 flex items-center gap-1 font-medium"
        >
          <span>← 返回大廳</span>
        </Link>
        {(userProfile?.role === 'admin' || (userProfile as any)?.is_super_admin) && (
          <Link
            href={`/liff/super-admin${urlGroupId ? `?groupId=${urlGroupId}` : ''}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Shield size={13} className="text-purple-200" />
            <span>👑 超級管理</span>
          </Link>
        )}
      </div>

      <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-4 border border-slate-200">
        <button
          onClick={() => {
            setActiveTab('sessions');
            setSelectedSession(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sessions'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          🏸 場次總覽 & 名單
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          ➕ 建立新零打場次
        </button>
      </div>

      {activeTab === 'create' && (
        <form onSubmit={handleCreateSession} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-bold text-base text-slate-800">建立零打場次</h2>
            <span className="text-[11px] text-slate-400">支援快速沿用舊場次</span>
          </div>

          {/* 複製成功提示橫條 */}
          {copyNotice && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
              <CheckCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">
                {copyNotice}
              </div>
              <button
                type="button"
                onClick={() => setCopyNotice(null)}
                className="text-amber-500 hover:text-amber-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* 歷史場次快速下拉複製器 */}
          {sessions.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Copy size={13} className="text-emerald-600" />
                <span>快速沿用歷史場次（自動順延 +7 天並清空名單）：</span>
              </label>
              <select
                className="text-xs border border-emerald-300 rounded-lg p-2 bg-white text-slate-700 outline-none focus:border-emerald-500 font-medium"
                onChange={(e) => {
                  const found = sessions.find((s) => s.id === e.target.value);
                  if (found) handleCopySessionToNextWeek(found);
                }}
                defaultValue=""
              >
                <option value="" disabled>點此選擇欲沿用的舊場次...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({new Date(s.start_time).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short', month: 'numeric', day: 'numeric' })})
                  </option>
                ))}
              </select>
            </div>
          )}

          {urlGroupId && (
            <div className="bg-slate-50 p-2 rounded text-xs text-slate-500">
              📌 本場次將綁定並發布至指定群組
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600">場次名稱 / 標題</label>
            <input
              type="text"
              required
              placeholder="例: 週六秀朗國小歡樂初中級團"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">型式</label>
              <select
                value={form.match_type}
                onChange={(e) => setForm({ ...form, match_type: e.target.value })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white"
              >
                <option value="double">雙打 (4人/場)</option>
                <option value="single">單打 (2人/場)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">每人費用 ($)</label>
              <input
                type="number"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">開始時間</label>
              <input
                type="datetime-local"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full text-xs border rounded-lg p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">結束時間</label>
              <input
                type="datetime-local"
                required
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full text-xs border rounded-lg p-2 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">地點與場地資訊</label>
            <input
              type="text"
              required
              placeholder="例: 秀朗國小羽球館 (第3、4面場地)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full text-xs border rounded-lg p-2.5 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">正取上限人數</label>
              <input
                type="number"
                value={form.max_players}
                onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">備取上限人數</label>
              <input
                type="number"
                value={form.max_waitlist}
                onChange={(e) => setForm({ ...form, max_waitlist: Number(e.target.value) })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">建議程度 & 用球</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="text"
                placeholder="程度: 初中級"
                value={form.level_requirement}
                onChange={(e) => setForm({ ...form, level_requirement: e.target.value })}
                className="text-xs border rounded-lg p-2.5"
              />
              <input
                type="text"
                placeholder="用球: 勝利比賽球"
                value={form.shuttlecock}
                onChange={(e) => setForm({ ...form, shuttlecock: e.target.value })}
                className="text-xs border rounded-lg p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">備註說明 (取消期限等)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full text-xs border rounded-lg p-2 mt-1 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all mt-2"
          >
            建立場次並產生 LINE 卡片
          </button>
        </form>
      )}

      {activeTab === 'sessions' && !selectedSession && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {urlGroupId ? '本群場次總覽' : '進行中與開放場次'}
            </h2>
            <button onClick={() => fetchSessions(idToken, userProfile?.line_user_id)} className="text-slate-400 hover:text-slate-600">
              <RefreshCw size={14} />
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border text-xs text-slate-500">
              尚無場次，請點擊上方「建立新零打場次」
            </div>
          ) : (
            sessions.map((s) => {
              const isFull = (s.current_players || 0) >= s.max_players;
              return (
                <div
                  key={s.id}
                  onClick={() => openSessionDetail(s)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-all cursor-pointer relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{s.title}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isFull
                          ? 'bg-emerald-800 text-emerald-100'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isFull
                        ? `已額滿 (${s.current_players}/${s.max_players})`
                        : `招募中 (${s.current_players}/${s.max_players})`}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} />
                      <span>{new Date(s.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      <span>{s.location}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopySessionToNextWeek(s);
                      }}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold flex items-center gap-1 active:scale-95 transition-all text-xs"
                      title="直接沿用此場次所有設定，順延 7 天開下週團"
                    >
                      <Copy size={13} className="text-amber-600" />
                      <span>複製到下週 (+7天)</span>
                    </button>
                    <span className="text-emerald-600 font-bold">管理名單 →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedSession && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedSession(null)}
              className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
            >
              ← 返回場次總覽
            </button>
            <button
              type="button"
              onClick={() => handleCopySessionToNextWeek(selectedSession)}
              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold flex items-center gap-1 text-xs active:scale-95 transition-all shadow-sm"
              title="直接沿用此場次所有設定，順延 7 天開下週團"
            >
              <Copy size={13} className="text-amber-600" />
              <span>複製本場到下週 (+7天)</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-800 text-base">{selectedSession.title}</h2>
            <p className="text-xs text-slate-500 mt-1">{selectedSession.location}</p>

            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Send size={13} className="text-emerald-600" /> 向本場所有報名球友發送緊急通知
              </label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  placeholder="例：更換為第4號場地，請大家直接到4號集合！"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  className="flex-1 text-xs border rounded-lg px-2 py-1.5 outline-none"
                />
                <button
                  onClick={handleBroadcast}
                  disabled={isBroadcasting || !broadcastMsg.trim()}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isBroadcasting ? '發送中...' : '推播'}
                </button>
              </div>
            </div>

            <form onSubmit={handleProxyRegister} className="mt-3 pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <PlusCircle size={13} className="text-blue-600" /> 手動替球友代報名 (+1)
              </label>
              <div className="flex gap-2 mt-1.5">
                <input
                  type="text"
                  required
                  placeholder="球友稱呼 / 朋友名稱"
                  value={proxyName}
                  onChange={(e) => setProxyName(e.target.value)}
                  className="flex-1 text-xs border rounded-lg px-2 py-1.5 outline-none"
                />
                <select
                  value={proxySize}
                  onChange={(e) => setProxySize(Number(e.target.value))}
                  className="text-xs border rounded-lg px-2 bg-white"
                >
                  <option value={1}>1人</option>
                  <option value={2}>2人</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  代報名
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-slate-500 uppercase">報名球友清單與收款對帳</h3>

            {registrations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">目前尚無球友報名</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {registrations.map((r, idx) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {r.status === 'main' ? `${idx + 1}.` : `[備${r.waitlist_order}]`} {r.player_name}
                        </span>
                        {r.party_size > 1 && (
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            +{r.party_size}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        應付: ${selectedSession.fee * (r.party_size || 1)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePayment(r)}
                        className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all shadow-sm ${
                          r.payment_status === 'paid'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                      >
                        {r.payment_status === 'paid' ? '✓ 已付款' : '待付款'}
                      </button>

                      <button
                        onClick={() => handleRemovePlayer(r.id)}
                        className="text-[11px] text-red-500 hover:text-red-700 underline px-1"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">載入中...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
