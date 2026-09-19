-- ============================================================
-- 羽球零打小幫手：群組固定咖與季打優惠資料庫擴充
-- ============================================================

-- 1. 建立 group_memberships (群組成員名冊與固定咖設定)
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    is_regular BOOLEAN NOT NULL DEFAULT TRUE,           -- 是否為固定咖 (開團預設自動帶入)
    has_seasonal_discount BOOLEAN NOT NULL DEFAULT FALSE, -- 是否享有季打優惠
    seasonal_fee INT CHECK (seasonal_fee > 0),          -- 個人特定季打優惠價 (NULL 則採用場次季打優惠價)
    valid_from DATE,                                    -- 季打/固定咖生效起始日
    valid_until DATE,                                   -- 季打/固定咖效期結束日
    notes TEXT,                                         -- 團主備忘 (如: 已繳 2026 Q3 季費)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 部分索引優化查詢開團預載名單
CREATE INDEX IF NOT EXISTS idx_group_memberships_active_regulars 
ON group_memberships(group_id) 
WHERE is_regular = TRUE;

-- 2. 擴充 match_sessions (支援場次通用季打優惠價)
ALTER TABLE match_sessions 
ADD COLUMN IF NOT EXISTS seasonal_fee INT CHECK (seasonal_fee > 0);

-- 3. 擴充 registrations (支援記錄固定咖標記、預載來源與實收金額)
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS is_regular BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_prefilled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applicable_fee INT CHECK (applicable_fee >= 0);

