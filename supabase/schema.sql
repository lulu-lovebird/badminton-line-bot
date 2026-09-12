-- ============================================================
-- 羽球零打報名系統 (Badminton Line Bot) 資料庫綱要
-- 支援 Multi-Tenant (多群組共用架構)
-- ============================================================

-- 1. 使用者資料表 (球友與團主)
CREATE TABLE IF NOT EXISTS users (
    line_user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    picture_url TEXT,
    role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'host' | 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 群組資料表 (多群組支援)
CREATE TABLE IF NOT EXISTS groups (
    group_id TEXT PRIMARY KEY,                   -- LINE Group ID (以 c 開頭的字串)
    group_name TEXT,                             -- 群組名稱 (例: 秀朗週六歡樂羽球團)
    creator_user_id TEXT REFERENCES users(line_user_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 零打場次資料表 (綁定 group_id)
CREATE TABLE IF NOT EXISTS match_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT REFERENCES groups(group_id) ON DELETE SET NULL, -- 歸屬群組 (NULL 代表全域公開場次)
    host_user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,                         -- 例: 週六秀朗歡樂初中級雙打團
    match_type TEXT NOT NULL DEFAULT 'double',   -- 'single' (單打) | 'double' (雙打)
    start_time TIMESTAMPTZ NOT NULL,             -- 開始時間
    end_time TIMESTAMPTZ NOT NULL,               -- 結束時間
    location TEXT NOT NULL,                      -- 地點 (如秀朗國小羽球館)
    court_info TEXT,                             -- 面數/場地編號 (如: 第3、4場地，共2面)
    max_players INT NOT NULL DEFAULT 8,          -- 正取上限人數
    max_waitlist INT NOT NULL DEFAULT 5,         -- 備取上限人數
    level_requirement TEXT,                      -- 建議程度 (如: 4~7級 / 初中級)
    shuttlecock TEXT,                            -- 用球品牌 (如: 勝利比賽球、Yonex AS-30)
    fee INT NOT NULL DEFAULT 200,                -- 費用 (每人)
    notes TEXT,                                  -- 備註 (冷氣、飲水、收費方式等)
    cancel_deadline TIMESTAMPTZ,                 -- 免費取消截止時間
    status TEXT NOT NULL DEFAULT 'open',         -- 'open' (開放中) | 'full' (已滿) | 'closed' (已關閉) | 'cancelled' (已取消)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 報名資料表
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES match_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,                   -- 顯示名稱 (可支援替朋友代報，填朋友名字)
    party_size INT NOT NULL DEFAULT 1,           -- 報名人數 (預設 1)
    status TEXT NOT NULL DEFAULT 'main',         -- 'main' (正取) | 'waitlist' (備取) | 'cancelled' (已取消)
    waitlist_order INT,                          -- 備取順序 (1, 2, 3...)
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid' (未付款-橘色) | 'paid' (已付款-綠色)
    attendance_status TEXT DEFAULT 'pending',     -- 'pending' | 'attended' (已到) | 'absent' (缺席)
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    notes TEXT
);

-- 索引優化常用查詢
CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON match_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON match_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_registrations_session_status ON registrations(session_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);

-- 自動更新 updated_at Trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE TRIGGER trigger_groups_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE TRIGGER trigger_sessions_updated_at
BEFORE UPDATE ON match_sessions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
