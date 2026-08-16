# UngDung's Code

> Thư mục/repo vẫn tên `referral-hub`; tên hiển thị lấy từ `src/lib/site.ts`.

Web app nội bộ tổng hợp & luân chuyển mã mời. Lượt dùng được **ghi nhận chéo**: người đăng mã mới bắt buộc khai báo mã của người trước mà họ đã dùng, và chính hành động đó cộng `+1` cho mã cha. Không có nút "tôi đã dùng mã này" để spam.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + RLS + RPC)

## Tính năng

**Người dùng** (`/`)

- **Hai luồng đăng mã**: (A) vừa dùng mã trên web → khai mã cha, mã cha tự +1;
  (B) đã dùng mã từ trước → không cần khai mã cha, tự khai số lượt của mình
- Lượt tự khai lưu riêng ở `declared_count`, hiện công khai kèm nhãn "Tự khai"
- Validate 3 tầng cho cả hai luồng: client → server → Postgres
- Feed sắp xếp SVIP > Thường/VIP, rồi cũ hơn lên trước; mã full gom vào khu thu gọn
- Copy mã (Clipboard API + fallback), nút "Tôi dùng mã này" tự điền form
- **Báo mã lỗi**: chọn lý do + ghi chú; mỗi người chỉ báo một lần cho mỗi mã
- **4 trang công khai**, thanh điều hướng dính trên đầu mọi trang:
  `/` giới thiệu · `/huong-dan/vote-mango` · `/huong-dan/vote-1creator` ·
  `/lay-ma` (form đăng mã + danh sách mã)
- Hướng dẫn Mango+ (5 bước) và 1Creators (7 bước), ảnh minh hoạ bấm phóng to được;
  phase chưa có nội dung hiện khối "đang cập nhật" thay vì trang trống

**Quản trị** (`/admin`)

- Đăng nhập bằng mật khẩu chung, phiên lưu trong cookie httpOnly ký HMAC-SHA256
- Hàng đợi báo lỗi: **Gỡ mã** hoặc **Bỏ qua** (kèm ghi chú)
- Thêm mã thủ công (cho phép mã gốc `parent_code = NULL`), tuỳ chọn cộng lượt cho mã cha
- Sửa nickname / hạng / lượt dùng; **gỡ mềm** và khôi phục mã

**Giao diện**

- Banner đầu trang: ảnh idol + nhãn "Do UngDung lập" + mục đích của web
- Liên hệ hỗ trợ (Zalo) hiện ở footer, trong hộp thoại báo lỗi, và trong màn hình lỗi tải dữ liệu
- Nền trắng, nhấn xanh dương (đổi ảnh tại `public/idol.jpg`)
- Hai hạng: **SVIP** (chip gradient chàm–tím) và **Thường/VIP** (chip xanh nhạt)
- Mọi cặp màu chữ/nền đạt WCAG AA ≥ 4.5:1
- Nhật ký thao tác — mọi hành động admin đều được ghi lại

## Cấu trúc

```
supabase/migrations/
  0001_init.sql                     Schema, RPC atomic submit_code, RLS
  0002_admin_and_reports.sql        Xoá mềm, reports, admin RPC, audit log
  0003_merge_tiers.sql              Gộp 3 hạng còn 2: 'thuong_vip' | 'svip'
  0004_self_declared.sql            Luồng "đã dùng mã từ trước" + tự khai lượt
public/idol.jpg                     Ảnh banner — THAY BẰNG ẢNH IDOL CỦA BẠN
public/mascot.png                   Ảnh mascot bên phải banner
public/guide/buoc-1..4.jpg          Ảnh hướng dẫn app Mango+
public/guide/1c-1..7.jpg            Ảnh hướng dẫn app 1Creators
src/lib/
  site.ts                           Tên web, chủ web, mục đích, ảnh banner, Zalo hỗ trợ
  guide.ts                          Nội dung + slug 2 phase hướng dẫn (sửa chữ ở đây)
  types.ts        validation.ts     Kiểu dữ liệu + zod schema dùng chung
  errors.ts       queries.ts        Map lỗi tiếng Việt, truy vấn feed & admin
  auth.ts                           Token phiên admin (HMAC), so sánh timing-safe
  supabase/server.ts                Client anon (đọc feed, gọi RPC public)
  supabase/admin.ts                 Client secret key (chỉ dùng sau khi xác thực)
src/app/
  page.tsx                          Trang giới thiệu (tĩnh, không gọi DB)
  lay-ma/page.tsx                   Các bước + Form đăng mã + Feed
  actions/submit-code.ts            Server Action đăng mã
  actions/report-code.ts            Server Action báo lỗi
  actions/admin.ts                  Login/logout + 4 action quản trị
  admin/page.tsx  admin/login/      Trang quản trị
  huong-dan/[slug]/page.tsx         Trang hướng dẫn, sinh tĩnh từ GUIDE_PHASES
src/components/                     SiteNav, SiteFooter, SiteHeader, GuideLinks,
                                    GuideSteps, ContactBox, CodeForm, CodeFeed,
                                    CodeCard,
                                    ReportDialog, TierBadge, ProgressBar,
                                    CopyButton, Toast
src/components/admin/               LoginForm, ReportQueue, CreateCodeForm,
                                    CodeTable, LogoutButton
```

