# 🚀 羽球零打報名 LINE 機器人完整部署操作指南 (Deployment Guide)

本指南將手把手引導您完成從 **Supabase 資料庫建置**、**LINE 官方後台設定**、到 **Vercel 一鍵正式上線** 的完整流程。
不論您是**羽球團主**、**社團幹部**或**工程師**，皆能利用本專案在 10 分鐘內建立一套自己專屬、資料完全獨立運作的羽球零打報名系統！

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flulu-lovebird%2Fbadminton-line-bot&env=SUPER_ADMIN_LINE_IDS,LINE_CHANNEL_ID,LINE_CHANNEL_SECRET,LINE_CHANNEL_ACCESS_TOKEN,LINE_LIFF_ID,LINE_LIFF_URL,SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=%E8%AB%8B%E4%BE%9D%E7%85%A7%E9%83%A8%E7%BD%B2%E6%8C%87%E5%8D%97%E5%A1%AB%E5%85%A5%E6%82%A8%E7%9A%84LINE%E8%88%87Supabase%E9%80%A3%E7%B7%9A%E9%87%91%E9%91%B0&envLink=https%3A%2F%2Fgithub.com%2Flulu-lovebird%2Fbadminton-line-bot%2Fblob%2Fmain%2FDEPLOYMENT_GUIDE.md&project-name=badminton-line-bot&repository-name=badminton-line-bot)

---

## 📋 部署準備清單 (Checklist)
在開始前，請確認您已備妥以下四個免費帳號：
1. **GitHub 帳號**（用來託管專案程式碼與一鍵部署）
2. **Supabase 帳號**（免費 PostgreSQL 資料庫，提供 500MB 儲存）
3. **Vercel 帳號**（免費 Serverless 雲端主機與自動 HTTPS）
4. **LINE 帳號**（進入 LINE Developers Console 建立免費 Messaging API Bot 與 LIFF）

---

## 步驟 1：建立並設定 Supabase 資料庫

