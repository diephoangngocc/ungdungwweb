import { GuideLinks } from '@/components/GuideLinks';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

/**
 * Trang chính = trang GIỚI THIỆU.
 *
 * Form đăng mã và danh sách mã đã dời sang /lay-ma. Nhờ vậy trang này không
 * gọi database, render tĩnh, mở gần như tức thì — đúng vai trò "cửa vào" mà
 * người mới nhìn thấy đầu tiên.
 */
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      {/* Banner + mục đích — sửa nội dung trong src/lib/site.ts */}
      <SiteHeader />
      <GuideLinks />
      <SiteFooter />
    </main>
  );
}
