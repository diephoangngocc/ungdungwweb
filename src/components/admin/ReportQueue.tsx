'use client';

import { useActionState, useEffect, useState } from 'react';
import { adminResolveReportAction } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import { useToast } from '@/components/Toast';
import { TierBadge } from '@/components/TierBadge';
import { REPORT_REASON_LABEL, type AdminReport } from '@/lib/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function ReportItem({ report }: { report: AdminReport }) {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    adminResolveReportAction,
    initialActionState,
  );
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (state.status === 'success') toast(state.message, 'success');
    if (state.status === 'error') toast(state.message, 'error');
  }, [state, toast]);

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold tracking-wider text-slate-900">
              {report.code}
            </span>
            <TierBadge tier={report.tier} />
            <span className="text-xs text-slate-500">
              {report.nickname} · {report.used_count}/10
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-amber-700">
            {REPORT_REASON_LABEL[report.reason]}
          </p>
          {report.note && (
            <p className="mt-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm text-slate-700">
              “{report.note}”
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-slate-500">{timeAgo(report.created_at)}</p>
          {report.report_count > 1 && (
            <p className="mt-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
              {report.report_count} báo cáo
            </p>
          )}
        </div>
      </div>

      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="reportId" value={report.id} />

        {showNote && (
          <input
            name="note"
            maxLength={200}
            placeholder="Ghi chú xử lý (lưu vào nhật ký)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        )}

        <div className="flex flex-wrap gap-2">
          {/*
            Hai nút cùng một form, phân biệt bằng name="intent".
            Trình duyệt chỉ gửi giá trị của NÚT ĐƯỢC BẤM, nên server biết chính xác
            admin chọn gì mà không cần JS đồng bộ state ẩn.
          */}
          <button
            type="submit"
            name="intent"
            value="remove"
            disabled={isPending || report.code_status === 'removed'}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {report.code_status === 'removed' ? 'Mã đã bị gỡ' : 'Gỡ mã này'}
          </button>

          <button
            type="submit"
            name="intent"
            value="dismiss"
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Bỏ qua (mã vẫn ổn)
          </button>

          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            {showNote ? 'Ẩn ghi chú' : '+ Ghi chú'}
          </button>
        </div>
      </form>
    </li>
  );
}

export function ReportQueue({ reports }: { reports: AdminReport[] }) {
  if (reports.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Không có báo lỗi nào đang chờ xử lý.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <ReportItem key={r.id} report={r} />
      ))}
    </ul>
  );
}
