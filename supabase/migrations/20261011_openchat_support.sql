-- 支援 LINE 社群 (OpenChat) 擴充欄位
-- 1. groups.group_type: 'group' (一般 LINE 群組) | 'openchat' (LINE 社群)
-- 2. groups.join_token: LINE 社群專屬報名 Token 憑證（一般群組為 NULL）

ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT 'group';

-- 加入 CHECK 約束確保 group_type 僅限 'group' 或 'openchat'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_groups_group_type'
    ) THEN
        ALTER TABLE groups ADD CONSTRAINT check_groups_group_type CHECK (group_type IN ('group', 'openchat'));
    END IF;
END $$;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_token TEXT;

COMMENT ON COLUMN groups.group_type IS '群組型態: group (一般 LINE 群組) | openchat (LINE 社群)';
COMMENT ON COLUMN groups.join_token IS 'LINE 社群專屬驗證 Token 憑證，開團報名連結需攜帶此 Token 方可報名';
