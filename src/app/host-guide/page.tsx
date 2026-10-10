import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Users,
  Calendar,
  DollarSign,
  Copy,
  Send,
  PlusCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  Layers,
  Award,
  Sparkles,
  Ban,
  Trash2,
  Star,
  UserPlus,
  Share2,
  UserCheck,
  Mail,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '羽球零打小幫手 JuJu 🏸 | 團主使用手冊',
  description: '專為羽球社團揪團主設計的完整操作手冊，包含加機器人、申請團主、固定咖管理、季打優惠、Email 報名通知、開團發布、複製下週、現場對帳與自動遞補等完整教學。',
};

export default function HostGuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* 頂部導航 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/95 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-base sm:text-lg text-slate-900">
            <span className="text-emerald-600">🏸 JuJu</span>
            <span className="text-slate-300 font-normal">|</span>
            <span>團主使用手冊</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/liff/admin"
              className="text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>前往團主後台</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      {/* 英雄橫幅 */}
      <header className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 text-emerald-100 text-xs sm:text-sm font-semibold backdrop-blur-xs border border-white/15">
              <BookOpen size={15} />
              <span>零打團主必備 • 開團全方位指南</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              羽球零打小幫手 JuJu 團主使用手冊
            </h1>
            <p className="text-sm sm:text-base text-emerald-100 max-w-xl leading-relaxed">
              告別在 LINE 群組手動複製文字、+1 洗版、錯亂漏算人數與現場對帳困擾！JuJu
              提供團主固定咖預載、季打單場優惠核定、自行分享 Flex 開團卡片、正取備取排隊、自動遞補通知與現場收款標記工具。
            </p>
          </div>
          <div className="mt-6 sm:mt-0 flex flex-col items-center sm:items-end gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3.5 rounded-2xl text-center">
              <div className="text-emerald-200 text-xs sm:text-sm font-medium">手冊版本</div>
              <div className="text-lg sm:text-xl font-bold mt-0.5">v1.3 (2026 最新版)</div>
              <div className="text-xs text-emerald-300 mt-1">LINE LIFF 2.0 • 固定咖/季打 • 選用 Email 通知</div>
            </div>
          </div>
        </div>
      </header>

      {/* 目錄導覽捷徑 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-200">
          <div className="text-sm sm:text-base font-bold text-slate-800 mb-3.5 flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            <span>手冊章節快速導覽</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm">
            <a
              href="#step1"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>1. 帳號與群組準備</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step2"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>2. 申請團主權限</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step3"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>3. 發布新零打場次</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step4"
              className="p-3 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 border border-amber-200 transition-colors font-semibold flex items-center justify-between"
            >
              <span>4. 固定咖與季打管理</span>
              <ChevronRight size={14} className="text-amber-500 shrink-0" />
            </a>
            <a
              href="#step5"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>5. 複製到下週 (+7)</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step6"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>6. 現場收款對帳</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step7"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>7. 手動代報名/遞補</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step8"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>8. 分享卡片/緊急通知</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step9"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>9. 場次停用與刪除</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#faq"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between col-span-2 sm:col-span-1"
            >
              <span>10. 常見問題 FAQ</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* 手冊主體內容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10 space-y-12">
        {/* ===================== 第一章 ===================== */}
        <section id="step1" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              1
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第一步：加入官方帳號與群組準備</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">完成初次好友綁定與群組邀請</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <div className="flex gap-3.5 items-start">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-bold">加入 JuJu 官方帳號為好友：</strong>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  團主與球友皆需先將「羽球零打小幫手 JuJu」加入 LINE 好友。官方帳號底部的「圖文選單」會常駐「我要報名」、「報名記錄」與「團主後台」快捷功能。
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-bold">邀請 JuJu 加入您的羽球 LINE 群組：</strong>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  將 JuJu 機器人邀請進入您固定揪團打球的 LINE 群組中。開團後請由團主透過 LIFF 分享 Flex 卡片至該群；小幫手不會自動向群組推播開團訊息。球友仍可在群組輸入「零打」查詢開放場次。
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-bold">確認群組啟用狀態：</strong>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  小幫手進群後，群組預設為啟用。請從群內歡迎卡片進入 JuJu，連結會帶入該群組；若從一對一圖文選單進入，請在團主後台自行確認要申請的群組名稱。您本人也必須是該 LINE 群組成員。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 第二章 ===================== */}
        <section id="step2" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              2
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第二步：申請開團團主權限</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">每個群組分別申請、分別授權</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              團主權限綁定「LINE 使用者＋指定群組」，不是取得一次身分就能在所有群組開團。每個新群組都需要分別申請並獲核准，或由最高管理員直接授權：
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-600" />
                <span>申請步驟說明：</span>
              </div>
              <ol className="list-decimal pl-6 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <li>
                  打開小幫手官方帳號一對一私訊，點擊底部圖文選單右下角「<strong>⚙️ 團主後台</strong>」（或進入導航大廳點擊團主後台）。
                </li>
                <li>
                  若尚未取得<strong>目前群組</strong>的授權，後台會顯示申請表單；即使已能在另一個群組開團，仍須為新群組提出申請。
                </li>
                <li>
                  在「<strong>申請開團的 LINE 群組</strong>」確認群組名稱（從私訊進入時請自行選擇），填寫開團規劃後點擊「<strong>📨 申請成為開團團主</strong>」。請勿選錯舊群組。
                </li>
                <li>
                  最高管理員在審核頁看到申請人與對應群組，核准後會建立該群授權並嘗試以 LINE 私訊通知您；您也可以請最高管理員在「團主群組授權」直接新增授權。
                </li>
                <li>
                  重新進入後台，確認群組已列於可選清單；授權只適用於該群，不會自動延伸到其他群組。
                </li>
              </ol>
            </div>

            {/* 選用 Email 通知說明 */}
            <div className="p-4 sm:p-5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs sm:text-sm text-blue-950 space-y-2.5">
              <div className="font-bold flex items-center gap-2 text-blue-900 text-sm sm:text-base">
                <Mail size={18} className="text-blue-600" />
                <span>📧 選用功能：團主報名通知 Email 設定與驗證</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                <strong>【選用功能註記】</strong>：Email 即時通知為<strong>選用模組（Optional）</strong>。系統環境需先完成 Email 服務設定（如伺服器端環境變數啟用 Resend 與寄件設定），後台才會顯示 Email 設定面板；若部署環境未開啟此設定，該區塊將自動隱藏，不會影響一般開團報名運作。
              </p>
              <div className="bg-white/80 p-3.5 rounded-xl border border-blue-200/80 space-y-2 text-slate-700 leading-relaxed">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">團主設定與驗證流程：</div>
                <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm">
                  <li><strong>填寫信箱</strong>：申請團主時可一併填寫「團主通知 Email」，或已獲授權後在後台常駐的「📧 團主報名通知 Email」面板輸入個人信箱。</li>
                  <li><strong>寄送驗證碼</strong>：點擊「寄送驗證碼 / 更新信箱」，系統會發送含有 24 碼驗證碼的驗證信至該信箱。</li>
                  <li><strong>完成驗證</strong>：在後台輸入驗證碼並點擊「驗證」，通過後即標記為「<strong>✓ 已驗證 / 通知已啟用</strong>」。</li>
                  <li><strong>即時掌握球友動態</strong>：只有<strong>完成驗證的信箱</strong>才會在球友「報名成功」或「取消報名」時，第一時間收到系統 Email 通知（藉此省下 LINE 官方帳號的共用推播額度）。</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 第三章 ===================== */}
        <section id="step3" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              3
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第三步：建立並發布新零打場次</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">先指定場次歸屬群組，再決定是否分享或付費推播</p>
            </div>
          </div>

          <div className="space-y-5 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              在團主管理後台頂部切換至「<strong>➕ 建立新場次</strong>」分頁，依序填寫開團資訊：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">🏸 場次歸屬群組（必選）</span>
                <p className="text-slate-600 leading-relaxed">
                  在「場次所屬群組（必選）」下拉選單明確選擇這場球所屬的群組；選項只包含您已獲授權且啟用的群組。場次與報名名單會歸屬於該群，不能留空或借用另一群的授權。建立場次不會觸發 Bot 群組推播。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">🏸 場次名稱 / 標題</span>
                <p className="text-slate-600 leading-relaxed">
                  清楚明瞭的標題能提高球友報名意願，例：<em>週二永運歡樂初中級團 (第1號場)</em>。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">⏰ 開始與結束時間</span>
                <p className="text-slate-600 leading-relaxed">
                  精確設定台灣標準時間。系統具備防呆機制，若球友同時報名兩場時間重疊的活動，將主動在報名記錄提示撞期衝突！
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">👥 正取與備取上限人數</span>
                <p className="text-slate-600 leading-relaxed">
                  設定總招募人數（如 8 人）與備取人數（如 2 人）。額滿後球友報名將自動排入「備取順位」，正取釋出時自動遞補。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">💰 臨打費用與季打優惠 ($)</span>
                <p className="text-slate-600 leading-relaxed">
                  輸入每人單次臨打費用金額。若社團有季打/固定優惠制度，請勾選「<strong>啟用季打優惠</strong>」並填寫單場優惠金額（例如：臨打 $200、季打 $180）。不提供優惠則維持未勾選。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">🏸 比賽用球與程度分級</span>
                <p className="text-slate-600 leading-relaxed">
                  標註使用球種（例：勝利比賽球、摩亞）及建議程度（例：初中級 4~7 級），確保比賽節奏順暢。
                </p>
              </div>
            </div>

            {/* 預載固定咖亮點說明 */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs sm:text-sm text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-900 text-sm">
                <Star size={16} className="text-amber-600 fill-amber-500" />
                <span>開團亮點：預載本群固定咖名冊（免每週搶票）</span>
              </div>
              <p className="leading-relaxed text-slate-700">
                若您在後台已建置固定咖名冊，開團表單會自動展開「<strong>預載本群固定咖</strong>」面板，預設全選該群固定球友自動卡位正取：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 leading-relaxed">
                <li><strong>自動保留正取名額</strong>：開團建立時，系統直接將勾選的固定球友列入正取，球友無須每週手動報名搶票。</li>
                <li><strong>當週請假即時剔除</strong>：若某位固定咖已知本週請假，團主可在開團當下直接取消打勾，不佔用名額。</li>
                <li><strong>即時換算開放零打額度</strong>：面板會動態顯示「<strong>開放零打：X 名</strong>（總正取上限 - 已預載固定咖人數）」，開團人數計算一清二楚！</li>
              </ul>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-emerald-900">點擊「立即建立新零打場次」：</strong>
                <p className="mt-1 leading-relaxed">
                  場次會建立在選定群組下，<strong>Bot 不會向群組自動推播</strong>。建立後由團主點擊 LIFF 分享 Flex 卡片，親自選擇場次所屬群組發送；不扣 Bot 主動推播額度。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 第四章 ===================== */}
        <section id="step4" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-100 text-amber-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              4
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第四步：群組固定咖與季打球友管理</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">預載正取免搶票、三大加入途徑與季打單場優惠核定</p>
            </div>
          </div>

          <div className="space-y-5 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              羽球團常有一群每週必到的長期球友或預繳季費的「季打固定咖」。JuJu 提供了後台「<strong>👥 固定咖管理</strong>」專屬分頁，讓團主輕鬆維護名單，享受每週開團全自動帶入正取的極致便利！
            </p>

            {/* 三大建立途徑卡片 */}
            <div className="space-y-3">
              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-600" />
                <span>三大加入固定咖途徑（團主與球友皆免手動查填 LINE ID）：</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs sm:text-sm">
                {/* 方案 A */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      方案 A：歷史球友下拉快選
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      在固定咖管理頁面中，系統會<strong>自動彙整該群組過往所有出席球友，並依累計出席次數排序</strong>。團主只需在下拉選單選取常客球友，一鍵即可儲存為固定咖！
                    </p>
                  </div>
                  <div className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded-xl font-medium">
                    適合：社團已開過幾次團，直接挑選高頻率老球友升級為固定咖。
                  </div>
                </div>

                {/* 方案 B */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                      方案 B：場次名冊一鍵設為固定咖
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      在任何一場進行中或已結束場次的「名冊管理頁」中，每位球友右側都有「<strong>⭐ 設為固定咖</strong>」按鈕。點擊後跳出設定彈窗，一秒將該場球友加入常客清單。
                    </p>
                  </div>
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl font-medium">
                    適合：打球現場看到表現優秀或當場繳交季費的新球友，直接就地轉正！
                  </div>
                </div>

                {/* 方案 C */}
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                      <Share2 size={14} className="text-emerald-600" />
                      方案 C：自主登記專屬邀請連結
                    </span>
                    <p className="text-emerald-900 leading-relaxed">
                      在固定咖管理頂部點擊「<strong>複製專屬登記邀請連結與文案</strong>」發至 LINE 群。球友點開連結會由 LIFF 自動辨識本人 LINE 帳號一鍵加入固定咖名冊！
                    </p>
                  </div>
                  <div className="text-[11px] text-emerald-800 bg-white p-2 rounded-xl font-medium border border-emerald-200">
                    最省力：團主與球友皆免查、免填 33 碼 LINE ID，群組公告自主加入。
                  </div>
                </div>
              </div>
            </div>

            {/* 季打單場優惠價核定機制 */}
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-950 space-y-3">
              <div className="font-bold flex items-center gap-2 text-amber-900 text-sm sm:text-base">
                <DollarSign size={18} className="text-amber-600" />
                <span>季打單場優惠價與效期管理：</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-amber-900 leading-relaxed">
                <li>
                  <strong>單場優惠核定</strong>：在固定咖設定表單中，勾選「<strong>啟用季打單場優惠價</strong>」，可為該球友指定專屬單場優惠金額（例如臨打 $200、季打 $160）。
                </li>
                <li>
                  <strong>有效期限設定 (選填)</strong>：可填寫「季打效期至」（例如：2026-09-30）。效期內開團自動適用優惠價；效期過後系統自動回復一般原價，避免季費過期忘記更新。
                </li>
                <li>
                  <strong>安全審核機制</strong>：球友透過「方案 C 專屬連結」自主登記者，<strong>預設僅具備「固定咖（正取預載）」身分，不具備季打優惠</strong>。季打優惠價必須由團主在後台親自核定開啟，杜絕未繳季費者誤享優惠。
                </li>
                <li>
                  <strong>專屬備忘註記</strong>：團主可於後台備忘欄位記錄（如：「已匯款 2026 Q3 季費 1800 元」），此備忘僅團主可見，帳務更清晰。
                </li>
              </ul>
            </div>

            {/* 固定咖請假與自動遞補機制 */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2">
              <div className="font-bold flex items-center gap-2 text-slate-900 text-sm sm:text-base">
                <UserCheck size={18} className="text-emerald-600" />
                <span>固定咖臨時請假與自動釋出遞補說明：</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                固定咖若某週臨時有事無法出席，只要在「<strong>📋 報名記錄</strong>」中點擊該場次的「<strong>取消報名 / 請假</strong>」：
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 leading-relaxed">
                <li><strong>名額瞬間釋出</strong>：系統會立即將備取名單中第 1 順位球友自動晉升為正取，並透過 LINE 私訊通知該遞補球友。</li>
                <li><strong>固定咖資格完全不受影響</strong>：單場請假僅取消該次出席，完全不會自群組固定咖清單中移除。下週開新場次時，系統依然會自動預載！</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================== 第五章 ===================== */}
        <section id="step5" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-100 text-amber-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              5
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                第五步：快速沿用歷史場次（自動順延 +7 天）
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">固定每週開團神器，告別重複打字與複製貼上</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>羽球社團通常每週同時間同場地固定開打。JuJu 特別設計了「+7 天一鍵複製」功能：</p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Copy size={18} className="text-amber-600" />
                <span>兩種快速沿用操作方式：</span>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <li>
                  <strong>方式 A（在開團表單頂部選取）：</strong>在「建立新場次」頂部，點選「<strong>快速沿用歷史場次</strong>」下拉選單，選擇過去開過的團。
                </li>
                <li>
                  <strong>方式 B（在場次總覽卡片點選）：</strong>在「場次管理」列表中，每張場次卡片底部都有「<strong>📋 複製到下週 (+7天)</strong>」按鈕，直接點擊即可帶入。
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs sm:text-sm text-blue-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-blue-900">
                <Sparkles size={16} className="text-blue-600" />
                <span>自動化防呆保障：</span>
              </div>
              <p className="leading-relaxed">
                沿用舊場次時，系統會自動將<strong>打球時間精準順延 7 天</strong>，並自動將<strong>報名名單完全清空</strong>，完全不會殘留舊週報名者，確認細節後即可安心發布！
              </p>
            </div>
          </div>
        </section>

        {/* ===================== 第六章 ===================== */}
        <section id="step6" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              6
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第六步：現場名冊管理與收款對帳</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">到場點名、季打優惠標示與繳費狀態標記</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              在後台點選任一場次卡片，即可進入該場次的「<strong>名單管理詳細頁</strong>」：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  正取與備取名冊分流
                </span>
                <p className="text-slate-600 leading-relaxed">
                  清楚列出報名順序、球友 LINE 暱稱、報名人數（如 +1、+2）與登記時間，並以綠色標籤識別固定咖。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <DollarSign size={16} className="text-amber-600" />
                  現場收款與季打優惠標籤
                </span>
                <p className="text-slate-600 leading-relaxed">
                  具備季打資格球友會標註橘黃色「<strong>季打 $XXX</strong>」標籤，一般球友顯示臨打費用。球友到場繳費後，點擊標籤即可在「<strong>🟠 待付款</strong>」與「<strong>🟢 已付款</strong>」之間即時切換。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 第七章 ===================== */}
        <section id="step7" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-100 text-purple-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              7
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第七步：手動代報名與全自動遞補通知</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">彈性代報名機制與無人值守的備取遞補</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <PlusCircle size={18} className="text-blue-600" />
                手動代報名（朋友無 LINE 或電話報名）
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                若有朋友不在群組內、未加入小幫手，或透過電話臨時通知想加入，團主可以在名單管理頁下方輸入「球友姓名」及「人數」，點擊「<strong>手動代報名</strong>」即可為其保留名額。
              </p>
            </div>

            <div className="p-5 bg-purple-50 rounded-2xl border border-purple-200 text-xs sm:text-sm text-purple-950 space-y-2.5">
              <div className="font-bold flex items-center gap-2 text-purple-900 text-sm sm:text-base">
                <ShieldCheck size={20} className="text-purple-600" />
                <span>JuJu 核心功能：無人值守「全自動遞補」</span>
              </div>
              <p className="leading-relaxed">
                當已報名的正取球友（含預載之固定咖）因故自行取消，或由團主在後台點擊「取消報名」時：
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-purple-900 leading-relaxed">
                <li>系統會<strong>自動將「備取順位第 1 位」球友晉升為「正取名額」</strong>。</li>
                <li>JuJu 機器人會<strong>立即透過 LINE 一對一私訊通知該備取球友</strong>：「恭喜您已成功遞補為正取名單！」，團主完全無須手動聯繫找人！</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================== 第八章 ===================== */}
        <section id="step8" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-100 text-sky-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              8
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第八步：團主分享卡片與球友緊急通知</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">隨時置頂卡片與突發狀況即時廣播</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                  <Send size={15} className="text-emerald-600" />
                  團主自行分享群組卡片
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  場次建立時必須先指定歸屬群組。建立後可透過 LIFF Share Target Picker 分享 Flex 卡片；想再次提醒球友，可重新使用團主分享卡片或複製連結，自行貼至<strong>該場次所屬群組</strong>。Bot 的開團群組推播與補發功能目前停用。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                  <Send size={15} className="text-sky-600" />
                  場次緊急通知（一對一私訊球友）
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  若遇場地臨時更換（如換到 4 號場地）、停打或颱風天取消，在詳細頁輸入說明文字並點擊「<strong>推播</strong>」，JuJu 會<strong>一對一私訊給該場次的所有正取與備取球友</strong>，保證重要訊息不漏接！
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 sm:col-span-2">
                <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                  <Mail size={15} className="text-blue-600" />
                  球友報名與取消即時 Email 通知（選用）
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  為避免消耗 LINE 官方帳號每月的免費主動推播額度，JuJu 預設不會向團主發送 LINE 私訊。若系統管理員有配置並啟用 Email 通知服務，團主在完成信箱驗證後，每當有球友報名或臨時取消，系統會即時寄送通知信至團主信箱，球友名單異動即時掌握！
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 第九章：場次維護 ===================== */}
        <section id="step9" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-100 text-rose-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              9
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第九步：場次維護（停用、重新啟用與永久刪除）</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">彈性應對突發變卦、清理測試資料與釋出雲端資源</p>
            </div>
          </div>

          <div className="space-y-5 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              在日常揪團營運中，可能因突發天候、場館保養、團主私人事由或當初測試開團，需要暫停開放報名或將場次作廢清理。JuJu 在場次管理詳情頁頂部提供了「<strong>🚫 停用場次</strong>」與「<strong>🗑️ 刪除場次</strong>」兩種不同層級的處置功能：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              {/* 停用功能卡片 */}
              <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm sm:text-base">
                  <Ban size={18} className="text-amber-600 shrink-0" />
                  <span>🚫 停用場次（暫停報名，名冊保留）</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  若遇颱風天停打、場地整修，或團主希望暫停收人但<strong>保留既有名冊</strong>時，請點擊「<strong>停用場次</strong>」：
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-700 leading-relaxed">
                  <li><strong>球友前端警示</strong>：該場次卡片會即時標示紅色的「<span className="text-red-600 font-bold">🚫 場次已停用</span>」，報名按鈕轉為灰底禁用，防止球友繼續報名。</li>
                  <li><strong>群組查詢隱藏</strong>：群組球友輸入「零打」時，機器人會自動過濾略過停用的場次。</li>
                  <li><strong>名單完整安全</strong>：已報名之正取與備取球友資料 100% 完整保留，仍可供現場點名對帳。</li>
                  <li><strong>隨時可恢復</strong>：狀況排除後，點擊「<span className="text-emerald-700 font-bold">✅ 重新啟用</span>」即可一秒恢復對外招募！</li>
                </ul>
              </div>

              {/* 刪除功能卡片 */}
              <div className="p-5 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-rose-900 text-sm sm:text-base">
                  <Trash2 size={18} className="text-rose-600 shrink-0" />
                  <span>🗑️ 永久刪除場次（原子級清除）</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  若先前為測試功能開的測試場次，或確認徹底取消作廢的團，可點擊「<strong>刪除場次</strong>」：
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-700 leading-relaxed">
                  <li><strong>二次防呆確認</strong>：點擊後系統會彈出確認視窗，避免手滑誤觸。</li>
                  <li><strong>級聯連帶清理</strong>：系統自資料庫將該場次及<strong>其下所有球友報名與候補記錄全部清除</strong>，立即釋放資料庫空間。</li>
                  <li><strong>嚴密權限保護</strong>：僅有仍獲該群授權的原始開團團主，或最高管理員 (Super Admin) 可刪除群組場次。</li>
                  <li><strong>歷史場次支援</strong>：打完結束的歷史過期場次，團主亦可在後台隨時手動點擊刪除。</li>
                </ul>
              </div>
            </div>

            {/* 自動過期清理機制說明 */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2">
              <div className="font-bold flex items-center gap-2 text-slate-900 text-sm sm:text-base">
                <Sparkles size={18} className="text-emerald-600" />
                <span>🧹 系統貼心設計：過期歷史場次自動清理機制</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                為免資料庫隨時間累積過期舊資料而佔用免費儲存空間，JuJu 後台內建了背景非同步自動清理機制：
                系統預設會在場次結束 <strong>7 天後</strong>，自動從資料庫釋放清除該場次與其報名名單（團主完全無須逐週手動整理刪除）。
                此天數亦可由超級管理員透過環境變數 <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-xs">EXPIRED_SESSION_CLEANUP_DAYS</code> 彈性設定或設為 0 關閉。
              </p>
            </div>
          </div>
        </section>

        {/* ===================== 第十章：常見問題 ===================== */}
        <section id="faq" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-100 text-slate-800 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">常見問題與團主常見操作 (FAQ)</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">解答開團過程中的疑難雜症</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700">
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm sm:text-base">Q1：如何在 LINE 群組中達成「0 人洗版、0 打字報名」？</div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                開團卡片發送到群組後，團主長按該則訊息並選擇「<strong>設為公告</strong>」，卡片就會常駐在群組頂端。球友點開頂部公告即可點擊按鈕直接開網頁報名，完全不用在聊天室打字 +1！
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm sm:text-base">Q2：為什麼我開團後，群組沒有收到卡片？</div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                選擇群組只決定場次歸屬，Bot 不會自動推播開團卡片。請在建團成功後使用 LIFF 分享 Flex 卡片，由團主本人選擇<strong>該場次群組</strong>發送；不消耗 Bot 推播額度。
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm sm:text-base">Q3：球友可以在哪裡查看自己報名的場次？</div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                球友只要在小幫手官方帳號底部的圖文選單點選「<strong>📋 報名記錄</strong>」，即可查看所有已報名場次、時間、地點、應繳費用與主揪名稱，若有事也可在此一鍵取消。
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm sm:text-base">Q4：同一個群組內可以有多個團主開團嗎？</div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                可以！社團內可有多位經審核通過的團主各自開團。每張場次卡片均會清楚標示「👤 主揪團主：[LINE暱稱]」，球友報名時一目了然。
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm sm:text-base">Q5：如果某週臨時停打，我該選擇「停用場次」還是「刪除場次」？</div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                強烈建議選擇「<strong>停用場次</strong>」！先透過第八步的「緊急通知」發送私訊告知已報名的球友停打說明，接著在場次詳情頁點選「停用場次」。這樣既有的報名名冊能完整留存供日後查詢對帳，同時球友端亦無法再新增報名。唯有在該場次為「測試開團」或「徹底建立錯誤」時，才建議使用「刪除場次」。
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm sm:text-base">Q6：點擊「刪除場次」後，球友的報名資料還能救回嗎？</div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                無法復原！「刪除場次」屬於資料庫的物理級聯清除（Hard Delete），會連同該場次的所有報名記錄、候補順位與收款註記徹底抹除。因此點擊時系統會跳出確認警告彈窗，請確認確實無需保留後再執行。
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
              <div className="font-bold text-amber-950 text-sm sm:text-base flex items-center gap-1.5">
                <Star size={16} className="text-amber-600 fill-amber-500" />
                <span>Q7：社團每週都有固定的常客班底（固定咖），如何避免他們每週重複搶票？</span>
              </div>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                在團主後台頂部切換至「<strong>👥 固定咖管理</strong>」，透過「歷史球友快選」、「場次名單 ⭐ 一鍵加入」或將「自主登記專屬連結」發到群組。名單建置完成後，每次開新場次時系統會自動在「預載本群固定咖」勾選他們，開團建立瞬間自動列入正取，球友再也不需要每週準時搶票！
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
              <div className="font-bold text-emerald-950 text-sm sm:text-base flex items-center gap-1.5">
                <DollarSign size={16} className="text-emerald-600" />
                <span>Q8：季打優惠價是如何運作的？球友點專屬連結自主登記後會自動享有優惠嗎？</span>
              </div>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                開團時若勾選「啟用季打優惠」並設定單場優惠價，該場次即支援季打定價。為確保社團財務安全，球友點擊專屬連結登記後<strong>僅享有「固定咖正取保留」資格，預設不包含季打優惠</strong>。團主確認收到季費後，需至後台固定咖名冊中為該球友勾選「啟用季打單場優惠價」並填寫優惠金額與效期，之後該球友預載或報名才會自動以季打優惠金額計算。
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-1.5">
              <div className="font-bold text-blue-950 text-sm sm:text-base flex items-center gap-1.5">
                <Mail size={16} className="text-blue-600" />
                <span>Q9：球友報名或取消時，團主會收到通知嗎？如何開啟 Email 報名通知？</span>
              </div>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                為節省 LINE 官方帳號每月的共用主動推播額度，JuJu 機器人預設不對團主發送 LINE 私訊。系統內建<strong>選用（Optional）的 Email 通知功能</strong>：前提是系統部署環境中已完成 Email 通知服務設定。在此前提下，團主只需在團主後台的「📧 團主報名通知 Email」面板填寫個人信箱並收取 24 碼驗證碼完成驗證，之後該場次的每一次球友報名與取消，就會即時、免費寄送通知信到團主信箱！
              </p>
            </div>
          </div>
        </section>

        {/* 底部按鈕 */}
        <div className="text-center py-6 sm:py-10">
          <Link
            href="/liff/admin"
            className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base sm:text-lg shadow-md transition-all active:scale-95"
          >
            <span>立即進入團主後台開始揪團</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
