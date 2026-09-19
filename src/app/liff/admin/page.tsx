'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PlusCircle, Users, CheckCircle, Clock, Calendar, MapPin, Send, AlertCircle, RefreshCw, ShieldAlert, Key, Copy, Shield, UserPlus, FileText, User, Share2, Pencil, X, Ban, Trash2, Settings, Star, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { MatchSession, Registration, GroupMembership } from '@/types/database';
import { initLiff } from '@/lib/liff-client';
import { getSessionLiffUrl, formatSessionAnnouncement, shareSessionViaTargetPicker } from '@/lib/share-utils';

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

// 取得星期幾字串 (例如："週六", "週日", "週一" 等) - 依據 datetime-local (YYYY-MM-DDTHH:mm)
function getWeekdayString(dtStr: string): string {
  if (!dtStr) return '';
  const [datePart] = dtStr.split('T');
  if (!datePart) return '';
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dayIndex = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return weekdays[dayIndex] || '';
}

// 根據開始時間自動推算結束時間（預設 +2 小時，亦可指定小時數）
function addHoursToDatetimeLocal(dtStr: string, hours = 2): string {
  if (!dtStr) return '';
  const [datePart, timePart = '00:00'] = dtStr.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min] = timePart.split(':').map(Number);
  if (!y || !m || !d) return '';
  const dObj = new Date(Date.UTC(y, m - 1, d, h || 0, min || 0));
  const target = new Date(dObj.getTime() + hours * 60 * 60 * 1000);
  const ny = target.getUTCFullYear();
  const nm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(target.getUTCDate()).padStart(2, '0');
  const nh = String(target.getUTCHours()).padStart(2, '0');
  const nmin = String(target.getUTCMinutes()).padStart(2, '0');
  return `${ny}-${nm}-${nd}T${nh}:${nmin}`;
}

// 計算開始與結束時間的時長（以小時為單位，如 2 或 2.5）
function calculateDurationHours(startStr: string, endStr: string): number | null {
  if (!startStr || !endStr) return null;
  const [sDate, sTime = '00:00'] = startStr.split('T');
  const [eDate, eTime = '00:00'] = endStr.split('T');
  if (!sDate || !eDate) return null;
  const [sy, sm, sd] = sDate.split('-').map(Number);
  const [sh, smin] = sTime.split(':').map(Number);
  const [ey, em, ed] = eDate.split('-').map(Number);
  const [eh, emin] = eTime.split(':').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return null;
  const sUtc = Date.UTC(sy, sm - 1, sd, sh || 0, smin || 0);
  const eUtc = Date.UTC(ey, em - 1, ed, eh || 0, emin || 0);
  const diffMs = eUtc - sUtc;
  if (diffMs <= 0) return null;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
}