## Chạy

```bash
npm install
cp .env.example .env.local          # điền URL + key Supabase + mật khẩu admin
# Chạy 0001 → 0002 → 0003 trong Supabase SQL Editor
npm run dev
```

Chạy migration theo đúng thứ tự 0001 → 0002 → 0003. Migration seed sẵn mã gốc `ROOT0001` để người đầu tiên có "cha" mà khai báo.

**Mọi nội dung giới thiệu và số Zalo hỗ trợ nằm trong `src/lib/site.ts`** — sửa một chỗ là đổi khắp trang (banner, footer, hộp thoại báo lỗi, thẻ title trình duyệt).

**Sửa nội dung hướng dẫn:** toàn bộ chữ của 2 phase nằm trong `src/lib/guide.ts`. Phần đặt giữa `**hai dấu sao**` sẽ được in đậm. Thay ảnh minh hoạ: ghi đè `public/guide/buoc-N.jpg`.

Thêm một app mới = thêm một phần tử vào `GUIDE_PHASES` — route `/huong-dan/<slug>`, mục trên thanh điều hướng và thẻ ở trang chính đều tự sinh theo.

Phase nào chưa có nội dung thì đặt `draft: true` và để `steps: []` — trang tự hiện khối "đang cập nhật" kèm số Zalo thay vì trang trống.

**Đổi ảnh idol:** thay file `public/idol.jpg` (giữ nguyên tên; tỉ lệ ngang ~8:3; chủ thể nên lệch về phải vì góc dưới trái bị chữ đè). Đổi tên/mô tả fanclub trong `src/lib/site.ts`.

## Bất biến của hệ thống

| Bất biến | Được bảo đảm bởi |
|---|---|
| `0 <= used_count <= 10` | `CHECK` + `WHERE used_count < 10` trong RPC |
| Số mã con của X == `used_count` của X | UPDATE + INSERT trong cùng transaction |
| Không tự tham chiếu | `CHECK` + kiểm tra trong RPC + `.refine()` ở zod |
| Client không sửa được `used_count` | `REVOKE` quyền ghi; đường ghi duy nhất là RPC |
| `is_full` không giả mạo được | `GENERATED ALWAYS AS (used_count >= 10) STORED` |
| Mỗi người báo lỗi 1 lần/mã | `UNIQUE (code_id, reporter_key)` |
| `report_count` luôn khớp số báo cáo mở | Trigger `reports_sync_count` |
| Người dùng không đọc được nội dung báo cáo | RLS không policy + `REVOKE` trên `reports` |
| Chỉ admin gọi được `admin_*` | `REVOKE ... FROM public`, chỉ `GRANT` cho `service_role` |
| Mọi thao tác admin truy vết được | Ghi `admin_actions` ngay trong RPC |
| `declared_count <= used_count` | `CHECK codes_declared_le_used` |
| `used_count - declared_count == số mã con` | Chỉ RPC ghi được; kiểm bằng query rà soát trong 0004 |

## Kết quả kiểm thử

### Postgres 16 — nghiệp vụ cốt lõi

