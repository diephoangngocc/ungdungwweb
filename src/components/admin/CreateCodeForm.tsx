'use client';

import { useActionState, useEffect, useRef } from 'react';
import { adminCreateCodeAction } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import { useToast } from '@/components/Toast';
import { TIER_OPTIONS } from '@/lib/types';

const input =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export function CreateCodeForm() {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(
    adminCreateCodeAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      toast(state.message, 'success');
      formRef.current?.reset();
    }
  }, [state, toast]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="a-nickname" className="block text-xs font-semibold text-slate-700">
            Nickname
          </label>
          <input id="a-nickname" name="nickname" maxLength={40} className={input} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="a-code" className="block text-xs font-semibold text-slate-700">
            Mã
          </label>
          <input
            id="a-code"
            name="code"
            maxLength={32}
            spellCheck={false}
            placeholder="VD: FANCLUB02"
            className={`${input} font-mono tracking-wider`}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="a-tier" className="block text-xs font-semibold text-slate-700">
            Hạng
          </label>
          <select id="a-tier" name="tier" defaultValue="thuong_vip" className={`${input} appearance-none`}>
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="a-used" className="block text-xs font-semibold text-slate-700">
            Lượt đã dùng (0–10)
          </label>
          <input
            id="a-used"
            name="usedCount"
            type="number"
            min={0}
            max={10}
            defaultValue={0}
            className={input}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="a-parent" className="block text-xs font-semibold text-slate-700">
            Mã cha <span className="font-normal text-slate-500">(để trống = mã gốc)</span>
          </label>
          <input
            id="a-parent"
            name="parentCode"
            maxLength={32}
            spellCheck={false}
            placeholder="Bỏ trống nếu đây là mã khởi đầu"
            className={`${input} font-mono tracking-wider`}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5">
          <input type="checkbox" name="creditParent" className="mt-0.5 size-4 accent-blue-600" />
          <span className="text-xs text-slate-700">
            <span className="font-semibold">Cộng +1 lượt cho mã cha</span>
            <br />
            <span className="text-slate-500">
              Chỉ tick khi người này thực sự đã dùng mã cha. Nếu mã cha đã 10/10, thao tác sẽ bị
              từ chối.
            </span>
          </span>
        </label>
      </div>

      {state.status === 'error' && (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isPending && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
          />
        )}
        {isPending ? 'Đang thêm…' : 'Thêm mã'}
      </button>
    </form>
  );
}
