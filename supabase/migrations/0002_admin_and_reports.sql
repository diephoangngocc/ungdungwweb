-- =============================================================================
-- 0002_admin_and_reports.sql
--   * Xoá mềm (soft delete) cho mã
--   * Người dùng báo mã lỗi -> cảnh báo trên card + hàng đợi cho admin
--   * RPC dành riêng cho admin + audit log
-- Chạy SAU 0001_init.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trạng thái mã — xoá mềm
--    Không DELETE thật vì `parent_code` là FK tự tham chiếu: xoá cứng sẽ làm
--    mã con mất thông tin nguồn (ON DELETE SET NULL) và phá lịch sử luân chuyển.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.code_status as enum ('active', 'removed');
exception when duplicate_object then null;
end $$;

alter table public.codes
  add column if not exists status         public.code_status not null default 'active',
  add column if not exists removed_at     timestamptz,
  add column if not exists removed_reason text,
  -- Đếm sẵn số báo cáo đang mở. Denormalize có chủ đích: feed cần hiển thị
  -- badge cảnh báo trên MỌI card, nếu join/subquery mỗi dòng sẽ phá index-only scan.
  add column if not exists report_count   integer not null default 0;

alter table public.codes
  drop constraint if exists codes_report_count_nonneg;
alter table public.codes
  add constraint codes_report_count_nonneg check (report_count >= 0);

-- -----------------------------------------------------------------------------
-- 2. Bảng reports
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.report_reason as enum
    ('khong_dung_duoc', 'ma_sai', 'da_het_han', 'spam', 'khac');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null;
end $$;

create table if not exists public.reports (
  id            uuid                  primary key default gen_random_uuid(),
  code_id       uuid                  not null references public.codes(id) on delete cascade,
  reason        public.report_reason  not null,
  note          text,
  -- Khoá ẩn danh sinh ở trình duyệt (localStorage). Không phải danh tính thật,
  -- chỉ để chặn 1 người spam báo cáo cùng một mã nhiều lần.
  reporter_key  text                  not null,
  status        public.report_status  not null default 'open',
  created_at    timestamptz           not null default now(),
  resolved_at   timestamptz,
  resolved_note text,

  constraint reports_note_len     check (note is null or char_length(note) <= 280),
  constraint reports_key_len      check (char_length(reporter_key) between 8 and 64),
  constraint reports_once_per_key unique (code_id, reporter_key)
);

comment on column public.reports.reporter_key is
  'Khoá ẩn danh từ localStorage. UNIQUE(code_id, reporter_key) => mỗi người chỉ báo 1 lần/mã.';

-- -----------------------------------------------------------------------------
-- 3. Trigger đồng bộ codes.report_count = số report đang 'open'
-- -----------------------------------------------------------------------------
create or replace function public.sync_report_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code_id uuid := coalesce(new.code_id, old.code_id);
begin
  update public.codes c
     set report_count = (
       select count(*) from public.reports r
        where r.code_id = v_code_id and r.status = 'open'
     )
   where c.id = v_code_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reports_sync_count on public.reports;
create trigger reports_sync_count
  after insert or update or delete on public.reports
  for each row execute function public.sync_report_count();

