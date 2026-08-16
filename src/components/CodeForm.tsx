'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
// Next.js 14 (React 18): thay dòng trên bằng
//   import { useFormState } from 'react-dom';
import { submitCodeAction } from '@/app/actions/submit-code';
import { initialSubmitState } from '@/lib/action-state';
import { useToast } from '@/components/Toast';
import { PREFILL_PARENT_EVENT } from '@/lib/events';
import { TIER_OPTIONS, type Tier } from '@/lib/types';
import { submitCodeSchema, submitDeclaredSchema, type SubmitMode } from '@/lib/validation';

type FieldKey = 'nickname' | 'code' | 'tier' | 'parentCode' | 'declaredCount';

const inputBase =
  'w-full rounded-xl border bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

const MODES: { value: SubmitMode; label: string; hint: string }[] = [
  {
    value: 'web',
    label: 'Bạn mới chưa nhập code',
    hint: 'Bạn chưa nhập mã của ai. Chọn một mã trong danh sách bên dưới để nhập vào app, rồi khai mã đó ra — hệ thống tự cộng lượt cho chủ mã.',
  },
  {
    value: 'truoc',
    label: 'Bạn cũ khai báo mã',
    hint: 'Bạn đã nhập mã của người khác từ trước. Chỉ cần khai mã của bạn và số lượt mã đó đã được dùng — không cần khai mã đã nhập.',
  },
];

