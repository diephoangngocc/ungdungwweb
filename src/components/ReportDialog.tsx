'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { reportCodeAction } from '@/app/actions/report-code';
import { initialReportState } from '@/lib/action-state';
import { useToast } from '@/components/Toast';
import { getReporterKey } from '@/lib/reporter-key';
import { SITE } from '@/lib/site';
import { REPORT_REASON_OPTIONS } from '@/lib/types';

export function ReportDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(reportCodeAction, initialReportState);
  const [reporterKey, setReporterKey] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setReporterKey(getReporterKey()), []);

  // Đóng bằng phím Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Khoá scroll nền khi modal mở
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (state.status === 'success') {
      toast(state.message, 'success');
      onClose();
    }
  }, [state.status, state.message, toast, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-title" className="text-base font-bold text-slate-900">
              Báo mã lỗi
            </h2>
            <p className="mt-0.5 font-mono text-sm font-bold tracking-wider text-blue-600">{code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="reporterKey" value={reporterKey} />

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-slate-700">
              Mã này bị sao? <span className="text-rose-600">*</span>
            </legend>
            {REPORT_REASON_OPTIONS.map((opt, i) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:font-medium has-[:checked]:text-blue-800 hover:border-slate-400"
              >
                <input
                  type="radio"
                  name="reason"
                  value={opt.value}
                  defaultChecked={i === 0}
                  className="size-4 accent-blue-600"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="note" className="block text-sm font-semibold text-slate-700">
              Mô tả thêm <span className="font-normal text-slate-500">(không bắt buộc)</span>
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              maxLength={280}
              placeholder="VD: nhập mã báo &quot;đã hết lượt&quot; dù hiển thị 4/10"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {state.status === 'error' && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
              {state.message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isPending || !reporterKey}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isPending && (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
                />
              )}
              {isPending ? 'Đang gửi…' : 'Gửi báo lỗi'}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Mỗi người chỉ báo được một lần cho mỗi mã. Báo lỗi không tự động gỡ mã — quản trị viên
            sẽ xem xét rồi quyết định. Cần gấp thì nhắn {SITE.contact.channel}{' '}
            <a
              href={SITE.contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 underline underline-offset-2"
            >
              {SITE.contact.value}
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
