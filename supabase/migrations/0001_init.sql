-- =============================================================================
-- 0001_init.sql — Referral Hub: schema + atomic cross-credit RPC
-- Target: Supabase (Postgres 15+)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUM tier
--    Thứ tự khai báo QUYẾT ĐỊNH thứ tự sort: 'thuong' < 'vip' < 'svip'.
--    => ORDER BY tier DESC cho ra SVIP > VIP > Thường mà không cần CASE WHEN,
--       và vẫn dùng được index B-tree.
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.code_tier as enum ('thuong', 'vip', 'svip');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Bảng codes
-- -----------------------------------------------------------------------------
create table if not exists public.codes (
  id          uuid             primary key default gen_random_uuid(),
  nickname    text             not null,
  code        text             not null,
  tier        public.code_tier not null default 'thuong',
  used_count  integer          not null default 0,
  parent_code text,
  created_at  timestamptz      not null default now(),

  -- Cột generated: luôn đồng bộ với used_count, không thể ghi đè từ client.
  -- Biểu thức immutable nên STORED hợp lệ và index được.
  is_full     boolean generated always as (used_count >= 10) stored,

  constraint codes_code_key         unique (code),
  constraint codes_nickname_len     check (char_length(btrim(nickname)) between 1 and 40),
  -- Code đã được chuẩn hoá UPPERCASE ở tầng RPC -> constraint chỉ chấp nhận hoa.
  constraint codes_code_format      check (code ~ '^[A-Z0-9_-]{4,32}$'),
  constraint codes_used_count_range check (used_count >= 0 and used_count <= 10),
  -- Chặn tự tham chiếu ở tầng DB (ngoài validate trong RPC).
  constraint codes_no_self_parent   check (parent_code is null or parent_code <> code),

  -- FK logic tới chính bảng này qua unique(code).
  -- ON DELETE SET NULL: xoá mã cha không làm mất mã con (giữ dữ liệu cộng đồng).
  constraint codes_parent_fk foreign key (parent_code)
    references public.codes (code)
    on update cascade
    on delete set null
);

comment on column public.codes.parent_code is
  'Mã của người trước mà chủ record này đã dùng. Chính nó tạo ra +1 used_count cho mã cha.';
comment on column public.codes.is_full is
  'Generated column: used_count >= 10. Client không ghi được, không thể giả mạo.';

-- -----------------------------------------------------------------------------
-- 3. Index
-- -----------------------------------------------------------------------------

-- (a) Index chính cho FEED đang mở. Partial index => nhỏ, chỉ chứa mã còn slot,
--     và match đúng thứ tự ORDER BY tier DESC, created_at ASC => index-only scan,
--     không cần sort node.
create index if not exists codes_feed_active_idx
  on public.codes (tier desc, created_at asc)
  where used_count < 10;

-- (b) Index tổng quát theo đề xuất ban đầu — hữu ích cho các query thống kê
--     lọc theo used_count (vd: đếm mã full theo tier).
create index if not exists codes_used_tier_created_idx
  on public.codes (used_count, tier, created_at);

-- (c) Phục vụ FK check + truy vết cây giới thiệu (ai đã dùng mã của tôi).
create index if not exists codes_parent_code_idx
  on public.codes (parent_code)
  where parent_code is not null;

