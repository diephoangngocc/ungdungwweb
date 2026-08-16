/**
 * Nội dung hai phase hướng dẫn. Sửa chữ ở ĐÂY, không sửa trong component.
 *
 * Trong `text`, phần đặt giữa **hai dấu sao** sẽ được in đậm — dùng cho tên nút
 * trong app để người đọc dò theo ảnh cho nhanh.
 *
 * Ảnh nằm trong `public/guide/`. Thay ảnh mới thì giữ nguyên tên file,
 * hoặc đổi đường dẫn ở đây. Ảnh dọc (ảnh chụp điện thoại) là hợp nhất.
 */
export type GuideStep = {
  text: string;
  image?: string;
  imageAlt?: string;
};

export type GuidePhase = {
  /** true = chưa có nội dung, trang hiện khối "đang cập nhật" thay vì các bước. */
  draft?: boolean;
  /** Dùng làm URL: /huong-dan/<slug> */
  slug: string;
  badge: string;
  /** Nhãn ngắn trên thanh điều hướng — phải vừa màn hình hẹp. */
  navLabel: string;
  title: string;
  summary: string;
  steps: GuideStep[];
};

/** Tìm phase theo slug; trả về undefined nếu URL không khớp phase nào. */
export function findPhase(slug: string): GuidePhase | undefined {
  return GUIDE_PHASES.find((p) => p.slug === slug);
}

export const GUIDE_PHASES: GuidePhase[] = [
  {
    slug: 'vote-mango',
    badge: 'App Mango+',
    navLabel: 'Vote Mango',
    title: 'Hướng dẫn tích vote app Mango',
    summary: 'Điểm danh, làm nhiệm vụ rồi chơi game để đổi ra Mã Lực vote cho Hà An Huy.',
    steps: [
      {
        text: 'Mở app **Mango+**, ấn nút **Event Hub** ở thanh dưới cùng. Hoặc ấn thẳng vào **logo ATVNCG** trên banner.',
        image: '/guide/buoc-1.jpg',
        imageAlt: 'Màn hình chính Mango+ với nút Event Hub ở thanh dưới',
      },
      {
        text: 'Tìm sự kiện **Tích Mã Lực, Tiếp Sức Anh Tài** rồi ấn **Tham gia ngay**.',
        image: '/guide/buoc-2.jpg',
        imageAlt: 'Danh sách sự kiện trong Event Hub, nút Tham gia ngay',
      },
      {
        text: 'Vào trong sự kiện, con số ở góc trên bên trái chính là **điểm Mã Lực** của bạn.',
        image: '/guide/buoc-3.jpg',
        imageAlt: 'Trang sự kiện: điểm Mã Lực, mục Referral, Nhiệm vụ và nút Chơi ngay',
      },
      {
        text: 'Ấn **Nhiệm Vụ** rồi làm nhiệm vụ hằng ngày để lấy lượt chơi: **Điểm danh hàng ngày** (Free +1, VIP +3, SVIP +10 lượt) và **Xem ATVNCG 2026 ít nhất 5 phút** (+1 lượt, tối đa 3 lần/ngày).',
        image: '/guide/buoc-4.jpg',
        imageAlt: 'Bảng Nhiệm vụ Mã Lực với điểm danh và xem ATVNCG',
      },
      {
        text: 'Có lượt rồi thì ấn **CHƠI NGAY** để chơi game đổi ra Mã Lực. Ngoài ra ấn **Nhận Mã Lực Ngay** để lấy phần Mã Lực dành cho bạn mới.',
      },
    ],
  },
  {
    slug: 'vote-1creator',
    badge: 'App 1Creator',
    navLabel: 'Vote 1Creator',
    title: 'Hướng dẫn tích vote app 1Creators',
    summary:
      'Đăng ký tài khoản, xác minh số điện thoại rồi điểm danh mỗi ngày để nhận 2 vote free cho Hà An Huy.',
    steps: [
      {
        text: 'Mở app **1Creators**, vào tab **Cá nhân** rồi ấn **Đăng nhập** hoặc **Đăng ký**.',
        image: '/guide/1c-1.jpg',
        imageAlt: 'Tab Cá nhân của 1Creators với nút Đăng nhập và Đăng ký',
      },
      {
        text: 'Ở màn hình đăng ký, nhập **Email** và **mật khẩu** (hoặc đăng ký nhanh bằng **Google / Apple**), rồi tick xác nhận điều khoản.',
        image: '/guide/1c-2.jpg',
        imageAlt: 'Màn hình đăng ký tài khoản 1Creators',
      },
      {
        text: 'Nhập số điện thoại rồi chọn nhận mã OTP qua **Zalo** hoặc **SMS**, ấn **Gửi OTP**. ⚠️ **Bắt buộc xác minh số điện thoại** thì mới được nhận 2 vote free mỗi ngày.',
        image: '/guide/1c-3.jpg',
        imageAlt: 'Hộp thoại chọn phương thức nhận OTP qua Zalo hoặc SMS',
      },
      {
        text: 'Nhập **mã OTP 6 chữ số** vừa nhận rồi ấn **Xác thực**. Chưa thấy mã thì đợi hết 55 giây để gửi lại, hoặc đổi sang phương thức khác.',
        image: '/guide/1c-4.jpg',
        imageAlt: 'Màn hình nhập mã OTP 6 chữ số',
      },
      {
        text: 'Xác minh xong, tab **Cá nhân** hiện đầy đủ các mục: Thông tin tài khoản, Quản lý vé, **Lịch sử bình chọn**…',
        image: '/guide/1c-5.jpg',
        imageAlt: 'Tab Cá nhân sau khi xác minh số điện thoại thành công',
      },
      {
        text: 'Mỗi ngày mở app **điểm danh** để nhận **+2 lượt vote free**. Xem lại ở **Lịch sử bình chọn → Lịch sử thêm lượt**.',
        image: '/guide/1c-6.jpg',
        imageAlt: 'Lịch sử thêm lượt: điểm danh hằng ngày +2 lượt',
      },
      {
        text: 'Vào bảng vote **ANH TRAI VƯỢT NGÀN CHÔNG GAI 2026**, chọn **HÀ AN HUY**, chọn số vote muốn dùng rồi ấn **Xác nhận**. Số vote đang có hiện ở góc trên bên phải.',
        image: '/guide/1c-7.jpg',
        imageAlt: 'Màn hình bình chọn cho Hà An Huy với ô chọn số vote và nút Xác nhận',
      },
    ],
  },
];


