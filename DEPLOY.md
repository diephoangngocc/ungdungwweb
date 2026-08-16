# Deploy public — Vercel + Supabase

Toàn bộ quy trình dưới đây dùng **free tier của cả hai dịch vụ**, không cần thẻ tín dụng. Thời gian thực tế: ~20 phút.

Kiến trúc sau khi deploy:

```
Người dùng  ──HTTPS──►  Vercel (Next.js SSR + Server Action)
                              │
                              └──► Supabase Postgres (RPC submit_code + RLS)
```

Không có server nào bạn phải tự quản lý. Trình duyệt **không** nói chuyện trực tiếp với Supabase — mọi ghi đều đi qua Server Action trên Vercel.

---

## Bước 0 — Chuẩn bị

Ba tài khoản, đăng nhập tất cả bằng **cùng một tài khoản GitHub** cho đỡ rối:

| Dịch vụ | Link | Dùng để |
|---|---|---|
| GitHub | github.com | Chứa source code |
| Supabase | supabase.com/dashboard | Database |
| Vercel | vercel.com/signup | Chạy web app |

---

## Bước 1 — Dựng database trên Supabase

**1.1. Tạo project**

Dashboard → **New project**:

- *Name*: `referral-hub`
- *Database Password*: bấm **Generate a password** rồi **lưu lại chỗ an toàn**. Bạn không cần nó cho app này, nhưng mất thì phải reset.
- *Region*: chọn gần người dùng nhất. Cộng đồng ở Việt Nam → **Southeast Asia (Singapore)**. Chọn sai region là nguyên nhân phổ biến nhất khiến app chậm — và **không đổi được sau khi tạo**.

Đợi ~2 phút cho project khởi tạo xong.

**1.2. Chạy migration**

Sidebar trái → **SQL Editor** → **New query**. Chạy **bốn file, đúng thứ tự**, mỗi file một query riêng:

1. Dán toàn bộ `supabase/migrations/0001_init.sql` → **Run**
2. Dán toàn bộ `supabase/migrations/0002_admin_and_reports.sql` → **Run**
3. Dán toàn bộ `supabase/migrations/0003_merge_tiers.sql` → **Run**
4. Dán toàn bộ `supabase/migrations/0004_self_declared.sql` → **Run**

Kết quả mong đợi: `Success. No rows returned`. Nếu có `NOTICE: policy ... does not exist, skipping` thì **bình thường** — đó là câu `drop policy if exists`.

File 0002 thêm: xoá mềm, bảng `reports` cho tính năng báo mã lỗi, các hàm `admin_*`, và bảng nhật ký `admin_actions`. File 0003 gộp 3 hạng còn 2 (`thuong_vip` = Thường/VIP, `svip`) — dữ liệu `thuong` và `vip` cũ tự chuyển thành `thuong_vip`. File 0004 mở luồng "đã dùng mã từ trước" (tự khai số lượt).

**1.3. Kiểm tra nhanh**

Vẫn trong SQL Editor, chạy:

```sql
select code, tier, used_count, is_full from public.codes;
```

Phải thấy đúng 1 dòng: `ROOT0001 | svip | 0 | false`. Đây là mã gốc để người đầu tiên có "cha" mà khai báo.

> **Nên đổi mã gốc** thành thứ có ý nghĩa với cộng đồng bạn:
> ```sql
> update public.codes set code = 'FANCLUB01', nickname = 'BQT' where code = 'ROOT0001';
> ```
> Đổi được an toàn vì FK có `ON UPDATE CASCADE`.

**1.4. Lấy key**

**Project Settings** (bánh răng) → **API Keys**. Copy hai giá trị:

| Tên trên dashboard | Biến môi trường |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| **Secret key** (`sb_secret_...`) | `SUPABASE_SECRET_KEY` |

Nếu project của bạn chỉ hiện **anon public** / **service_role** (`eyJ...`) thì dùng chúng với tên biến `NEXT_PUBLIC_SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` — code nhận cả hai kiểu. Lưu ý Supabase sẽ khai tử key JWT legacy vào **cuối 2026**, nên project mới hãy dùng publishable/secret key.

> Publishable key lộ ra phía client là **có chủ đích và an toàn**: nó map tới Postgres role `anon`, mà role đó trong migration chỉ được `SELECT` trên `codes` và `EXECUTE` hai hàm `submit_code()` / `report_code()`. Không sửa được `used_count`, không đọc được nội dung báo cáo.
>
> ⚠️ **Secret key thì ngược lại — nó bỏ qua toàn bộ RLS.** Chỉ dùng cho trang `/admin`, và tên biến **không có** prefix `NEXT_PUBLIC_` nên không bao giờ lọt vào bundle trình duyệt. Đừng dán nó vào bất cứ đâu khác.

