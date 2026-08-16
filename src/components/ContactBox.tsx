import { SITE } from '@/lib/site';

/**
 * Khối liên hệ khi web lỗi.
 *
 * Dùng ở footer trang chính VÀ trong màn hình báo lỗi — vì đúng lúc web hỏng
 * là lúc người dùng cần số này nhất, mà footer thì có thể không render được.
 *
 * Số vẫn hiện dạng text (không chỉ nằm trong href) để người dùng máy tính,
 * nơi bấm link zalo.me không mở app, vẫn copy tay được.
 */
export function ContactBox({ compact = false }: { compact?: boolean }) {
  const { channel, value, href } = SITE.contact;

  if (compact) {
    return (
      <span className="text-sm">
        Web lỗi? Nhắn {channel}{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline underline-offset-2"
        >
          {value}
        </a>
      </span>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <p className="font-semibold">Web lỗi hoặc mã không dùng được?</p>
      <p className="mt-1 text-blue-800">
        Nhắn {channel}{' '}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900"
        >
          {value}
        </a>{' '}
        để được hỗ trợ.
      </p>
    </div>
  );
}
