'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createSessionToken,
  isAdmin,
  isPasswordCorrect,
} from '@/lib/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { describeError, parseRpcError } from '@/lib/errors';
import {
  adminCreateCodeSchema,
  adminLoginSchema,
  adminResolveReportSchema,
  adminSetStatusSchema,
  adminUpdateCodeSchema,
} from '@/lib/validation';

// 'use server' => chỉ được export async function; kiểu + hằng ở @/lib/action-state.
import type { ActionState } from '@/lib/action-state';

/**
 * Mọi server action admin PHẢI gọi hàm này trước tiên.
 * Server Action là endpoint HTTP công khai — không kiểm tra ở đây thì bất kỳ ai
 * biết action id đều gọi được, kể cả khi UI đã ẩn nút.
 */
async function requireAdmin(): Promise<ActionState | null> {
  if (await isAdmin()) return null;
  return { status: 'error', message: describeError('UNAUTHORIZED').message };
}

function rpcError(error: { message: string }): ActionState {
  return { status: 'error', message: describeError(parseRpcError(error.message)).message };
}

// -----------------------------------------------------------------------------
// Đăng nhập / đăng xuất
// -----------------------------------------------------------------------------
export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) {
    return { status: 'error', message: 'Vui lòng nhập mật khẩu.' };
  }

  let ok = false;
  try {
    ok = isPasswordCorrect(parsed.data.password);
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Chưa cấu hình mật khẩu admin.',
    };
  }

  // Trễ nhẹ để làm chậm brute-force qua mạng (đã có timing-safe compare ở lib/auth).
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600));
    return { status: 'error', message: 'Mật khẩu không đúng.' };
  }

  try {
    const store = await cookies();
    store.set(ADMIN_COOKIE, createSessionToken(), adminCookieOptions);
  } catch (e) {
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Không tạo được phiên đăng nhập.',
    };
  }

  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

// -----------------------------------------------------------------------------
// Thêm mã
// -----------------------------------------------------------------------------
export async function adminCreateCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = adminCreateCodeSchema.safeParse({
    nickname: formData.get('nickname'),
    code: formData.get('code'),
    tier: formData.get('tier'),
    parentCode: formData.get('parentCode') ?? '',
    usedCount: formData.get('usedCount') ?? 0,
    creditParent: formData.get('creditParent') === 'on',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };
  }

  const { nickname, code, tier, parentCode, usedCount, creditParent } = parsed.data;

  const { error } = await getSupabaseAdminClient().rpc('admin_create_code', {
    p_nickname: nickname,
    p_code: code,
    p_tier: tier,
    p_parent_code: parentCode,
    p_used_count: usedCount,
    p_credit_parent: creditParent,
  });

  if (error) return rpcError(error);

  revalidatePath('/admin');
  revalidatePath('/lay-ma');
  return {
    status: 'success',
    message: `Đã thêm mã ${code}${parentCode ? ` (mã cha: ${parentCode})` : ' (mã gốc)'}.`,
  };
}

// -----------------------------------------------------------------------------
// Sửa mã
// -----------------------------------------------------------------------------
export async function adminUpdateCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = adminUpdateCodeSchema.safeParse({
    code: formData.get('code'),
    nickname: formData.get('nickname'),
    tier: formData.get('tier'),
    usedCount: formData.get('usedCount'),
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };
  }

  const { code, nickname, tier, usedCount } = parsed.data;

  const { error } = await getSupabaseAdminClient().rpc('admin_update_code', {
    p_code: code,
    p_nickname: nickname,
    p_tier: tier,
    p_used_count: usedCount,
  });

  if (error) return rpcError(error);

  revalidatePath('/admin');
  revalidatePath('/lay-ma');
  return { status: 'success', message: `Đã cập nhật mã ${code}.` };
}

// -----------------------------------------------------------------------------
// Gỡ / khôi phục mã (xoá mềm)
// -----------------------------------------------------------------------------
export async function adminSetStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = adminSetStatusSchema.safeParse({
    code: formData.get('code'),
    status: formData.get('status'),
    reason: formData.get('reason') ?? undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };
  }

  const { code, status, reason } = parsed.data;

  const { error } = await getSupabaseAdminClient().rpc('admin_set_status', {
    p_code: code,
    p_status: status,
    p_reason: reason ?? null,
  });

  if (error) return rpcError(error);

  revalidatePath('/admin');
  revalidatePath('/lay-ma');
  return {
    status: 'success',
    message: status === 'removed' ? `Đã gỡ mã ${code} khỏi feed.` : `Đã khôi phục mã ${code}.`,
  };
}

// -----------------------------------------------------------------------------
// Xử lý báo lỗi
// -----------------------------------------------------------------------------
export async function adminResolveReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await requireAdmin();
  if (denied) return denied;

  // Hai nút submit cùng form, phân biệt bằng `intent` của nút bấm.
  // Suy ra status + removeCode ở server thay vì để client tự khai -> ít bề mặt sai.
  const intent = formData.get('intent');
  const parsed = adminResolveReportSchema.safeParse({
    reportId: formData.get('reportId'),
    status: intent === 'remove' ? 'resolved' : 'dismissed',
    note: formData.get('note') ?? undefined,
    removeCode: intent === 'remove',
  });

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };
  }

  const { reportId, status, note, removeCode } = parsed.data;

  const { error } = await getSupabaseAdminClient().rpc('admin_resolve_report', {
    p_report_id: reportId,
    p_status: status,
    p_note: note ?? null,
    p_remove_code: removeCode,
  });

  if (error) return rpcError(error);

  revalidatePath('/admin');
  revalidatePath('/lay-ma');
  return {
    status: 'success',
    message: removeCode
      ? 'Đã gỡ mã và đóng báo cáo.'
      : status === 'dismissed'
        ? 'Đã bỏ qua báo cáo.'
        : 'Đã xử lý báo cáo.',
  };
}
