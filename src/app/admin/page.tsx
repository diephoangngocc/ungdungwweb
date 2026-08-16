import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CodeTable } from '@/components/admin/CodeTable';
import { CreateCodeForm } from '@/components/admin/CreateCodeForm';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { ReportQueue } from '@/components/admin/ReportQueue';
import { isAdmin } from '@/lib/auth';
import { SITE } from '@/lib/site';
import { getAdminData } from '@/lib/queries';
import { ADMIN_ACTION_LABEL } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = { title: `Quản trị — ${SITE.name}` };

function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'warn' | 'muted';
}) {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : tone === 'muted'
        ? 'border-slate-200 bg-slate-50 text-slate-500'
        : 'border-slate-200 bg-white text-slate-900 shadow-sm';

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const { stats, openReports, codes, recentActions, error } = await getAdminData();

  if (error) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          Không tải được dữ liệu quản trị: {error}
          <br />
          <span className="mt-2 block text-rose-600">
            Thường là do thiếu <code>SUPABASE_SECRET_KEY</code> hoặc chưa chạy migration 0002.
          </span>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Quản trị</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Mọi thao tác đều được ghi vào nhật ký bên dưới.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            ← Xem trang chính
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section aria-label="Thống kê" className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Tổng số mã" value={stats.total} />
        <StatTile label="Đang hoạt động" value={stats.active} />
        <StatTile label="Đã full 10/10" value={stats.full} tone="muted" />
        <StatTile label="Đã gỡ" value={stats.removed} tone="muted" />
        <StatTile
          label="Mã tự khai"
          value={stats.selfDeclared}
          tone={stats.selfDeclared > 0 ? 'warn' : 'default'}
        />
        <StatTile
          label="Báo lỗi chờ xử lý"
          value={stats.openReports}
          tone={stats.openReports > 0 ? 'warn' : 'default'}
        />
      </section>

      {/* 1. Hàng đợi báo lỗi — việc cần làm trước tiên nên đặt trên cùng */}
      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900">
          Báo lỗi chờ xử lý
          {stats.openReports > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-800">
              {stats.openReports}
            </span>
          )}
        </h2>
        <ReportQueue reports={openReports} />
      </section>

      {/* 2. Thêm mã */}
      <section className="mb-8">
        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-bold text-slate-900 marker:content-none">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              Thêm mã thủ công
            </span>
          </summary>
          <div className="border-t border-slate-200 p-4">
            <CreateCodeForm />
          </div>
        </details>
      </section>

      {/* 3. Danh sách mã */}
      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Danh sách mã</h2>
        <CodeTable codes={codes} />
      </section>

      {/* 4. Nhật ký thao tác */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Nhật ký thao tác gần đây</h2>
        {recentActions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Chưa có thao tác nào.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {recentActions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5 text-sm">
                <span className="font-semibold text-slate-800">
                  {ADMIN_ACTION_LABEL[a.action] ?? a.action}
                </span>
                {a.target_code && (
                  <span className="font-mono text-xs tracking-wider text-blue-600">
                    {a.target_code}
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-500">
                  {new Date(a.created_at).toLocaleString('vi-VN')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
