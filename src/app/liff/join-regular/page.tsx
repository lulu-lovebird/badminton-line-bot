'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Users, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { initLiff } from '@/lib/liff-client';

function JoinRegularContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId')?.trim() || '';
  const groupNameParam = searchParams.get('groupName')?.trim() || '';

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ userId: string; displayName: string; pictureUrl?: string } | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'already' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [groupName, setGroupName] = useState<string>(groupNameParam || '羽球社團');

  useEffect(() => {
    document.title = '🏸 登記加入羽球團固定咖';
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
            pictureUrl: profile.pictureUrl,
          });
        } else {
          // 本地開發模擬測試
          setUserProfile({
            userId: 'U_demo_regular_user',
            displayName: '測試球友',
            pictureUrl: '',
          });
        }
      } catch (err) {
        console.error('LIFF 初始化失敗:', err);
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, []);

  // 檢查是否已是固定咖
  useEffect(() => {
    if (!groupId || !userProfile?.userId) return;
    async function checkMembership() {
      try {
        const res = await fetch(`/api/groups/members?groupId=${groupId}&regularOnly=true`);
        if (res.ok) {
          const members = await res.json();
          if (Array.isArray(members)) {
            const found = members.find((m: any) => m.user_id === userProfile?.userId);
            if (found) {
              setStatus('already');
            }
          }
        }
      } catch (e) {
        console.error('檢查固定咖狀態失敗:', e);
      }
    }
    checkMembership();
  }, [groupId, userProfile]);

  const handleRegister = async () => {
    if (!groupId || !userProfile?.userId) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      else headers['x-test-user-id'] = userProfile.userId;

      const res = await fetch('/api/groups/members', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          group_id: groupId,
          user_id: userProfile.userId,
          display_name: userProfile.displayName,
          picture_url: userProfile.pictureUrl,
          is_regular: true,
        }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || '登記失敗，請洽團主');
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg((err as Error).message || '連線錯誤');
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!groupId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">無效的登記連結</h2>
          <p className="text-sm text-slate-500">
            缺少群組識別碼 (groupId)，請向團主取得正確的固定咖登記專屬連結。
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
          <span>驗證身分中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 max-w-md mx-auto">
      <div className="space-y-5 pt-4">
        {/* 社團識別 Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-sm space-y-2 text-center">
          <div className="inline-flex p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs mb-1">
            <Users className="w-7 h-7 text-emerald-100" />
          </div>
          <h1 className="text-lg font-black tracking-tight">{groupName}</h1>
          <p className="text-xs text-emerald-100 font-medium">羽球零打團・固定咖專屬登記</p>
        </div>

        {/* 球友個人卡片 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">登記球友身分</div>
          <div className="flex items-center gap-3">
            {userProfile?.pictureUrl ? (
              <img
                src={userProfile.pictureUrl}
                alt={userProfile.displayName}
                className="w-12 h-12 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                {userProfile?.displayName?.[0] || '🏸'}
              </div>
            )}
            <div>
              <div className="font-black text-slate-800 text-base">{userProfile?.displayName}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">LINE ID 認證完畢</div>
            </div>
          </div>
        </div>

        {/* 權益說明卡片 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5 text-xs text-slate-600">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>加入固定咖享有專屬特權</span>
          </div>
          <ul className="space-y-1.5 pl-5 list-disc text-slate-600 leading-relaxed">
            <li>每週團主開新場次時，系統將<strong>自動為您預載正取名額</strong>，免搶票！</li>
            <li>若當週有事無法出席，可至「我的紀錄」自主點選<strong>取消報名（請假）</strong>，名額自動轉讓候補。</li>
            <li><strong>單場請假不影響固定咖資格</strong>，下週開新場次依然自動帶入。</li>
            <li>若有季打優惠，團主將於後台核定您的季繳專屬單場優惠價。</li>
          </ul>
        </div>

        {/* 操作與狀態展示 */}
        {status === 'already' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-900 text-sm">您已經是本團固定咖囉！</h3>
            <p className="text-xs text-emerald-700">
              每週團主開團時皆會自動為您帶入名冊，無須重複登記。
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-900 text-sm">🎉 登記成功！</h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              您已成功加入【{groupName}】固定咖清單，下週起開團將自動為您保留正取名額！
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="font-bold text-red-900 text-sm">登記未完成</h3>
            <p className="text-xs text-red-700">{errorMsg}</p>
          </div>
        )}

        {status === 'idle' && (
          <button
            type="button"
            disabled={submitting}
            onClick={handleRegister}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <span>處理中...</span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>確認以本人 LINE 身分加入固定咖</span>
              </>
            )}
          </button>
        )}
      </div>

      <footer className="text-center py-4 text-[11px] text-slate-400">
        Developed with ❤️ by Bean, Bird & Badminton Tech Consulting
      </footer>
    </div>
  );
}

export default function JoinRegularPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-sm text-slate-500">載入中...</div>
        </div>
      }
    >
      <JoinRegularContent />
    </Suspense>
  );
}
