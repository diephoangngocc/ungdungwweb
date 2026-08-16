'use client';

import { useCallback, useState } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ReportDialog } from '@/components/ReportDialog';
import { TierBadge, TIER_STYLES } from '@/components/TierBadge';
import { PREFILL_PARENT_EVENT } from '@/lib/events';
import { MAX_USES, type CodeRow } from '@/lib/types';

export function CodeCard({ item }: { item: CodeRow }) {
  const [reporting, setReporting] = useState(false);
  const styles = TIER_STYLES[item.tier];
  const isFull = item.used_count >= MAX_USES;
  const remaining = Math.max(MAX_USES - item.used_count, 0);
  // Số lượt báo lỗi KHÔNG hiện trên card: mã hỏng thì người dùng nhập vào là
  // biết ngay, còn dải cảnh báo lại mở đường cho việc hùa nhau báo bậy để dìm
  // mã người khác. Báo cáo vẫn chạy về hàng đợi quản trị như cũ.
  //
  // Phần web tự ghi nhận = tổng trừ phần chủ mã tự khai. Luôn khớp với số mã con.
  const verified = Math.max(item.used_count - item.declared_count, 0);

  /** Điền nhanh mã này vào ô "mã người trước" của form. */
  function useThisCode() {
    window.dispatchEvent(new CustomEvent(PREFILL_PARENT_EVENT, { detail: item.code }));
  }

  // useCallback để tham chiếu ổn định: ReportDialog dùng onClose trong dependency
  // của useEffect, nếu truyền arrow mới mỗi lần render thì listener Esc bị gỡ/gắn
  // lại liên tục và effect xử lý success chạy dư.
  const closeReport = useCallback(() => setReporting(false), []);

  return (
    <>
      <article
        className={[
          'rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md',
          isFull ? 'border-slate-200 bg-slate-50 opacity-70' : styles.card,
          isFull ? '' : styles.ring,
        ].join(' ')}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">{item.nickname}</p>
            <p className="mt-0.5 truncate font-mono text-lg font-bold tracking-wider text-slate-900">
              {item.code}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <TierBadge tier={item.tier} />
            {isFull && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                Đã full
              </span>
            )}
            {item.self_declared && (
              <span
                title="Chủ mã tự khai số lượt vì đã dùng mã từ trước web này"
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-300"
              >
                Tự khai
              </span>
            )}
          </div>
        </header>

        <div className="mt-4 space-y-1.5">
          <ProgressBar
            value={item.used_count}
            accentClassName={isFull ? 'bg-slate-400' : styles.accent}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold tabular-nums text-slate-700">
              {item.used_count}/{MAX_USES} lượt
            </span>
            <span>{isFull ? 'Hết slot' : `Còn ${remaining} slot`}</span>
          </div>

          {/*
            Mã đăng qua luồng "đã dùng từ trước" có phần lượt do chính chủ khai.
            Hiện tách bạch để người khác tự đánh giá độ tin cậy — web chỉ bảo
            đảm được phần nó tự ghi nhận.
          */}
          {item.self_declared && item.declared_count > 0 && (
            <p className="text-[11px] leading-snug text-slate-500">
              <span className="font-semibold text-amber-700">{item.declared_count} lượt tự khai</span>
              {' · '}
              {verified} lượt web ghi nhận
            </p>
          )}
        </div>

        <footer className="mt-4 space-y-2">
          <div className="flex gap-2">
            <CopyButton value={item.code} className="flex-1" />
            {!isFull && (
              <button
                type="button"
                onClick={useThisCode}
                className="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-200"
              >
                Tôi dùng mã này
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setReporting(true)}
            className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            ⚠ Báo mã lỗi
          </button>
        </footer>
      </article>

      {reporting && <ReportDialog code={item.code} onClose={closeReport} />}
    </>
  );
}