/**
 * Trang "Lấy & gửi mã" — không phải hướng dẫn thuần mà là chỗ THAO TÁC:
 * vài bước tóm tắt ở trên, form đăng mã và danh sách mã ở dưới.
 */
export const EXCHANGE_PAGE = {
  href: '/lay-ma',
  navLabel: 'Lấy & gửi mã',
  badge: 'Bước cuối',
  title: 'Lấy mã & gửi mã cho cộng đồng',
  summary:
    'Nhập mã của người khác để cả hai cùng có thêm điểm vote, rồi đăng mã của bạn lên đây cho người sau nhập.',
  steps: [
      {
        text: 'Trong trang sự kiện, ấn vào mục **Referral** — đây là chỗ nhập mã mời.',
        image: '/guide/buoc-3.jpg',
        imageAlt: 'Vị trí mục Referral trong trang sự kiện',
      },
      {
        text: 'Kéo xuống phần **Mã đang mở** ở trang này, bấm **Copy Mã** trên một mã còn slot rồi dán vào ô Referral trong app.',
      },
      {
        text: 'Nhập xong, quay lại đây bấm **Tôi dùng mã này** trên đúng card đó. Hệ thống tự cộng lượt cho chủ mã — không ai tự bấm khống được.',
      },
      {
        text: 'Cuối cùng, đăng **mã của chính bạn** ở form phía trên để người sau nhập. Mỗi mã tối đa 10 lượt, càng nhiều người nhập bạn càng có thêm Mã Lực.',
      },
    ],
} as const;
