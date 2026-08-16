import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

/**
 * Client chạy PHÍA SERVER (Server Component + Server Action).
 *
 * Dùng anon key là đủ và an toàn vì:
 *  - RLS chỉ mở SELECT; anon đã bị revoke INSERT/UPDATE/DELETE trên `codes`.
 *  - Đường ghi duy nhất là RPC `submit_code` (SECURITY DEFINER) đã validate.
 * Nếu muốn siết hơn nữa: revoke execute khỏi anon và dùng SUPABASE_SERVICE_ROLE_KEY
 * ở đây — khi đó chỉ server của bạn mới gọi được RPC.
 */
let cached: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Chấp nhận cả định dạng key mới (sb_publishable_/sb_secret_) lẫn legacy JWT
  // (anon/service_role) — Supabase khai tử legacy JWT vào cuối 2026.
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc key Supabase ' +
        '(NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY). Xem .env.example.',
    );
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