export function CodeForm() {
  const toast = useToast();
  const [state, formAction, isPending] = useActionState(submitCodeAction, initialSubmitState);

  const [mode, setMode] = useState<SubmitMode>('web');
  const [values, setValues] = useState({
    nickname: '',
    code: '',
    tier: 'thuong_vip' as Tier,
    parentCode: '',
    declaredCount: '0',
  });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const parentRef = useRef<HTMLInputElement>(null);

  // --- Validate client-side theo ĐÚNG chế độ đang chọn ------------------------
  const clientErrors = useMemo(() => {
    const result =
      mode === 'truoc'
        ? submitDeclaredSchema.safeParse({
            nickname: values.nickname,
            code: values.code,
            tier: values.tier,
            declaredCount: values.declaredCount,
          })
        : submitCodeSchema.safeParse({
            nickname: values.nickname,
            code: values.code,
            tier: values.tier,
            parentCode: values.parentCode,
          });

    if (result.success) return {} as Partial<Record<FieldKey, string>>;
    const errs: Partial<Record<FieldKey, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as FieldKey | undefined;
      if (key && !errs[key]) errs[key] = issue.message;
    }
    return errs;
  }, [mode, values]);

  const isValid = Object.keys(clientErrors).length === 0;

  function errorFor(field: FieldKey): string | undefined {
    if (state.status === 'error' && state.fieldErrors[field]) return state.fieldErrors[field];
    if (submitAttempted || touched[field]) return clientErrors[field];
    return undefined;
  }

  // --- Nút "Tôi dùng mã này" trên Card: điền mã cha VÀ chuyển về chế độ web ----
  useEffect(() => {
    function onPrefill(e: Event) {
      const code = (e as CustomEvent<string>).detail;
      setMode('web');
      setValues((v) => ({ ...v, parentCode: code }));
      setTouched((t) => ({ ...t, parentCode: true }));
      parentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      parentRef.current?.focus({ preventScroll: true });
      toast(`Đã điền mã người trước: ${code}`, 'success');
    }
    window.addEventListener(PREFILL_PARENT_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_PARENT_EVENT, onPrefill);
  }, [toast]);

  // --- Reset sau khi submit thành công ----------------------------------------
  useEffect(() => {
    if (state.status === 'success') {
      setValues((v) => ({ ...v, code: '', parentCode: '', declaredCount: '0' }));
      setTouched({});
      setSubmitAttempted(false);
    }
  }, [state.status, state.message]);

  const activeMode = MODES.find((m) => m.value === mode)!;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        setSubmitAttempted(true);
        if (!isValid) e.preventDefault();
      }}
      noValidate
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-bold text-slate-900">Đăng mã của bạn</h2>

      {/* Chế độ được gửi lên server và quyết định luồng xử lý ở đó */}
      <input type="hidden" name="mode" value={mode} />

      <div
        role="radiogroup"
        aria-label="Chế độ đăng mã"
        className="mt-4 grid gap-2 sm:grid-cols-2"
      >
        {MODES.map((m) => {
          const on = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setMode(m.value);
                setSubmitAttempted(false);
              }}
              className={[
                'rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors',
                on
                  ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-200'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={[
                    'inline-block size-3.5 shrink-0 rounded-full border-4',
                    on ? 'border-blue-600' : 'border-slate-300',
                  ].join(' ')}
                />
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-sm text-slate-600">{activeMode.hint}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nickname" htmlFor="nickname" error={errorFor('nickname')}>
          <input
            id="nickname"
            name="nickname"
            value={values.nickname}
            onChange={(e) => setValues((v) => ({ ...v, nickname: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
            maxLength={40}
            autoComplete="nickname"
            placeholder="Tên hiển thị của bạn"
            aria-invalid={!!errorFor('nickname')}
            className={`${inputBase} ${errorFor('nickname') ? 'border-rose-500' : 'border-slate-300'}`}
          />
        </Field>

        <Field label="Hạng" htmlFor="tier" error={errorFor('tier')}>
          <select
            id="tier"
            name="tier"
            value={values.tier}
            onChange={(e) => setValues((v) => ({ ...v, tier: e.target.value as Tier }))}
            className={`${inputBase} appearance-none border-slate-300`}
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Mã của bạn"
          htmlFor="code"
          error={errorFor('code')}
          hint="4–32 ký tự: chữ, số, - hoặc _"
        >
          <input
            id="code"
            name="code"
            value={values.code}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
            onBlur={() => setTouched((t) => ({ ...t, code: true }))}
            maxLength={32}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="VD: ABCD1234"
            aria-invalid={!!errorFor('code')}
            className={`${inputBase} font-mono tracking-wider ${errorFor('code') ? 'border-rose-500' : 'border-slate-300'}`}
          />
        </Field>

        {mode === 'web' ? (
          <Field
            label="Mã người trước bạn đã dùng"
            htmlFor="parentCode"
            error={errorFor('parentCode')}
            hint="Bắt buộc — mã này sẽ được +1 lượt"
            required
          >
            <input
              id="parentCode"
              name="parentCode"
              ref={parentRef}
              value={values.parentCode}
              onChange={(e) =>
                setValues((v) => ({ ...v, parentCode: e.target.value.toUpperCase() }))
              }
              onBlur={() => setTouched((t) => ({ ...t, parentCode: true }))}
              maxLength={32}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Dán mã từ danh sách bên dưới"
              aria-invalid={!!errorFor('parentCode')}
              className={`${inputBase} font-mono tracking-wider ${errorFor('parentCode') ? 'border-rose-500' : 'border-slate-300'}`}
            />
          </Field>
        ) : (
          <Field
            label="Mã của bạn đã được dùng bao nhiêu lượt?"
            htmlFor="declaredCount"
            error={errorFor('declaredCount')}
            hint="0–10. Số này hiện công khai kèm nhãn “tự khai”."
            required
          >
            <input
              id="declaredCount"
              name="declaredCount"
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={values.declaredCount}
              onChange={(e) => setValues((v) => ({ ...v, declaredCount: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, declaredCount: true }))}
              aria-invalid={!!errorFor('declaredCount')}
              className={`${inputBase} ${errorFor('declaredCount') ? 'border-rose-500' : 'border-slate-300'}`}
            />
          </Field>
        )}
      </div>

      {mode === 'truoc' && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          Vui lòng khai báo đúng mã và số lượt mã đã được dùng để việc thống kê không bị ảnh hưởng.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isPending && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
          />
        )}
        {isPending ? 'Đang gửi…' : 'Đăng mã'}
      </button>

      <div aria-live="polite" className="mt-3 empty:mt-0">
        {state.status === 'success' && (
          <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
            {state.message}
          </p>
        )}
        {state.status === 'error' && (
          <p className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
