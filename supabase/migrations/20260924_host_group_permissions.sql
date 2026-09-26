-- 團主權限以群組為單位；舊的 users.role = 'host' 不自動授權任何群組。
CREATE TABLE IF NOT EXISTS host_group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    group_id TEXT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_host_group_permissions_group_id ON host_group_permissions(group_id);
-- 權限資料只由後端 service_role 操作，不開放公開 anon key 直接讀寫。
ALTER TABLE host_group_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON host_group_permissions FROM anon, authenticated;

ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS group_id TEXT REFERENCES groups(group_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_host_applications_pending_group
    ON host_applications(user_id, group_id) WHERE status = 'pending';
