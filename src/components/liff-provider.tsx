'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initLiff } from '@/lib/liff-client';

export interface LiffUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  role?: string;
  is_super_admin?: boolean;
}

interface LiffContextType {
  liff: any | null;
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  userProfile: LiffUserProfile | null;
  idToken: string;
  error: string | null;
  login: () => void;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
  userProfile: null,
  idToken: '',
  error: null,
  login: () => {},
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liff, setLiff] = useState<any | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInClient, setIsInClient] = useState(false);
  const [userProfile, setUserProfile] = useState<LiffUserProfile | null>(null);
  const [idToken, setIdToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const liffObj = await initLiff();
        if (!isMounted) return;

        if (!liffObj) {
          setError('LIFF 初始化失敗');
          setIsReady(true);
          return;
        }

        setLiff(liffObj);
        const inClient = liffObj.isInClient();
        const loggedIn = liffObj.isLoggedIn();
        setIsInClient(inClient);
        setIsLoggedIn(loggedIn);

        if (loggedIn) {
          try {
            const profile = await liffObj.getProfile();
            const token = liffObj.getIDToken() || liffObj.getAccessToken() || '';
            if (isMounted) {
              setUserProfile({
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
              });
              setIdToken(token);
            }

            // 🚀 關鍵：在使用者進入 LIFF App 時，立即自動向後端 /api/auth/me 註冊/同步至 users 表
            if (token) {
              fetch('/api/auth/me', {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
                .then((res) => res.json())
                .then((userData) => {
                  if (userData && !userData.error && isMounted) {
                    setUserProfile((prev) =>
                      prev
                        ? {
                            ...prev,
                            role: userData.role,
                            is_super_admin: userData.is_super_admin || userData.role === 'admin',
                          }
                        : {
                            userId: userData.line_user_id,
                            displayName: userData.display_name,
                            role: userData.role,
                            is_super_admin: userData.is_super_admin || userData.role === 'admin',
                          }
                    );
                  }
                })
                .catch((err) => console.warn('自動同步使用者資料庫紀錄失敗:', err));
            }
          } catch (pe: any) {
            console.warn('取得 LINE 個人檔案失敗:', pe);
          }
        } else {
          // 外部瀏覽器未登入訪客模式
          if (isMounted && new URLSearchParams(window.location.search).get('externalLogin') !== '1') {
            setUserProfile({
              userId: 'U_guest_player',
              displayName: '球友',
            });
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || '初始化異常');
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = () => {
    if (!liff || !isReady) return;
    try {
      const redirect = new URL(window.location.href);
      if (redirect.pathname !== '/liff/sessions' || redirect.searchParams.get('externalLogin') !== '1') return;
      // 使用目前的網站及完整報名參數，不接受外部傳入的 redirect URI。
      redirect.hash = '';
      liff.login({ redirectUri: redirect.toString() });
    } catch {
      setError('無法開始 LINE 登入，請重新開啟報名連結');
    }
  };

  return (
    <LiffContext.Provider
      value={{
        liff,
        isReady,
        isLoggedIn,
        isInClient,
        userProfile,
        idToken,
        error,
        login,
      }}
    >
      {children}
      {process.env.NEXT_PUBLIC_DEBUG === 'on' && (
        <aside
          aria-label="LIFF 安全診斷"
          className="fixed right-2 top-2 z-50 rounded-lg bg-slate-900 p-3 text-xs text-white shadow-lg"
        >
          <strong>LIFF 安全診斷</strong>
          <ul>
            <li>流程完成：{isReady ? '是' : '否'}</li>
            <li>SDK 初始化成功：{liff ? '是' : '否'}</li>
            <li>LIFF 瀏覽器：{isReady ? (isInClient ? '是' : '否') : '待確認'}</li>
            <li>已登入：{isReady ? (isLoggedIn ? '是' : '否') : '待確認'}</li>
            <li>登入憑證存在：{idToken ? '是' : '否'}</li>
            <li>初始化錯誤：{error ? '有' : '無'}</li>
          </ul>
        </aside>
      )}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  return useContext(LiffContext);
}
