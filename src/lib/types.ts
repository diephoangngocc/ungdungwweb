export const MAX_USES = 10;

export type Tier = 'thuong_vip' | 'svip';
export type CodeStatus = 'active' | 'removed';
export type ReportReason = 'khong_dung_duoc' | 'ma_sai' | 'da_het_han' | 'spam' | 'khac';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export type CodeRow = {
  id: string;
  nickname: string;
  code: string;
  tier: Tier;
  used_count: number;
  parent_code: string | null;
  created_at: string;
  is_full: boolean;
  status: CodeStatus;
  removed_at: string | null;
  removed_reason: string | null;
  report_count: number;
  /** Số lượt do chính chủ tự khai lúc đăng (luồng "đã dùng từ trước"). */
  declared_count: number;
  self_declared: boolean;
};

export type ReportRow = {
  id: string;
  code_id: string;
  reason: ReportReason;
  note: string | null;
  reporter_key: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_note: string | null;
};

/** Một dòng trong hàng đợi báo lỗi của admin (view admin_reports_view). */
export type AdminReport = {
  id: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_note: string | null;
  code_id: string;
  code: string;
  nickname: string;
  tier: Tier;
  used_count: number;
  code_status: CodeStatus;
  report_count: number;
  declared_count: number;
  self_declared: boolean;
};

export type AdminAction = {
  id: number;
  action: string;
  target_code: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export const TIER_LABEL: Record<Tier, string> = {
  thuong_vip: 'Thường/VIP',
  svip: 'SVIP',
};

export const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: 'thuong_vip', label: 'Thường/VIP' },
  { value: 'svip', label: 'SVIP' },
];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  khong_dung_duoc: 'Nhập vào nhưng không dùng được',
  ma_sai: 'Mã sai / không tồn tại',
  da_het_han: 'Mã đã hết hạn',
  spam: 'Mã rác, spam, không liên quan',
  khac: 'Lý do khác',
};

export const REPORT_REASON_OPTIONS = Object.entries(REPORT_REASON_LABEL).map(
  ([value, label]) => ({ value: value as ReportReason, label }),
);

export const ADMIN_ACTION_LABEL: Record<string, string> = {
  create_code: 'Thêm mã',
  update_code: 'Sửa mã',
  remove_code: 'Gỡ mã',
  restore_code: 'Khôi phục mã',
  resolve_report: 'Xử lý báo lỗi',
};

/** Schema tối thiểu để supabase-js suy luận kiểu cho `.from()` và `.rpc()`. */
export type Database = {
  public: {
    Tables: {
      codes: {
        Row: CodeRow;
        Insert: Partial<CodeRow> & { nickname: string; code: string };
        Update: Partial<CodeRow>;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Partial<ReportRow> & { code_id: string; reason: ReportReason; reporter_key: string };
        Update: Partial<ReportRow>;
        Relationships: [];
      };
      admin_actions: {
        Row: AdminAction;
        Insert: Partial<AdminAction> & { action: string };
        Update: Partial<AdminAction>;
        Relationships: [];
      };
    };
    Views: {
      admin_reports_view: { Row: AdminReport; Relationships: [] };
    };
    Functions: {
      submit_code: {
        Args: { p_nickname: string; p_code: string; p_tier: Tier; p_parent_code: string };
        Returns: CodeRow;
      };
      submit_code_declared: {
        Args: {
          p_nickname: string;
          p_code: string;
          p_tier: Tier;
          p_declared_count: number;
        };
        Returns: CodeRow;
      };
      report_code: {
        Args: {
          p_code: string;
          p_reason: ReportReason;
          p_note: string | null;
          p_reporter_key: string;
        };
        Returns: number;
      };
      admin_create_code: {
        Args: {
          p_nickname: string;
          p_code: string;
          p_tier: Tier;
          p_parent_code: string | null;
          p_used_count: number;
          p_credit_parent: boolean;
        };
        Returns: CodeRow;
      };
      admin_update_code: {
        Args: { p_code: string; p_nickname: string; p_tier: Tier; p_used_count: number };
        Returns: CodeRow;
      };
      admin_set_status: {
        Args: { p_code: string; p_status: CodeStatus; p_reason: string | null };
        Returns: CodeRow;
      };
      admin_resolve_report: {
        Args: {
          p_report_id: string;
          p_status: ReportStatus;
          p_note: string | null;
          p_remove_code: boolean;
        };
        Returns: ReportRow;
      };
    };
    Enums: {
      code_tier: Tier;
      code_status: CodeStatus;
      report_reason: ReportReason;
      report_status: ReportStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
