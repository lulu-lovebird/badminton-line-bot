import { createClient } from '@supabase/supabase-js';

// 同時支援 SUPABASE_URL (Vercel 建議) 與 NEXT_PUBLIC_SUPABASE_URL
const rawUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co';

// 🛡️ 自動過濾結尾多餘的 /rest/v1 或斜線，防止 Supabase JS SDK 產生雙重 /rest/v1/rest/v1 404 錯誤
const supabaseUrl = rawUrl
  .trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

const supabaseAnonKey = (
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_anon_key'
).trim();

const supabaseServiceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey
).trim();

// 前端公開 Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 後端 Admin Client (完全繞過 RLS，確保後端寫入成功)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
