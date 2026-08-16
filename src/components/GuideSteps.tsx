'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import type { GuideStep } from '@/lib/guide';

/**
 * Danh sách các bước của một phase, kèm phóng to ảnh.
 *
 * Ảnh minh hoạ là ảnh chụp điện thoại có chữ chú thích nhỏ — ở kích thước
 * thumbnail sẽ không đọc nổi, nên bấm vào là mở toàn màn hình (Esc hoặc bấm
 * nền để đóng).
 */
export function GuideSteps({ steps }: { steps: GuideStep[] }) {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const close = useCallback(() => setZoom(null), []);

  useEffect(() => {
    if (!zoom) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom, close]);

  return (
    <>
      <ol className="space-y-5">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 space-y-3">
              <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
                <RichText value={step.text} />
              </p>

              {step.image && (
                <button
                  type="button"
                  onClick={() => setZoom({ src: step.image!, alt: step.imageAlt ?? '' })}
                  className="block overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md focus-visible:shadow-md"
                  aria-label="Phóng to ảnh minh hoạ"
                >
                  <Image
                    src={step.image}
                    alt={step.imageAlt ?? ''}
                    width={520}
                    height={1085}
                    sizes="(max-width: 640px) 60vw, 280px"
                    className="w-48 sm:w-64"
                  />
                  <span className="block bg-slate-50 px-2 py-1.5 text-center text-xs font-medium text-slate-500">
                    Bấm để phóng to
                  </span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoom.alt}
          onMouseDown={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Đóng ảnh"
            className="absolute right-4 top-4 rounded-lg bg-white/15 px-3 py-1 text-2xl leading-none text-white hover:bg-white/25"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.src}
            alt={zoom.alt}
            onMouseDown={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

/** In đậm phần nằm giữa **hai dấu sao**. Không kéo cả thư viện markdown về cho một tính năng. */
function RichText({ value }: { value: string }) {
  return (
    <>
      {value.split('**').map((chunk, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-slate-900">
            {chunk}
          </strong>
        ) : (
          <span key={i}>{chunk}</span>
        ),
      )}
    </>
  );
}
