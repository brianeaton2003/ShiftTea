import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'ShiftTea',
  description: 'Anonymous employer reviews from real hourly workers in South Jersey.',
};

/** `viewport-fit=cover` + min height fixes iOS Safari clipping the top bar under the notch / dynamic toolbar. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fff7ed',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-dvh overflow-hidden">
      <body
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