-- -----------------------------------------------------------------------------
-- 4. RPC: submit_code — UPDATE cha + INSERT con trong MỘT transaction
--
--    XỬ LÝ RACE CONDITION (điểm cốt lõi):
--    Câu lệnh `UPDATE ... WHERE code = X AND used_count < 10` chạy ở isolation
--    level READ COMMITTED (mặc định của Postgres/Supabase). Khi hai request
--    cùng nhắm vào một hàng:
--      - Request 1 lấy row-level exclusive lock, tăng used_count.
--      - Request 2 chạm đúng hàng đó -> BỊ BLOCK cho tới khi R1 commit/rollback.
--      - Sau khi R1 commit, Postgres KHÔNG dùng lại snapshot cũ: nó chạy
--        EvalPlanQual, tức là ĐÁNH GIÁ LẠI mệnh đề WHERE trên phiên bản hàng
--        MỚI NHẤT. Nếu used_count vừa chạm 10, predicate `used_count < 10`
--        sai -> hàng bị loại -> ROW_COUNT = 0.
--    Vì vậy read-modify-write kiểu `SELECT used_count` rồi `UPDATE SET = n+1`
--    (lost update) không bao giờ xảy ra: phép cộng nằm ngay trong UPDATE và
--    predicate được re-check dưới lock.
--
--    ROW_COUNT = 0 => raise exception => TOÀN BỘ function abort => phần
--    used_count đã tăng (nếu có) được rollback cùng. Tương tự, nếu INSERT vi
--    phạm unique(code), ta bắt unique_violation rồi RE-RAISE, nên +1 của mã cha
--    cũng bị rollback — không có chuyện "cha bị tính lượt mà con không được tạo".
--
--    CHECK (used_count <= 10) là lớp phòng thủ cuối: kể cả có đường ghi khác
--    lọt qua, DB vẫn từ chối vượt 10.
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
  ---------------------------------------------------------------------------
  -- 4.1 Validate server-side (KHÔNG tin client)
  ---------------------------------------------------------------------------
  if v_nickname = '' or char_length(v_nickname) > 40 then
    raise exception 'INVALID_NICKNAME' using errcode = 'P0001';
  end if;

  if v_code !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'INVALID_CODE' using errcode = 'P0001';
  end if;

  if v_parent !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'INVALID_PARENT_CODE' using errcode = 'P0001';
  end if;

  -- Chặn tự tham chiếu (so sánh sau khi đã normalize hoa/thường + trim).
  if v_code = v_parent then
    raise exception 'SELF_REFERENCE' using errcode = 'P0001';
  end if;

  ---------------------------------------------------------------------------
  -- 4.2 Cộng lượt cho mã cha — conditional UPDATE (atomic, chống race)
  ---------------------------------------------------------------------------
  update public.codes
     set used_count = used_count + 1
   where code = v_parent
     and used_count < 10;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    -- Phân biệt "không tồn tại" vs "đã full" để trả lỗi cho đúng ngữ cảnh.
    if exists (select 1 from public.codes where code = v_parent) then
      raise exception 'PARENT_FULL' using errcode = 'P0001';
    else
      raise exception 'PARENT_NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 4.3 Tạo mã mới của người submit
  ---------------------------------------------------------------------------
  begin
    insert into public.codes (nickname, code, tier, parent_code, used_count)
    values (v_nickname, v_code, p_tier, v_parent, 0)
    returning * into v_new;
  exception
    when unique_violation then
      -- Re-raise => abort cả function => rollback luôn +1 ở bước 4.2.
      raise exception 'CODE_EXISTS' using errcode = 'P0001';
    when foreign_key_violation then
      raise exception 'PARENT_NOT_FOUND' using errcode = 'P0001';
  end;

  return v_new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. RLS + quyền
--    Chiến lược: bảng KHÔNG có policy INSERT/UPDATE/DELETE nào, và anon/
--    authenticated bị revoke quyền ghi. Con đường ghi DUY NHẤT là RPC
--    security definer ở trên (owner = postgres, bypass RLS vì là table owner).
--    => Client không thể tự UPDATE used_count để "spam lượt dùng ảo".
-- -----------------------------------------------------------------------------
alter table public.codes enable row level security;

drop policy if exists codes_public_read on public.codes;
create policy codes_public_read
  on public.codes
  for select
  to anon, authenticated
  using (true);

revoke all on table public.codes from anon, authenticated;
grant select on table public.codes to anon, authenticated;

revoke all on function public.submit_code(text, text, public.code_tier, text) from public;
grant execute on function public.submit_code(text, text, public.code_tier, text)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. (Tuỳ chọn) Seed mã gốc để hệ thống có "cha" đầu tiên.
--    Vì parent_code là BẮT BUỘC ở tầng UI/RPC, cần ít nhất một mã root do admin
--    tạo trực tiếp (bỏ qua RPC) thì người đầu tiên mới submit được.
-- -----------------------------------------------------------------------------
insert into public.codes (nickname, code, tier, parent_code)
values ('Admin', 'ROOT0001', 'svip', null)
on conflict (code) do nothing;
