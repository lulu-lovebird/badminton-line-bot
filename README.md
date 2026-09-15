# 🏸 羽球零打報名 LINE 機器人 (Badminton LINE Bot)

這是一個專為 LINE 羽球零打社團群組設計的自動化報名與管理系統。
採用 **Next.js (App Router) + Supabase (PostgreSQL) + LINE Messaging API / LIFF** 開發，可免費部署在 **Vercel** 與 **Supabase Free Tier**。

---

## ✨ 核心功能特色

### 1. 一般球友功能 (LIFF 前端)
- **🏸 我要報名 (`/liff/sessions`)**：
  - 依日期篩選與瀏覽目前開放的零打場次。
  - 一鍵報名（支援攜伴 `+1`, `+2`, `+3`）。
  - **滿額自動備取**：正取滿額自動轉為備取順位 (備1, 備2...)。
  - **指定場次自動置頂**：點擊團主分享之專屬連結時，自動置頂並以綠色螢光框標註該場次。
  - **名冊透明度支援**：公開名單可即時展開查看已報名球友；私密名單保護隱私僅統計人數，球友可點選查詢個人錄取狀態。
- **📋 報名紀錄 (`/liff/my-records`)**：
  - 檢視個人所有報名紀錄與繳費狀態。
  - **時間衝突自動偵測**：若報名的兩場次時間重疊，以 **🔴 紅色底色** 明顯警示。
  - **取消報名**：一鍵取消，系統自動連動遞補機制。

### 2. 團主管理後台 (LIFF 前端 `/liff/admin`)
- **➕ 建立零打場次**：
  - 型式選擇（雙打／單打／不限）。
  - 人數下拉選單防呆：正取上限（預設 8 人，可選 2-32）、備取上限（預設 2 人，可選 0-10）。
  - 報名名單公開度設定（🌐 公開名單／🔒 私密名單）。
  - 支援一鍵沿用舊場次資料順延 7 天開團（自動清空名單）。
- **📊 場次總覽與名單管理**：
  - 場次進度顏色標記：**🟢 深綠色（已額滿）** / **🟡 淺綠色（招募中）**。
  - **修改場次內容**：未開始之場次可隨時調整時間、地點、用球、費用與人數上限（防呆不可低於已報名人數）。
  - **手動代報名**：團主可直接幫群組外朋友新增報名 (+1)。
  - **強制取消球友**：移除特定球友報名，自動遞補備取 1。
  - **收款對帳追蹤**：點擊切換繳費狀態，**🟠 橘色（待付款）** / **🟢 綠色（已付款）**。
- **📢 緊急推播通知**：
  - 針對單一場次的所有報名球友，一鍵批次發送 LINE 推播訊息（例如：臨時更換場地、停打通知）。

### 3. 核心自動化邏輯 (Backend)
- **🎉 備取自動遞補機制**：
  - 當正取球友或團主取消報名時，系統自動將排在第一位的備取球友遞補為正取，並透過 LINE 機器人自動發送一對一私訊通知！

---

## 💡 LINE 200 則免費額度保護機制 (Zero-Quota Architecture)

LINE 官方帳號免費方案（Free Plan）每個月僅提供 **200 則主動推播（Push Message）**。在群組營運時，若 Bot 主動向群組推播，**發送 1 次訊息就會乘上群內人數（例：50 人群組推播 1 次扣 50 則）**，開 4 次團就會導致整個月額度歸零！

為徹底解決此痛點，本專案特別設計了 **三大「0 額度消耗」分享機制**：

