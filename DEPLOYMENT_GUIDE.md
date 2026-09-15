# 🚀 羽球零打報名 LINE 機器人完整部署操作指南 (Deployment Guide)

本指南將手把手引導您完成從 **Supabase 資料庫建置**、**LINE 官方後台設定**、到 **Vercel 一鍵正式上線** 的完整流程。

---

## 📋 部署準備清單 (Checklist)
在開始前，請確認您已備妥：
1. **GitHub 帳號**（用來託管專案程式碼）
2. **Supabase 帳號**（免費 PostgreSQL 資料庫）
3. **Vercel 帳號**（免費 Serverless 雲端主機）
4. **LINE 帳號**（進入 LINE Developers Console）

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
   - 打開本專案中的 [`supabase/schema.sql`](supabase/schema.sql)，**複製全部內容**並貼入 SQL Editor。
   - 點擊右下角的 **"Run"** 執行。執行成功後，資料表（`users`, `groups`, `match_sessions`, `registrations`）與觸發器即建置完畢。
4. 取得 Supabase 連線金鑰：
   - 點擊左下角 **Project Settings (齒輪圖示)** -> **API**。
   - 複製並記錄以下三個值：
     - `Project URL`（對應 `NEXT_PUBLIC_SUPABASE_URL`）
     - `Project API keys` 中的 `anon public`（對應 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
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
3. 複製並記錄生成的 **LIFF ID**（格式如 `1234567890-AbCdEfGh`，對應 `NEXT_PUBLIC_LIFF_ID`）。
   - 對應的 `NEXT_PUBLIC_LIFF_URL` 即為 `https://liff.line.me/<你的LIFF_ID>`。

---

## 步驟 3：查詢您自己的 LINE User ID (設定最高管理員)

1. 在 LINE Developers Console 的首頁右上角，點擊您的大頭貼進入 **Profile**。
2. 複製頁面中的 **Your user ID**（以 `U` 開頭的 33 碼英數字，例如 `U1234567890abcdef...`）。
3. 這個 ID 將填入環境變數 `SUPER_ADMIN_LINE_IDS`，您就會直接擁有**最高管理員權限**！

---

## 步驟 4：將程式碼推送至 GitHub

在您本機終端機執行以下指令：

```bash
cd /Users/myhsu/Devel/badminton-line-bot

# 1. 初始化 Git（若尚未初始化）
git init

# 2. 加入所有檔案並提交
git add .
git commit -m "feat: complete badminton line bot with multi-tenant and admin features"

# 3. 前往 GitHub 建立一個新 Repository (例如 badminton-line-bot)
# 4. 關聯遠端並推播
git branch -M main
git remote add origin https://github.com/您的GitHub帳號/badminton-line-bot.git
git push -u origin main
```

---

## 步驟 5：部署至 Vercel (一鍵上線)

1. 前往 [Vercel 官網](https://vercel.com) 登入。
2. 點擊 **"Add New..."** -> **"Project"**。
3. 在 Import Git Repository 列表中找到剛剛建立的 `badminton-line-bot`，點擊 **"Import"**。
4. 在 **Environment Variables** 區塊，逐一貼入以下環境變數：

| 變數名稱 (Key) | 說明 / 範例值 (Value) |
| :--- | :--- |
| `SUPER_ADMIN_LINE_IDS` | 您的 LINE User ID (步驟 3 取得) |
| `LINE_CHANNEL_ID` | LINE Channel ID (步驟 2-A 取得) |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret (步驟 2-A 取得) |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token (步驟 2-A 取得) |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID (步驟 2-B 取得) |
| `NEXT_PUBLIC_LIFF_URL` | `https://liff.line.me/<你的LIFF_ID>` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL (步驟 1 取得) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase anon public key (步驟 1 取得) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret key (步驟 1 取得) |

5. 點擊 **"Deploy"**！
6. 等待約 1 分鐘，Vercel 就會部署成功，並發放一組正式的 HTTPS 域名（例如：`https://badminton-line-bot.vercel.app`）。

---

## 步驟 6：完成最後的回填綁定 (Webhook & LIFF)

拿到 Vercel 的正式網址後，回到 LINE Developers Console 完成最後兩項設定：

### 1. 啟用 Webhook URL
- 進入 Messaging API Channel -> **Messaging API** 分頁。
- 找到 **Webhook settings**：
  - **Webhook URL**：填入 `https://你的Vercel域名/api/webhook`（例如 `https://badminton-line-bot.vercel.app/api/webhook`）
  - 點擊 **Update**，接著點擊 **Verify** 測試連線（應顯示 `Success`）。
  - 將下方 **Use webhook** 的開關切換為 **開啟 (綠色 ON)**。

### 2. 更新 LIFF Endpoint URL
- 進入 LIFF 分頁，點擊剛建立的 LIFF App 進入編輯：
  - 將 **Endpoint URL** 修改為正式網址：`https://你的Vercel域名/liff/sessions`
  - 點擊 **Update** 儲存。

---

## 🎉 恭喜完成！如何驗證系統運作？

### 測試 1：邀請進群組
1. 在手機 LINE 建立一個測試群組，將您的「零打小幫手」機器人邀請進群。
2. 小幫手應會自動發送一張「歡迎報到」卡片。

### 測試 2：開團與報名
1. 以您的管理者帳號在手機打開：`https://liff.line.me/<你的LIFF_ID>/admin`（或從私訊選單進入），建立一個週六的測試場次。
2. 建立後群組會收到開團 Flex 卡片。
3. 點擊「立即報名」，測試正取登記與滿額備取功能！

### 測試 3：超級管理後台
1. 在手機打開：`https://liff.line.me/<你的LIFF_ID>/super-admin`。
2. 您可以看到剛剛加入的群組與使用者清單，具備一鍵停用、退群與團主授權功能！
