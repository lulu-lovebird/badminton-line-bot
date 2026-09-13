'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Shield, Users, Layers, Power, LogOut, CheckCircle, XCircle, RefreshCw, AlertTriangle, Key, ArrowLeft, MailCheck, Clock, Check, X, Copy, MessageSquare } from 'lucide-react';
import { User, Group, HostApplication } from '@/types/database';
import { initLiff } from '@/lib/liff-client';

function SuperAdminContent() {
  const [activeTab, setActiveTab] = useState<'applications' | 'groups' | 'hosts'>('applications');
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    document.title = '👑 系統最高管理後台';
    initAuth();
  }, []);

  async function initAuth() {
    setLoading(true);
    try {
      const liff = await initLiff();
      let token = '';
      let lineProfile: any = null;

      if (liff) {
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        token = liff.getIDToken() || '';
        setIdToken(token);
        lineProfile = await liff.getProfile();
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      else if (lineProfile) headers['x-test-user-id'] = lineProfile.userId;
      else headers['x-test-user-id'] = 'super_admin_001';

      const res = await fetch('/api/auth/me', { headers });
      const user = await res.json().catch(() => null);

      setDebugInfo({
        status: res.status,
        user,
        lineUserId: lineProfile?.userId,
        lineDisplayName: lineProfile?.displayName,
      });

      if (res.ok && (user?.role === 'admin' || user?.is_super_admin)) {
        setIsAuthorized(true);
        loadData(token);
        return;
      }
      setIsAuthorized(false);
    } catch (e: any) {
      console.error(e);
      setDebugInfo({ error: e?.message });
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadData(token?: string) {
    setLoading(true);
    const currentToken = token || idToken;
    const headers: Record<string, string> = {};
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    else headers['x-test-user-id'] = 'super_admin_001';

    try {
      const [groupsRes, usersRes, appsRes] = await Promise.all([
        fetch('/api/admin/groups', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/host-applications', { headers }),
      ]);

      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (appsRes.ok) {
        const appData = await appsRes.json();
        setApplications(appData.applications || []);
        setPendingCount(appData.pending_count || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveApplication(app: HostApplication) {
    if (!window.confirm(`確定要核准【${app.display_name}】成為開團團主嗎？\n系統將會自動發送 LINE 推播通知給該球友。`)) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else headers['x-test-user-id'] = 'super_admin_001';

      const res = await fetch('/api/host-applications', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          application_id: app.id,
          user_id: app.user_id,
          action: 'approve',
        }),
      });
      if (res.ok) {
        alert(`🎉 已成功核准【${app.display_name}】成為開團團主！`);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || '核准失敗');
      }
    } catch (e: unknown) {
      alert((e as Error).message || '連線錯誤');
    }
  }

  async function handleRejectApplication(app: HostApplication) {
    const reason = window.prompt(`請輸入駁回【${app.display_name}】團主申請的原因說明 (將會以 LINE 通知給球友)：`, '目前團主名額已滿，請先聯繫管理員');
    if (reason === null) return; // 球友取消輸入
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else headers['x-test-user-id'] = 'super_admin_001';

      const res = await fetch('/api/host-applications', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          application_id: app.id,
          user_id: app.user_id,
          action: 'reject',
          review_notes: reason.trim() || '未符合目前資格',
        }),
      });
      if (res.ok) {
        alert(`已駁回【${app.display_name}】之申請。`);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || '駁回失敗');
      }
    } catch (e: unknown) {
      alert((e as Error).message || '連線錯誤');
    }
  }

  async function toggleGroupStatus(groupId: string, currentStatus: boolean) {
    const nextStatus = !currentStatus;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    else headers['x-test-user-id'] = 'super_admin_001';

    try {
      const res = await fetch('/api/admin/groups', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          group_id: groupId,
          action: 'toggle_active',
          is_active: nextStatus,
        }),
      });
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) => (g.group_id === groupId ? { ...g, is_active: nextStatus } : g))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLeaveGroup(groupId: string) {
    if (!window.confirm('確定要讓機器人主動退出此群組嗎？\n該群組將無法再使用小幫手。')) return;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    else headers['x-test-user-id'] = 'super_admin_001';

    try {
      const res = await fetch('/api/admin/groups', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          group_id: groupId,
          action: 'leave_group',
        }),
      });
      if (res.ok) {
        alert('機器人已成功退出該群組！');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRoleChange(userId: string, targetRole: 'member' | 'host' | 'admin') {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    else headers['x-test-user-id'] = 'super_admin_001';

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          line_user_id: userId,
          role: targetRole,
        }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.line_user_id === userId ? { ...u, role: targetRole } : u))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw size={32} className="animate-spin text-slate-800 mb-2" />
        <p className="text-xs text-slate-500 font-bold">檢查最高管理員身分中...</p>
      </main>
    );
  }

  if (isAuthorized === false) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center text-center">
        <AlertTriangle size={52} className="text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">最高管理員身分未通過</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          此頁面僅限系統最高管理者存取。
        </p>

        {debugInfo && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 text-left text-xs max-w-xs w-full shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-2 border-b pb-1.5">
              <Key size={14} className="text-emerald-600" />
              <span>身分偵測診斷資訊</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div>暱稱：<span className="font-bold text-slate-800">{debugInfo.lineDisplayName || '未知'}</span></div>
              <div>身分角色：<span className="font-bold text-red-600">{debugInfo.user?.role || '無角色紀錄'}</span></div>
              <div className="break-all font-mono text-[10px] text-slate-400 mt-1">
                您的 LINE ID:<br />
                <span className="text-emerald-700 font-bold">{debugInfo.lineUserId || debugInfo.user?.line_user_id}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => initAuth()}
          className="mt-4 px-6 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
        >
          重新驗證
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pb-20 max-w-lg mx-auto text-slate-800">
      {/* 頂部導航列 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <Link
          href="/liff"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
        >
          <span>← 返回 JuJu 大廳</span>
        </Link>
        <Link
          href="/liff/admin"
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 shadow-2xs transition-colors"
        >
          <span>🏸 前往團主後台</span>
        </Link>
      </div>

      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm mb-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Shield size={20} className="text-amber-400" /> 系統最高管理後台
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          管理各羽球社團群組使用權限、審核與開通團主資格
        </p>
      </div>

      <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-4 border border-slate-200">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 relative ${
            activeTab === 'applications'
              ? 'bg-purple-700 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MailCheck size={14} />
          <span>團主審核</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-bold animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'groups'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers size={14} /> 群組授權 ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab('hosts')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'hosts'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={14} /> 團主名單 ({users.filter((u) => u.role === 'host').length})
        </button>
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700">團主身分審核列表</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                  {pendingCount} 筆待審核
                </span>
              )}
            </div>
            <button onClick={() => loadData()} className="text-slate-400 hover:text-slate-600">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* 篩選切換列 */}
          <div className="flex gap-1.5 p-1 bg-slate-200/70 rounded-xl text-[11px] font-bold text-slate-600">
            <button
              onClick={() => setAppFilter('pending')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                appFilter === 'pending' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              ⏳ 待審核 ({pendingCount})
            </button>
            <button
              onClick={() => setAppFilter('all')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                appFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              全部 ({applications.length})
            </button>
            <button
              onClick={() => setAppFilter('reviewed')}
              className={`flex-1 py-1 rounded-lg transition-all ${
                appFilter === 'reviewed' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              已處理 ({applications.filter((a) => a.status !== 'pending').length})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">載入審核名單中...</div>
          ) : (() => {
            const filtered = applications.filter((a) => {
              if (appFilter === 'pending') return a.status === 'pending';
              if (appFilter === 'reviewed') return a.status !== 'pending';
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 bg-white rounded-2xl border text-xs text-slate-500">
                  {appFilter === 'pending' ? '🎉 目前沒有待審核的團主申請' : '尚無申請紀錄'}
                </div>
              );
            }

            return filtered.map((app) => (
              <div
                key={app.id || app.user_id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      app.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : app.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {app.status === 'pending'
                      ? '⏳ 待審核'
                      : app.status === 'approved'
                      ? '✅ 已核准'
                      : '❌ 已駁回'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {app.created_at ? new Date(app.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : ''}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">{app.display_name}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(app.user_id);
                        alert(`已複製 LINE ID: ${app.user_id}`);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-mono"
                    >
                      <Copy size={11} /> 複製 ID
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 break-all">
                    ID: {app.user_id}
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <div className="font-bold text-[10px] text-slate-400 mb-1">申請開團說明 / 自述：</div>
                  <p className="leading-relaxed">{app.reason || '(未填寫說明)'}</p>
                </div>

                {app.review_notes && (
                  <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100 text-[11px] text-amber-900">
                    <span className="font-bold">審核備註：</span>{app.review_notes}
                  </div>
                )}

                {app.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleApproveApplication(app)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> ✅ 核准為團主
                    </button>
                    <button
                      onClick={() => handleRejectApplication(app)}
                      className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={14} /> ❌ 駁回申請
                    </button>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-500 uppercase">已加入之 LINE 羽球群組</span>
            <button onClick={() => loadData()} className="text-slate-400 hover:text-slate-600">
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">載入群組中...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border text-xs text-slate-500">
              目前尚未加入任何群組
            </div>
          ) : (
            groups.map((g) => (
              <div
                key={g.group_id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      {g.group_name || '未命名羽球群組'}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      ID: {g.group_id.slice(0, 16)}...
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      g.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {g.is_active ? '啟用中' : '已停權'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleGroupStatus(g.group_id, g.is_active)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                      g.is_active
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <Power size={13} />
                    {g.is_active ? '暫停該群服務' : '恢復該群服務'}
                  </button>

                  <button
                    onClick={() => handleLeaveGroup(g.group_id)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={13} />
                    主動退出群組
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'hosts' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-500 uppercase">球友身分與團主授權</span>
            <button onClick={() => loadData()} className="text-slate-400 hover:text-slate-600">
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">載入使用者中...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border text-xs text-slate-500">
              尚無使用者紀錄
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.line_user_id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{u.display_name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'host'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.role === 'admin' ? '最高管理員' : u.role === 'host' ? '零打團主' : '一般球友'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {u.line_user_id.slice(0, 16)}...
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {u.role === 'member' && (
                    <button
                      onClick={() => handleRoleChange(u.line_user_id, 'host')}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm"
                    >
                      設為團主
                    </button>
                  )}
                  {u.role === 'host' && (
                    <button
                      onClick={() => handleRoleChange(u.line_user_id, 'member')}
                      className="text-xs text-red-600 border border-red-200 hover:bg-red-50 font-bold px-2.5 py-1 rounded-lg"
                    >
                      撤銷團主
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">載入中...</div>}>
      <SuperAdminContent />
    </Suspense>
  );
}
