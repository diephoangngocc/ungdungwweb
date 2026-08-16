'use client';

/**
 * Error boundary cho toàn bộ route tree.
 *
 * Trước khi có file này, MỌI exception ném ra từ Server Component hoặc Server
 * Action đều làm Next.js thay cả trang bằng màn hình trắng
 * "Application error: a server-side exception has occurred" — người dùng không
 * biết phải làm gì, còn lỗi thật thì bị giấu trong log của Vercel.
 *
 * Nguyên nhân hay gặp nhất khi bấm "Đăng mã": tab đang mở thuộc bản deploy CŨ,
 * còn server đã chạy bản MỚI. ID của Server Action không khớp -> Next ném
 * "Failed to find Server Action". Tải lại trang là hết, nên nút bấm đầu tiên
 * ở đây là "Tải lại trang".
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h1 className="text-xl font-black tracking-tight text-rose-900">
          Có lỗi xảy ra khi xử lý yêu cầu
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-rose-800">
          Nếu bạn vừa bấm <strong>Đăng mã</strong>, nhiều khả năng trang đang mở
          là bản cũ trong khi web vừa được cập nhật. Hãy tải lại trang rồi gửi
          lại — dữ liệu của bạn chưa bị mất.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Tải lại trang
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Thử lại
          </button>
        </div>

        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-rose-700/70">
            Mã lỗi: {error.digest}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Vẫn lỗi? Nhắn Zalo <span className="font-semibold">0327158672</span> kèm
        mã lỗi ở trên.
      </p>
    </main>
  );
}
