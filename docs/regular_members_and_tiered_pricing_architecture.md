# 🏸 團主進階功能架構設計草案：季打球友管理、單場優惠價與開團預載固定咖

> **專案**: 羽球零打小幫手 (Badminton LINE Bot & Web)  
> **維護單位**: Bean, Bird & Badminton Tech Consulting (BBB Tech Consulting)  
> **狀態**: 架構審查階段 (Planning & Architecture Review) — **先不進行任何 Coding**

---

## 一、 商業場景與痛點分析 (Context & Pain Points)

在台灣的羽球社群與零打團經營中，團主的營運模式通常包含兩種球友：
1. **單次零打球友 (Drop-in Players)**：每週視情況登記，繳交單場零打公定價（例如：$200 ~ $250）。
2. **季打 / 長期固定球友 (Quarterly / Regular Members)**：
   - 通常一次繳交一整季（例如 12~13 週）或長期包月費用。
   - 折合單場費用通常較為便宜（例如優惠單場 $150 ~ $180）。
   - **痛點 1（球友端）**：固定咖每週都要去系統跟散客搶名額登記，若忘記點按鈕還可能落入候補，體驗極差。
   - **痛點 2（團主端）**：團主每次開新場次，若最大上限 8 人、已有 4 位季打固定咖，團主常需手動扣減上限設為 4 人，或者開團後手動幫固定咖一筆筆「代報名」，重複操作費時且容易記錯人或人數計算混亂。
   - **痛點 3（對帳與費用端）**：目前名單上的費用一律顯示場次公定價，團主在現場或名單核對時，難以區分誰是季打優惠價、誰是單次零打價，收款與核帳容易出錯。

---

## 二、 核心功能需求拆解 (Functional Requirements)

1. **群組季打 / 固定咖管理 (Quarterly / Regular Roster Management)**：
   - 團主可在管理後台針對特定群組（或自身名下球友），將群組內常打球友標記為「季打 / 固定咖」。
   - 設定**季打單場優惠價**（例如：預設全場 $200，某球友或該群固定價為 $160）或**有效期限**（例如：2026 Q3 或至 2026-09-30）。
2. **開團時自動帶入 / 勾選固定咖 (Auto-prefill Regulars on Session Creation)**：
   - 團主開新場次時，系統自動列出該群組/團主的固定咖清單（預設全部勾選或可彈性勾選）。
   - 勾選的固定咖會直接在開場建立時**自動列為正取（status: 'main'）**，不必等球友手動報名。
   - 名額計算：自動消耗場次的正取名額（例如 8 人上限，預載 4 位固定咖，剩餘開放零打名額即為 4 人）。
3. **保留彈性移除與請假退訂 (Manual Removal & Opt-out)**：
   - **開團當下**：團主可在建立場次頁面上取消勾選本週請假的固定咖。
   - **開團後管理**：團主仍可在場次詳情名單中「手動移除」固定咖。
   - **固定咖自行取消/請假**：若固定咖臨時有事，可在報名頁面或「我的紀錄」中點擊取消（請假），系統將**自動釋出名額並將候補第一順位轉正取**，並推播通知候補者！
4. **名單與收費差異化呈現 (Tiered Pricing Display)**：
   - 報名表與名單中標註「季打」或「零打」標籤。
   - 報名記錄中的 `applicable_fee`（適用費用）準確記錄個人應繳金額，便於團主後台對帳與標記付款。

---

## 三、 資料庫模型設計 (Schema Evolution Proposal)

為確保向下相容並維持多群組隔離架構，建議擴充以下設計：

### 1. 新增：`group_memberships` (群組球友會員與固定咖設定表)
```sql
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    member_type TEXT NOT NULL DEFAULT 'regular', -- 'regular' (固定咖/季打) | 'general' (一般散客球友)
    custom_fee INT,                             -- 個人或季打單場優惠價 (NULL 則採用場次預設費用)
    valid_until DATE,                           -- 季打有效期限 (例: 2026-09-30，到期自動轉為散客)
    is_auto_prefill BOOLEAN NOT NULL DEFAULT TRUE, -- 開團時是否預設自動勾選帶入
    notes TEXT,                                 -- 團主備忘 (如: 已繳 2026 Q3 季費 2000 元)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_lookup 
ON group_memberships(group_id, member_type, is_auto_prefill);
```

