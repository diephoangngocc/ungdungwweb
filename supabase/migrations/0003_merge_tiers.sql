-- =============================================================================
-- 0003_merge_tiers.sql — Gộp 3 hạng còn 2: 'thuong_vip' (Thường/VIP) và 'svip'
-- Chạy SAU 0002_admin_and_reports.sql
--
-- Postgres KHÔNG cho xoá giá trị khỏi enum, nên phải tạo type mới rồi chuyển.
-- Mọi đối tượng phụ thuộc vào code_tier (view, function, index) phải bỏ trước,
-- tạo lại sau — nếu không, ALTER COLUMN TYPE sẽ báo lỗi dependency.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bỏ các đối tượng phụ thuộc
-- -----------------------------------------------------------------------------
drop view if exists public.admin_reports_view;

drop function if exists public.submit_code(text, text, public.code_tier, text);
drop function if exists public.admin_create_code(text, text, public.code_tier, text, integer, boolean);
drop function if exists public.admin_update_code(text, text, public.code_tier, integer);

drop index if exists public.codes_feed_active_idx;
drop index if exists public.codes_used_tier_created_idx;

-- -----------------------------------------------------------------------------
-- 2. Enum mới. Thứ tự khai báo vẫn quyết định sort:
--    'thuong_vip' < 'svip'  =>  ORDER BY tier DESC cho SVIP lên đầu.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.code_tier_v2 as enum ('thuong_vip', 'svip');
exception when duplicate_object then null;
end $$;

-- DEFAULT thuộc kiểu cũ nên phải gỡ trước khi đổi kiểu cột.
alter table public.codes alter column tier drop default;

alter table public.codes
  alter column tier type public.code_tier_v2
  using (case tier when 'svip' then 'svip' else 'thuong_vip' end)::public.code_tier_v2;

alter table public.codes alter column tier set default 'thuong_vip';

drop type public.code_tier;
alter type public.code_tier_v2 rename to code_tier;

-- -----------------------------------------------------------------------------
-- 3. Tạo lại index (predicate và thứ tự cột giữ nguyên như 0002)
-- -----------------------------------------------------------------------------
create index codes_feed_active_idx
  on public.codes (tier desc, created_at asc)
  where used_count < 10 and status = 'active';

create index codes_used_tier_created_idx
  on public.codes (used_count, tier, created_at);

-- -----------------------------------------------------------------------------
-- 4. Tạo lại các function (thân hàm giữ nguyên, chỉ khác kiểu tham số tier)
-- -----------------------------------------------------------------------------
create or replace function public.submit_code(
  p_nickname    text,
  p_code        text,
  p_tier        public.code_tier,
  p_parent_code text
)
returns public.codes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nickname text := btrim(coalesce(p_nickname, ''));
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_parent   text := upper(btrim(coalesce(p_parent_code, '')));
  v_updated  integer;
  v_new      public.codes;
begin
  if v_nickname = '' or char_length(v_nickname) > 40 then
    raise exception 'INVALID_NICKNAME' using errcode = 'P0001'; end if;
  if v_code !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;
  if v_parent !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'INVALID_PARENT_CODE' using errcode = 'P0001'; end if;
  if v_code = v_parent then
    raise exception 'SELF_REFERENCE' using errcode = 'P0001'; end if;

  -- Conditional UPDATE: predicate được EvalPlanQual đánh giá lại dưới row lock
  -- => nhiều request song song không thể đẩy used_count vượt 10.
  update public.codes
     set used_count = used_count + 1
   where code = v_parent
     and used_count < 10
     and status = 'active';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    if exists (select 1 from public.codes where code = v_parent and status = 'removed') then
      raise exception 'PARENT_REMOVED' using errcode = 'P0001';
    elsif exists (select 1 from public.codes where code = v_parent) then
      raise exception 'PARENT_FULL' using errcode = 'P0001';
    else
      raise exception 'PARENT_NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  begin
    insert into public.codes (nickname, code, tier, parent_code, used_count)
    values (v_nickname, v_code, p_tier, v_parent, 0)
    returning * into v_new;
  exception
    when unique_violation      then raise exception 'CODE_EXISTS'      using errcode = 'P0001';
    when foreign_key_violation then raise exception 'PARENT_NOT_FOUND' using errcode = 'P0001';
  end;

  return v_new;
end;
$$;

