import Link from 'next/link';
import { ContactBox } from '@/components/ContactBox';
import { SITE } from '@/lib/site';

/** Chân trang dùng chung cho mọi trang công khai. */
export function SiteFooter() {
  return (
    <footer className="mt-10 space-y-4 border-t border-slate-200 pt-6">
      <ContactBox />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{SITE.name} — phục vụ cộng đồng fan Hà An Huy.</span>
        <Link href="/admin" className="transition-colors hover:text-slate-800">
          Trang quản trị
        </Link>
      </div>
    </footer>
  );
}
