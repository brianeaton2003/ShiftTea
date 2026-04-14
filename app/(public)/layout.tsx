import { Suspense } from 'react';
import { MobileShell } from '@/components/MobileShell';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <MobileShell>{children}</MobileShell>
    </Suspense>
  );
}
