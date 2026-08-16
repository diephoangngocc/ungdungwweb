import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'rh_admin';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 giờ

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET thiếu hoặc ngắn hơn 32 ký tự. ' +
        'Tạo bằng: openssl rand -hex 32',
    );
  }
  return s;
}

/** So sánh chuỗi trong thời gian hằng số — tránh timing attack khi dò mật khẩu. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  // timingSafeEqual ném lỗi nếu khác độ dài, nên hash về cùng độ dài trước.
  const ha = createHmac('sha256', 'cmp').update(ba).digest();
  const hb = createHmac('sha256', 'cmp').update(bb).digest();
  return timingSafeEqual(ha, hb);
}

export function isPasswordCorrect(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error('Chưa đặt ADMIN_PASSWORD trong biến môi trường.');
  }
  return safeEqual(input, expected);
}

/**
 * Token = `<hạn>.<nonce>.<chữ ký HMAC-SHA256>`.
 * Không lưu session ở server: chữ ký tự chứng minh token do server phát ra,
 * nên không cần bảng sessions và scale được trên serverless.
 */
export function createSessionToken(): string {
  const payload = `${Date.now() + TTL_MS}.${randomBytes(9).toString('hex')}`;
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token?: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expRaw, nonce, sig] = parts;
  const payload = `${expRaw}.${nonce}`;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('hex');

  if (!safeEqual(sig, expected)) return false;

  const exp = Number(expRaw);
  return Number.isFinite(exp) && exp > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies();
    return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  } catch {
    // Thiếu ADMIN_SESSION_SECRET -> coi như chưa đăng nhập, không lộ chi tiết.
    return false;
  }
}

export const adminCookieOptions = {
  httpOnly: true,                                   // JS phía client không đọc được
  secure: process.env.NODE_ENV === 'production',    // chỉ gửi qua HTTPS khi deploy
  sameSite: 'lax' as const,                         // chặn CSRF cơ bản
  path: '/',
  maxAge: TTL_MS / 1000,
};
