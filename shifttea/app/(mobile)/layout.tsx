import { Suspense } from 'react';
import { MobileShell } from '@/components/MobileShell';

export default function MobileGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <MobileShell>{children}</MobileShell>
    </Suspense>
  );
}
