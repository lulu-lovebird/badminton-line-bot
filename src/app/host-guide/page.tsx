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
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '羽球零打小幫手 JuJu 🏸 | 團主使用手冊',
  description: '專為羽球社團揪團主設計的完整操作手冊，包含加機器人、申請團主、開團發布、複製下週、現場對帳與自動遞補等完整教學。',
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
              提供全自動化的開團推播、正取備取排隊、自動遞補通知與現場收款標記工具。
            </p>
          </div>
          <div className="mt-6 sm:mt-0 flex flex-col items-center sm:items-end gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3.5 rounded-2xl text-center">
              <div className="text-emerald-200 text-xs sm:text-sm font-medium">手冊版本</div>
              <div className="text-lg sm:text-xl font-bold mt-0.5">v1.2 (2026 最新版)</div>
              <div className="text-xs text-emerald-300 mt-1">LINE LIFF 2.0 整合支援</div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs sm:text-sm">
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
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>4. 複製到下週 (+7)</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step5"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>5. 現場收款對帳</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step6"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>6. 手動代報名/遞補</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#step7"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>7. 補發卡片/緊急通知</span>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
            </a>
            <a
              href="#faq"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/80 transition-colors font-semibold flex items-center justify-between"
            >
              <span>8. 常見問題 FAQ</span>
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
                  將 JuJu 機器人邀請進入您固定揪團打球的 LINE 群組中。只要機器人在群組內，即可支援自動推播圖文開團卡片，球友在群組輸入「零打」也會自動叫出即時開放場次。
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-bold">確認群組啟用狀態：</strong>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  小幫手進群後，群組預設為啟用狀態。若需確認，可在群組傳送 <code className="bg-slate-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm font-semibold">!id</code> 或由最高管理員於管理後台確認授權。
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
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">一般球友升級為開團團主的審核流程</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              為了維護社團秩序與開團品質，系統採用「團主實名審核制」。一般球友無法隨意開團，必須先提出申請：
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
                  因尚未具備團主身分，系統會顯示「身分驗證提醒」，並提供「<strong>📨 申請開通團主權限</strong>」區塊。
                </li>
                <li>
                  在輸入框填寫開團規劃（例：<em>預計每週二晚上在永和運動中心開團雙打</em>），點擊「<strong>送出申請</strong>」。
                </li>
                <li>
                  送出後，系統最高管理員將立即收到審核通知；審核通過後，JuJu 會<strong>主動以 LINE 私訊發送核准通知</strong>給您！
                </li>
                <li>
                  收到核准通知後，再次點擊「⚙️ 團主後台」，即可正式啟用後台所有開團管理功能！
                </li>
              </ol>
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
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">一鍵產生視覺化 Flex 卡片並自動推播至群組</p>
            </div>
          </div>

          <div className="space-y-5 text-sm sm:text-base text-slate-700 leading-relaxed">
            <p>
              在團主管理後台頂部切換至「<strong>➕ 建立新場次</strong>」分頁，依序填寫開團資訊：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">📢 發布推播目標群組</span>
                <p className="text-slate-600 leading-relaxed">
                  下拉選單會自動列出您所在的啟用群組（系統會自動為您預選）。開團成功後，卡片將直接推播到該群組！亦可選「不推播僅上架」。
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
                <span className="font-bold text-slate-900 text-sm">💰 臨打費用 ($)</span>
                <p className="text-slate-600 leading-relaxed">每人費用金額。系統會根據每位球友報名人數（如 +2）自動計算應付總額。</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm">🏸 比賽用球與程度分級</span>
                <p className="text-slate-600 leading-relaxed">
                  標註使用球種（例：勝利比賽球、摩亞）及建議程度（例：初中級 4~7 級），確保比賽節奏順暢。
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs sm:text-sm text-emerald-950 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-emerald-900">點擊「🚀 立即建立並發布」：</strong>
                <p className="mt-1 leading-relaxed">
                  系統將即刻在指定群組發布帶有全新 JuJu
                  運動形象圖、時間地點、費用與主揪名稱的精美卡片。群組球友只要點擊卡片上的「<strong>立即報名零打 🏸</strong>」，即可一鍵秒速卡位！
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
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                第四步：快速沿用歷史場次（自動順延 +7 天）
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

        {/* ===================== 第五章 ===================== */}
        <section id="step5" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              5
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第五步：現場名冊管理與收款對帳</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">到場點名、繳費狀態標記，帳目清楚一目了然</p>
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
                  清楚列出報名順序、球友 LINE 暱稱、報名人數（如 +1、+2）與登記時間。
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <DollarSign size={16} className="text-amber-600" />
                  現場收款標籤切換
                </span>
                <p className="text-slate-600 leading-relaxed">
                  球友到場繳交現金或轉帳後，團主只需輕點該球友右側的標籤，即可在「<strong>🟠 未付款</strong>」與「<strong>🟢 已付款</strong>」之間即時切換。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 第六章 ===================== */}
        <section id="step6" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-100 text-purple-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              6
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第六步：手動代報名與全自動遞補通知</h2>
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
                當已報名的正取球友因故自行取消，或由團主在後台點擊「取消報名」時：
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-purple-900 leading-relaxed">
                <li>系統會<strong>自動將「備取順位第 1 位」球友自動晉升為「正取名額」</strong>。</li>
                <li>JuJu 機器人會<strong>立即透過 LINE 一對一私訊通知該備取球友</strong>：「恭喜您已成功遞補為正取名單！」，團主完全無須手動聯繫找人！</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================== 第七章 ===================== */}
        <section id="step7" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sky-100 text-sky-900 font-black flex items-center justify-center text-base sm:text-lg shrink-0">
              7
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">第七步：群組補發卡片與球友緊急通知</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">隨時置頂卡片與突發狀況即時廣播</p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <strong className="text-slate-900 text-sm flex items-center gap-1.5">
                  <Send size={15} className="text-emerald-600" />
                  群組卡片補發 / 重發
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  若開團建立時忘記選群組，或想在群組中再次提醒球友，只需在場次卡片點選「<strong>📢 推播卡片</strong>」或進入詳細頁點選「<strong>立即推播/補發卡片</strong>」，系統便會立刻將該場次卡片重新送至群組。
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
            </div>
          </div>
        </section>

        {/* ===================== 第八章：常見問題 ===================== */}
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
                請確認開團表單頂部的「<strong>發布推播目標群組</strong>」是否有選取您的球群（若選為「僅建立場次」，則不會推播）。若未推播，隨時可在後台該場次點選「<strong>📢 立即推播/補發卡片</strong>」隨時補送！
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
