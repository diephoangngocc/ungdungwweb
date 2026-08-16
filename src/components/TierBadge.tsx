import { TIER_LABEL, type Tier } from '@/lib/types';

/**
 * Bảng màu 2 hạng — dùng chung cho badge, viền Card và thanh tiến trình.
 *
 * Hai hạng khác nhau ở ĐỘ ĐẬM chứ không chỉ ở sắc độ: SVIP là chip đặc có
 * gradient + ring + shadow, Thường/VIP là chip nền nhạt chữ đậm. Người bị mù
 * màu vẫn phân biệt được, và cả hai đều đạt tương phản chữ ≥ 4.5:1 (WCAG AA):
 *   - trắng trên indigo-600  ≈ 6.4:1   (đầu gradient)
 *   - trắng trên violet-600  ≈ 5.9:1   (cuối gradient)
 *   - blue-800 trên blue-100 ≈ 8.6:1
 */
export const TIER_STYLES: Record<
  Tier,
  { badge: string; card: string; accent: string; ring: string }
> = {
  svip: {
    badge:
      'bg-gradient-to-r from-indigo-600 to-violet-600 text-white ring-1 ring-indigo-300 shadow-sm',
    card: 'border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-white',
    accent: 'bg-gradient-to-r from-indigo-600 to-violet-600',
    ring: 'ring-1 ring-indigo-100',
  },
  thuong_vip: {
    badge: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
    card: 'border-slate-200 bg-white',
    accent: 'bg-blue-600',
    ring: '',
  },
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5',
        'text-[11px] font-bold uppercase tracking-wide',
        TIER_STYLES[tier].badge,
      ].join(' ')}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