**1.5. Tạo mật khẩu và khoá phiên cho trang quản trị**

Chạy trên máy bạn (hoặc bất kỳ terminal nào):

```bash
openssl rand -base64 24   # -> ADMIN_PASSWORD
openssl rand -hex 32      # -> ADMIN_SESSION_SECRET
```

Không có `openssl` (Windows)? Dùng PowerShell:

```powershell
[Convert]::ToBase64String((1..24|%{Get-Random -Max 256}))            # ADMIN_PASSWORD
-join((1..64)|%{'0123456789abcdef'[(Get-Random -Max 16)]})           # ADMIN_SESSION_SECRET
```

`ADMIN_PASSWORD` là thứ duy nhất đứng giữa internet và quyền sửa dữ liệu — đừng đặt `admin123`. Đổi `ADMIN_SESSION_SECRET` sau này sẽ đăng xuất mọi phiên admin đang mở (hữu ích nếu nghi ngờ bị lộ).

---

## Bước 2 — Đưa code lên GitHub

Trong thư mục project:

```bash
git init
git add .
git commit -m "Referral Hub: schema, RPC atomic, UI"
```

Kiểm tra `.env.local` **không** nằm trong commit (`.gitignore` đã loại sẵn):

```bash
git status --short          # không được thấy .env.local
```

Tạo repo trên GitHub (**Private** là đủ — Vercel vẫn đọc được), rồi:

```bash
git remote add origin https://github.com/<username>/referral-hub.git
git branch -M main
git push -u origin main
```

---

## Bước 3 — Deploy lên Vercel

**3.1.** vercel.com → **Add New… → Project** → **Import Git Repository** → chọn `referral-hub`.

**3.2.** Vercel tự nhận diện Next.js. **Không đổi** Build Command / Output Directory.

**3.3.** Mở **Environment Variables**, thêm 4 biến từ bước 1.4 và 1.5:

```
NEXT_PUBLIC_SUPABASE_URL              = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = sb_publishable_xxxx
SUPABASE_SECRET_KEY                   = sb_secret_xxxx
ADMIN_PASSWORD                        = <chuỗi từ openssl rand -base64 24>
ADMIN_SESSION_SECRET                  = <chuỗi từ openssl rand -hex 32>
```

Để mặc định cả 3 môi trường (Production / Preview / Development) đều tick.

Bỏ qua 3 biến cuối thì trang chính vẫn chạy bình thường, chỉ `/admin` báo lỗi cấu hình.

> ⚠️ Đây là lỗi hay gặp nhất: **thêm biến sau khi đã deploy thì phải Redeploy**, vì biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build chứ không đọc lúc chạy. Deployments → dấu `⋯` → **Redeploy**.

**3.4.** Bấm **Deploy**, đợi ~1–2 phút.

Xong — app đã public tại `https://referral-hub-xxxx.vercel.app`, có sẵn HTTPS, CDN toàn cầu. Gửi link này cho cộng đồng là dùng được ngay.

---

## Bước 4 — Kiểm tra sau khi deploy

Mở link Vercel trên **điện thoại** (app này mobile-first) và chạy hết checklist. Thứ tự đúng như một thành viên mới sẽ đi.

**Trang chính `/`**

- [ ] Banner hiện ảnh nền + mascot, không vỡ chữ
- [ ] Thanh điều hướng trên đầu có đủ: Trang chính · Vote Mango · Vote 1Creator · Lấy & gửi mã
- [ ] Ba thẻ giới thiệu bấm được, dẫn đúng trang

**Hai trang hướng dẫn**

- [ ] `/huong-dan/vote-mango` hiện 5 bước, `/huong-dan/vote-1creator` hiện 7 bước
- [ ] Bấm vào ảnh minh hoạ → mở toàn màn hình, bấm nền hoặc Esc để đóng

**Trang `/lay-ma`** — phần quan trọng nhất

