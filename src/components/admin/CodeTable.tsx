'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { adminSetStatusAction, adminUpdateCodeAction } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import { useToast } from '@/components/Toast';
import { TierBadge } from '@/components/TierBadge';
import { MAX_USES, TIER_OPTIONS, type CodeRow } from '@/lib/types';

const cell =
  'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

function CodeRowItem({ item }: { item: CodeRow }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const [updState, updAction, updPending] = useActionState(
    adminUpdateCodeAction,
    initialActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    adminSetStatusAction,
    initialActionState,
  );

  useEffect(() => {
    if (updState.status === 'success') {
      toast(updState.message, 'success');
      setEditing(false);
    }
    if (updState.status === 'error') toast(updState.message, 'error');
  }, [updState, toast]);

  useEffect(() => {
    if (statusState.status === 'success') {
      toast(statusState.message, 'success');
      setConfirmRemove(false);
    }
    if (statusState.status === 'error') toast(statusState.message, 'error');
  }, [statusState, toast]);

  const removed = item.status === 'removed';

  return (
    <li
      className={[
        'rounded-xl border p-3',
        removed ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white shadow-sm',
      ].join(' ')}
    >
      {/* --- Chế độ xem --- */}
      {!editing && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-wider text-slate-900">
                {item.code}
              </span>
              <TierBadge tier={item.tier} />
              {removed && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                  Đã gỡ
                </span>
              )}
              {item.self_declared && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                  Tự khai {item.declared_count}
                </span>
              )}
              {item.report_count > 0 && !removed && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  ⚠ {item.report_count} báo lỗi
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {item.nickname} · <span className="tabular-nums">{item.used_count}/{MAX_USES}</span>
              {item.parent_code
                ? ` · cha: ${item.parent_code}`
                : item.self_declared
                  ? ` · tự khai ${item.declared_count}, web ghi nhận ${item.used_count - item.declared_count}`
                  : ' · mã gốc'}
              {removed && item.removed_reason ? ` · lý do: ${item.removed_reason}` : ''}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            {!removed && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Sửa
              </button>
            )}

            {removed ? (
              <form action={statusAction}>
                <input type="hidden" name="code" value={item.code} />
                <input type="hidden" name="status" value="active" />
                <button
                  type="submit"
                  disabled={statusPending}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  Khôi phục
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove((v) => !v)}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Gỡ
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Xác nhận gỡ (kèm lý do, lưu vào audit log) --- */}
      {confirmRemove && !removed && (
        <form action={statusAction} className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
          <input type="hidden" name="code" value={item.code} />
          <input type="hidden" name="status" value="removed" />
          <input
            name="reason"
            maxLength={200}
            placeholder="Lý do gỡ (hiện trong nhật ký)"
            className={`${cell} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={statusPending}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {statusPending ? 'Đang gỡ…' : 'Xác nhận gỡ'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmRemove(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Huỷ
          </button>
        </form>
      )}

      {/* --- Chế độ sửa --- */}
      {editing && (
        <form action={updAction} className="space-y-2">
          <input type="hidden" name="code" value={item.code} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-wider text-slate-500">
              {item.code}
            </span>
            <input
              name="nickname"
              defaultValue={item.nickname}
              maxLength={40}
              aria-label="Nickname"
              className={`${cell} min-w-0 flex-1`}
            />
            <select
              name="tier"
              defaultValue={item.tier}
              aria-label="Hạng"
              className={`${cell} appearance-none`}
            >
              {TIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              name="usedCount"
              type="number"
              min={0}
              max={10}
              defaultValue={item.used_count}
              aria-label="Lượt đã dùng"
              className={`${cell} w-20`}
            />
            <button
              type="submit"
              disabled={updPending}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updPending ? 'Đang lưu…' : 'Lưu'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Huỷ
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Sửa lượt dùng được ghi lại kèm giá trị cũ → mới trong nhật ký thao tác.
          </p>
        </form>
      )}
    </li>
  );
}

type Filter = 'all' | 'active' | 'full' | 'reported' | 'declared' | 'removed';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang mở' },
  { value: 'full', label: 'Đã full' },
  { value: 'reported', label: 'Bị báo lỗi' },
  { value: 'declared', label: 'Tự khai' },
  { value: 'removed', label: 'Đã gỡ' },
];

export function CodeTable({ codes }: { codes: CodeRow[] }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return codes.filter((c) => {
      if (needle && !c.code.toLowerCase().includes(needle) && !c.nickname.toLowerCase().includes(needle))
        return false;
      switch (filter) {
        case 'active':
          return c.status === 'active' && c.used_count < MAX_USES;
        case 'full':
          return c.status === 'active' && c.used_count >= MAX_USES;
        case 'reported':
          return c.report_count > 0;
        case 'declared':
          return c.self_declared;
        case 'removed':
          return c.status === 'removed';
        default:
          return true;
      }
    });
  }, [codes, q, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo mã hoặc nickname…"
          aria-label="Tìm mã"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={[
                'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Hiển thị {shown.length} / {codes.length} mã
      </p>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Không có mã nào khớp bộ lọc.
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((c) => (
            <CodeRowItem key={c.id} item={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