1. 前往 [Supabase 官網](https://supabase.com) 登入或註冊。
2. 點擊 **"New Project"** 建立新專案：
   - **Name**：`badminton-line-bot`（或自訂名稱）
   - **Database Password**：設定一組強密碼（請妥善保存）
   - **Region**：建議選擇 **Tokyo (ap-northeast-1)** 或 **Singapore**（對台灣連線速度最快）
   - 點擊 **"Create new project"**，等待約 1~2 分鐘建立完成。
3. 進入專案左側選單的 **SQL Editor**：
   - 點擊 **"New query"**。
   - 打開專案中的 [`supabase/schema.sql`](supabase/schema.sql)（若未下載程式碼，可[點此直接開啟原始碼複製](https://raw.githubusercontent.com/lulu-lovebird/badminton-line-bot/main/supabase/schema.sql)），**複製全部內容**並貼入 SQL Editor。
   - 點擊右下角的 **"Run"** 執行。新專案會一次建置完成包含 `users`、`groups`、`host_group_permissions`、`group_memberships`、`match_sessions`、`registrations`、`host_applications` 以及通知架構等全套資料表、索引與觸發器。

---

### 💡 資料庫 SQL 腳本適用時機說明（全新安裝 vs 舊版升級）

為了避免新舊用戶混淆，本專案 SQL 檔案分為兩種類型：

1. **全新安裝（初次建立專案者）**：
   - **只需要執行 [`supabase/schema.sql`](supabase/schema.sql)** 一次即可。
   - `schema.sql` 永遠保持為**最新完整資料庫結構**（包含多群組權限、固定咖與季打優惠、到場人員註記、通知架構等）。
   - **全新安裝使用者請勿重複執行 `supabase/migrations/` 裡的檔案**。

2. **舊版升級（既有專案升級至新版本者）**：
   - 僅適用於**先前已經部署舊版、資料庫已存有正式資料**的專案。為了保留既有資料不被重置，請勿直接重跑 `schema.sql`，而是依照升級跨越的版本，依序在 SQL Editor 執行 `supabase/migrations/` 下對應的增量腳本：
     - `20260919_group_memberships.sql`：升級支援群組固定咖名單與季打優惠價。
     - `20260924_host_group_permissions.sql`：升級支援多群組隔離與分群團主授權。
     - `20260927_registration_attendee_name.sql`：升級支援團主註記實際到場人員稱呼。
     - `20261002_optional_host_email_notifications.sql`：升級支援團主 Email 通知模組（若僅使用 Lite 模式則不需執行）。

---
4. 取得 Supabase 連線金鑰：
   - 點擊左下角 **Project Settings (齒輪圖示)** -> **API**。
   - 複製並記錄以下三個值：
     - `Project URL`（對應 `SUPABASE_URL`）
     - `Project API keys` 中的 `anon public`（對應 `SUPABASE_ANON_KEY`）
     - `Project API keys` 中的 `service_role secret`（對應 `SUPABASE_SERVICE_ROLE_KEY`，點 Reveal 複製）

---

## 步驟 2：設定 LINE Developers Console

1. 前往 [LINE Developers Console](https://developers.line.biz/console/) 登入您的 LINE 帳號。
2. 若尚未建立 Provider，先點擊 **Create a new provider**（名稱例如：`羽球社團服務`）。

### A. 建立 Messaging API Channel（機器人本人）
1. 在 Provider 內點擊 **Create a Messaging API channel**：
   - **Channel name**：`零打小幫手`（機器人顯示名稱）
   - **Channel description**：`羽球社團零打自動化報名與管理小幫手`
   - **Category**：選擇 `Sports` 或 `Community`
   - 勾選同意條款後點擊 **Create**。
2. 取得 Channel 憑證：
   - 在 **Basic settings** 分頁：
     - 複製 `Channel ID`（對應 `LINE_CHANNEL_ID`）
     - 複製 `Channel secret`（對應 `LINE_CHANNEL_SECRET`）
   - 切換至 **Messaging API** 分頁：
     - 滾動至最底部，在 `Channel access token (long-lived)` 點擊 **Issue** 發行金鑰，並完整複製（對應 `LINE_CHANNEL_ACCESS_TOKEN`）。
3. 設定機器人加入群組權限：
   - 在 **Messaging API** 分頁中，找到 **LINE Official Account features**：
     - 點擊 **Auto-reply messages** 右側的 `Edit`。
     - 在 LINE Official Account Manager 後台將 **「允許加入群組或多人聊天室」設定為「開啟 (Allow)」**。
     - 將 **「自動回應訊息」設定為「關閉 (Disabled)」**，將 **「Webhook」設定為「開啟 (Enabled)」**。

### B. 建立 LIFF App（輕量前端介面）
1. 回到剛才建立的 Provider，點擊 **Create a new channel** -> 選擇 **LINE Front-end Framework (LIFF)** 或直接在剛剛的 Messaging Channel 內切換至 **LIFF** 分頁。
2. 點擊 **Add LIFF app**：
   - **LIFF app name**：`零打報名`
   - **Size**：建議選擇 **Tall** 或 **Full**（彈窗高度體驗最佳）
   - **Endpoint URL**：先暫填 `https://localhost:3000/liff/sessions`（等稍後 Vercel 部署完拿到正式網址再回頭修改）
   - **Scopes**：勾選 `profile` 與 `openid`
   - **Bot link feature**：選擇 `On (Normal)`（讓球友開啟 LIFF 時順便加機器人好友）
   - **Share Target Picker**：設定為 **On**（⚠️ 極重要！開啟後團主才能免額度使用社群分享器送出 Flex 互動卡片）
   - 點擊 **Add** 建立完成。
3. 複製並記錄生成的 **LIFF ID**（格式如 `1234567890-AbCdEfGh`，對應 `LINE_LIFF_ID`）。
   - 對應的 `LINE_LIFF_URL` 即為 `https://liff.line.me/<你的LIFF_ID>`。
   - LIFF 所屬 Channel 可能與 Messaging API Channel 不同。後端以 `LINE_LIFF_ID` 的數字前綴（LIFF 所屬 Channel ID）向 LINE 官方驗證 ID Token；`LINE_CHANNEL_ID` 保留為 Messaging API 的 Channel ID，**不要**為了修正登入而將兩者硬改成相同值。LIFF Scopes 須勾選 `openid`。

---

## 步驟 3：查詢您自己的 LINE User ID (設定最高管理員)

1. 在 LINE Developers Console 的首頁右上角，點擊您的大頭貼進入 **Profile**。
2. 複製頁面中的 **Your user ID**（以 `U` 開頭的 33 碼英數字，例如 `U1234567890abcdef...`）。
3. 這個 ID 將填入環境變數 `SUPER_ADMIN_LINE_IDS`，您就會直接擁有**最高管理員權限**！

---

## 步驟 4：部署至 Vercel 雲端主機（支援兩種途徑）

您可依據您的需求，選擇最適合的部署方式：

---

### 途徑 A：【最推薦】免寫程式一鍵自動部署 (One-Click Deploy)
> 適合對象：**羽球團主、社團幹部、一般網友**（完全不需要終端機與寫程式！）

點擊下方按鈕，直接開始一鍵部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flulu-lovebird%2Fbadminton-line-bot&env=SUPER_ADMIN_LINE_IDS,LINE_CHANNEL_ID,LINE_CHANNEL_SECRET,LINE_CHANNEL_ACCESS_TOKEN,LINE_LIFF_ID,LINE_LIFF_URL,SUPABASE_URL,SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=%E8%AB%8B%E4%BE%9D%E7%85%A7%E9%83%A8%E7%BD%B2%E6%8C%87%E5%8D%97%E5%A1%AB%E5%85%A5%E6%82%A8%E7%9A%84LINE%E8%88%87Supabase%E9%80%A3%E7%B7%9A%E9%87%91%E9%91%B0&envLink=https%3A%2F%2Fgithub.com%2Flulu-lovebird%2Fbadminton-line-bot%2Fblob%2Fmain%2FDEPLOYMENT_GUIDE.md&project-name=badminton-line-bot&repository-name=badminton-line-bot)

1. 點擊上方按鈕後，登入或註冊 Vercel 帳號。
2. **Create Git Repository**：選擇您的 GitHub 帳號（個人或 Organization），Vercel 會自動將本專案複製（Clone）到您的 GitHub 帳號下。
3. **Configure Project**：Vercel 會自動列出預先設定好的環境變數欄位，請將步驟 1~3 取得的金鑰逐一貼入：

| 變數名稱 (Key) | 必填/選填 | 來源與說明 |
| :--- | :---: | :--- |
| `SUPER_ADMIN_LINE_IDS` | **必填** | 步驟 3 取得之您的 LINE User ID（以 `U` 開頭的 33 碼字串） |
| `LINE_CHANNEL_ID` | **必填** | 步驟 2-A 取得之 LINE Channel ID |
| `LINE_CHANNEL_SECRET` | **必填** | 步驟 2-A 取得之 LINE Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | **必填** | 步驟 2-A 取得之 LINE Long-Lived Access Token |
| `LINE_LIFF_ID` | **必填** | 步驟 2-B 取得之 LIFF ID（如 `1234567890-AbCdEfGh`） |
| `LINE_LIFF_URL` | **必填** | `https://liff.line.me/<你的LIFF_ID>` |
| `SUPABASE_URL` | **必填** | 步驟 1 取得之 Supabase Project URL |
| `SUPABASE_ANON_KEY` | **必填** | 步驟 1 取得之 Supabase `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | **必填** | 步驟 1 取得之 Supabase `service_role` secret key |
| `DEBUG` | 選填 | 設為 `on` 啟用 LIFF 除錯診斷面板，預設 `off` (關閉) |
| `SESSION_CACHE_TTL_SECONDS` | 選填 | 零打場次快取時效 (秒)，預設為 `30` |
| `EXPIRED_SESSION_CLEANUP_DAYS` | 選填 | 歷史過期場次自動清理天數，預設 `7` 天。設為 `0` 則不刪除過期場次 |
| `ALLOW_CROSS_GROUP_SESSIONS` | 選填 | 是否允許跨社團查看零打場次。預設為 `false`（嚴格社團隔離封閉模式，群組場次僅該群可見）；設為 `true` 則開啟全域撮合模式（任何管道與私訊皆可瀏覽全站所有球團之開放場次） |

#### 可選：Full 團主 Email 通知（Lite 使用者可直接略過）

預設 `EMAIL_NOTIFICATIONS_ENABLED=false`，**不需提供 Resend 金鑰或設定 DNS**，上方一鍵部署按鈕亦不要求 Email 欄位。現有 Lite 專案不必執行 Email migration；新專案的 `schema.sql` 雖含受保護的可選表，但功能關閉時不會存取它們。

若要啟用 Full，請依序：
1. 在 Supabase SQL Editor 執行 [`supabase/migrations/20261002_optional_host_email_notifications.sql`](supabase/migrations/20261002_optional_host_email_notifications.sql)。不要把既有場次或報名資料刪除。
2. 在 [Resend](https://resend.com/) 驗證可管理 DNS 的寄件網域（`*.vercel.app` 無法作寄件網域）。
3. 在 **Vercel 的 Production / Preview 各環境**分別設定 `EMAIL_NOTIFICATIONS_ENABLED=true`、`RESEND_API_KEY`（只存環境變數）以及 `EMAIL_FROM=JuJu <notify@已驗證網域>`，再重新部署；沒有完整設定時後台會顯示錯誤。勿將金鑰寫入程式或貼到對話。
4. 新團主在申請表填 Email；既有團主可在後台補填，收取驗證碼並輸入驗證。驗證前不寄含球友報名資料的通知；寄送失敗可在資料庫 `host_notification_events` 檢查，現階段未提供自動重試。

`HOST_LINE_NOTIFICATIONS_ENABLED=false` 為獨立開關。僅在明確改為 `true` 時主動私訊原始團主，會消耗 LINE 官方帳號的共用推播額度；不會恢復群組 Bot 推播。

4. 點擊 **"Deploy"**！
5. 等待約 1 分鐘，看到滿天彩帶畫面即代表部署成功！請複製 Vercel 提供給您的正式網址（例如：`https://badminton-line-bot-xxx.vercel.app`）。

---

### 途徑 B：【開發者】Fork 倉庫或本地 Git 部署
> 適合對象：**軟體工程師、前端/後端開發者**（希望客製程式碼或修改介面）

1. 前往 GitHub 專案首頁點擊右上角 **Fork**，將專案複製到您自己的 GitHub 帳號。
2. 將專案 Clone 至本機開發環境：
   ```bash
   git clone https://github.com/您的GitHub帳號/badminton-line-bot.git
   cd badminton-line-bot
   npm install
   ```
3. 建立本地環境變數檔案 `.env.local`：
   ```bash
   cp .env.example .env.local
   # 使用編輯器開啟 .env.local 填入您的金鑰
   ```
4. 啟動本地開發伺服器驗證：
   ```bash
   npm run dev
   ```
5. 將修改推送至您的 GitHub 倉庫，並在 Vercel 點擊 **"Add New Project"** 匯入該倉庫完成部署。

---

## 步驟 5：完成最後的回填綁定 (Webhook & LIFF)

拿到 Vercel 的正式網址（以下簡稱 `https://你的域名`）後，回到 [LINE Developers Console](https://developers.line.biz/console/) 完成最後兩處關鍵綁定：

### 1. 啟用 Webhook URL (讓機器人能接收群組訊息)
- 進入您的 Messaging API Channel ➔ **Messaging API** 分頁。
- 找到 **Webhook settings**：
  - **Webhook URL**：填入 `https://你的域名/api/webhook`（例如 `https://badminton-line-bot-xxx.vercel.app/api/webhook`）
  - 點擊 **Update** 儲存。
  - 點擊 **Verify** 進行連線測試（應顯示 `Success`）。
  - 將下方的 **Use webhook** 開關切換為 **開啟 (綠色 ON)**。

### 2. 更新 LIFF Endpoint URL (讓手機介面正確載入)
- 進入剛才建立的 LIFF App 編輯頁面：
  - 將 **Endpoint URL** 更新為正式網址：`https://你的域名/liff/sessions`
  - 再次確認 **Share Target Picker** 為 **On**。
  - 點擊 **Update** 儲存。

---

## 🎉 恭喜上線！如何驗證系統運作？

### 測試 1：邀請進群組
1. 在手機 LINE 建立一個測試群組，將您的「零打小幫手」機器人邀請進群。
2. 小幫手會自動發送一張「歡迎報到」卡片。

### 測試 2：依群組申請團主並審核
1. 申請人須加入測試群組，從群內歡迎卡片開啟 LIFF「團主管理後台」；也可從圖文選單進入，但要在申請頁**明確選擇該群名稱**。
2. 送出申請後，最高管理員在審核列表確認「申請人＋群組」，核准後至「團主群組授權」確認關係已建立。即使使用者已是其他群的團主，新群仍須另申請；最高管理員也可直接在授權列表新增、修改或刪除關係。
3. 申請人重新開啟後台，確認只能選已獲授權且啟用的群組。

### 測試 3：在對應群組開團並免額度分享
1. 在手機打開團主管理後台：`https://liff.line.me/<你的LIFF_ID>/admin`。
2. 在「建立新場次」**明確選擇場次所屬的已授權群組**；季打優惠預設未啟用，若要設定請勾選後填入大於 0 的整數金額。建立測試場次（正取 8 人、備取 2 人）；群組不可留空。
3. **建立場次不會由 Bot 自動推播到群組**，原有開團自動推播與 Bot 補發卡片功能已停用。建立後由團主在 LINE 內用 LIFF 分享 Flex 卡片，親自選擇場次所屬群組發送（0 則 Bot 主動推播額度）；手動複製報名連結仍可作為備用。
4. 點擊卡片上的「立即報名」，測試正取與備取排隊流程。

### 測試 4：超級管理員後台
在手機打開 `https://liff.line.me/<你的LIFF_ID>/super-admin`，可檢視群組及團主對應關係、依群組審核申請，並在「團主群組授權」直接新增、修改、刪除授權。刪除授權不會清除歷史場次。

---

## ❓ 常見問題與除錯 (FAQ & Troubleshooting)

#### Q1: 點擊「分享 Flex 卡片」時出現「您的環境目前不支援社群分享器」？
- **原因**：LINE Developers Console 中的 LIFF App 尚未開啟 Share Target Picker，或是在外部一般瀏覽器（如 Safari/Chrome）中開啟。
- **解法**：請至 LINE Developers 後台該 LIFF App 設定中，將 **Share Target Picker** 切換為 **On**，並確保在手機 LINE 內建瀏覽器中操作。

#### Q2: Webhook 點擊 Verify 測試失敗？
- **原因**：Vercel 尚未部署完成、網址打錯、或是 `LINE_CHANNEL_SECRET` 與 `LINE_CHANNEL_ACCESS_TOKEN` 貼錯或帶有頭尾空格。
- **解法**：請至 Vercel Dashboard 檢查部署日誌（Logs），並確認環境變數無多餘空白。

#### Q3: 點擊報名或開團時，頁面有轉圈圈提示？
- **原因**：本系統使用 Vercel 與 Supabase 的 Free Tier，若數小時無人使用會有 Serverless 冷啟動延遲（約 1~2 秒）。
- **解法**：系統已內建顯式的「正在讀取資料中，請稍候...」動畫與快取機制，冷啟動完成後即恢復極速反應。
