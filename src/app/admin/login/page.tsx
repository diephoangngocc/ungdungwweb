import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { isAdmin } from '@/lib/auth';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata = { title: `Đăng nhập quản trị — ${SITE.name}` };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <LoginForm />
    </main>
  );
}