// 格式化日期提示文字（例如："9月19日"）
function formatDateSummary(dtStr: string): string {
  if (!dtStr) return '';
  const [datePart] = dtStr.split('T');
  if (!datePart) return '';
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${m}月${d}日`;
}

// 格式化時間（例如："18:00"）
function formatTimeOnly(dtStr: string): string {
  if (!dtStr) return '';
  const [, timePart] = dtStr.split('T');
  return timePart || '';
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get('groupId') || '';

  const [activeTab, setActiveTab] = useState<'sessions' | 'create' | 'members'>('sessions');
  const [sessions, setSessions] = useState<MatchSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<MatchSession | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<{ line_user_id: string; display_name: string; role: string; is_super_admin?: boolean } | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [adminFilter, setAdminFilter] = useState<'all' | 'mine'>('all');

  // 權限判斷：是否為超級管理員
  const isSuperAdminUser = Boolean(userProfile?.is_super_admin || userProfile?.role === 'admin');

  // 權限判斷：是否為該場次之原始主揪團主或超級管理員
  function canManageSession(session: MatchSession | null): boolean {
    if (!session || !userProfile?.line_user_id) return false;
    if (isSuperAdminUser) return true;
    return session.host_user_id === userProfile.line_user_id;
  }

  // 篩選後呈現之場次：一般團主僅能見自己建立之場次；超級管理員可全覽或切換 (徹底排除已刪除場次)
  const displayedSessions = useMemo(() => {
    const nonDeleted = sessions.filter((s) => s.status !== 'deleted');
    if (isSuperAdminUser) {
      if (adminFilter === 'mine' && userProfile?.line_user_id) {
        return nonDeleted.filter((s) => s.host_user_id === userProfile.line_user_id);
      }
      return nonDeleted;
    }
    // 一般團主：嚴格只保留自己建立的場次 (前端雙重防護)
    if (!userProfile?.line_user_id) return [];
    return nonDeleted.filter((s) => s.host_user_id === userProfile.line_user_id);
  }, [sessions, isSuperAdminUser, adminFilter, userProfile?.line_user_id]);

  // 團主申請狀態
  const [application, setApplication] = useState<{
    id?: string;
    status: string;
    reason?: string;
    review_notes?: string;
    created_at?: string;
  } | null>(null);
  const [applyReason, setApplyReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // 緊急廣播與群組推播狀態
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<{ group_id: string; group_name: string }[]>([]);

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
    max_waitlist: 2,
    level_requirement: '初中級 (4~7級)',
    shuttlecock: '勝利比賽球 (綠標)',
    fee: 200,
    seasonal_fee: 180,
    notes: '含空調，請自備球拍與乾淨球鞋',
    is_roster_public: true,
  });

  // 群組固定咖與季打會員狀態
  const [groupMembers, setGroupMembers] = useState<GroupMembership[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isRegularAccordionOpen, setIsRegularAccordionOpen] = useState(true);
  const [prefillRegularIds, setPrefillRegularIds] = useState<string[]>([]);
  
  // 方案 A: 歷史球友下拉快選
  const [historyPlayers, setHistoryPlayers] = useState<{ user_id: string; display_name: string; picture_url?: string; count: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [memberInputMode, setMemberInputMode] = useState<'select' | 'manual'>('select');

  // 固定咖管理彈窗/表單狀態
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberIsRegular, setNewMemberIsRegular] = useState(true);
  const [newMemberHasDiscount, setNewMemberHasDiscount] = useState(false);
  const [newMemberDiscountFee, setNewMemberDiscountFee] = useState<number>(180);
  const [newMemberValidUntil, setNewMemberValidUntil] = useState('');
  const [newMemberNotes, setNewMemberNotes] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

  // 方案 B: 場次名冊 ⭐ 一鍵加入固定咖彈窗狀態
  const [fastRegularPlayer, setFastRegularPlayer] = useState<{ user_id: string; player_name: string } | null>(null);
  const [fastHasDiscount, setFastHasDiscount] = useState(false);
  const [fastDiscountFee, setFastDiscountFee] = useState<number>(180);
  const [isSavingFastRegular, setIsSavingFastRegular] = useState(false);

  // 方案 C: 邀請連結複製狀態
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [autoPushToGroup, setAutoPushToGroup] = useState(false);
  const [liffInstance, setLiffInstance] = useState<any>(null);
  const [shareModalSession, setShareModalSession] = useState<MatchSession | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isSharingTarget, setIsSharingTarget] = useState(false);

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
      max_waitlist: s.max_waitlist !== undefined ? s.max_waitlist : 2,
      level_requirement: s.level_requirement || '初中級 (4~7級)',
      shuttlecock: s.shuttlecock || '勝利比賽球 (綠標)',
      fee: s.fee || 200,
      seasonal_fee: s.seasonal_fee ?? 180,
      notes: s.notes || '含空調，請自備球拍與乾淨球鞋',
      is_roster_public: s.is_roster_public ?? true,
    });

    setCopyNotice(`已成功為您帶入「${s.title}」並自動順延 7 天至下週！報名名單已全新清空。`);
    setActiveTab('create');
    setSelectedSession(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 變更開始時間時，自動將結束時間預設為開始時間 + 2 小時
  function handleStartTimeChange(newStart: string) {
    if (!newStart) {
      setForm((prev) => ({ ...prev, start_time: '' }));
      return;
    }
    const newEnd = addHoursToDatetimeLocal(newStart, 2);
    setForm((prev) => ({
      ...prev,
      start_time: newStart,
      end_time: newEnd,
    }));
  }

  // 場次詳情分頁狀態
  const [detailTab, setDetailTab] = useState<'roster' | 'settings' | 'sharing'>('roster');
  const [editForm, setEditForm] = useState<{
    id: string;
    title: string;
    match_type: string;
    start_time: string;
    end_time: string;
    location: string;
    court_info: string;
    max_players: number;
    max_waitlist: number;
    level_requirement: string;
    shuttlecock: string;
    fee: number;
    notes: string;
    is_roster_public: boolean;
    current_players: number;
  }>({
    id: '',
    title: '',
    match_type: 'double',
    start_time: '',
    end_time: '',
    location: '',
    court_info: '',
    max_players: 8,
    max_waitlist: 2,
    level_requirement: '初中級 (4~7級)',
    shuttlecock: '勝利比賽球 (綠標)',
    fee: 200,
    notes: '',
    is_roster_public: true,
    current_players: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editNotice, setEditNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleEditStartTimeChange(newStart: string) {
    if (!newStart) {
      setEditForm((prev) => ({ ...prev, start_time: '' }));
      return;
    }
    const newEnd = addHoursToDatetimeLocal(newStart, 2);
    setEditForm((prev) => ({
      ...prev,
      start_time: newStart,
      end_time: newEnd,
    }));
  }

  async function handleUpdateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSession) return;

    // 前端防呆：上限不可低於目前已正取人數
    const currentConfirmed = registrations
      .filter((r) => r.status === 'main')
      .reduce((sum, r) => sum + (r.party_size || 1), 0);
    if (editForm.max_players < currentConfirmed) {
      alert(`⚠️ 名額上限錯誤：目前已有 ${currentConfirmed} 位正取球友，上限不可低於 ${currentConfirmed} 人！`);
      return;
    }

    setIsUpdating(true);
    setEditNotice(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '修改場次失敗');
      }

      setEditNotice({ type: 'success', text: '🎉 場次修改成功！資訊已即時更新。' });
      setSelectedSession((prev) => (prev ? { ...prev, ...data } : data));
      await fetchSessions(idToken, userProfile?.line_user_id, true);
      await openSessionDetail({ ...selectedSession, ...data }, true);

      setTimeout(() => {
        setEditNotice(null);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失敗';
      setEditNotice({ type: 'error', text: msg });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleToggleDisableSession(session: MatchSession) {
    if (!canManageSession(session)) {
      alert('您無權變更此場次狀態');
      return;
    }
    const isCurrentlyCancelled = session.status === 'cancelled';
    const actionName = isCurrentlyCancelled ? '重新啟用' : '停用';
    const confirmMsg = isCurrentlyCancelled
      ? `確定要重新開放「${session.title}」場次嗎？\n啟用後球友將可以繼續報名此場次。`
      : `確定要停用「${session.title}」場次嗎？\n停用後球友將無法報名此場次，但現有名單仍會保留。`;

    if (!confirm(confirmMsg)) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: session.id,
          status: isCurrentlyCancelled ? 'open' : 'cancelled',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `${actionName}場次失敗`);
      }

      alert(`✅ 場次已成功${actionName}！`);
      await fetchSessions(idToken, userProfile?.line_user_id, true);
      if (selectedSession && selectedSession.id === session.id) {
        setSelectedSession((prev) => (prev ? { ...prev, status: isCurrentlyCancelled ? 'open' : 'cancelled' } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `${actionName}失敗`);
    }
  }

  async function handleDeleteSession(session: MatchSession) {
    if (!canManageSession(session)) {
      alert('您無權刪除此場次');
      return;
    }
    const confirmMsg = `⚠️ 警告：確定要刪除「${session.title}」場次嗎？\n\n此動作將永久從系統與資料庫中刪除此場次及其所有球友報名與候補記錄，且無法復原！`;
    if (!confirm(confirmMsg)) return;

    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch(`/api/sessions?id=${session.id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '刪除場次失敗');
      }

      alert('🗑️ 場次及其報名記錄已成功刪除！');
      if (selectedSession && selectedSession.id === session.id) {
        setSelectedSession(null);
      }
      await fetchSessions(idToken, userProfile?.line_user_id, true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
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
        setLiffInstance(liff);
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
          await fetchSessions(token, user.line_user_id, false, user);
          // 載入可用羽球群組供開團選取
          try {
            const gRes = await fetch('/api/groups');
            if (gRes.ok) {
              const gList = await gRes.json();
              setAvailableGroups(gList);
              if (!urlGroupId && gList.length > 0) {
                setForm((prev) => ({ ...prev, group_id: prev.group_id || gList[0].group_id }));
              }
            }
          } catch {}
          return;
        } else {
          setAuthError(`您的身分目前是【一般球友】(ID: ${user.line_user_id})，尚未取得團主開團權限。`);
          setIsAuthorized(false);
          // 查詢該球友是否已有團主申請紀錄
          try {
            const appRes = await fetch(`/api/host-applications?userId=${user.line_user_id}`, { headers });
            if (appRes.ok) {
              const appData = await appRes.json();
              if (appData.applications && appData.applications.length > 0) {
                setApplication(appData.applications[0]);
              }
            }
          } catch {}
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

  async function fetchSessions(
    token?: string,
    userId?: string,
    forceRefresh = false,
    currentUserObj?: { line_user_id: string; role: string; is_super_admin?: boolean } | null
  ) {
    setLoadingSessions(true);
    try {
      const activeUser = currentUserObj || userProfile;
      const currentToken = token || idToken;
      const currentUserId = userId || activeUser?.line_user_id;

      const headers: Record<string, string> = {};
      if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
      else if (currentUserId) headers['x-test-user-id'] = currentUserId;
      else headers['x-test-user-id'] = 'host_admin_001';

      const params = new URLSearchParams();
      if (urlGroupId) params.append('groupId', urlGroupId);
      if (forceRefresh) params.append('refresh', 'true');

      // 判斷是否為超級管理員 (同步優先讀取 activeUser，避免 React setState 非同步閉包尚未生效)
      const isSuper = Boolean(activeUser?.is_super_admin || activeUser?.role === 'admin');

      // 若非超級管理員（即一般團主），強制於 API 加入 hostId 限制只查自己開的場次
      // 若為超級管理員，預設載入全站所有場次 (不傳 hostId)
      if (!isSuper && currentUserId) {
        params.append('hostId', currentUserId);
      }

      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/sessions${qs}`, { headers });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function openSessionDetail(session: MatchSession, keepTab = false) {
    if (!canManageSession(session)) {
      alert('⚠️ 權限不足：您只能查看與管理自己建立主持的零打場次。');
      return;
    }
    setSelectedSession(session);
    if (!keepTab) {
      setDetailTab('roster');
    }

    setEditForm({
      id: session.id,
      title: session.title,
      match_type: session.match_type || 'double',
      start_time: toDatetimeLocalString(session.start_time),
      end_time: toDatetimeLocalString(session.end_time),
      location: session.location || '',
      court_info: session.court_info || '',
      max_players: session.max_players || 8,
      max_waitlist: session.max_waitlist !== undefined ? session.max_waitlist : 2,
      level_requirement: session.level_requirement || '初中級 (4~7級)',
      shuttlecock: session.shuttlecock || '勝利比賽球 (綠標)',
      fee: session.fee ?? 200,
      notes: session.notes || '',
      is_roster_public: session.is_roster_public ?? true,
      current_players: session.current_players || 0,
    });
    setEditNotice(null);

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

  // 載入指定群組之固定咖與季打清單
  async function fetchGroupMembers(targetGroupId: string) {
    if (!targetGroupId) {
      setGroupMembers([]);
      setPrefillRegularIds([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/groups/members?groupId=${targetGroupId}`);
      if (res.ok) {
        const list: GroupMembership[] = await res.json();
        setGroupMembers(Array.isArray(list) ? list : []);
        // 開團時預設自動勾選所有 is_regular === true 的固定咖
        const regulars = (list || []).filter((m) => m.is_regular).map((m) => m.user_id);
        setPrefillRegularIds(regulars);
      }
    } catch (e) {
      console.error('載入群組成員異常:', e);
    } finally {
      setLoadingMembers(false);
    }
  }

  // 方案 A: 載入本群歷史報名球友清單
  async function fetchHistoryPlayers(targetGroupId: string) {
    if (!targetGroupId) {
      setHistoryPlayers([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/groups/members?groupId=${targetGroupId}&action=history_players`);
      if (res.ok) {
        const list = await res.json();
        setHistoryPlayers(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('載入歷史球友失敗:', e);
    } finally {
      setLoadingHistory(false);
    }
  }

  // 切換群組時自動載入該群固定咖與歷史球友
  useEffect(() => {
    if (form.group_id) {
      fetchGroupMembers(form.group_id);
      fetchHistoryPlayers(form.group_id);
    }
  }, [form.group_id]);

  // 方案 B: 快速設為固定咖
  async function handleFastSaveRegular() {
    if (!selectedSession?.group_id || !fastRegularPlayer?.user_id) return;
    setIsSavingFastRegular(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/groups/members', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          group_id: selectedSession.group_id,
          user_id: fastRegularPlayer.user_id,
          display_name: fastRegularPlayer.player_name,
          is_regular: true,
          has_seasonal_discount: fastHasDiscount,
          seasonal_fee: fastHasDiscount ? Number(fastDiscountFee) : null,
          notes: '由場次名單一鍵設為固定咖',
        }),
      });

      if (res.ok) {
        alert(`🎉 已成功將「${fastRegularPlayer.player_name}」加入固定咖名單！`);
        setFastRegularPlayer(null);
        if (form.group_id) fetchGroupMembers(form.group_id);
      } else {
        const err = await res.json();
        alert(err.error || '設定失敗');
      }
    } catch (e) {
      alert((e as Error).message || '連線失敗');
    } finally {
      setIsSavingFastRegular(false);
    }
  }

  // 方案 C: 複製固定咖登記邀請連結
  function handleCopyInviteLink() {
    if (!form.group_id) {
      alert('請先選擇群組！');
      return;
    }
    const currentGroup = availableGroups.find((g) => g.group_id === form.group_id);
    const groupNameStr = currentGroup?.group_name || '羽球社團';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/liff/join-regular?groupId=${encodeURIComponent(form.group_id)}&groupName=${encodeURIComponent(groupNameStr)}`;
    
    const text = `🏸 【${groupNameStr}】固定咖專屬登記邀請\n點擊下方專屬連結，自動以 LINE 身分加入本社團固定咖名單，下週開團免搶票自動保留名額！\n👉 ${inviteUrl}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 3000);
    }).catch(() => {
      prompt('請手動複製邀請連結：', text);
    });
  }

  function handleTogglePrefill(userId: string) {
    setPrefillRegularIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!form.group_id || !newMemberUserId.trim()) {
      alert('請先選擇群組並填寫球友 LINE User ID！');
      return;
    }
    setIsSavingMember(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/groups/members', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          group_id: form.group_id,
          user_id: newMemberUserId.trim(),
          is_regular: newMemberIsRegular,
          has_seasonal_discount: newMemberHasDiscount,
          seasonal_fee: newMemberHasDiscount ? Number(newMemberDiscountFee) : null,
          valid_until: newMemberValidUntil || null,
          notes: newMemberNotes.trim() || null,
        }),
      });
      if (res.ok) {
        alert('🎉 成員設定已成功儲存！');
        setNewMemberUserId('');
        setNewMemberNotes('');
        await fetchGroupMembers(form.group_id);
      } else {
        const err = await res.json();
        alert(err.error || '儲存失敗');
      }
    } catch (err: unknown) {
      alert((err as Error).message || '連線錯誤');
    } finally {
      setIsSavingMember(false);
    }
  }

  async function handleDeleteMember(membershipId: string) {
    if (!window.confirm('確定要自固定咖名單中移除此球友嗎？')) return;
    try {
      const headers: Record<string, string> = {};
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch(`/api/groups/members?id=${membershipId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        if (form.group_id) fetchGroupMembers(form.group_id);
      } else {
        const err = await res.json();
        alert(err.error || '刪除失敗');
      }
    } catch (err: unknown) {
      alert((err as Error).message || '刪除失敗');
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
          host_name: userProfile?.display_name,
          notify_group_id: autoPushToGroup && form.group_id ? form.group_id : undefined,
          prefilled_user_ids: prefillRegularIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchSessions(idToken, userProfile?.line_user_id);
        setShareModalSession(data);
        setCopyToast(null);
      } else {
        alert(data.error || '建立失敗');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleApplyHost() {
    if (!userProfile?.line_user_id) return;
    setIsApplying(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else if (userProfile?.line_user_id) headers['x-test-user-id'] = userProfile.line_user_id;

      const res = await fetch('/api/host-applications', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userProfile.line_user_id,
          display_name: userProfile.display_name,
          reason: applyReason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('🎉 團主資格申請已成功送出！請靜待系統最高管理員審核。');
        setApplication({
          status: 'pending',
          reason: applyReason.trim(),
          created_at: new Date().toISOString(),
        });
      } else {
        alert(data.error || '申請送出失敗');
      }
    } catch (e: unknown) {
      alert((e as Error).message || '連線失敗');
    } finally {
      setIsApplying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center text-center space-y-3">
        <RefreshCw size={36} className="animate-spin text-emerald-600 mb-1" />
        <div className="text-sm font-bold text-slate-800">正在讀取資料中，請稍候...</div>
        <p className="text-xs text-slate-400">正在驗證團主身分並同步最新場次資訊</p>
      </main>
    );
  }

  if (isAuthorized === false) {
    const isPending = application?.status === 'pending';
    const isRejected = application?.status === 'rejected';

    return (
      <main className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
        <ShieldAlert size={48} className="text-amber-500 mb-2" />
        <h2 className="text-lg font-bold text-slate-800">尚未開通團主開團權限</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
          {authError || '此頁面僅限開團團主與社團管理員發布場次。'}
        </p>

        {userProfile && (
          <div className="mt-4 p-3.5 bg-white rounded-2xl border border-slate-200 text-left text-xs w-full shadow-sm">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1.5 border-b pb-1.5">
              <Key size={14} className="text-emerald-600" />
              <span>您的 LINE 帳號資料</span>
            </div>
            <div className="text-slate-500 space-y-1 text-[11px]">
              <div>暱稱：<span className="text-slate-800 font-bold">{userProfile.display_name}</span></div>
              <div>身分：<span className="text-amber-600 font-bold">{isPending ? '團主審核中 (pending)' : userProfile.role}</span></div>
              <div className="break-all font-mono text-[10px] text-slate-400 mt-1">
                LINE ID: {userProfile.line_user_id}
              </div>
            </div>
          </div>
        )}

        {/* 審核中狀態提示 */}
        {isPending && (
          <div className="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs w-full shadow-sm text-amber-900 space-y-1 animate-in fade-in">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Clock size={15} />
              <span>⏳ 團主資格審核中</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              您的團主申請已成功送達最高管理員！審核通過後，系統將自動推播 LINE 通知給您，屆時即可直接在此建立零打場次！
            </p>
          </div>
        )}

        {/* 上次被駁回狀態提示 */}
        {isRejected && (
          <div className="mt-3 p-3.5 bg-red-50 rounded-2xl border border-red-200 text-left text-xs w-full shadow-sm text-red-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-red-800">
              <AlertCircle size={15} />
              <span>上次申請未獲通過</span>
            </div>
            <p className="text-[11px] text-red-700 leading-relaxed">
              說明理由：{application?.review_notes || '未符合資格'}
            </p>
            <p className="text-[10px] text-slate-500 pt-1">
              若狀況已修正，您可以更新備註並重新提出申請。
            </p>
          </div>
        )}

        {/* 申請成為團主表單 (未申請或被駁回時可填寫) */}
        {!isPending && (
          <div className="mt-3 p-3.5 bg-white rounded-2xl border border-slate-200 text-left text-xs w-full shadow-sm space-y-2.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <UserPlus size={15} className="text-emerald-600" />
              <span>{isRejected ? '重新申請成為團主' : '申請開通團主權限'}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              若您想在羽球社團中開團招募零打，請點擊下方按鈕提出申請，系統最高管理員將為您審核開通。
            </p>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">
                開團規劃 / 地點時段簡述 (選填)
              </label>
              <input
                type="text"
                placeholder="例：預計每週六晚上在秀朗國小開團雙打"
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyHost}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5"
            >
              <Send size={14} />
              <span>{isApplying ? '送出申請中...' : '📨 申請成為開團團主'}</span>
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={() => checkAdminAuth()}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            🔄 重新整理驗證身分
          </button>
          <Link
            href="/liff"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            ← 返回 JuJu 導航大廳
          </Link>
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
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
        >
          <span>← 返回大廳</span>
        </Link>
        <Link
          href="/host-guide"
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200 shadow-2xs transition-colors"
        >
          <span>📖 團主使用手冊</span>
        </Link>
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
          🏸 場次總覽
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          ➕ 建立新場次
        </button>
        <button
          onClick={() => {
            setActiveTab('members');
            setSelectedSession(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          👥 固定咖管理
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
                    {s.title} ({s.host_name ? `${s.host_name} • ` : ''}{new Date(s.start_time).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short', month: 'numeric', day: 'numeric' })})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>發布推播目標群組</span>
              {form.group_id ? (
                <span className="text-[11px] text-emerald-600 font-medium">✓ 開團後將自動發送卡片至該群</span>
              ) : (
                <span className="text-[11px] text-amber-600 font-medium">⚠️ 尚未選擇目標群組</span>
              )}
            </label>
            <select
              value={form.group_id}
              onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 mt-1 bg-white font-medium text-slate-700 outline-none focus:border-emerald-500"
            >
              {availableGroups.length > 0 ? (
                <>
                  {availableGroups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      🏸 {g.group_name || '羽球社團群組'}
                    </option>
                  ))}
                  <option value="">🚫 僅建立場次（不推播至任何群組）</option>
                </>
              ) : (
                <option value="">尚無可用群組 (僅建立場次)</option>
              )}
            </select>
          </div>

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

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">型式</label>
              <select
                value={form.match_type}
                onChange={(e) => setForm({ ...form, match_type: e.target.value })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white"
              >
                <option value="double">雙打</option>
                <option value="single">單打</option>
                <option value="any">不限</option>
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
            <div>
              <label className="text-xs font-semibold text-slate-600">季打優惠 ($)</label>
              <input
                type="number"
                placeholder="選填"
                value={form.seasonal_fee}
                onChange={(e) => setForm({ ...form, seasonal_fee: Number(e.target.value) })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none text-emerald-700 font-bold"
              />
            </div>
          </div>

          {/* 日期與時間設定 (含星期幾與自動預設2小時) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 開始時間 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    開始時間
                  </label>
                  {form.start_time && getWeekdayString(form.start_time) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                      📅 {getWeekdayString(form.start_time)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">請選日期時間</span>
                  )}
                </div>
                <input
                  type="datetime-local"
                  required
                  value={form.start_time}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 結束時間 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    結束時間
                  </label>
                  {form.end_time && getWeekdayString(form.end_time) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
                      📅 {getWeekdayString(form.end_time)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">預設+2小時</span>
                  )}
                </div>
                <input
                  type="datetime-local"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 快速時長選擇按鈕 */}
            {form.start_time && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 flex-wrap gap-2">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <span>⚡ 快捷時長：</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { hours: 2, label: '2 小時 (預設)' },
                    { hours: 2.5, label: '2.5 小時' },
                    { hours: 3, label: '3 小時' },
                    { hours: 4, label: '4 小時' },
                  ].map(({ hours, label }) => {
                    const currentDuration = calculateDurationHours(form.start_time, form.end_time);
                    const isSelected = currentDuration === hours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            end_time: addHoursToDatetimeLocal(prev.start_time, hours),
                          }))
                        }
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm scale-105'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 場次時段預覽條 */}
            {form.start_time && form.end_time && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-blue-950">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏸</span>
                  <div>
                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                      <span>{formatDateSummary(form.start_time)}</span>
                      <span className="bg-blue-600 text-white text-[11px] px-1.5 py-0.2 rounded font-medium">
                        {getWeekdayString(form.start_time)}
                      </span>
                      <span>
                        {formatTimeOnly(form.start_time)} ~ {formatTimeOnly(form.end_time)}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-700 mt-0.5">
                      時長：{calculateDurationHours(form.start_time, form.end_time) ?? 2} 小時
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-blue-600 font-semibold bg-white/90 border border-blue-200 px-2 py-0.5 rounded shadow-sm">
                  選定開始自動填入+2h
                </span>
              </div>
            )}
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
              <select
                value={form.max_players}
                onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 31 }, (_, i) => i + 2).map((num) => (
                  <option key={num} value={num}>
                    {num} 人 {num === 8 ? '(預設)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">備取上限人數</label>
              <select
                value={form.max_waitlist}
                onChange={(e) => setForm({ ...form, max_waitlist: Number(e.target.value) })}
                className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 11 }, (_, i) => i).map((num) => (
                  <option key={num} value={num}>
                    {num === 0 ? '0 人 (不開放備取)' : `${num} 人 ${num === 2 ? '(預設)' : ''}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 🌟 預載固定咖折疊面板 (方便開團直接帶入固定球友) */}
          {form.group_id && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsRegularAccordionOpen(!isRegularAccordionOpen)}
                className="w-full p-3 flex items-center justify-between text-left bg-emerald-100/60 hover:bg-emerald-100/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-emerald-950">
                    預載本群固定咖 ({prefillRegularIds.length}/{groupMembers.filter((m) => m.is_regular).length} 位)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-emerald-800 font-bold border border-emerald-300">
                    開放零打：{Math.max(0, form.max_players - prefillRegularIds.length)} 名
                  </span>
                </div>
                {isRegularAccordionOpen ? (
                  <ChevronUp size={15} className="text-emerald-700" />
                ) : (
                  <ChevronDown size={15} className="text-emerald-700" />
                )}
              </button>

              {isRegularAccordionOpen && (
                <div className="p-3 space-y-2 text-xs">
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                    💡 開團將直接把勾選的固定球友列為<strong>正取</strong>（不必每週手動報名），若當週有人請假請直接取消打勾：
                  </p>
                  {loadingMembers ? (
                    <div className="text-slate-400 py-2 flex items-center gap-1.5 text-xs">
                      <RefreshCw size={12} className="animate-spin text-emerald-600" />
                      <span>載入固定咖名單中...</span>
                    </div>
                  ) : groupMembers.filter((m) => m.is_regular).length === 0 ? (
                    <div className="text-slate-500 py-2 text-[11px]">
                      此群組尚未設定固定咖名單，可點選上方「👥 固定咖管理」快速加入常客球友！
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {groupMembers
                        .filter((m) => m.is_regular)
                        .map((m) => {
                          const isChecked = prefillRegularIds.includes(m.user_id);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-white border-emerald-400 shadow-2xs text-emerald-950'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePrefill(m.user_id)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                                />
                                <span className="font-bold truncate text-xs">
                                  {m.user?.display_name || '固定球友'}
                                </span>
                              </div>
                              {m.has_seasonal_discount ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                                  季打 ${m.seasonal_fee || form.seasonal_fee || form.fee}
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                                  原價 ${form.fee}
                                </span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* 名單公開度設定 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>報名名單公開度</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {form.is_roster_public ? '🌐 球友可見報名暱稱' : '🔒 僅主揪可見報名名冊'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  form.is_roster_public
                    ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="roster_visibility_create"
                  checked={form.is_roster_public}
                  onChange={() => setForm({ ...form, is_roster_public: true })}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <span>🌐 公開名單</span>
                    <span className="text-[10px] px-1 py-0.2 bg-blue-100 text-blue-700 rounded font-semibold">預設</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    球友報名時可查看名單暱稱與同行人數
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  !form.is_roster_public
                    ? 'bg-amber-50/80 border-amber-400 text-amber-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="roster_visibility_create"
                  checked={!form.is_roster_public}
                  onChange={() => setForm({ ...form, is_roster_public: false })}
                  className="mt-0.5 text-amber-600"
                />
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <span>🔒 私密名單</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    隱藏名單，球友僅能看到報名總人數
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 群組推播設定 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPushToGroup}
                onChange={(e) => setAutoPushToGroup(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>由 Bot 自動推播至群組（選用）</span>
            </label>
            <p className="text-[11px] text-slate-400 pl-5 leading-tight">
              ⚠️ 注意：Bot 主動推播會消耗每月 200 則免費額度 (群組人數 × 1 則)。建議建立後使用「分享卡片」或「複製連結」自貼群組，完全免扣額度！
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all mt-2"
          >
            建立零打場次並取得分享卡片
          </button>
        </form>
      )}

      {/* 👥 Tab: 固定咖與季打球友管理 */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                  <Star size={17} className="text-amber-500 fill-amber-500" />
                  <span>群組固定咖與季打球友管理</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  設定固定咖後，開團時可一鍵預載正取名額，免去每週搶票困擾
                </p>
              </div>
            </div>

            {/* 選擇群組 */}
            <div>
              <label className="text-xs font-semibold text-slate-700">選擇管理群組</label>
              <select
                value={form.group_id}
                onChange={(e) => {
                  setForm({ ...form, group_id: e.target.value });
                }}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 mt-1 bg-white font-medium text-slate-700 outline-none focus:border-emerald-500"
              >
                {availableGroups.length > 0 ? (
                  availableGroups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      🏸 {g.group_name || '羽球社團群組'}
                    </option>
                  ))
                ) : (
                  <option value="">尚無可用群組</option>
                )}
              </select>
            </div>

            {/* 方案 C: 邀請連結產生與複製專區 */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <Share2 size={13} className="text-emerald-700" />
                  <span>方案 C: 固定咖自主登記專屬邀請連結</span>
                </div>
                {copiedInvite && (
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                    ✓ 已複製邀請文案！
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                將專屬連結發送到 LINE 大群，球友點開後會自動透過 LIFF 讀取其身分一鍵登記為固定咖，<strong>團主與球友皆免查、免填 LINE ID！</strong>
              </p>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Copy size={12} />
                <span>複製專屬登記邀請連結與文案</span>
              </button>
            </div>

            {/* 新增 / 設定固定咖表單 (支援方案 A: 歷史球友下拉快選) */}
            <form onSubmit={handleSaveMember} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <UserPlus size={14} className="text-emerald-600" />
                  <span>新增或設定群組固定咖</span>
                </div>
                {/* 切換手動填寫 / 歷史選單 */}
                <button
                  type="button"
                  onClick={() => {
                    setMemberInputMode(memberInputMode === 'select' ? 'manual' : 'select');
                    setNewMemberUserId('');
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  {memberInputMode === 'select' ? '✍️ 手動輸入 LINE ID' : '📋 切換為歷史球友選單'}
                </button>
              </div>

              {/* 方案 A: 歷史球友下拉快選 */}
              {memberInputMode === 'select' ? (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600 font-bold">
                      方案 A: 選擇歷史報名球友 ({historyPlayers.length} 位)
                    </label>
                    {loadingHistory && <span className="text-[10px] text-slate-400">載入中...</span>}
                  </div>
                  <select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 mt-1 bg-white outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- 請選擇球友 (依歷史出席次數排序) --</option>
                    {historyPlayers.map((p) => {
                      const isAlreadyRegular = groupMembers.some((m) => m.user_id === p.user_id && m.is_regular);
                      return (
                        <option key={p.user_id} value={p.user_id}>
                          {p.display_name} {p.count > 0 ? `(累計出席 ${p.count} 次)` : ''} {isAlreadyRegular ? '★ 已是固定咖' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {historyPlayers.length === 0 && !loadingHistory && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      本社團尚無歷史報名球友，可切換為「手動輸入」或使用下方「方案 C 邀請連結」。
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">球友 LINE User ID (以 U 開頭 33 碼字串)</label>
                  <input
                    type="text"
                    required
                    placeholder="例: U1234567890abcdef1234567890abcdef"
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2 mt-1 bg-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer p-2 bg-white rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newMemberIsRegular}
                    onChange={(e) => setNewMemberIsRegular(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-bold text-slate-700 text-xs">設為固定咖 (開團預載)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer p-2 bg-white rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={newMemberHasDiscount}
                    onChange={(e) => setNewMemberHasDiscount(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span className="font-bold text-slate-700 text-xs">啟用季打單場優惠價</span>
                </label>
              </div>
              {newMemberHasDiscount && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">季打每場優惠價 ($)</label>
                    <input
                      type="number"
                      value={newMemberDiscountFee}
                      onChange={(e) => setNewMemberDiscountFee(Number(e.target.value))}
                      className="w-full text-xs border rounded-lg p-2 mt-1 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">季打效期至 (選填)</label>
                    <input
                      type="date"
                      value={newMemberValidUntil}
                      onChange={(e) => setNewMemberValidUntil(e.target.value)}
                      className="w-full text-xs border rounded-lg p-2 mt-1 bg-white outline-none"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] text-slate-500">備忘註記 (如: 已繳 2026 Q3 季費)</label>
                <input
                  type="text"
                  placeholder="選填，僅團主可見"
                  value={newMemberNotes}
                  onChange={(e) => setNewMemberNotes(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2 mt-1 bg-white outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingMember || !newMemberUserId.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
              >
                {isSavingMember ? '儲存中...' : '確認儲存固定咖身分'}
              </button>
            </form>

            {/* 本群固定咖清單 */}
            <div className="space-y-2 pt-2">
              <h3 className="font-bold text-xs text-slate-600 flex items-center justify-between">
                <span>目前群組固定咖清單 ({groupMembers.length} 人)</span>
                <button
                  type="button"
                  onClick={() => form.group_id && fetchGroupMembers(form.group_id)}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <RefreshCw size={11} className={loadingMembers ? 'animate-spin' : ''} />
                  <span>刷新</span>
                </button>
              </h3>

              {loadingMembers ? (
                <div className="text-center py-6 text-slate-400 text-xs">讀取中...</div>
              ) : groupMembers.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  尚無固定咖球友，可在上方表單輸入球友 LINE ID 進行設定
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
                  {groupMembers.map((m, idx) => (
                    <div key={m.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            {idx + 1}. {m.user?.display_name || '固定球友'}
                          </span>
                          {m.is_regular && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                              固定咖
                            </span>
                          )}
                          {m.has_seasonal_discount && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                              季打 ${m.seasonal_fee || 180}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 space-x-2">
                          <span>ID: {m.user_id.slice(0, 10)}...</span>
                          {m.valid_until && <span>效期至: {m.valid_until}</span>}
                          {m.notes && <span className="text-slate-500">({m.notes})</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m.id)}
                        className="text-[11px] text-red-500 hover:text-red-700 underline px-1"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && !selectedSession && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {urlGroupId
                    ? '本群場次總覽'
                    : isSuperAdminUser
                    ? '全站零打場次總覽'
                    : '我建立的零打場次'}
                </h2>
                {isSuperAdminUser && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                    🛡️ 管理員全覽
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isSuperAdminUser
                  ? '超級管理員可檢視並管理全站所有團主建立之場次'
                  : '僅顯示您所建立主持之零打場次'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isSuperAdminUser && (
                <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAdminFilter('all')}
                    className={`px-2 py-0.5 rounded-md transition ${adminFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    全部 ({sessions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminFilter('mine')}
                    className={`px-2 py-0.5 rounded-md transition ${adminFilter === 'mine' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    我開的 ({sessions.filter((s) => s.host_user_id === userProfile?.line_user_id).length})
                  </button>
                </div>
              )}
              <button
                onClick={() => fetchSessions(idToken, userProfile?.line_user_id, true)}
                className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all p-1 rounded"
                title="強制重新整理 (繞過快取)"
              >
                <RefreshCw size={14} className={loadingSessions ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loadingSessions ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-xs space-y-2.5 p-6 shadow-sm">
              <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-slate-800">正在讀取資料中，請稍候...</div>
              <div className="text-slate-400 text-[11px]">正在連線伺服器，即時同步您的開團名單</div>
            </div>
          ) : displayedSessions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border text-xs text-slate-500 space-y-2.5">
              <div className="text-slate-400">
                {isSuperAdminUser
                  ? '目前無符合條件之零打場次'
                  : '您目前尚未建立任何零打場次'}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow-sm inline-flex items-center gap-1"
              >
                <PlusCircle size={14} />
                <span>立即建立新零打場次</span>
              </button>
            </div>
          ) : (
            displayedSessions.map((s) => {
              const isFull = (s.current_players || 0) >= s.max_players;
              return (
                <div
                  key={s.id}
                  onClick={() => openSessionDetail(s)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-all cursor-pointer relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{s.title}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        👤 主揪：{s.host_name || '球團團主'}
                      </span>
                      {userProfile?.line_user_id && s.host_user_id === userProfile.line_user_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold border border-blue-200">
                          我開的團
                        </span>
                      )}
                      {s.status === 'cancelled' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold border border-red-200">
                          🚫 已停用
                        </span>
                      )}
                      {s.is_roster_public === false ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                          🔒 私密名單
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          🌐 公開名單
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        s.status === 'cancelled'
                          ? 'bg-slate-200 text-slate-600'
                          : isFull
                          ? 'bg-emerald-800 text-emerald-100'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.status === 'cancelled'
                        ? '已停用'
                        : isFull
                        ? `已額滿 (${s.current_players}/${s.max_players})`
                        : `招募中 (${s.current_players}/${s.max_players})`}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} />
                      <span>{new Date(s.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      <span>{s.location}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareModalSession(s);
                          setCopyToast(null);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-bold flex items-center gap-1 active:scale-95 transition-all text-xs"
                        title="分享卡片或複製報名連結至群組 (0 額度消耗)"
                      >
                        <Share2 size={12} className="text-blue-600" />
                        <span>分享 / 複製</span>
                      </button>
                    </div>
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                      進入管理 →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedSession && (
        <div className="space-y-4">
          {/* 頂部操作列 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={() => setSelectedSession(null)}
              className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
            >
              ← 返回場次總覽
            </button>
            <div className="flex items-center gap-1.5 flex-wrap">
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
          </div>

          {/* 場次資訊摘要卡片 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="font-bold text-slate-800 text-base">{selectedSession.title}</h2>
                {selectedSession.status === 'cancelled' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold">
                    🚫 已停用/已取消
                  </span>
                )}
                {selectedSession.is_roster_public === false ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                    🔒 私密名單
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                    🌐 公開名單
                  </span>
                )}
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shrink-0">
                👤 主揪：{selectedSession.host_name || '球團團主'}
              </span>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 mt-1">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400 shrink-0" />
                <span>
                  {new Date(selectedSession.start_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} ~ {new Date(selectedSession.end_time).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span>{selectedSession.location} {selectedSession.court_info ? `(${selectedSession.court_info})` : ''}</span>
              </div>
            </div>

            {selectedSession.status === 'cancelled' && (
              <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <Ban size={15} className="text-red-600 shrink-0" />
                <span className="font-medium">此場次目前為「已停用/已取消」狀態，球友無法進行報名。點擊切換至「⚙️ 場次設定」即可重新啟用。</span>
              </div>
            )}

            {/* 3個 Segmented Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl mt-3.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDetailTab('roster')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  detailTab === 'roster'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} className={detailTab === 'roster' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>名單對帳 ({registrations.filter((r) => r.status === 'main').reduce((sum, r) => sum + (r.party_size || 1), 0)}/{selectedSession.max_players})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('settings')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  detailTab === 'settings'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings size={14} className={detailTab === 'settings' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>場次設定</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('sharing')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  detailTab === 'sharing'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 size={14} className={detailTab === 'sharing' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>分享與通知</span>
              </button>
            </div>
          </div>

          {/* Tab 1: 👥 球友名冊與對帳 */}
          {detailTab === 'roster' && (
            <div className="space-y-3">
              {/* 手動替球友代報名 (+1) */}
              <form onSubmit={handleProxyRegister} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <PlusCircle size={13} className="text-blue-600" /> 手動替球友代報名 (+1)
                </label>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    required
                    placeholder="球友稱呼 / 朋友名稱"
                    value={proxyName}
                    onChange={(e) => setProxyName(e.target.value)}
                    className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500"
                  />
                  <select
                    value={proxySize}
                    onChange={(e) => setProxySize(Number(e.target.value))}
                    className="text-xs border rounded-lg px-2 bg-white outline-none"
                  >
                    <option value={1}>1人</option>
                    <option value={2}>2人</option>
                    <option value={3}>3人</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shrink-0 hover:bg-blue-700 active:scale-95 transition-all shadow-xs"
                  >
                    代報名
                  </button>
                </div>
              </form>

              {/* 球友名冊清單 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-xs text-slate-500 uppercase">報名球友清單與收款對帳</h3>

                {registrations.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">目前尚無球友報名</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {registrations.map((r, idx) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-700">
                              {r.status === 'main' ? `${idx + 1}.` : `[備${r.waitlist_order}]`} {r.player_name}
                            </span>
                            {r.is_regular && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                固定咖
                              </span>
                            )}
                            {r.applicable_fee && r.applicable_fee < selectedSession.fee && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                季打優惠
                              </span>
                            )}
                            {r.party_size > 1 && (
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                +{r.party_size}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>
                              應付: ${(r.applicable_fee ?? selectedSession.fee) * (r.party_size || 1)}
                            </span>
                            {r.applicable_fee && r.applicable_fee !== selectedSession.fee && (
                              <span className="line-through text-slate-300">
                                (${selectedSession.fee * (r.party_size || 1)})
                              </span>
                            )}
                          </div>
                        </div>

                          <div className="flex items-center gap-1.5">
                            {/* 方案 B: 場次名單一鍵設為固定咖 (排除已是固定咖或代報名) */}
                            {selectedSession.group_id && !r.is_regular && !r.user_id.startsWith('proxy_') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFastRegularPlayer({ user_id: r.user_id, player_name: r.player_name });
                                  setFastHasDiscount(false);
                                  setFastDiscountFee(selectedSession.seasonal_fee || 180);
                                }}
                                className="text-[11px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold flex items-center gap-0.5 transition shadow-2xs"
                                title="將此球友加入本社團固定咖名單"
                              >
                                <Star size={11} className="text-amber-600 fill-amber-500" />
                                <span>設為固定咖</span>
                              </button>
                            )}

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

                {/* 方案 B: 快速設為固定咖確認彈窗 */}
                {fastRegularPlayer && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                          <Star size={16} className="text-amber-500 fill-amber-500" />
                          <span>設為本社團固定咖</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFastRegularPlayer(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="text-[11px] text-amber-800">目標球友：</div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5">{fastRegularPlayer.player_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {fastRegularPlayer.user_id}</div>
                        </div>

                        <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fastHasDiscount}
                            onChange={(e) => setFastHasDiscount(e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-bold text-slate-700">同步享有季打單場優惠價</span>
                        </label>

                        {fastHasDiscount && (
                          <div>
                            <label className="text-[11px] text-slate-500 font-medium">季打每場優惠收費 ($)</label>
                            <input
                              type="number"
                              value={fastDiscountFee}
                              onChange={(e) => setFastDiscountFee(Number(e.target.value))}
                              className="w-full text-xs border rounded-lg p-2 mt-1 bg-white outline-none focus:border-amber-500 font-bold"
                            />
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          加入固定咖後，下次開團系統將自動預載此球友為正取名額，無需每週搶票！
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setFastRegularPlayer(null)}
                          className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          disabled={isSavingFastRegular}
                          onClick={handleFastSaveRegular}
                          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition"
                        >
                          {isSavingFastRegular ? '儲存中...' : '確認加入固定咖'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          )}

          {/* Tab 2: ⚙️ 場次設定與修改 */}
          {detailTab === 'settings' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {editNotice && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    editNotice.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editNotice.text}</span>
                </div>
              )}

              {new Date(selectedSession.start_time).getTime() <= Date.now() && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <span>此場次時間已結束，基本資訊僅供檢視。</span>
                </div>
              )}

              <form onSubmit={handleUpdateSession} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700">場次標題</label>
                  <input
                    type="text"
                    required
                    disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">型式</label>
                    <select
                      disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                      value={editForm.match_type}
                      onChange={(e) => setEditForm({ ...editForm, match_type: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white focus:border-blue-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="double">雙打</option>
                      <option value="single">單打</option>
                      <option value="any">不限</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">每人費用 ($)</label>
                    <input
                      type="number"
                      disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                      value={editForm.fee}
                      onChange={(e) => setEditForm({ ...editForm, fee: Number(e.target.value) })}
                      className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* 日期與時間設定 (含星期幾與自動預設2小時) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          開始時間
                        </label>
                        {editForm.start_time && getWeekdayString(editForm.start_time) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            📅 {getWeekdayString(editForm.start_time)}
                          </span>
                        )}
                      </div>
                      <input
                        type="datetime-local"
                        required
                        disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                        value={editForm.start_time}
                        onChange={(e) => handleEditStartTimeChange(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          結束時間
                        </label>
                        {editForm.end_time && getWeekdayString(editForm.end_time) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            📅 {getWeekdayString(editForm.end_time)}
                          </span>
                        )}
                      </div>
                      <input
                        type="datetime-local"
                        required
                        disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                        value={editForm.end_time}
                        onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* 快捷時長按鈕 */}
                  {editForm.start_time && new Date(selectedSession.start_time).getTime() > Date.now() && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/70">
                      <span className="text-[11px] text-slate-500 font-medium">快捷時長：</span>
                      {[2, 2.5, 3, 4].map((h) => {
                        const currentDuration = calculateDurationHours(editForm.start_time, editForm.end_time);
                        const isSelected = currentDuration === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() =>
                              setEditForm((prev: any) => ({
                                ...prev,
                                end_time: addHoursToDatetimeLocal(prev.start_time, h),
                              }))
                            }
                            className={`px-2 py-0.5 text-xs rounded-md font-bold transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            +{h}h
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">地點與球場資訊</label>
                  <input
                    type="text"
                    required
                    disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">場地編號/面數備註 (選填)</label>
                  <input
                    type="text"
                    placeholder="例: 第3、4面場地"
                    disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                    value={editForm.court_info}
                    onChange={(e) => setEditForm({ ...editForm, court_info: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">正取上限人數</label>
                      {editForm.current_players > 0 && (
                        <span className="text-[10px] text-blue-600 font-bold">
                          (已報{editForm.current_players}人)
                        </span>
                      )}
                    </div>
                    <select
                      disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                      value={editForm.max_players}
                      onChange={(e) => setEditForm({ ...editForm, max_players: Number(e.target.value) })}
                      className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {Array.from(
                        { length: Math.max(32, editForm.max_players || 8, editForm.current_players || 0) - 1 },
                        (_, i) => i + 2
                      ).map((num) => (
                        <option
                          key={num}
                          value={num}
                          disabled={num < editForm.current_players}
                        >
                          {num} 人 {num < editForm.current_players ? '(低於已報人數)' : num === 8 ? '(推薦)' : ''}
                        </option>
                      ))}
                    </select>
                    {editForm.current_players > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        不可低於已正取 ({editForm.current_players}人)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">備取上限人數</label>
                    <select
                      disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                      value={editForm.max_waitlist}
                      onChange={(e) => setEditForm({ ...editForm, max_waitlist: Number(e.target.value) })}
                      className="w-full text-xs border rounded-lg p-2.5 mt-1 bg-white outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {Array.from(
                        { length: Math.max(10, editForm.max_waitlist || 2) + 1 },
                        (_, i) => i
                      ).map((num) => (
                        <option key={num} value={num}>
                          {num === 0 ? '0 人 (不開放備取)' : `${num} 人 ${num === 2 ? '(預設)' : ''}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">建議程度</label>
                    <input
                      type="text"
                      disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                      value={editForm.level_requirement}
                      onChange={(e) => setEditForm({ ...editForm, level_requirement: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">使用球種</label>
                    <input
                      type="text"
                      disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                      value={editForm.shuttlecock}
                      onChange={(e) => setEditForm({ ...editForm, shuttlecock: e.target.value })}
                      className="w-full text-xs border rounded-lg p-2.5 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">注意事項與備註</label>
                  <textarea
                    rows={2}
                    disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full text-xs border rounded-lg p-2 mt-1 outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                {/* 名單公開度設定 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>報名名單公開度</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {editForm.is_roster_public ? '🌐 球友可見報名暱稱' : '🔒 僅主揪可見報名名冊'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        editForm.is_roster_public
                          ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                        name="roster_visibility_edit"
                        checked={editForm.is_roster_public}
                        onChange={() => setEditForm({ ...editForm, is_roster_public: true })}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>🌐 公開名單</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          球友報名時可查看名單暱稱
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        !editForm.is_roster_public
                          ? 'bg-amber-50/80 border-amber-400 text-amber-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        disabled={new Date(selectedSession.start_time).getTime() <= Date.now()}
                        name="roster_visibility_edit"
                        checked={!editForm.is_roster_public}
                        onChange={() => setEditForm({ ...editForm, is_roster_public: false })}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span>🔒 私密名單</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          隱藏名單，球友僅見總人數
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {new Date(selectedSession.start_time).getTime() > Date.now() && (
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>儲存修改中...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        <span>💾 儲存場次修改</span>
                      </>
                    )}
                  </button>
                )}
              </form>

              {/* 危險操作與狀態維護區 */}
              {canManageSession(selectedSession) && (
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-red-600" />
                    <span>場次狀態與危險操作</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    停用場次可隨時恢復；刪除場次將永久移除此場次及名冊，請謹慎操作。
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {new Date(selectedSession.start_time).getTime() > Date.now() && (
                      <button
                        type="button"
                        onClick={() => handleToggleDisableSession(selectedSession)}
                        className={`flex-1 py-2 px-3 border rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all shadow-xs ${
                          selectedSession.status === 'cancelled'
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {selectedSession.status === 'cancelled' ? (
                          <>
                            <CheckCircle size={14} className="text-emerald-600" />
                            <span>重新啟用場次</span>
                          </>
                        ) : (
                          <>
                            <Ban size={14} className="text-amber-600" />
                            <span>停用此場次 (暫停報名)</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(selectedSession)}
                      className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all shadow-xs"
                    >
                      <Trash2 size={14} className="text-red-600" />
                      <span>永久刪除場次</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: 📢 分享與通知 */}
          {detailTab === 'sharing' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {/* 團主分享卡片 (0 額度消耗) */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Share2 size={14} className="text-blue-600" />
                  <span>📲 免額度社群分享卡片 / 專屬連結</span>
                </div>
                <p className="text-[11px] text-blue-800/80 leading-relaxed">
                  透過 LINE 原生分享器以個人名義在群組送出互動 Flex 卡片，或複製專屬報名連結與排版文案貼至群組，100% 不消耗機器人每月 200 則推播額度！
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShareModalSession(selectedSession);
                    setCopyToast(null);
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition shadow-xs"
                >
                  <Share2 size={13} />
                  <span>開啟分享卡片 / 複製專屬報名連結</span>
                </button>
              </div>

              {/* 向本場所有報名球友發送緊急通知 */}
              <div className="pt-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Send size={13} className="text-emerald-600" />
                  <span>向本場所有報名球友發送緊急通知 (1對1私訊)</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  若遇更換場地、停打或颱風取消，可在此輸入訊息直接私訊給正取與備取球友。
                </p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="例：更換為第4號場地，請大家直接到4號集合！"
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || !broadcastMsg.trim()}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 shrink-0 hover:bg-emerald-700 active:scale-95 transition shadow-xs"
                  >
                    {isBroadcasting ? '發送中...' : '推播'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📤 場次分享與快速複製彈窗 (Share Modal) */}
      {shareModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShareModalSession(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="text-center pt-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 text-2xl shadow-inner">
                🏸
              </div>
              <h3 className="font-black text-slate-800 text-lg">開團成功！分享至群組</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                透過以下免額度方式分享，球友點擊即可立即報名
              </p>
            </div>

            {/* 場次資訊摘要 */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800 text-sm truncate">
                {shareModalSession.title}
              </div>
              <div className="text-slate-500 flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400 shrink-0" />
                <span>
                  {new Date(shareModalSession.start_time).toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
              </div>
              <div className="text-slate-500 flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{shareModalSession.location}</span>
              </div>
            </div>

            {/* 複製成功提示 */}
            {copyToast && (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle size={15} className="shrink-0" />
                <span>{copyToast}</span>
              </div>
            )}

            {/* 3 大核心動作按鈕 */}
            <div className="space-y-2 pt-1">
              {/* 按鈕 1: 原生 LINE 卡片分享 */}
              <button
                type="button"
                disabled={isSharingTarget}
                onClick={async () => {
                  setIsSharingTarget(true);
                  const result = await shareSessionViaTargetPicker(liffInstance, shareModalSession);
                  setIsSharingTarget(false);
                  if (result.ok) {
                    setCopyToast('🎉 卡片已送至群組！(0 Bot 額度消耗)');
                    setTimeout(() => {
                      setShareModalSession(null);
                      setActiveTab('sessions');
                    }, 2000);
                  } else if (result.message && !result.message.includes('取消')) {
                    alert(result.message);
                  }
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-2xl shadow-md flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
                    📲
                  </div>
                  <div>
                    <div className="text-xs font-bold">分享 Flex 報名卡片</div>
                    <div className="text-[10px] text-emerald-100">原生互動卡片 • 0 額度消耗</div>
                  </div>
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md shrink-0">
                  {isSharingTarget ? '開啟中...' : '傳送 →'}
                </span>
              </button>

              {/* 按鈕 2: 複製報名連結 */}
              <button
                type="button"
                onClick={() => {
                  const url = getSessionLiffUrl(shareModalSession);
                  navigator.clipboard.writeText(url);
                  setCopyToast('✓ 已複製報名連結！可直接貼在 LINE 群組');
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 font-bold rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Copy size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold">複製報名連結 (URL)</div>
                    <div className="text-[10px] text-slate-400">貼入群組會自帶網頁卡片預覽</div>
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md shrink-0">複製</span>
              </button>

              {/* 按鈕 3: 複製開團文案 */}
              <button
                type="button"
                onClick={() => {
                  const text = formatSessionAnnouncement(shareModalSession);
                  navigator.clipboard.writeText(text);
                  setCopyToast('✓ 已複製完整揪團文案！至群組長按貼上即可');
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 font-bold rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold">複製完整揪團排版文案</div>
                    <div className="text-[10px] text-slate-400">時間、地點、費用與報名連結全包</div>
                  </div>
                </div>
                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md shrink-0">複製</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShareModalSession(null);
                setActiveTab('sessions');
              }}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              完成，返回場次列表
            </button>
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
