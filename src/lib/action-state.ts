/**
 * Kiểu dữ liệu + giá trị khởi tạo cho `useActionState` của các form.
 *
 * VÌ SAO TÁCH RA KHỎI FILE ACTION:
 * Một file gắn `'use server'` CHỈ được export async function. Next.js coi mọi
 * export trong đó là một endpoint HTTP, nên gặp export là object nó ném lỗi
 *
 *     Error: A "use server" file can only export async functions, found object.
 *
 * Lỗi này không chặn `next build` — nó nổ lúc chạy, khi request POST đầu tiên
 * gọi tới action, và biểu hiện ra ngoài là HTTP 500 + màn hình
 * "Application error: a server-side exception has occurred".
 *
 * Các hằng `initial*State` chỉ là dữ liệu thuần cho client, không cần chạy trên
 * server, nên chỗ đúng của chúng là file thường như file này.
 */

// --- Form đăng mã (/lay-ma) ---------------------------------------------------
import type { CodeRow } from '@/lib/types';

export type SubmitFieldKey = 'nickname' | 'code' | 'tier' | 'parentCode' | 'declaredCount';

export type SubmitState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /** Lỗi theo từng field để highlight input tương ứng. */
  fieldErrors: Partial<Record<SubmitFieldKey, string>>;
  /** Bản ghi vừa tạo (dùng để hiển thị xác nhận). */
  created?: Pick<CodeRow, 'code' | 'nickname' | 'tier' | 'parent_code'>;
};

export const initialSubmitState: SubmitState = {
  status: 'idle',
  message: '',
  fieldErrors: {},
};

// --- Hộp thoại báo mã lỗi -----------------------------------------------------
export type ReportState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /** Số báo cáo đang mở của mã sau khi ghi nhận. */
  reportCount?: number;
};

export const initialReportState: ReportState = { status: 'idle', message: '' };

// --- Các form trong trang quản trị -------------------------------------------
export type ActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const initialActionState: ActionState = { status: 'idle', message: '' };