create or replace function public.admin_create_code(
  p_nickname      text,
  p_code          text,
  p_tier          public.code_tier,
  p_parent_code   text    default null,
  p_used_count    integer default 0,
  p_credit_parent boolean default false
)
returns public.codes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nickname text    := btrim(coalesce(p_nickname, ''));
  v_code     text    := upper(btrim(coalesce(p_code, '')));
  v_parent   text    := nullif(upper(btrim(coalesce(p_parent_code, ''))), '');
  v_used     integer := coalesce(p_used_count, 0);
  v_new      public.codes;
  v_updated  integer;
begin
  if v_nickname = '' or char_length(v_nickname) > 40 then
    raise exception 'INVALID_NICKNAME' using errcode = 'P0001'; end if;
  if v_code !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'INVALID_CODE' using errcode = 'P0001'; end if;
  if v_used < 0 or v_used > 10 then
    raise exception 'INVALID_USED_COUNT' using errcode = 'P0001'; end if;

  if v_parent is not null then
    if v_parent = v_code then
      raise exception 'SELF_REFERENCE' using errcode = 'P0001'; end if;
    if not exists (select 1 from public.codes where code = v_parent) then
      raise exception 'PARENT_NOT_FOUND' using errcode = 'P0001'; end if;

    if p_credit_parent then
      update public.codes set used_count = used_count + 1
       where code = v_parent and used_count < 10 and status = 'active';
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'PARENT_FULL' using errcode = 'P0001'; end if;
    end if;
  end if;

  begin
    insert into public.codes (nickname, code, tier, parent_code, used_count)
    values (v_nickname, v_code, p_tier, v_parent, v_used)
    returning * into v_new;
  exception when unique_violation then
    raise exception 'CODE_EXISTS' using errcode = 'P0001';
  end;

  insert into public.admin_actions (action, target_code, detail)
  values ('create_code', v_code,
          jsonb_build_object('tier', p_tier, 'parent_code', v_parent,
                             'used_count', v_used, 'credit_parent', p_credit_parent));

  return v_new;
end;
$$;

create or replace function public.admin_update_code(
  p_code       text,
  p_nickname   text,
  p_tier       public.code_tier,
  p_used_count integer
)
returns public.codes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code     text    := upper(btrim(coalesce(p_code, '')));
  v_nickname text    := btrim(coalesce(p_nickname, ''));
  v_used     integer := coalesce(p_used_count, 0);
  v_old      public.codes;
  v_new      public.codes;
begin
  if v_nickname = '' or char_length(v_nickname) > 40 then
    raise exception 'INVALID_NICKNAME' using errcode = 'P0001'; end if;
  if v_used < 0 or v_used > 10 then
    raise exception 'INVALID_USED_COUNT' using errcode = 'P0001'; end if;

  select * into v_old from public.codes where code = v_code;
  if not found then
    raise exception 'CODE_NOT_FOUND' using errcode = 'P0001'; end if;

  update public.codes
     set nickname = v_nickname, tier = p_tier, used_count = v_used
   where code = v_code
  returning * into v_new;

  insert into public.admin_actions (action, target_code, detail)
  values ('update_code', v_code, jsonb_build_object(
    'truoc', jsonb_build_object('nickname', v_old.nickname, 'tier', v_old.tier,
                                'used_count', v_old.used_count),
    'sau',   jsonb_build_object('nickname', v_new.nickname, 'tier', v_new.tier,
                                'used_count', v_new.used_count)));

  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Tạo lại view hàng đợi báo lỗi
-- -----------------------------------------------------------------------------
create or replace view public.admin_reports_view as
select r.id, r.reason, r.note, r.status, r.created_at, r.resolved_at, r.resolved_note,
       c.id as code_id, c.code, c.nickname, c.tier, c.used_count,
       c.status as code_status, c.report_count
  from public.reports r
  join public.codes  c on c.id = r.code_id;

alter view public.admin_reports_view set (security_invoker = on);

-- -----------------------------------------------------------------------------
-- 6. Cấp lại quyền (DROP FUNCTION đã xoá sạch grant cũ)
-- -----------------------------------------------------------------------------
revoke all on public.admin_reports_view from anon, authenticated;

revoke all on function public.submit_code(text, text, public.code_tier, text) from public;
grant execute on function public.submit_code(text, text, public.code_tier, text)
  to anon, authenticated;

revoke all on function public.admin_create_code(text, text, public.code_tier, text, integer, boolean) from public;
revoke all on function public.admin_update_code(text, text, public.code_tier, integer)                from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.admin_create_code(text, text, public.code_tier, text, integer, boolean) to service_role';
    execute 'grant execute on function public.admin_update_code(text, text, public.code_tier, integer) to service_role';
    execute 'grant select on public.admin_reports_view to service_role';
  end if;
end $$;
