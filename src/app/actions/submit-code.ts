'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { submitCodeSchema, submitDeclaredSchema, submitModeSchema } from '@/lib/validation';
import { describeError, parseRpcError } from '@/lib/errors';
import type { CodeRow } from '@/lib/types';

type FieldKey = 'nickname' | 'code' | 'tier' | 'parentCode' | 'declaredCount';

export type SubmitState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /** Lỗi theo từng field để highlight input tương ứng. */
  fieldErrors: Partial<Record<FieldKey, string>>;
  /** Bản ghi vừa tạo (dùng để hiển thị xác nhận). */
  created?: Pick<CodeRow, 'code' | 'nickname' | 'tier' | 'parent_code'>;
};

export const initialSubmitState: SubmitState = {
  status: 'idle',
  message: '',
  fieldErrors: {},
};

function invalid(issues: { path: (string | number)[]; message: string }[]): SubmitState {
  const fieldErrors: SubmitState['fieldErrors'] = {};
  for (const issue of issues) {
    const key = issue.path[0] as FieldKey | undefined;
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    status: 'error',
    message: 'Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại các trường bên dưới.',
    fieldErrors,
  };
}

function rpcFailure(message: string): SubmitState {
  const appCode = parseRpcError(message);
  const described = describeError(appCode);
  return {
    status: 'error',
    message: described.message,
    fieldErrors: described.field
      ? { [described.field as FieldKey]: described.message }
      : {},
  };
}

/**
 * Hai luồng đăng mã, phân biệt bằng field `mode` trong form:
 *
 *  'web'   — người vừa dùng mã của người khác NGAY TRÊN WEB NÀY.
 *            Bắt buộc khai `parentCode`; RPC cộng +1 cho mã cha trong cùng
 *            transaction. Đây là luồng có kiểm chứng.
 *
 *  'truoc' — người đã dùng mã từ trước, ngoài web. Không có mã cha để khai,
 *            nên tự khai số lượt mã mình đã được dùng. Số này được lưu riêng
 *            ở `declared_count` và hiện công khai trên card, KHÔNG trộn lẫn
 *            với phần web tự ghi nhận.
 *
 * `mode` đọc ở SERVER chứ không tin client chọn hộ: mỗi nhánh chạy schema và
 * RPC riêng, nên gửi kèm `parentCode` ở chế độ 'truoc' cũng không có tác dụng.
 */
export async function submitCodeAction(
  _prevState: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  // Bọc toàn bộ luồng: một exception lọt ra khỏi Server Action sẽ bị Next.js
  // đổi thành màn hình trắng "Application error", xoá sạch những gì người dùng
  // vừa gõ. Trả về SubmitState thì form vẫn còn nguyên và hiện được lý do.
  try {
    return await runSubmit(formData);
  } catch (err) {
    // Log ra Runtime Logs của Vercel — đây là nơi duy nhất còn thấy lỗi gốc.
    console.error('[submit-code] unexpected failure:', err);
    return {
      status: 'error',
      message:
        'Máy chủ đang gặp sự cố khi lưu mã. Vui lòng tải lại trang và thử lại; ' +
        'nếu vẫn lỗi hãy nhắn Zalo 0327158672.',
      fieldErrors: {},
    };
  }
}

async function runSubmit(formData: FormData): Promise<SubmitState> {
  const mode = submitModeSchema.safeParse(formData.get('mode'));
  if (!mode.success) {
    return { status: 'error', message: 'Chế độ đăng mã không hợp lệ.', fieldErrors: {} };
  }

  const supabase = getSupabaseServerClient();

  // ---------------------------------------------------------------------------
  // Luồng B — đã dùng mã từ trước, tự khai số lượt
  // ---------------------------------------------------------------------------
  if (mode.data === 'truoc') {
    const parsed = submitDeclaredSchema.safeParse({
      nickname: formData.get('nickname'),
      code: formData.get('code'),
      tier: formData.get('tier'),
      declaredCount: formData.get('declaredCount'),
    });
    if (!parsed.success) return invalid(parsed.error.issues);

    const { nickname, code, tier, declaredCount } = parsed.data;

    const { data, error } = await supabase.rpc('submit_code_declared', {
      p_nickname: nickname,
      p_code: code,
      p_tier: tier,
      p_declared_count: declaredCount,
    });

    if (error) return rpcFailure(error.message);

    revalidatePath('/lay-ma');

    const created = data as unknown as CodeRow | null;
    return {
      status: 'success',
      message:
        `Đã đăng mã ${created?.code ?? code} với ${declaredCount}/10 lượt tự khai. ` +
        'Mọi lượt sau này do người khác khai sẽ được cộng thêm tự động.',
      fieldErrors: {},
      created: created
        ? {
            code: created.code,
            nickname: created.nickname,
            tier: created.tier,
            parent_code: created.parent_code,
          }
        : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Luồng A — vừa dùng mã trên web, khai mã cha
  // ---------------------------------------------------------------------------
  const parsed = submitCodeSchema.safeParse({
    nickname: formData.get('nickname'),
    code: formData.get('code'),
    tier: formData.get('tier'),
    parentCode: formData.get('parentCode'),
  });
  if (!parsed.success) return invalid(parsed.error.issues);

  const { nickname, code, tier, parentCode } = parsed.data;

  const { data, error } = await supabase.rpc('submit_code', {
    p_nickname: nickname,
    p_code: code,
    p_tier: tier,
    p_parent_code: parentCode,
  });

  if (error) return rpcFailure(error.message);

  revalidatePath('/lay-ma');

  const created = data as unknown as CodeRow | null;
  return {
    status: 'success',
    message: `Đã đăng mã ${created?.code ?? code}. Mã ${parentCode} được ghi nhận +1 lượt.`,
    fieldErrors: {},
    created: created
      ? {
          code: created.code,
          nickname: created.nickname,
          tier: created.tier,
          parent_code: created.parent_code,
        }
      : undefined,
  };
}
