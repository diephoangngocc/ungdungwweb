/**
 * Kênh giao tiếp nhẹ giữa CodeCard (trong feed) và CodeForm (trên đầu trang).
 * Dùng CustomEvent thay vì Context/global store để hai nhánh cây component
 * không phải bọc chung provider, và feed vẫn render được từ Server Component.
 */
export const PREFILL_PARENT_EVENT = 'referral-hub:prefill-parent';
