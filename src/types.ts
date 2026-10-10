export type TransferStatus = 'pending' | 'verified' | 'rejected' | 'reupload_requested';

export interface TransferItem {
  id: string;
  branchName: string;
  branchId: string;
  invoiceNo: string; // رقم الفاتورة أو كود التتبع التلقائي
  amount: number; // المبلغ المحول بالجنيه
  screenshotUrl: string; // الصورة الأساسية للتوافق
  images?: string[]; // صور العملية (صورة الفاتورة + صورة إيصال إنستاباي + صور إضافية)
  status: TransferStatus;
  referenceNo?: string; // رقم العملية المرجعي من إنستاباي
  senderName?: string; // اسم الراسل
  senderIpaOrPhone?: string; // عنوان الدفع اللحظي أو رقم التليفون
  cashierName?: string; // اسم الكاشير أو المسؤول بالمخزن
  cashierNote?: string; // ملاحظة سريعة اختيارية
  createdAt: string; // ISO String
  verifiedAt?: string;
  verifiedBy?: string; // اسم المحاسب المعتمد
  rejectionReason?: string;
  accountantNotes?: string;
  customerPhone?: string;
  bankAccountUsed?: string; // الحساب المستقبل
  tags?: string[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  phone?: string;
  address?: string;
  notes?: string;
  pinCode: string; // الرقم السري للدخول
  isActive: boolean;
  defaultCashier?: string;
  type: 'store' | 'warehouse';
  createdAt?: string;
}

export type UserRole = 'branch_cashier' | 'auditor';

export interface UserSession {
  role: UserRole;
  branchId?: string;
  branchName: string;
  userName: string;
  loggedInAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instapayIpa: string;
  phone: string;
  isActive: boolean;
}

export interface RejectionReasonOption {
  id: string;
  label: string;
  description: string;
}

export interface BankStatementRecord {
  id: string;
  date: string;
  amount: number;
  senderIpaOrName: string;
  referenceNo: string;
  matchedTransferId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string; // e.g. "كاشير معرض صفا مكرم"
  senderRole: UserRole;
  targetBranchId: string; // 'all' for general company group, or specific branchId
  text: string;
  audioUrl?: string | null;
  audioDuration?: number;
  imageUrl?: string | null;
  isWalkieTalkie?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
}

export interface TrashItem {
  id: string;
  originalId: string;
  type: 'transfer' | 'branch' | 'bank_account' | 'message';
  title: string;
  deletedAt: string; // ISO String
  deletedBy: string;
  data: any; // Original object payload for restoration
}


