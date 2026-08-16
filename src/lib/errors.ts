/**
 * Map mã lỗi do các RPC raise -> thông điệp tiếng Việt cho người dùng,
 * kèm gợi ý field để highlight trên form.
 */
export type AppErrorCode =
  | 'MISSING_FIELDS'
  | 'INVALID_NICKNAME'
  | 'INVALID_PARENT_CODE'
  | 'INVALID_CODE'
  | 'INVALID_USED_COUNT'
  | 'INVALID_DECLARED_COUNT'
  | 'INVALID_REPORTER'
  | 'INVALID_STATUS'
  | 'SELF_REFERENCE'
  | 'PARENT_NOT_FOUND'
  | 'PARENT_REMOVED'
  | 'PARENT_FULL'
  | 'CODE_EXISTS'
  | 'CODE_NOT_FOUND'
  | 'ALREADY_REPORTED'
  | 'NOTE_TOO_LONG'
  | 'REPORT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

const MESSAGES: Record<AppErrorCode, { message: string; field?: string }> = {
  MISSING_FIELDS: { message: 'Vui lòng điền đầy đủ các trường bắt buộc.' },
  INVALID_NICKNAME: { message: 'Nickname không hợp lệ (1–40 ký tự).', field: 'nickname' },
  INVALID_PARENT_CODE: {
    message: 'Mã người trước không hợp lệ (4–32 ký tự, chữ/số/-/_).',
    field: 'parentCode',
  },
  INVALID_CODE: { message: 'Mã không hợp lệ (4–32 ký tự, chữ/số/-/_).', field: 'code' },
  INVALID_USED_COUNT: { message: 'Lượt dùng phải nằm trong khoảng 0–10.', field: 'usedCount' },
  INVALID_DECLARED_COUNT: {
    message: 'Số lượt tự khai phải nằm trong khoảng 0–10.',
    field: 'declaredCount',
  },
  INVALID_REPORTER: { message: 'Phiên trình duyệt không hợp lệ. Hãy tải lại trang.' },
  INVALID_STATUS: { message: 'Trạng thái không hợp lệ.' },
  SELF_REFERENCE: {
    message: 'Không thể khai báo chính mã của mình làm mã người trước.',
    field: 'parentCode',
  },
  PARENT_NOT_FOUND: {
    message: 'Mã người trước không tồn tại trong hệ thống. Hãy copy lại từ danh sách bên dưới.',
    field: 'parentCode',
  },
  PARENT_REMOVED: {
    message: 'Mã người trước đã bị quản trị viên gỡ. Vui lòng chọn mã khác.',
    field: 'parentCode',
  },
  PARENT_FULL: {
    message: 'Mã người trước vừa đủ 10/10 lượt. Vui lòng chọn một mã khác còn slot.',
    field: 'parentCode',
  },
  CODE_EXISTS: { message: 'Mã này đã được đăng trước đó. Mỗi mã chỉ đăng một lần.', field: 'code' },
  CODE_NOT_FOUND: { message: 'Không tìm thấy mã này (có thể đã bị gỡ).', field: 'code' },
  ALREADY_REPORTED: { message: 'Bạn đã báo lỗi mã này rồi. Cảm ơn bạn!' },
  NOTE_TOO_LONG: { message: 'Ghi chú quá dài (tối đa 280 ký tự).', field: 'note' },
  REPORT_NOT_FOUND: { message: 'Không tìm thấy báo cáo này (có thể đã được xử lý).' },
  UNAUTHORIZED: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
  RATE_LIMITED: { message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.' },
  UNKNOWN: { message: 'Có lỗi xảy ra, vui lòng thử lại sau.' },
};

const KNOWN_CODES = Object.keys(MESSAGES) as AppErrorCode[];

/** Trích mã lỗi từ `PostgrestError.message` do RAISE EXCEPTION trả về. */
export function parseRpcError(raw?: string | null): AppErrorCode {
  if (!raw) return 'UNKNOWN';
  const upper = raw.toUpperCase();
  // Khớp token DÀI NHẤT trước, để INVALID_PARENT_CODE không bị INVALID_CODE nuốt.
  const found = [...KNOWN_CODES]
    .sort((a, b) => b.length - a.length)
    .find((code) => upper.includes(code));
  if (found) return found;
  if (upper.includes('DUPLICATE KEY') || upper.includes('23505')) return 'CODE_EXISTS';
  return 'UNKNOWN';
}

export function describeError(code: AppErrorCode) {
  return MESSAGES[code] ?? MESSAGES.UNKNOWN;
}
