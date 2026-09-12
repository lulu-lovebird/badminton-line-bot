import { createClient } from '@supabase/supabase-js';

// 同時支援 SUPABASE_URL (Vercel 建議) 與 NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder_anon_key';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey;

// 前端公開 Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 後端 Admin Client (完全繞過 RLS，確保後端寫入成功)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
