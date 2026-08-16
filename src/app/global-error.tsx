'use client';

/**
 * Lưới an toàn cuối cùng: bắt cả lỗi xảy ra trong chính `layout.tsx`, chỗ mà
 * `error.tsx` không với tới được. Vì nó thay thế luôn thẻ <html>, file này phải
 * tự render <html>/<body> và không dùng được component nào phía trên nó.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '3rem 1rem',
          textAlign: 'center',
          color: '#0f172a',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          Web đang gặp sự cố
        </h1>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#475569' }}>
          Vui lòng tải lại trang. Nếu vẫn lỗi, nhắn Zalo 0327158672.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1.25rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Tải lại
        </button>
        {error.digest && (
          <p
            style={{
              marginTop: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: '#94a3b8',
            }}
          >
            Mã lỗi: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
