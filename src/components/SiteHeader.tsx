import Image from 'next/image';
import { SITE } from '@/lib/site';

/**
 * Banner đầu trang: nền gradient + chữ bên trái + mascot bên phải.
 *
 * Ba quyết định đáng ghi lại:
 *
 * 1. Mascot nằm trong KHUNG bo góc có viền trắng thay vì tách nền. Ảnh gốc có
 *    nền trời/tường/cỏ và watermark TikTok — tách nền tự động sẽ lỗi ở viền
 *    (thân Doraemon xanh gần màu trời), còn cắt watermark thì mất credit tác
 *    giả. Đóng khung là cách trung thực mà vẫn ra dáng "sticker".
 *
 * 2. Lớp phủ chuyển theo CHIỀU CHÉO (from-slate-900/90 → to-slate-900/20):
 *    góc trái dưới — nơi có chữ — luôn đủ tối cho chữ trắng, còn góc phải
 *    vẫn sáng để mascot nổi. Nhờ vậy đổi ảnh nền nào cũng không vỡ tương phản.
 *
 * 3. Khối chữ có `pr-*` bằng đúng bề ngang mascot nên hai bên không bao giờ
 *    đè lên nhau, kể cả màn hình 360px.
 */
export function SiteHeader() {
  return (
    <header className="mb-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative h-52 w-full sm:h-60">
          {/* Nền */}
          <Image
            src={SITE.bannerSrc}
            alt={SITE.bannerAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-tr from-slate-900/90 via-slate-900/55 to-slate-900/20"
          />

          {/* Mascot bên phải, đứng trên đáy banner */}
          <div className="absolute bottom-0 right-4 h-[88%] w-28 sm:right-6 sm:w-36 lg:w-44">
            <div className="relative h-full w-full rotate-1 overflow-hidden rounded-xl rounded-b-none ring-2 ring-white/60 shadow-xl">
              <Image
                src={SITE.mascotSrc}
                alt={SITE.mascotAlt}
                fill
                priority
                sizes="160px"
                className="object-cover object-top"
              />
            </div>
          </div>

          {/* Chữ bên trái */}
          <div className="absolute inset-x-0 bottom-0 p-4 pr-36 sm:p-6 sm:pr-48 lg:pr-56">
            {/* Không ép uppercase: câu credit viết thường đọc thân mật hơn. */}
            <span className="inline-flex items-center rounded-full bg-slate-900/60 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white ring-1 ring-white/25 backdrop-blur-sm">
              {SITE.credit}
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white drop-shadow-sm sm:text-3xl">
              {SITE.name}
            </h1>
            <p className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-white/90">
              {SITE.tagline}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">{SITE.howItWorks}</p>
    </header>
  );
}
