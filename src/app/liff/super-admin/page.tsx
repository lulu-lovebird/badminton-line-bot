'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Shield, Users, Layers, Power, LogOut, CheckCircle, XCircle, RefreshCw, AlertTriangle, Key } from 'lucide-react';
import { User, Group } from '@/types/database';
import { initLiff } from '@/lib/liff-client';

function SuperAdminContent() {
  const [activeTab, setActiveTab] = useState<'groups' | 'hosts'>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [idToken, setIdToken] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
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
      const [groupsRes, usersRes] = await Promise.all([
        fetch('/api/admin/groups', { headers }),
        fetch('/api/admin/users', { headers }),
      ]);

      if (groupsRes.ok) setGroups(await groupsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'groups'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers size={14} /> 群組授權管理 ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab('hosts')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'hosts'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={14} /> 團主名單管理 ({users.filter((u) => u.role === 'host').length})
        </button>
      </div>

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
