import { CodeFeed } from '@/components/CodeFeed';
import { CodeForm } from '@/components/CodeForm';
import { ContactBox } from '@/components/ContactBox';
import { GuideSteps } from '@/components/GuideSteps';
import { SiteFooter } from '@/components/SiteFooter';
import { EXCHANGE_PAGE } from '@/lib/guide';
import { getFeed } from '@/lib/queries';
import { SITE } from '@/lib/site';

// Feed đổi mỗi lần có người submit; revalidatePath('/lay-ma') trong Server
// Action đẩy dữ liệu mới. force-dynamic để không phục vụ HTML tĩnh cũ.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: `${EXCHANGE_PAGE.title} — ${SITE.name}`,
  description: EXCHANGE_PAGE.summary,
};

export default async function ExchangePage() {
  const { active, full, error } = await getFeed();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-800">
          {EXCHANGE_PAGE.badge}
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {EXCHANGE_PAGE.title}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{EXCHANGE_PAGE.summary}</p>
      </header>

      {/*
        Các bước để trong <details> đóng sẵn: người quen vào đây để copy mã,
        không nên bắt họ cuộn qua hướng dẫn mỗi lần.
      */}
      <details className="group mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 font-bold text-slate-900 marker:content-none">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block text-slate-500 transition-transform group-open:rotate-90"
            >
              ▸
            </span>
            Các bước làm — bấm để xem
          </span>
        </summary>
        <div className="border-t border-slate-200 p-4">
          <GuideSteps steps={[...EXCHANGE_PAGE.steps]} />
        </div>
      </details>

      <div className="mb-8">
        <CodeForm />
      </div>

      {error ? (
        <div className="space-y-3">
          <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            Không tải được danh sách mã: {error}
          </p>
          <ContactBox />
        </div>
      ) : (
        <CodeFeed active={active} full={full} />
      )}

      <SiteFooter />
    </main>
  );
}
