-- 每筆報名可由團主註記實際到場人員稱呼；不變更報名者、報名人數或費用。
-- 請先於 Supabase SQL Editor 套用，再部署使用此欄位的程式。
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attendee_name TEXT;
COMMENT ON COLUMN registrations.attendee_name IS '團主註記的實際到場人員稱呼（多人可自由文字填寫）；不取代原報名姓名';
