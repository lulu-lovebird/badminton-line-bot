-- ============================================================
-- 零打場次名單公開度 (Roster Visibility) 遷移腳本
-- 執行地點：Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE match_sessions 
ADD COLUMN IF NOT EXISTS is_roster_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN match_sessions.is_roster_public IS '是否公開已報名球友名冊 (true: 公開, false: 私密僅主揪可見)';
