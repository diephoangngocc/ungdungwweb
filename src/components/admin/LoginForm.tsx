'use client';

import { useActionState } from 'react';
import { initialActionState, loginAction } from '@/app/actions/admin';

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialActionState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-bold text-slate-900">Đăng nhập quản trị</h1>
      <p className="mt-1 text-sm text-slate-600">
        Trang này dành cho ban quản trị. Mật khẩu được cấu hình trong biến môi trường.
      </p>

      <div className="mt-5 space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {state.status === 'error' && (
        <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isPending && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
          />
        )}
        {isPending ? 'Đang kiểm tra…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
