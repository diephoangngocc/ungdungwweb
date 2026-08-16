'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EXCHANGE_PAGE, GUIDE_PHASES } from '@/lib/guide';
import { SITE } from '@/lib/site';

/**
 * Thanh điều hướng dính trên đầu, có ở MỌI trang.
 *
 * Thứ tự các mục = đúng thứ tự người dùng đi: giới thiệu → học cách tích vote
 * ở từng app → sang trang thao tác lấy/gửi mã.
 *
 * Danh sách sinh thẳng từ `guide.ts`, nên thêm một app mới ở đó là vừa có
 * route vừa có mục nav, không phải sửa hai chỗ rồi quên một.
 *
 * Trang quản trị KHÔNG nằm ở đây (vẫn để link mờ dưới footer): nav là chỗ cho
 * việc mà mọi thành viên đều làm, còn /admin chỉ 1–2 người dùng.
 */
export function SiteNav() {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Trang chính' },
    ...GUIDE_PHASES.map((p) => ({ href: `/huong-dan/${p.slug}`, label: p.navLabel })),
    { href: EXCHANGE_PAGE.href, label: EXCHANGE_PAGE.navLabel },
  ];

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex w-full max-w-5xl items-center gap-1.5 overflow-x-auto px-4 py-2.5 sm:gap-2 sm:px-6"
      >
        <Link
          href="/"
          className="mr-auto hidden shrink-0 text-sm font-black tracking-tight text-slate-900 lg:block"
        >
          {SITE.name}
        </Link>

        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