```mermaid
flowchart TD
    Host([團主建立場次]) --> Decision{發布至群組的方式}
    
    Decision -->|方案 A: 個人名義發送| SharePicker[📲 LIFF Share Target Picker]
    SharePicker --> HostSends[以團主個人身份發送 Flex 卡片<br><b>0 額度消耗 • 原生互動按鈕</b>]
    
    Decision -->|方案 B: 快速複製連結| CopyUrl[📋 複製專屬報名連結]
    CopyUrl --> PasteUrl[團主貼到群組自帶網頁預覽<br><b>0 額度消耗</b>]
    
    Decision -->|方案 C: 複製揪團文案| CopyText[📝 複製完整排版文案]
    CopyText --> PasteText[全套時間地點文案長按貼上<br><b>0 額度消耗</b>]
    
    Decision -->|方案 D: 群友關鍵字| Keyword[群友輸入「零打」]
    Keyword --> ReplyToken[Bot 透過 replyToken 回覆<br><b>100% 免費 • 無上限</b>]
    
    Decision -.->|傳統模式: 官方 Bot 廣播| BotPush[⚠️ 官方帳號 pushMessage]
    BotPush -.-> Consume[消耗群組人數 × 1 則額度<br>極易超標導致停止服務]
```

### 1. 📲 LIFF Share Target Picker（社群分享卡片）
* 透過 LINE LIFF SDK 的 `liff.shareTargetPicker`，喚起 LINE 原生的好友／群組分享器。
* **以「團主個人 LINE 身份」在群組送出原汁原味、美觀的 Flex Message 互動卡片**（自帶綠色「立即報名」按鈕）。
* **Bot 推播額度消耗：0 則！完全免費、無上限！**

### 2. 📋 一鍵複製報名 URL & 📝 完整揪團文案
* **複製專屬報名 URL**：複製形如 `https://liff.line.me/<LIFF_ID>/sessions?sessionId=<ID>`，貼入 LINE 群組會自動產生網頁預覽卡片，球友點擊立即精準定位該場次。
* **複製完整揪團文案**：自動排版好帶有羽球 emoji、時間、地點、費用、程度、用球及報名專屬連結的專業文案，一鍵複製後至群組長按貼上即可發布。
* **Bot 推播額度消耗：0 則！**

### 3. 💬 群組關鍵字被動回覆（ReplyToken 替代 Push）
* 球友在群組輸入「零打」或「場次」，Bot 是透過 **`replyToken`（被動回覆）** 回傳開放中的場次卡片。
* **LINE 官方規範：Reply Message 完全免費且無上限！**

### 4. 🛡️ 表單防呆開關與額度保護
* 團主建立場次表單中，「由 Bot 自動推播至群組」改為**選用開關（預設關閉）**，並附有額度警語。
* **保留珍貴的 200 則 Push 額度**，專門用於最核心的「有人取消時，1 對 1 私訊通知備取第一位球友已成功遞補正取」。

---

## 🚀 快速上手與部署步驟

### 步驟 1: 設定 Supabase 資料庫
1. 前往 [Supabase](https://supabase.com) 註冊並建立免費專案。
2. 進入專案的 **SQL Editor**。
3. 複製專案內 [`supabase/schema.sql`](supabase/schema.sql) 的全部內容並執行，即可建立所有資料表與索引。
4. 到 **Project Settings** -> **API** 取得：
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public` key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role secret` key (`SUPABASE_SERVICE_ROLE_KEY`)

### 步驟 2: 設定 LINE Developers Console
1. 建立一個 **Messaging API** Channel：
   - 取得 `Channel Secret` 與 `Channel Access Token`。
   - 將 Webhook URL 設定為：`https://你的域名/api/webhook`，並開啟 **Use Webhook**。
2. 建立一個 **LIFF App**：
   - Endpoint URL 設定為你的專案網址（例如：`https://你的域名/liff/sessions`）。
   - Scope 勾選 `profile` 與 `openid`。
   - **Share Target Picker**：設定為 **On**（⚠️ 必開！開啟後才能免額度使用社群分享器發送 Flex 卡片至群組）。
   - 取得 `LIFF ID`。

### 步驟 3: 本地開發環境變數設定
複製 `.env.example` 為 `.env.local` 並填入對應金鑰：
```bash
cp .env.example .env.local
```

### 步驟 4: 部署至 Vercel
1. 將專案推送到 GitHub。
2. 在 [Vercel](https://vercel.com) 匯入該 GitHub Repo。
3. 在 Vercel 專案設定的 **Environment Variables** 填入上述所有環境變數。
4. 點擊 **Deploy** 完成部署！
