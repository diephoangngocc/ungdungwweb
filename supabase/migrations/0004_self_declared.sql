-- =============================================================================
-- 0004_self_declared.sql — Hai luồng đăng mã
--   (A) Người MỚI dùng mã trên web  -> khai parent_code, mã cha +1  (như cũ)
--   (B) Người ĐÃ dùng mã từ trước   -> không có parent_code, TỰ KHAI số lượt
-- Chạy SAU 0003_merge_tiers.sql
--
-- ĐÁNH ĐỔI CẦN BIẾT: luồng (B) cho người dùng tự nhập số lượt — đúng thứ mà
-- thiết kế ban đầu chặn. Không thể bỏ, vì người tham gia từ trước đã có sẵn
-- vài lượt; ép về 0 vừa sai thực tế vừa cho họ nhận quá 10 lượt tổng.
--
-- Cách kiểm soát: tách phần tự khai ra cột riêng thay vì trộn vào used_count.
-- Nhờ đó luôn kiểm chứng được:
--     used_count - declared_count == số mã con trỏ tới mã này
-- Phần web tự ghi nhận vẫn không thể giả mạo; chỉ phần declared_count là lời
-- khai, và nó hiện công khai trên card + lọc được ở trang quản trị.
-- =============================================================================

alter table public.codes
  add column if not exists declared_count integer not null default 0,
  add column if not exists self_declared  boolean not null default false;

alter table public.codes drop constraint if exists codes_declared_range;
alter table public.codes
  add constraint codes_declared_range check (declared_count >= 0 and declared_count <= 10);

-- Bất biến: phần tự khai không bao giờ vượt tổng lượt.
alter table public.codes drop constraint if exists codes_declared_le_used;
alter table public.codes
  add constraint codes_declared_le_used check (declared_count <= used_count);

comment on column public.codes.declared_count is
  'Số lượt do chính chủ tự khai lúc đăng (luồng B). Phần web ghi nhận = used_count - declared_count.';
comment on column public.codes.self_declared is
  'true nếu mã được đăng qua luồng B (không khai mã cha).';

-- Lọc nhanh danh sách mã tự khai để admin rà soát.
create index if not exists codes_self_declared_idx
  on public.codes (created_at desc) where self_declared;

-- -----------------------------------------------------------------------------
-- RPC luồng (B): đăng mã kèm số lượt tự khai, KHÔNG có mã cha
-- -----------------------------------------------------------------------------
create or replace function public.submit_code_declared(
  p_nickname       text,
  p_code           text,
  p_tier           public.code_tier,
  p_declared_count integer
)
returns public.codes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nickname text    := btrim(coalesce(p_nickname, ''));
  v_code     text    := upper(btrim(coalesce(p_code, '')));
  v_declared integer := coalesce(p_declared_count, 0);
  v_new      public.codes;
begin
  if v_nickname = '' or char_length(v_nickname) > 40 then
    raise exception 'INVALID_NICKNAME' using errcode = 'P0001'; end if;
  if v_code !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;
  if v_declared < 0 or v_declared > 10 then
    raise exception 'INVALID_DECLARED_COUNT' using errcode = 'P0001'; end if;

  -- used_count khởi tạo BẰNG phần tự khai; mọi lượt sau này do người khác
  -- khai mã cha sẽ cộng thêm lên trên, nên hai phần luôn tách bạch.
  begin
    insert into public.codes (nickname, code, tier, parent_code,
                              used_count, declared_count, self_declared)
    values (v_nickname, v_code, p_tier, null, v_declared, v_declared, true)
    returning * into v_new;
  exception when unique_violation then
    raise exception 'CODE_EXISTS' using errcode = 'P0001';
  end;

  return v_new;
end;
$$;

revoke all on function public.submit_code_declared(text, text, public.code_tier, integer) from public;
grant execute on function public.submit_code_declared(text, text, public.code_tier, integer)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- View admin: bổ sung 2 cột mới
-- -----------------------------------------------------------------------------
create or replace view public.admin_reports_view as
select r.id, r.reason, r.note, r.status, r.created_at, r.resolved_at, r.resolved_note,
       c.id as code_id, c.code, c.nickname, c.tier, c.used_count,
       c.status as code_status, c.report_count,
       c.declared_count, c.self_declared
  from public.reports r
  join public.codes  c on c.id = r.code_id;

alter view public.admin_reports_view set (security_invoker = on);

revoke all on public.admin_reports_view from anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select on public.admin_reports_view to service_role';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Truy vấn rà soát cho admin: mã nào tự khai nhiều mà web ghi nhận ít?
-- (chạy tay trong SQL Editor khi nghi ngờ có người khai khống)
-- -----------------------------------------------------------------------------
--   select code, nickname, declared_count,
--          used_count - declared_count as web_ghi_nhan,
--          (select count(*) from codes ch where ch.parent_code = c.code) as so_ma_con
--     from codes c
--    where self_declared
--    order by declared_count desc;
--
-- `web_ghi_nhan` PHẢI bằng `so_ma_con`. Lệch nhau = dữ liệu bị can thiệp ngoài RPC.
