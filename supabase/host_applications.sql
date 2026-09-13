-- ============================================================
-- 團主身分審核資料表 (Host Applications)
-- ============================================================

CREATE TABLE IF NOT EXISTS host_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    picture_url TEXT,
    reason TEXT,                                   -- 申請原因 / 自述
    status TEXT NOT NULL DEFAULT 'pending',       -- 'pending' (待審核) | 'approved' (已核准) | 'rejected' (已駁回)
    review_notes TEXT,                             -- 審核備註 / 駁回理由
    reviewed_by TEXT REFERENCES users(line_user_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_host_applications_status ON host_applications(status);
CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_created_at ON host_applications(created_at DESC);

-- 自動更新 updated_at
CREATE OR REPLACE TRIGGER trigger_host_applications_updated_at
BEFORE UPDATE ON host_applications
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
