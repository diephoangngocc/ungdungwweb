import { z } from 'zod';

/**
 * Schema DÙNG CHUNG cho client (UX: báo lỗi tức thì) và server (bảo mật).
 * Client-side validate chỉ để trải nghiệm tốt — server luôn validate lại,
 * và tầng cuối cùng là CHECK constraint + regex trong RPC Postgres.
 */
export const CODE_REGEX = /^[A-Za-z0-9_-]{4,32}$/;

const codeField = z
  .string({ required_error: 'Vui lòng nhập mã.' })
  .trim()
  .min(4, 'Mã phải có ít nhất 4 ký tự.')
  .max(32, 'Mã tối đa 32 ký tự.')
  .regex(CODE_REGEX, 'Mã chỉ gồm chữ, số, gạch ngang và gạch dưới.')
  .transform((v) => v.toUpperCase());

const nicknameField = z
  .string({ required_error: 'Vui lòng nhập nickname.' })
  .trim()
  .min(1, 'Vui lòng nhập nickname.')
  .max(40, 'Nickname tối đa 40 ký tự.');

const tierField = z.enum(['thuong_vip', 'svip'], {
  errorMap: () => ({ message: 'Vui lòng chọn hạng hợp lệ.' }),
});

// --- Người dùng đăng mã -------------------------------------------------------
export const submitCodeSchema = z
  .object({
    nickname: nicknameField,
    code: codeField,
    tier: tierField,
    parentCode: codeField,
  })
  .refine((data) => data.code !== data.parentCode, {
    path: ['parentCode'],
    message: 'Không thể khai báo chính mã của bạn làm mã người trước.',
  });

export type SubmitCodeInput = z.infer<typeof submitCodeSchema>;

/**
 * Luồng B — người đã dùng mã từ trước (ngoài web này).
 * Không có `parentCode`; đổi lại phải tự khai số lượt mã mình đã được dùng.
 */
export const submitDeclaredSchema = z.object({
  nickname: nicknameField,
  code: codeField,
  tier: tierField,
  declaredCount: z.coerce
    .number({ invalid_type_error: 'Số lượt phải là số.' })
    .int('Số lượt phải là số nguyên.')
    .min(0, 'Số lượt nhỏ nhất là 0.')
    .max(10, 'Số lượt lớn nhất là 10.'),
});

export type SubmitDeclaredInput = z.infer<typeof submitDeclaredSchema>;

/** Hai chế độ của form đăng mã. */
export const submitModeSchema = z.enum(['web', 'truoc']);
export type SubmitMode = z.infer<typeof submitModeSchema>;

// --- Người dùng báo mã lỗi ----------------------------------------------------
export const reportCodeSchema = z.object({
  code: codeField,
  reason: z.enum(['khong_dung_duoc', 'ma_sai', 'da_het_han', 'spam', 'khac'], {
    errorMap: () => ({ message: 'Vui lòng chọn lý do.' }),
  }),
  note: z
    .string()
    .trim()
    .max(280, 'Ghi chú tối đa 280 ký tự.')
    .optional()
    .transform((v) => (v ? v : null)),
  reporterKey: z
    .string()
    .trim()
    .min(8, 'Khoá người báo không hợp lệ.')
    .max(64, 'Khoá người báo không hợp lệ.'),
});

// --- Admin --------------------------------------------------------------------
export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export const adminCreateCodeSchema = z.object({
  nickname: nicknameField,
  code: codeField,
  tier: tierField,
  // Để trống => tạo mã gốc (parent_code = NULL)
  parentCode: z
    .string()
    .trim()
    .transform((v) => (v ? v.toUpperCase() : ''))
    .refine((v) => v === '' || CODE_REGEX.test(v), 'Mã cha không hợp lệ.')
    .transform((v) => (v === '' ? null : v)),
  usedCount: z.coerce
    .number({ invalid_type_error: 'Lượt dùng phải là số.' })
    .int('Lượt dùng phải là số nguyên.')
    .min(0, 'Lượt dùng nhỏ nhất là 0.')
    .max(10, 'Lượt dùng lớn nhất là 10.'),
  creditParent: z.coerce.boolean().default(false),
});

export const adminUpdateCodeSchema = z.object({
  code: codeField,
  nickname: nicknameField,
  tier: tierField,
  usedCount: z.coerce.number().int().min(0, 'Lượt dùng nhỏ nhất là 0.').max(10, 'Lượt dùng lớn nhất là 10.'),
});

export const adminSetStatusSchema = z.object({
  code: codeField,
  status: z.enum(['active', 'removed']),
  reason: z.string().trim().max(200).optional(),
});

export const adminResolveReportSchema = z.object({
  reportId: z.string().uuid('ID báo cáo không hợp lệ.'),
  status: z.enum(['resolved', 'dismissed']),
  note: z.string().trim().max(200).optional(),
  removeCode: z.coerce.boolean().default(false),
});
