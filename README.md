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
- **📋 報名紀錄 (`/liff/my-records`)**：
  - 檢視個人所有報名紀錄與繳費狀態。
  - **時間衝突自動偵測**：若報名的兩場次時間重疊，以 **🔴 紅色底色** 明顯警示。
  - **取消報名**：一鍵取消，系統自動連動遞補機制。

### 2. 團主管理後台 (LIFF 前端 `/liff/admin`)
- **➕ 建立零打場次**：
  - 設定型式（單打/雙打）、時間、地點、正取/備取人數上限、用球、程度等級、費用與備註。
  - 建立後自動生成精美的 **LINE Flex Message 卡片** 推播至指定群組。
- **📊 場次總覽與名單管理**：
  - 場次進度顏色標記：**🟢 深綠色（已額滿）** / **🟡 淺綠色（招募中）**。
  - 點入個別場次可查看正取與備取名單。
  - **手動代報名**：團主可直接幫群組外朋友新增報名 (+1)。
  - **強制取消球友**：移除特定球友報名，自動遞補備取 1。
  - **收款對帳追蹤**：點擊切換繳費狀態，**🟠 橘色（待付款）** / **🟢 綠色（已付款）**。
- **📢 緊急推播通知**：
  - 針對單一場次的所有報名球友，一鍵批次發送 LINE 推播訊息（例如：臨時更換場地、停打通知）。

### 3. 核心自動化邏輯 (Backend)
- **🎉 備取自動遞補機制**：
  - 當正取球友或團主取消報名時，系統自動將排在第一位的備取球友遞補為正取，並透過 LINE 機器人自動發送一對一私訊通知！

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
