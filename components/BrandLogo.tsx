import Image from 'next/image';
import Link from 'next/link';

export function BrandLogo({
  href = '/',
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${className ?? ''}`}
      aria-label="ShiftTea home"
    >
      <Image src="/logo.png" alt="" width={36} height={36} priority className="h-8 w-8 shrink-0 object-contain" />
      <span className="text-lg font-bold leading-none tracking-tight text-gray-900 sm:text-xl">
        Shift<span className="text-orange-500">Tea</span>
      </span>
    </Link>
  );
}

export function BrandLogoFooter() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-semibold text-slate-50">
        Shift<span className="text-orange-400">Tea</span>
      </span>
    </div>
  );
}
