import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactBox } from '@/components/ContactBox';
import { GuideSteps } from '@/components/GuideSteps';
import { EXCHANGE_PAGE, GUIDE_PHASES, findPhase } from '@/lib/guide';
import { SITE } from '@/lib/site';

/** Có bao nhiêu phase trong guide.ts thì có bấy nhiêu trang tĩnh. */
export function generateStaticParams() {
  return GUIDE_PHASES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const phase = findPhase(slug);
  if (!phase) return { title: `Không tìm thấy hướng dẫn — ${SITE.name}` };
  return { title: `${phase.title} — ${SITE.name}`, description: phase.summary };
}

export default async function GuidePhasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const phase = findPhase(slug);
  if (!phase) notFound();

  const others = GUIDE_PHASES.filter((p) => p.slug !== phase.slug);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-800">
          {phase.badge}
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {phase.title}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{phase.summary}</p>
      </header>

      {phase.draft || phase.steps.length === 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">Hướng dẫn đang được cập nhật.</p>
          <p className="mt-1.5 leading-relaxed">
            Ban quản trị đang soạn các bước cho app này. Trong lúc chờ, bạn cứ làm theo hướng dẫn
            của app còn lại và nhắn {SITE.contact.channel}{' '}
            <a
              href={SITE.contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-2"
            >
              {SITE.contact.value}
            </a>{' '}
            nếu cần hỏi gấp.
          </p>
        </div>
      ) : (
        <GuideSteps steps={phase.steps} />
      )}

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={EXCHANGE_PAGE.href}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Sang trang lấy &amp; gửi mã →
          </Link>
          {others.map((p) => (
            <Link
              key={p.slug}
              href={`/huong-dan/${p.slug}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {p.badge}: {p.navLabel} →
            </Link>
          ))}
        </div>

        <ContactBox />
      </div>
    </main>
  );
}
