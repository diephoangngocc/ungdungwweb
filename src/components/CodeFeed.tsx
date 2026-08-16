import { CodeCard } from '@/components/CodeCard';
import type { CodeRow } from '@/lib/types';

type Props = {
  active: CodeRow[];
  full: CodeRow[];
};

/**
 * QUYẾT ĐỊNH THIẾT KẾ — mã đã full nằm ở đâu?
 *
 * Chọn: ẨN khỏi feed chính, gom vào khu vực <details> thu gọn ở CUỐI trang,
 * hiển thị mờ + nhãn "Đã full".
 *
 * Lý do:
 *  1. Feed chính chỉ chứa item CÓ THỂ HÀNH ĐỘNG. Mã 10/10 không dùng được nữa,
 *     để lẫn vào giữa sẽ làm loãng và khiến người dùng copy nhầm rồi bị lỗi
 *     PARENT_FULL khi submit.
 *  2. Nhưng KHÔNG xoá hẳn: người vừa đăng cần thấy mã của mình đã đủ 10 lượt
 *     (bằng chứng hệ thống ghi nhận đúng), và "đã full" là social proof.
 *     Đặt trong <details> đóng sẵn => không tốn không gian trên mobile,
 *     nhưng vẫn tra cứu được.
 *  3. Chi phí: giữ chúng ở feed chính buộc phải kéo cả bảng; tách riêng cho
 *     phép query chính dùng partial index `used_count < 10`.
 */
export function CodeFeed({ active, full }: Props) {
  return (
    <section aria-labelledby="feed-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="feed-heading" className="text-lg font-bold text-slate-900">
          Mã đang mở
        </h2>
        <span className="text-sm tabular-nums text-slate-500">{active.length} mã</span>
      </div>

      {active.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Chưa có mã nào còn slot. Hãy quay lại sau ít phút.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((item) => (
            <li key={item.id}>
              <CodeCard item={item} />
            </li>
          ))}
        </ul>
      )}

      {full.length > 0 && (
        <details className="group rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-600 marker:content-none hover:text-slate-900">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              Mã đã full ({full.length})
            </span>
          </summary>
          <div className="border-t border-slate-200 p-4">
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {full.map((item) => (
                <li key={item.id}>
                  <CodeCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </section>
  );
}
