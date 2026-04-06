'use client';

type AdSlot = 'feed' | 'in-review';

const SLOT_CONFIG: Record<AdSlot, { height: string; label: string }> = {
  'feed':      { height: 'min-h-[90px]', label: 'AdSense · 320×90' },
  'in-review': { height: 'min-h-[56px]', label: 'AdSense · 320×50' },
};

export function AdPlaceholder({ slot }: { slot: AdSlot }) {
  const { height, label } = SLOT_CONFIG[slot];
  return (
    <div
      className={`w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 ${height}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
        Advertisement
      </span>
      <span className="mt-0.5 text-[9px] text-gray-200">{label}</span>
    </div>
  );
}