- [ ] Danh sách hiện card `ROOT0001` (hoặc mã gốc bạn đã đổi) với badge SVIP
- [ ] Bấm **Copy Mã** → hiện toast "Đã copy…". *Không copy được nghĩa là site chưa chạy HTTPS — link Vercel thì luôn có sẵn HTTPS*
- [ ] Bấm **Tôi dùng mã này** → form tự chuyển về chế độ "Bạn mới chưa nhập code" và điền sẵn mã cha
- [ ] Điền nickname + mã của bạn → **Đăng mã**. Card mới xuất hiện, mã gốc nhảy lên `1/10`
- [ ] Submit lại **đúng mã vừa đăng** → báo đỏ *"Mã này đã được đăng trước đó"*
- [ ] Chọn **Bạn cũ khai báo mã**, khai 3 lượt → card mới có nhãn vàng **TỰ KHAI** và dòng *"3 lượt tự khai · 0 lượt web ghi nhận"*
- [ ] Bấm **⚠ Báo mã lỗi** trên một card → gửi. Card **không** đổi gì (đúng thiết kế), nhưng báo cáo phải về tới admin
- [ ] Bấm lại **Báo mã lỗi** trên đúng card đó → báo *"Bạn đã báo lỗi mã này rồi"*

**Trang `/admin`**

- [ ] Mở `/admin` ở **cửa sổ ẩn danh** (chưa đăng nhập) → bị đẩy về trang đăng nhập
- [ ] Đăng nhập bằng `ADMIN_PASSWORD` → thấy báo cáo vừa gửi trong hàng đợi
- [ ] Ô thống kê **Mã tự khai** đếm đúng; bộ lọc **Tự khai** lọc ra đúng mã
- [ ] Bấm **Gỡ mã này** → mã biến khỏi `/lay-ma`, hiện ở bộ lọc *Đã gỡ*, và **Khôi phục** được
- [ ] Nhật ký thao tác ghi lại đúng hành động vừa làm

Nếu trang trắng hoặc lỗi: Vercel → project → **Logs** (runtime logs). Lỗi `Thiếu NEXT_PUBLIC_SUPABASE_URL…` nghĩa là bước 3.3 chưa Redeploy sau khi thêm biến.

## Bước 5 — Domain riêng (tuỳ chọn)

Vercel → project → **Settings → Domains** → nhập domain bạn sở hữu → Vercel hiện bản ghi DNS cần thêm ở nhà cung cấp domain (thường là `CNAME → cname.vercel-dns.com`). SSL tự cấp sau vài phút.

Domain `.vercel.app` cũng dùng vĩnh viễn được nếu bạn không cần tên riêng.

---

## Bước 6 — Vận hành

**Cập nhật code:** cứ `git push` lên `main`, Vercel tự build và deploy lại. Push lên nhánh khác → Vercel tạo **Preview URL** riêng để test trước khi merge.

**Sửa database:** viết migration mới (`0002_xxx.sql`) và chạy trong SQL Editor. Đừng sửa bảng bằng tay qua Table Editor — sẽ lệch với file migration trong repo.

**Xem dữ liệu:** Supabase → **Table Editor → codes**.

**⚠️ Supabase free tier tự pause project** nếu hoạt động thấp trong **7 ngày liên tiếp**. Vài request mỗi ngày là đủ để giữ project sống — với một app cộng đồng đang được dùng thì không thành vấn đề. Nếu bị pause, vào Dashboard bấm **Resume project** (dữ liệu còn nguyên, có 1 năm để khôi phục).

**Giới hạn free tier cần biết:**

| | Supabase Free | Vercel Hobby |
|---|---|---|
| Dung lượng / băng thông | 500 MB DB, 5 GB egress/tháng | 100 GB bandwidth/tháng |
| Đủ cho | ~hàng trăm nghìn dòng `codes` | vài chục nghìn lượt xem/tháng |
| Ràng buộc | Pause sau 7 ngày ít hoạt động | **Chỉ cho mục đích phi thương mại** |

Với một web nội bộ cộng đồng fan, cả hai mức này dư dùng.

---

## Trước khi mở rộng ra ngoài cộng đồng nhỏ

App hiện **chưa có rate limiting và chưa có xác thực**. Ai biết link đều submit được không giới hạn số lần, nên về lý thuyết có thể tạo hàng loạt mã rác để bơm `used_count` cho mã của mình — vẫn là spam, chỉ tinh vi hơn cơ chế cũ.

Điều đó **không chặn bạn deploy** cho một nhóm kín: cơ chế ghi nhận chéo đã khiến chi phí spam cao hơn hẳn nút "đã dùng", và mọi mã rác đều để lại dấu vết trong `parent_code` nên truy ngược được:

```sql
-- Ai đang được cộng lượt nhiều nhất, và bởi những mã nào?
select parent_code, count(*) as luot, min(created_at) as tu, max(created_at) as den
from public.codes
where parent_code is not null
group by parent_code
having count(*) >= 5
order by count(*) desc;
```

Nếu thấy một mã nhận đủ 10 lượt trong vài phút từ các nickname vô nghĩa → gần như chắc chắn là spam. Lúc đó hãy thêm rate limit theo IP + Cloudflare Turnstile.
