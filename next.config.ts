import type { NextConfig } from "next";

const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const cleanSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  // 將後端/Vercel 的環境變數安全映射到前端，避開 Vercel 對 NEXT_ 前綴的限制
  env: {
    NEXT_PUBLIC_LIFF_ID: process.env.LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || '',
    NEXT_PUBLIC_LIFF_URL: process.env.LINE_LIFF_URL || process.env.NEXT_PUBLIC_LIFF_URL || '',
    NEXT_PUBLIC_SUPABASE_URL: cleanSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    NEXT_PUBLIC_DEBUG: (process.env.DEBUG || process.env.NEXT_PUBLIC_DEBUG || 'off').toLowerCase().trim(),
    NEXT_PUBLIC_ALLOW_CROSS_GROUP_SESSIONS: (process.env.ALLOW_CROSS_GROUP_SESSIONS || process.env.NEXT_PUBLIC_ALLOW_CROSS_GROUP_SESSIONS || 'false').toLowerCase().trim(),
  },
};

export default nextConfig;
