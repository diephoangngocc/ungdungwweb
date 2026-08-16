import Link from 'next/link';
import { EXCHANGE_PAGE, GUIDE_PHASES } from '@/lib/guide';

type Card = {
  href: string;
  badge: string;
  title: string;
  summary: string;
  cta: string;
  draft?: boolean;
};

/**
 * Ba thẻ dẫn sang các trang chức năng, đặt ở trang chính.
 *
 * Trang chính giờ chỉ giới thiệu, nên đây là lối vào duy nhất ngoài thanh nav —
 * vì vậy thẻ ghi rõ mỗi trang làm gì thay vì chỉ để tên.
 */
export function GuideLinks() {
  const cards: Card[] = [
    ...GUIDE_PHASES.map((p) => ({
      href: `/huong-dan/${p.slug}`,
      badge: p.badge,
      title: p.title,
      summary: p.summary,
      cta: p.draft ? 'Đang cập nhật' : 'Xem hướng dẫn →',
      draft: p.draft,
    })),
    {
      href: EXCHANGE_PAGE.href,
      badge: EXCHANGE_PAGE.badge,
      title: EXCHANGE_PAGE.title,
      summary: EXCHANGE_PAGE.summary,
      cta: 'Lấy mã ngay →',
    },
  ];

  return (
    <section aria-labelledby="guide-links-heading" className="space-y-3">
      <h2 id="guide-links-heading" className="text-lg font-bold text-slate-900">
        Bắt đầu từ đâu?
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              className={[
                'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                c.draft ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-800',
              ].join(' ')}
            >
              {c.badge}
            </span>
            <h3 className="mt-1.5 font-bold text-slate-900">{c.title}</h3>
            <p className="mt-0.5 grow text-sm text-slate-600">{c.summary}</p>
            <span
              className={[
                'mt-3 inline-block text-sm font-semibold',
                c.draft ? 'text-slate-500' : 'text-blue-700 group-hover:underline',
              ].join(' ')}
            >
              {c.cta}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