### 2. 擴充：`match_sessions` (開團時預設季打價)
在場次上支援全場通用的「季打/固定單場優惠價」設定，避免每個人都要個別指定：
```sql
ALTER TABLE match_sessions 
ADD COLUMN IF NOT EXISTS regular_fee INT; -- 季打優惠價 (例: fee=220, regular_fee=180)
```

### 3. 擴充：`registrations` (記錄報名身分與適用費用)
```sql
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS member_type TEXT NOT NULL DEFAULT 'drop_in', -- 'drop_in' (單次零打) | 'regular' (季打固定咖)
ADD COLUMN IF NOT EXISTS applicable_fee INT;                          -- 實際適用單場金額 (如 180)
```

---

## 四、 核心工作流程與 API 規格 (Workflows & API Design)

### 流程 A：團主設定群組季打名單
1. 團主在 LIFF 管理後台開啟「群組球友與季打管理」頁面。
2. 系統列出曾在該群組報名過或有群組互動的球友清單。
3. 團主點選球友，設定為「季打固定咖」，輸入其單場優惠價（或吃場次預設價）與有效期限。
4. 儲存至 `group_memberships`。

### 流程 B：開團並預載固定咖
1. 團主進「建立場次」表單，選擇目標群組。
2. 前端自動向 `/api/groups/members?groupId=xxx&type=regular` 取得該群有效固定咖名單。
3. 介面呈現「預載固定咖 (4人)」勾選清單：
   - 預設全勾選（若某固定咖已知要請假，團主可取消打勾）。
   - 顯示「開放零打名額：4 人 (總上限 8 人 - 固定咖 4 人)」。
4. 團主點擊「送出開團」：
   - POST `/api/sessions` 帶著 `prefilled_user_ids: ["U123", "U456", ...]`。
   - 後端使用資料庫 Transaction（交易），建立 `match_sessions` 的同時，一併將固定咖寫入 `registrations`（`status: 'main'`，`member_type: 'regular'`）。
   - 當群組收到開團 Flex 卡片時，卡片即時顯示「目前已報 4/8 人 (含固定咖 4 位)」，路過球友立即知悉還有 4 個零打名額！

### 流程 C：固定咖請假與自動遞補
1. 固定咖打開 LIFF 或我的紀錄，看到該場次已被預約，若當週不克前往，點擊「取消 / 請假」。
2. 後端呼叫 `cancelRegistrationAndPromote(registration_id)`：
   - 將固定咖狀態設為 `cancelled`。
   - 若有候補球友（`waitlist_order = 1`），**自動秒級將候補第一位轉為正取**。
   - 透過 LINE Messaging API 私訊通知候補者「您已成功遞補週六羽球零打正取！」。
3. 團主名單即時連動更新，全程零手動介入。

---

## 五、 請右側 Pane (M2 Pro agy Reviewer) 審查重點

1. **資料結構相容性**：
   - `group_memberships` 是否需要支援「跨群共用團主固定咖」（團主跨多個群組，某些球友跟著團主打，無特定 group_id）？
   - 還是嚴格綁定 `group_id` 確保多租戶 (Multi-tenant) 資料隔離？
2. **開團併發與名額扣減 (Race Condition & Transaction)**：
   - 在建立場次時直接批量寫入 `registrations`，如何確保正取人數與 `max_players` 一致性？
3. **退訂請假與遞補體驗 (Cancellation & Promotion UX)**：
   - 季打通常已預繳整季費用，請假時退費或補打如何界定？（系統是否只需記錄請假/取消，不涉入複雜退費金流？）
   - 固定咖手動移除後，若下週開團時是否仍會被預載？
4. **前端 UI/UX 負擔**：
   - 團主後台是否會因為增加季打管理而過於繁複？如何保持開團介面的簡潔與高效率？
