import React from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服務條款 | 羽球零打小幫手 JuJu 🏸',
  description: '羽球零打小幫手 JuJu 使用者服務條款與球團活動規範',
};

export default function TermsOfUsePage() {
  const lastUpdated = '2026 年 9 月 13 日';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 頂部橫幅 */}
        <div className="bg-slate-800 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <FileText size={22} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">服務條款</h1>
              <p className="text-xs text-slate-400 font-mono">Terms of Use</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-3">
            感謝您使用「羽球零打小幫手 JuJu」（以下簡稱「本服務」）。當您開始使用本服務、透過 LINE 登入或點擊報名時，即表示您已閱讀、瞭解並同意遵守本服務條款。
          </p>
          <div className="mt-4 text-[11px] text-slate-400">
            最近更新日期：{lastUpdated}
          </div>
        </div>

        {/* 內文區域 */}
        <div className="p-6 sm:p-8 space-y-8 text-xs sm:text-sm leading-relaxed text-slate-600">
          {/* 條款 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              一、服務內容與定位說明
            </h2>
            <p>
              本服務旨在提供羽球愛好者與各羽球社團、球隊之「零打場次資訊整合」、「線上即時卡位報名」、「候補自動遞補通知」及「團主名冊管理輔助」。
            </p>
            <p className="text-slate-700 font-medium">
              ⚠️ 本服務僅為羽球活動資訊交流與名額登記之輔助工具，並非活動承辦方，亦非收費金流代理平台。
            </p>
          </section>

          {/* 條款 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              二、使用者守則與報名責任
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li><strong>珍惜名額：</strong>零打場地名額有限，報名前請務必確認個人行程。如遇臨時無法出席，應於團主設定之免費取消時限前主動於系統取消，以利候補球友依序遞補。</li>
              <li><strong>不得惡意佔位：</strong>嚴禁使用自動化程式、虛假帳號或連續佔用名額後無故缺席（No-Show）。各球團團主有權對惡意棄單之球友進行停權或列入黑名單處分。</li>
              <li><strong>代友報名責任：</strong>若您使用「代報名」功能替同行球友登記，您須對該球友之準時出席與費用給付負連帶通知與協調之責。</li>
            </ul>
          </section>

          {/* 條款 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              三、零打費用與交易免責聲明
            </h2>
            <p>
              零打費用（包含場地費、用球費等）之定價、收取方式（如現場現金、街口支付、Line Pay 或銀行轉帳）及退費規範，均由各場次之「開團團主」自行訂定與執行。
            </p>
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
              <strong>免責聲明：</strong>本服務系統本身不經手、代收或保管任何零打費用。參加者與開團團主間之一切款項交付、對帳或退費爭議，應由雙方本於誠信原則自行溝通解決，本服務不負擔任何民事或金錢賠償保證。
            </div>
          </section>

          {/* 條款 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              四、運動安全與健康自我評估
            </h2>
            <p>
              羽球為強度較高之競技運動，球友於參加前應自主評估身體健康狀況，並備妥合格球鞋與運動防護配備。於球場活動期間所發生之運動傷害、意外事故或個人財物遺失，均由參與者自行負責或依各運動場館之保險規範辦理。
            </p>
          </section>

          {/* 條款 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              五、服務中斷與免責條款
            </h2>
            <p>
              本服務將盡力維護系統穩定運作，但遇下列情事時，本服務有權暫停或中斷全部或部分功能，且不負因此所生之任何損害賠償責任：
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>系統軟硬體設備進行必要之定期維護、升級或保養。</li>
              <li>LINE 平台、Supabase 或雲端網路業者發生重大斷線、故障或服務中斷。</li>
              <li>因颱風、地震、停電或不可抗力之天災事變致無法提供服務。</li>
            </ul>
          </section>

          {/* 條款 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              六、準據法與管轄法院
            </h2>
            <p>
              本條款之解釋與適用，以及因使用本服務所引起之爭端，均以中華民國法律為準據法，並以臺灣臺北地方法院為第一審管轄法院。
            </p>
          </section>
        </div>

        {/* 底部導覽 */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:text-emerald-700 underline font-medium">
              隱私權政策 (Privacy Policy)
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
