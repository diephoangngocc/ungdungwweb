import { MAX_USES } from '@/lib/types';

type Props = {
  value: number;
  max?: number;
  /** Class Tailwind cho phần đã lấp đầy (lấy từ TIER_STYLES.accent). */
  accentClassName?: string;
};

/**
 * Thanh tiến trình dạng 10 ô rời — đọc "3/10" bằng mắt nhanh hơn thanh liền,
 * và mỗi ô tương ứng đúng 1 slot còn lại.
 */
export function ProgressBar({ value, max = MAX_USES, accentClassName = 'bg-sky-500' }: Props) {
  const safe = Math.min(Math.max(value, 0), max);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={safe}
      aria-label={`Đã dùng ${safe} trên ${max} lượt`}
      className="flex w-full gap-1"
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={[
            'h-1.5 flex-1 rounded-full transition-colors',
            i < safe ? accentClassName : 'bg-slate-200',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
