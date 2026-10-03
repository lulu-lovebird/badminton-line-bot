-- Full/Email 模式專用；Lite 不需執行。須先執行本檔，再設定 EMAIL_NOTIFICATIONS_ENABLED=true。
-- 不在 users / host_applications 等可能由 anon API 查詢的表存放私人 Email 或驗證碼。
CREATE TABLE IF NOT EXISTS host_notification_contacts (
    user_id TEXT PRIMARY KEY REFERENCES users(line_user_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    code_hash TEXT,
    code_expires_at TIMESTAMPTZ,
    code_sent_at TIMESTAMPTZ,
    code_attempts INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE host_notification_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON host_notification_contacts FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS host_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('registered', 'cancelled')),
    host_user_id TEXT NOT NULL REFERENCES users(line_user_id) ON DELETE CASCADE,
    email_state TEXT NOT NULL DEFAULT 'pending' CHECK (email_state IN ('pending', 'sent', 'failed', 'skipped')),
    line_state TEXT NOT NULL DEFAULT 'skipped' CHECK (line_state IN ('pending', 'sent', 'failed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (registration_id, event_type)
);
ALTER TABLE host_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON host_notification_events FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_host_notification_events_pending
    ON host_notification_events(email_state, line_state) WHERE email_state = 'failed' OR line_state = 'failed';
