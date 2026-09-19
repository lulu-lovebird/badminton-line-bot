# 🏸 Facebook 零打社團開團與報名整合架構方案規劃 (Architecture Proposal)

## 一、 商業與使用者場景分析 (Context & Pain Points)

在台灣的羽球社群中，除了 LINE 群組外，**Facebook 零打社團**（例如：台北羽球零打揪團、新北羽球同好會等，動輒數萬人）也是極其龐大的開團與找球咖管道。

### 現行 Facebook 開團痛點：
1. **留言區混亂**：團主貼文發布後，球友在留言區回覆「+1」、「帶一位」，團主難以精準追蹤時間戳順序、正取與候補。
2. **名額缺乏即時性**：路過球友不知道貼文是否額滿，常留言問「還有名額嗎？」，團主得不斷手動更新貼文內文。
3. **取消通知失聯**：有人在開打前幾小時刪留言或請假，候補球友往往沒看到通知而流標。
4. **摩擦成本 (Friction)**：球友不願意為了報名一場零打而下載一個全新的 App，更極度排斥「另外填寫帳號密碼註冊帳號」。

---

## 二、 核心架構決策：Facebook App vs. 獨立 Website (PWA/Responsive Web)

| 維度評估 | 方案 A：Facebook Canvas App / 深度外掛 | 方案 B：獨立 Web (RWD + PWA) 透過連結導入 (推薦 ⭐⭐⭐⭐⭐) |
| :--- | :--- | :--- |
| **技術可行性** | ❌ **極低**。Meta 近年大幅收緊 Facebook Graph API，第三方 App 無法任意存取公開/私人社團貼文或留言，審核門檻極高。 | ✅ **極高**。現有 Next.js 16 架構天然支援，部署在 Vercel 上具備極佳效能與 SEO/OG 卡片預覽。 |
| **球友使用門檻** | ❌ 需透過 FB 內部跳轉或受限於 FB 內建瀏覽器政策。 | ✅ **零安裝**。團主在 FB 貼文貼上「專屬報名短連結」，球友點擊直接在 FB In-App Browser 或 Safari/Chrome 開啟。 |
| **社團擴散力** | ❌ 封閉在特定 App。 | ✅ **極強**。Open Graph (OG Tags) 動態生成帶有「場次時間、地點、招募中/額滿」的社群預覽大圖卡。 |
| **跨平台整合** | ❌ 無法與現有 LINE Bot 共存。 | ✅ **無縫整合**。後端同屬 Supabase 同一個 `match_sessions` 資料庫，LINE 與 FB 雙軌並行！ |

> 💡 **架構結論**：**採「Website-First (響應式行動網頁)」架構**，捨棄審核極嚴苛且不穩定的 Facebook App 封閉形式。團主只需在 FB 社團發文並附帶「報名網址」，球友點擊立即卡位。

---

## 三、 身分驗證 (Auth) 策略：零註冊負擔，第三方社群登入 (Social Login)

為了避免球友因「要註冊會員」而放棄報名，系統**徹底放棄傳統 Email/密碼註冊機制**，採用 **Supabase Auth 原生支援的 OAuth 社群登入**：

### 1. 支援登入管道 (Social Providers)
* **🔵 Facebook Login**：FB 社團球友的本命登入方式。點擊一次即完成授權，自動取得 FB 名稱與頭貼。
* **🟢 LINE Login**：台灣普及率最高，方便同時使用 LINE 的球友。
* **🔴 Google One-Tap / OAuth**：Android 與 Chrome 用戶一秒登入。
* **⚫ Apple ID (Sign in with Apple)**：iOS Safari 用戶 Face ID 一鍵秒授權。

### 2. 資料庫多身分關聯設計 (Unified User Entity)
在 Supabase 現有的 `users` 表結構中進行擴充，實現一人多管道帳號綁定：
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
-- 透過 auth.users 觸發器 (Trigger)，球友無論用 FB、LINE 還是 Google 登入，皆對應至同一位 player
```

---

## 四、 團主在 Facebook 的開團與推廣工作流 (Host & Player Flow)

### 關鍵體驗亮點：動態 Open Graph (OG) 圖片預覽
* 當團主將報名連結貼至 FB 貼文時，Next.js 的 `ImageResponse` (Edge API) 會**即時動態生成包含開團資訊的圖片**：
  * 「🏸 週六秀朗國小歡樂團 | 📅 3/22 18:00 | 📍 新北永和 | 🟢 熱烈招募中 (6/8)」
* 球友在 FB 動態牆上一眼就能看見最新即時名額，點進去即可報名。

---

## 五、 遞補與緊急通知機制 (Notifications)

在 LINE 環境下有免費的官方 Bot 被動回覆與遞補私訊；在 FB/獨立 Web 環境下，球友登出網頁後如何收到「遞補成功通知」或「臨時停打通知」？

1. **優先：PWA Web Push (瀏覽器推播通知)**：
   * 球友報名後，提示「開啟開團與遞補通知」，iOS 16.4+ 與 Android Chrome 皆支援背景推播。
2. **選用：LINE 帳號綁定 (強大綜效)**：
   * 球友在 FB 登入報名後，頁面提示：「綁定 LINE 官方帳號，隨時接收候補私訊通知！」（導流回 JuJu 機器人）。
3. **備援：Transactional Email / SMS (Resend 免費額度)**：
   * 若球友授權包含 Email，以免費的 Resend / Supabase Auth 寄送即時遞補確認信。

---

## 六、 待請右側 Pane (M2 Pro agy) Review 之重點

1. **Web-first 策略 vs Facebook App 審核可行性評估**。
2. **Supabase Auth (Facebook OAuth + Google + Apple + LINE) 架構擴充之複雜度**。
3. **無 LINE Bot 環境下，Web 端候補遞補通知的最佳落地實踐**。
4. **現有 Supabase 資料庫 schema 的平滑過渡方案**。
