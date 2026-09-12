import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// 用於前端/LIFF 公開查詢 (遵從 RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 用於後端 API / Webhook (繞過 RLS 的管理員 client)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