| Kịch bản | Kết quả |
|---|---|
| Happy path | Mã mới tạo, cha `+1` |
| `parent_code` không tồn tại / đã full / đã bị gỡ | `PARENT_NOT_FOUND` / `PARENT_FULL` / `PARENT_REMOVED` |
| `code` trùng | `CODE_EXISTS`, **`used_count` của cha rollback về giá trị cũ** |
| Tự tham chiếu | `SELF_REFERENCE` |
| `anon` tự `UPDATE used_count` | `permission denied for table codes` |
| Ghi vào `is_full` | `column "is_full" can only be updated to DEFAULT` |
| **30 request song song vào 1 mã còn 9 slot** | **đúng 9 OK / 21 `PARENT_FULL`; `used_count` = 10, không vượt** |
| Plan feed trên 80k dòng | `Index Scan using codes_feed_active_idx` — không có Sort node |

### Postgres 16 — báo lỗi & quản trị

| Kịch bản | Kết quả |
|---|---|
| 3 người khác nhau báo 1 mã | `report_count` = 3, mã **vẫn hiển thị** (không tự ẩn) |
| Cùng một người báo lại | `ALREADY_REPORTED` |
| Báo mã không tồn tại | `CODE_NOT_FOUND` |
| `anon` đọc `reports` / `admin_reports_view` | `permission denied` |
| `anon` gọi `admin_set_status` | `permission denied for function` |
| Admin gỡ mã | `status = removed`, báo cáo tự đóng, `report_count` về 0 |
| Admin đặt `used_count = 99` | `INVALID_USED_COUNT` |
| Admin bỏ qua / chấp nhận báo cáo | `dismissed` / `resolved` + gỡ mã trong 1 thao tác |
| Audit log | 7/7 thao tác được ghi kèm giá trị trước → sau |

### Postgres 16 — gộp hạng (migration 0003)

| Kịch bản | Kết quả |
|---|---|
| Dữ liệu cũ `thuong` + `vip` | Chuyển hết thành `thuong_vip`; `svip` giữ nguyên |
| Enum sau khi chạy | Đúng 2 giá trị, thứ tự `thuong_vip` < `svip` |
| Gọi RPC với hạng cũ `'vip'` | `invalid input value for enum code_tier` |
| Bất biến rollback sau khi tạo lại function | `CODE_EXISTS` → `used_count` của cha không đổi |
| View + phân quyền sau khi tạo lại | `anon` vẫn `permission denied` trên `reports` và `admin_set_status` |
| Plan feed trên 80k dòng | `Index Scan using codes_feed_active_idx` |

### Postgres 16 — luồng tự khai (migration 0004)

| Kịch bản | Kết quả |
|---|---|
| Luồng A (khai mã cha) | `declared_count = 0`, `self_declared = false`, mã cha `+1` |
| Luồng B (tự khai 4 lượt) | `used_count = 4`, `declared_count = 4`, `self_declared = true` |
| Người khác dùng mã của B | `used_count = 5`, phần web ghi nhận = 1 — cộng **thêm** lên trên phần tự khai |
| **Bất biến `used_count - declared_count == số mã con`** | **Đúng cho mọi mã đã kiểm** |
| Tự khai 11 / âm | `INVALID_DECLARED_COUNT` |
| Tự khai 10 | Mã full ngay, không lên feed |
| `anon` sửa trực tiếp `declared_count` | `permission denied for table codes` |
| Ép `declared_count > used_count` bằng SQL | Vi phạm `codes_declared_le_used` |

### Giao diện — audit tương phản WCAG AA

| Hạng mục | Kết quả |
|---|---|
| Quét toàn bộ text node (trang chính + quản trị) | 0 cặp màu dưới ngưỡng |
| Badge SVIP (chữ trắng trên gradient) — đo pixel thật | 6.39:1 |
| Tiêu đề banner trên ảnh | 8.69:1 |
| Mô tả banner trên ảnh | 10.59:1 |

### Phiên đăng nhập admin — 12/12 pass

| Kịch bản | Kết quả |
|---|---|
| Token mới | Chấp nhận |
| Sửa chữ ký | Từ chối |
| **Kéo dài hạn mà không ký lại** | **Từ chối** |
| Token hết hạn / rác / rỗng | Từ chối |
| Ký bằng secret khác | Từ chối |
| Mật khẩu đúng / sai / rỗng / tiền tố đúng | Đúng kết quả mong đợi |
| `ADMIN_SESSION_SECRET` < 32 ký tự | Ném lỗi kèm hướng dẫn tạo khoá |
