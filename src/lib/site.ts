/**
 * Toàn bộ nội dung giới thiệu & liên hệ nằm ở ĐÂY — sửa một chỗ, đổi khắp trang.
 *
 * Đổi ảnh idol: thay file `public/idol.jpg` bằng ảnh của bạn (giữ nguyên tên),
 * hoặc đổi `bannerSrc` sang tên file khác trong `public/`.
 * Ảnh nên có tỉ lệ ngang ~8:3 (vd 1600×600) và chủ thể lệch về bên phải,
 * vì góc dưới bên trái sẽ bị chữ đè lên.
 */
export const SITE = {
  name: 'Trạm Voting Hà An Huy',

  /** Người/nhóm lập ra web, hiện ở header và footer. */
  owner: 'UngDung',

  /** Mục đích của web — câu này nằm ngay dưới tiêu đề banner. */
  tagline:
    'Nơi gom và luân chuyển mã mời Mango của cộng đồng, để tích hoả lực vote cho Hà An Huy.',

  /** Giải thích cơ chế, hiện trong khối thông tin dưới banner. */
  howItWorks:
    'Copy mã của người khác để dùng, rồi đăng mã của bạn kèm khai báo mã vừa dùng. ' +
    'Lượt dùng được ghi nhận chéo tự động — mỗi mã tối đa 10 lượt.',

  /** Ảnh nền banner (ngang, ~8:3). Thay file trong public/ là đổi. */
  bannerSrc: '/idol.jpg',
  bannerAlt: 'Ảnh bìa fanclub Hà An Huy',

  /**
   * Ảnh mascot đứng bên phải banner. Ảnh DỌC (~3:4) cho khung vừa đẹp.
   * Hiển thị trong khung bo góc có viền trắng — giữ nguyên ảnh gốc kể cả
   * watermark, nên không cần tách nền.
   */
  mascotSrc: '/mascot.png',
  mascotAlt: 'Mascot của UngDung',

  /**
   * Liên hệ khi web lỗi.
   * `href` dùng zalo.me để bấm là mở thẳng Zalo trên điện thoại;
   * số vẫn hiện dạng text để người dùng máy tính copy tay được.
   */
  contact: {
    channel: 'Zalo',
    value: '0327158672',
    href: 'https://zalo.me/0327158672',
  },
} as const;
