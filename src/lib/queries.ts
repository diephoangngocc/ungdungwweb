import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { MAX_USES, type AdminAction, type AdminReport, type CodeRow } from '@/lib/types';

export type FeedData = {
  active: CodeRow[];
  full: CodeRow[];
  error: string | null;
};

/**
 * Feed công khai. Chỉ mã `status = 'active'` — mã bị admin gỡ biến mất hoàn toàn
 * khỏi giao diện người dùng (nhưng vẫn còn trong DB để giữ chuỗi parent_code).
 *
 * Tách 2 truy vấn:
 *  - `active`: used_count < 10 -> khớp partial index `codes_feed_active_idx`
 *    (tier desc, created_at asc) WHERE used_count < 10 AND status = 'active'
 *  - `full`:   used_count = 10, giới hạn N mã gần nhất cho khu vực thu gọn.
 */
export async function getFeed(fullLimit = 30): Promise<FeedData> {
  const supabase = getSupabaseServerClient();

  const [activeRes, fullRes] = await Promise.all([
    supabase
      .from('codes')
      .select('*')
      .eq('status', 'active')
      .lt('used_count', MAX_USES)
      .order('tier', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('codes')
      .select('*')
      .eq('status', 'active')
      .gte('used_count', MAX_USES)
      .order('created_at', { ascending: false })
      .limit(fullLimit),
  ]);

  return {
    active: (activeRes.data as CodeRow[] | null) ?? [],
    full: (fullRes.data as CodeRow[] | null) ?? [],
    error: activeRes.error?.message ?? fullRes.error?.message ?? null,
  };
}

// =============================================================================
// Truy vấn cho trang admin — dùng secret key, CHỈ gọi sau khi đã xác thực cookie
// =============================================================================

export type AdminStats = {
  total: number;
  active: number;
  full: number;
  removed: number;
  selfDeclared: number;
  openReports: number;
};

export type AdminData = {
  stats: AdminStats;
  openReports: AdminReport[];
  codes: CodeRow[];
  recentActions: AdminAction[];
  error: string | null;
};

export async function getAdminData(): Promise<AdminData> {
  const supabase = getSupabaseAdminClient();

  const [codesRes, reportsRes, actionsRes] = await Promise.all([
    supabase
      .from('codes')
      .select('*')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('admin_reports_view')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: true }),
    supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const codes = (codesRes.data as CodeRow[] | null) ?? [];
  const openReports = (reportsRes.data as AdminReport[] | null) ?? [];

  return {
    stats: {
      total: codes.length,
      active: codes.filter((c) => c.status === 'active').length,
      full: codes.filter((c) => c.status === 'active' && c.used_count >= MAX_USES).length,
      removed: codes.filter((c) => c.status === 'removed').length,
      selfDeclared: codes.filter((c) => c.self_declared && c.status === 'active').length,
      openReports: openReports.length,
    },
    openReports,
    codes,
    recentActions: (actionsRes.data as AdminAction[] | null) ?? [],
    error: codesRes.error?.message ?? reportsRes.error?.message ?? actionsRes.error?.message ?? null,
  };
}
