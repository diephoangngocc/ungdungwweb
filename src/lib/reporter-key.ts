'use client';

const STORAGE_KEY = 'referral-hub:reporter-key';

/**
 * Khoá ẩn danh, sinh một lần cho mỗi trình duyệt.
 * Mục đích duy nhất: chặn một người báo lỗi cùng một mã nhiều lần
 * (UNIQUE(code_id, reporter_key) ở tầng DB). Không chứa thông tin cá nhân.
 *
 * Người dùng xoá dữ liệu trình duyệt sẽ nhận khoá mới — chấp nhận được, vì đây
 * là biện pháp chống trùng lặp thiện chí, không phải chống tấn công.
 */
export function getReporterKey(): string {
  if (typeof window === 'undefined') return '';

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;

    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `rk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư): dùng khoá tạm theo phiên.
    return `rk-tmp-${Math.random().toString(36).slice(2, 14)}`;
  }
}
