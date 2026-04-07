'use client';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  label?: string;
}

export function StarRating({ value, onChange, size = 20, label }: Props) {
  const stars = [1, 2, 3, 4, 5];
  const filled = Math.round(value);

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>}
      <div className="flex gap-0.5">
        {stars.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange?.(s)}
            className={onChange ? 'cursor-pointer' : 'cursor-default'}
            style={{ background: 'none', border: 'none', padding: 0 }}
            aria-label={`${s} star`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 20 20"
              fill={s <= filled ? '#f59e0b' : '#d1d5db'}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {value > 0 && <span className="text-sm font-semibold text-gray-700">{value.toFixed(1)}</span>}
    </div>
  );
}
