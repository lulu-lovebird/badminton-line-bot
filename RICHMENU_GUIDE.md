# 📱 羽球零打小幫手圖文選單 (Rich Menu) 設定教學

圖文選單是常駐在球友與團主進入小幫手「一對一私訊聊天室」底部的視覺功能導覽列。
點擊選單按鈕會直接彈出 LIFF 介面，免輸入任何關鍵字即可完成報名與管理！

---

## 🎨 一、 圖文選單版型與功能規劃

我們採用標準 **3 格橫排版型（2500 x 843 像素）**：

```
┌─────────────────────────────────────────────────────────────┐
│                    羽球零打小幫手圖文選單                      │
├───────────────────┬───────────────────┬─────────────────────┤
│     按鈕 A        │      按鈕 B       │       按鈕 C        │
│   🏸 我要報名     │  📋 報名記錄      │    ⚙️ 團主後台      │
│                   │                   │                     │
│ (瀏覽近期場次與報名)│ (查個人行程/防衝突) │ (開團/現場對帳/廣播) │
└───────────────────┴───────────────────┴─────────────────────┘
```

| 區塊 | 名稱 | 動作類型 | 點擊跳轉網址 (Action URL) | 權限說明 |
| :--- | :--- | :--- | :--- | :--- |
| **A (左)** | **我要報名** | 開啟連結 (URI) | `https://liff.line.me/<你的LIFF_ID>/sessions` | 開放所有球友 |
| **B (中)** | **報名記錄** | 開啟連結 (URI) | `https://liff.line.me/<你的LIFF_ID>/my-records` | 開放所有球友 |
| **C (右)** | **團主後台** | 開啟連結 (URI) | `https://liff.line.me/<你的LIFF_ID>/admin` | 僅限團主/管理員（非團主進入自動阻擋） |

---

## 🖼️ 二、 選單底圖取得

選單圖片已為您設計好向量圖檔，位於專案目錄：
* **SVG 原始檔**：[`public/images/richmenu.svg`](public/images/richmenu.svg)
* **規格**：`2500 x 843 像素`，採用羽球經典「翠綠色 (我要報名)」+「青湖綠 (報名記錄)」+「深墨色 (團主後台)」，清爽大方且文字辨識度極高。

> 💡 **提示**：若使用 LINE 官方後台建立，可使用瀏覽器打開 `public/images/richmenu.svg` 另存為 PNG，或使用 Canva 建立 2500x843 像素的圖片。

---

## ⚙️ 三、 設定圖文選單的兩種方式

### 方法 A：透過 LINE Official Account Manager (網頁後台設定，最推薦 ⭐⭐⭐⭐⭐)

1. 前往 [LINE Official Account Manager](https://manager.line.biz/) 並登入您的帳號。
2. 選擇您的零打小幫手官方帳號。
3. 在左側選單點擊 **聊天室管理** -> **圖文選單 (Rich Menus)**。
4. 點擊右上角 **建立 (Create)**：
   - **標題 (Title)**：`零打小幫手主要選單`
   - **使用期間 (Display period)**：設定開始時間為今天，結束時間設為未來（例如 2030 年）。
   - **聊天室選單文字 (Menu bar text)**：輸入 `🏸 點我開啟零打選單`。
   - **預設動作 (Default behavior)**：選擇 `顯示 (Display)`。
5. **內容設定 (Design & Actions)**：
   - 點擊 **選擇版型 (Select template)** -> 選擇 **小型 (Compact)** 區塊裡的 **3 格版型 (橫向三等分)**。
   - 點擊 **上傳圖片 (Upload image)**，上傳您的選單底圖。
   - 設定各格動作：
     - **A (左格)**：類型選擇 `連結 (URL)`，填入 `https://liff.line.me/<你的LIFF_ID>/sessions`。
     - **B (中格)**：類型選擇 `連結 (URL)`，填入 `https://liff.line.me/<你的LIFF_ID>/my-records`。
     - **C (右格)**：類型選擇 `連結 (URL)`，填入 `https://liff.line.me/<你的LIFF_ID>/admin`。
6. 點擊 **儲存 (Save)**，圖文選單立即生效！

---

### 方法 B：透過 Node.js 腳本一鍵設定 (Code CLI ⭐⭐⭐)

專案內已準備好自動建立腳本 [`scripts/create-richmenu.ts`](scripts/create-richmenu.ts)。

當您在 `.env.local` 填好 `LINE_CHANNEL_ACCESS_TOKEN` 與 `LINE_LIFF_URL` (或 `NEXT_PUBLIC_LIFF_URL`) 後，只需在終端機執行：

```bash
npx tsx scripts/create-richmenu.ts
```

腳本會自動透過 LINE Messaging API：
1. 建立 2500x843 像素的 3 格選單物件與動作連結。
2. 上傳底圖（若有 `public/images/richmenu.png`）。
3. 將該選單指派為所有球友進入小幫手聊天室時的「預設選單」。
