import React from 'react';
import Link from 'next/link';
import { Shield, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隱私權政策 | 羽球零打小幫手 JuJu 🏸',
  description: '羽球零打小幫手 JuJu 服務之個人資料蒐集、處理及利用隱私權政策',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = '2026 年 9 月 13 日';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 頂部橫幅 */}
        <div className="bg-emerald-700 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Shield size={22} className="text-emerald-200" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">隱私權政策</h1>
              <p className="text-xs text-emerald-100 font-mono">Privacy Policy</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed mt-3">
            歡迎使用「羽球零打小幫手 JuJu」（以下簡稱「本服務」）。本服務極為重視您的隱私權與個人資料保護，特此依中華民國《個人資料保護法》及 LINE 平台開發者規範訂定本隱私權政策。
          </p>
          <div className="mt-4 text-[11px] text-emerald-200">
            最近更新日期：{lastUpdated}
          </div>
        </div>

        {/* 內文區域 */}
        <div className="p-6 sm:p-8 space-y-8 text-xs sm:text-sm leading-relaxed text-slate-600">
          {/* 條款 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              一、個人資料蒐集之目的
            </h2>
            <p>
              本服務為基於 LINE Messaging API 及 LINE Front-end Framework (LIFF) 提供羽球社團零打場次報名、名冊核對、候補自動遞補、臨打對帳及活動推播通知之專屬輔助工具。蒐集目的包括：
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>羽球零打場次之報名名單登記、正取與備取名額計算。</li>
              <li>場次名額釋出時，透過 LINE 官方帳號發送自動遞補成功通知與出席提醒。</li>
              <li>球團主揪於現場核對球友身分、點名與繳費收款狀態標記。</li>
              <li>球團緊急異動（如暴雨停辦、場館變更）之推播通知。</li>
            </ul>
          </section>

          {/* 條款 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              二、蒐集之個人資料類別
            </h2>
            <p>當您透過 LINE 加入本服務官方帳號或開啟 LIFF 應用程式時，本服務僅蒐集以下必要資料：</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  LINE 內部識別碼 (User ID)
                </div>
                <p className="text-[11px] text-slate-500">由 LINE 平台自動產生的字串，用於辨識球友身分及發送專屬報名/遞補推播，絕非您的 LINE 登入帳號密碼。</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  公開顯示暱稱與大頭照 (Profile)
                </div>
                <p className="text-[11px] text-slate-500">您於 LINE 設定之公開暱稱與頭像縮圖，僅用於場次名單顯示及球團團主現場點名核對。</p>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              🔒 <strong>隱私保證：</strong>本服務絕不蒐集您的 LINE 密碼、真實身分證字號、電話號碼、私人通訊紀錄或好友通訊錄。
            </p>
          </section>

          {/* 條款 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              三、個人資料利用之期間、地區及對象
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>期間：</strong>本服務運作期間，或至您要求刪除個人資料或停止使用本服務為止。</li>
              <li><strong>地區：</strong>中華民國境內及 LINE 平台雲端基礎設施所在區域。</li>
              <li><strong>對象：</strong>僅限本服務系統與該零打場次所屬之開團團主點名對帳使用。本服務絕不會將您的個資出售、交換或提供給任何無關之第三方廣告商或行銷單位。</li>
            </ul>
          </section>

          {/* 條款 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              四、使用者就個人資料之權利
            </h2>
            <p>
              依《個人資料保護法》第三條規定，您就本服務所保有之個人資料，可行使以下權利：
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>查詢或請求閱覽（可於「我的報名記錄」頁面隨時檢視個人歷程）。</li>
              <li>請求補充或更正。</li>
              <li>請求停止蒐集、處理或利用，以及請求刪除報名紀錄與個人資料。</li>
            </ul>
            <p className="text-xs text-slate-500">
              如欲行使上述權利，您可向您所屬之羽球社團管理員或本系統管理團隊提出申請。
            </p>
          </section>

          {/* 條款 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              五、資料儲存與安全維護
            </h2>
            <p>
              本服務後端採用 Supabase (PostgreSQL) 企業級安全雲端資料庫，所有網路連線均強制採用 TLS/HTTPS 傳輸加密，並設有嚴格之存取控制權限保護，防止未經授權之存取、洩漏或竄改。
            </p>
          </section>

          {/* 條款 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              六、隱私權政策之修訂
            </h2>
            <p>
              本服務有權隨時因應法令變更或功能擴充更新本政策。修訂後之內容將發布於本網址，並於公布之日起生效。
            </p>
          </section>
        </div>

        {/* 底部導覽 */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-emerald-700 underline font-medium">
              服務條款 (Terms of Use)
            </Link>
            <span>•</span>
            <Link href="/liff" className="hover:text-emerald-700 underline font-medium">
              進入 JuJu 導航大廳
            </Link>
          </div>
          <div>© {new Date().getFullYear()} 羽球零打小幫手 JuJu. All rights reserved.</div>
        </div>
      </div>
    </main>
  );
}
