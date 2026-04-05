import { MobileShell } from '@/components/MobileShell';

export default function MobileGroupLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