-- -----------------------------------------------------------------------------
-- 4. Audit log — mọi thao tác admin đều để lại dấu vết
--    Vì admin dùng MẬT KHẨU CHUNG, log này là thứ duy nhất trả lời được
--    "ai đã gỡ mã X lúc nào". Không có nó, thao tác admin là hộp đen.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id          bigint generated always as identity primary key,
  action      text        not null,
  target_code text,
  detail      jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_actions_recent_idx
  on public.admin_actions (created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Index
-- -----------------------------------------------------------------------------
-- Feed chỉ hiện mã active còn slot -> predicate của partial index phải khớp.
drop index if exists public.codes_feed_active_idx;
create index codes_feed_active_idx
  on public.codes (tier desc, created_at asc)
  where used_count < 10 and status = 'active';

create index if not exists reports_open_idx
  on public.reports (created_at desc) where status = 'open';

create index if not exists reports_code_id_idx on public.reports (code_id);

-- -----------------------------------------------------------------------------
-- 6. submit_code — thêm điều kiện status = 'active'
--    Mã đã bị admin gỡ thì KHÔNG được dùng làm parent nữa.
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

-- -----------------------------------------------------------------------------
-- 7. report_code — người dùng báo mã lỗi (public, gọi được bởi anon)
-- -----------------------------------------------------------------------------
create or replace function public.report_code(
  p_code         text,
  p_reason       public.report_reason,
  p_note         text,
  p_reporter_key text
)
returns integer                      -- số báo cáo đang mở của mã sau khi ghi nhận
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code  text := upper(btrim(coalesce(p_code, '')));
  v_key   text := btrim(coalesce(p_reporter_key, ''));
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
  v_id    uuid;
  v_count integer;
begin
  if char_length(v_key) not between 8 and 64 then
    raise exception 'INVALID_REPORTER' using errcode = 'P0001'; end if;
  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'NOTE_TOO_LONG' using errcode = 'P0001'; end if;

  select id into v_id from public.codes where code = v_code and status = 'active';
  if v_id is null then
    raise exception 'CODE_NOT_FOUND' using errcode = 'P0001'; end if;

  begin
    insert into public.reports (code_id, reason, note, reporter_key)
    values (v_id, p_reason, v_note, v_key);
  exception when unique_violation then
    -- Đã báo mã này rồi -> không cộng thêm, tránh 1 người thổi phồng số báo cáo.
    raise exception 'ALREADY_REPORTED' using errcode = 'P0001';
  end;

  select report_count into v_count from public.codes where id = v_id;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. RPC dành cho ADMIN
--    Chỉ `service_role` được EXECUTE. Tầng Next.js xác thực cookie admin TRƯỚC,
--    rồi mới dùng secret key gọi các hàm này. anon không chạm tới được.
-- -----------------------------------------------------------------------------

-- 8.1 Thêm mã thủ công. parent_code có thể NULL => tạo mã gốc.
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

    -- Chỉ cộng lượt cho mã cha khi admin tick "ghi nhận lượt".
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

-- 8.2 Sửa mã. used_count sửa được để admin khắc phục sai sót, nhưng vẫn bị
--     CHECK 0..10 chặn và mọi lần sửa đều ghi giá trị cũ -> mới vào audit log.
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

-- 8.3 Ẩn / khôi phục mã (xoá mềm)
create or replace function public.admin_set_status(
  p_code   text,
  p_status public.code_status,
  p_reason text default null
)
returns public.codes
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_new  public.codes;
begin
  update public.codes
     set status         = p_status,
         removed_at     = case when p_status = 'removed' then now() else null end,
         removed_reason = case when p_status = 'removed'
                               then nullif(btrim(coalesce(p_reason, '')), '') else null end
   where code = v_code
  returning * into v_new;

  if not found then
    raise exception 'CODE_NOT_FOUND' using errcode = 'P0001'; end if;

  -- Gỡ mã thì đóng luôn các báo cáo đang mở của nó (trigger tự hạ report_count).
  if p_status = 'removed' then
    update public.reports
       set status = 'resolved', resolved_at = now(),
           resolved_note = coalesce(nullif(btrim(p_reason), ''), 'Mã đã bị gỡ')
     where code_id = v_new.id and status = 'open';
  end if;

  insert into public.admin_actions (action, target_code, detail)
  values (case when p_status = 'removed' then 'remove_code' else 'restore_code' end,
          v_code, jsonb_build_object('reason', p_reason));

  return v_new;
end;
$$;

-- 8.4 Xử lý một báo cáo: chấp nhận (kèm tuỳ chọn gỡ mã) hoặc bỏ qua
create or replace function public.admin_resolve_report(
  p_report_id   uuid,
  p_status      public.report_status,
  p_note        text    default null,
  p_remove_code boolean default false
)
returns public.reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_report public.reports;
  v_code   text;
begin
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001'; end if;

  select c.code into v_code
    from public.reports r join public.codes c on c.id = r.code_id
   where r.id = p_report_id;

  if v_code is null then
    raise exception 'REPORT_NOT_FOUND' using errcode = 'P0001'; end if;

  if p_remove_code then
    perform public.admin_set_status(v_code, 'removed',
                                    coalesce(nullif(btrim(p_note), ''), 'Gỡ theo báo cáo'));
  end if;

  update public.reports
     set status = p_status, resolved_at = now(),
         resolved_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_report_id
  returning * into v_report;

  insert into public.admin_actions (action, target_code, detail)
  values ('resolve_report', v_code,
          jsonb_build_object('report_id', p_report_id, 'status', p_status,
                             'remove_code', p_remove_code, 'note', p_note));

  return v_report;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. View cho hàng đợi báo lỗi (chỉ admin đọc)
-- -----------------------------------------------------------------------------
create or replace view public.admin_reports_view as
select r.id, r.reason, r.note, r.status, r.created_at, r.resolved_at, r.resolved_note,
       c.id as code_id, c.code, c.nickname, c.tier, c.used_count,
       c.status as code_status, c.report_count
  from public.reports r
  join public.codes  c on c.id = r.code_id;

alter view public.admin_reports_view set (security_invoker = on);

-- -----------------------------------------------------------------------------
-- 10. RLS + quyền
-- -----------------------------------------------------------------------------
alter table public.reports       enable row level security;
alter table public.admin_actions enable row level security;

-- Không tạo policy nào cho reports/admin_actions => anon & authenticated mù hoàn toàn.
-- Nội dung báo cáo (kể cả ghi chú) chỉ admin đọc được.
revoke all on table public.reports            from anon, authenticated;
revoke all on table public.admin_actions      from anon, authenticated;
revoke all on public.admin_reports_view       from anon, authenticated;

-- Người dùng ẩn danh chỉ được GỌI report_code, không đọc/ghi trực tiếp bảng.
revoke all on function public.report_code(text, public.report_reason, text, text) from public;
grant execute on function public.report_code(text, public.report_reason, text, text)
  to anon, authenticated;

-- Các hàm admin: chỉ service_role.
revoke all on function public.admin_create_code(text, text, public.code_tier, text, integer, boolean) from public;
revoke all on function public.admin_update_code(text, text, public.code_tier, integer)                from public;
revoke all on function public.admin_set_status(text, public.code_status, text)                        from public;
revoke all on function public.admin_resolve_report(uuid, public.report_status, text, boolean)         from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.admin_create_code(text, text, public.code_tier, text, integer, boolean) to service_role';
    execute 'grant execute on function public.admin_update_code(text, text, public.code_tier, integer) to service_role';
    execute 'grant execute on function public.admin_set_status(text, public.code_status, text) to service_role';
    execute 'grant execute on function public.admin_resolve_report(uuid, public.report_status, text, boolean) to service_role';
    execute 'grant select on public.admin_reports_view to service_role';
    execute 'grant select on public.reports, public.admin_actions to service_role';
  end if;
end $$;
