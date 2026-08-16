'use client';

import { logoutAction } from '@/app/actions/admin';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        Đăng xuất
      </button>
    </form>
  );
}
