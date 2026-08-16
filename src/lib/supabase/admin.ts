import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

/**
 * Client dùng SECRET KEY (service_role) — bỏ qua RLS hoàn toàn.
 *
 * CHỈ được gọi SAU khi đã xác thực cookie admin (xem requireAdmin() trong
 * src/app/actions/admin.ts). Các RPC admin_* trong migration 0002 đã revoke
 * khỏi anon, nên đây là con đường duy nhất chạm tới chúng.
 *
 * Biến môi trường KHÔNG có prefix NEXT_PUBLIC_ => không bao giờ lọt vào bundle
 * gửi xuống trình duyệt.
 */
let cached: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Thiếu SUPABASE_SECRET_KEY (hoặc SUPABASE_SERVICE_ROLE_KEY). ' +
        'Trang admin cần key này để gọi các hàm admin_*. Xem .env.example.',
    );
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
