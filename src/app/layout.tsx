import type { Metadata, Viewport } from 'next';
import { SiteNav } from '@/components/SiteNav';
import { ToastProvider } from '@/components/Toast';
import { SITE } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: `${SITE.name} — Mã mời Mango cho Hà An Huy`,
  description: SITE.tagline,
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          <SiteNav />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
