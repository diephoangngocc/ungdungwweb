'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { reportCodeSchema } from '@/lib/validation';
import { describeError, parseRpcError } from '@/lib/errors';
// 'use server' => chỉ được export async function; kiểu + hằng ở @/lib/action-state.
import type { ReportState } from '@/lib/action-state';

export async function reportCodeAction(
  _prevState: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = reportCodeSchema.safeParse({
    code: formData.get('code'),
    reason: formData.get('reason'),
    note: formData.get('note') ?? undefined,
    reporterKey: formData.get('reporterKey'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Dữ liệu báo lỗi không hợp lệ.',
    };
  }

  const { code, reason, note, reporterKey } = parsed.data;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.rpc('report_code', {
    p_code: code,
    p_reason: reason,
    p_note: note,
    p_reporter_key: reporterKey,
  });

  if (error) {
    const appCode = parseRpcError(error.message);
    return {
      status: 'error',
      message: describeError(appCode).message,
    };
  }

  // Cập nhật badge cảnh báo trên feed cho mọi người.
  revalidatePath('/lay-ma');

  const count = typeof data === 'number' ? data : 0;
  return {
    status: 'success',
    message:
      `Đã gửi báo lỗi cho mã ${code}. ` +
      (count > 1
        ? `Hiện có ${count} người báo mã này — quản trị viên sẽ xem xét.`
        : 'Quản trị viên sẽ xem xét sớm.'),
    reportCount: count,
  };
}
