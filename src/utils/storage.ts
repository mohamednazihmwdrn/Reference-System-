import { TransferItem, Branch, BankAccount, UserSession } from '../types';

const STORAGE_KEYS = {
  TRANSFERS: 'rawda_instapay_transfers_v3',
  BRANCHES: 'rawda_instapay_branches_v3',
  BANK_ACCOUNTS: 'rawda_instapay_bank_accounts_v3',
  LAST_SELECTED_BRANCH: 'rawda_last_branch_id',
  LAST_CASHIER_NAME: 'rawda_last_cashier_name',
  SOUND_ENABLED: 'rawda_sound_enabled',
  USER_SESSION: 'rawda_user_session_v3',
};

export const AUDITOR_CREDENTIALS = {
  id: 'auditor_main',
  name: 'الإدارة المالية والمراجعة (المراجع العام)',
  role: 'auditor' as const,
  pinCode: '9999',
  description: 'صلاحية كاملة لمراجعة واستلام واعتماد إيصالات الفروع والطباعة والأرشفة',
};

export const COMPANY_INFO = {
  name: 'شركة الروضة الشريفة للتجارة والتوريدات',
  shortName: 'شركة الروضة الشريفة',
  systemName: 'منظومة الروضة الشريفة لإدارة ومطابقة تحويلات إنستا باي',
  developer: 'Mohamed Nazih',
  developerContact: '01029190615',
  supportPhone: '01029190615',
  copyrightNotice: 'حقوق الملكية الفكرية وبرمجة النظام محفوظة باسم: Mohamed Nazih (هاتف: 01029190615)',
  companyNotice: 'حقوق الملكية التجارية والبيانات محفوظة لشركة الروضة الشريفة © 2026',
};

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'b_rawda',
    name: 'محل الروضة الشريفة',
    code: 'ST-01',
    city: 'الفرع الرئيسي',
    phone: '01029190615',
    pinCode: '1001',
    type: 'store',
    isActive: true,
    defaultCashier: 'كاشير الروضة الشريفة',
  },
  {
    id: 'b_safa',
    name: 'محل صفا مكرم',
    code: 'ST-02',
    city: 'القاهرة',
    phone: '01022334455',
    pinCode: '2002',
    type: 'store',
    isActive: true,
    defaultCashier: 'كاشير صفا مكرم',
  },
  {
    id: 'b_modern',
    name: 'محل مودرن',
    code: 'ST-03',
    city: 'القاهرة',
    phone: '01033445566',
    pinCode: '3003',
    type: 'store',
    isActive: true,
    defaultCashier: 'كاشير محل مودرن',
  },
  {
    id: 'b_nadi',
    name: 'مخزن النادي',
    code: 'WH-01',
    city: 'المعادي',
    phone: '01044556677',
    pinCode: '4004',
    type: 'warehouse',
    isActive: true,
    defaultCashier: 'أمين مخزن النادي',
  },
  {
    id: 'b_nahas',
    name: 'مخزن النحاس',
    code: 'WH-02',
    city: 'مصر الجديدة',
    phone: '01055667788',
    pinCode: '5005',
    type: 'warehouse',
    isActive: true,
    defaultCashier: 'أمين مخزن النحاس',
  },
];

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'ba_nbe',
    bankName: 'البنك الأهلي المصري (NBE)',
    accountName: 'شركة الروضة الشريفة',
    accountNumber: '10293847561001',
    instapayIpa: 'alrawda.store@instapay',
    phone: '01029190615',
    isActive: true,
  },
  {
    id: 'ba_cib',
    bankName: 'البنك التجاري الدولي (CIB)',
    accountName: 'شركة الروضة الشريفة - حساب التحصيلات',
    accountNumber: '100049281723',
    instapayIpa: 'alrawda.pos@instapay',
    phone: '01029190615',
    isActive: true,
  },
  {
    id: 'ba_misr',
    bankName: 'بنك مصر (BM)',
    accountName: 'شركة الروضة الشريفة',
    accountNumber: '124009837162',
    instapayIpa: 'alrawda.co@instapay',
    phone: '01029190615',
    isActive: true,
  },
];

export const SAMPLE_RECEIPT_1 = '/src/assets/images/instapay_sample_receipt_1791231113924.jpg';
export const SAMPLE_RECEIPT_2 = '/src/assets/images/instapay_sample_receipt_two_1791231126875.jpg';
export const SAMPLE_INVOICE = '/src/assets/images/paper_invoice_receipt_1791231743153.jpg';

export const INITIAL_TRANSFERS: TransferItem[] = [
  {
    id: 'tx_101',
    branchName: 'محل الروضة الشريفة',
    branchId: 'b_rawda',
    invoiceNo: 'طلب #4401',
    amount: 2450.00,
    screenshotUrl: SAMPLE_RECEIPT_1,
    images: [SAMPLE_INVOICE, SAMPLE_RECEIPT_1],
    status: 'pending',
    referenceNo: 'IP20261005882194',
    senderName: 'طارق حسام عبد الرحمن',
    senderIpaOrPhone: 'tarek.hossam@instapay',
    cashierName: 'كاشير الروضة الشريفة',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    bankAccountUsed: 'alrawda.store@instapay',
    customerPhone: '01099234567',
  },
  {
    id: 'tx_102',
    branchName: 'محل صفا مكرم',
    branchId: 'b_safa',
    invoiceNo: 'طلب #4402',
    amount: 850.00,
    screenshotUrl: SAMPLE_RECEIPT_2,
    images: [SAMPLE_INVOICE, SAMPLE_RECEIPT_2],
    status: 'pending',
    referenceNo: 'IP20261005771029',
    senderName: 'مينا كمال غطاس',
    senderIpaOrPhone: '01288334455',
    cashierName: 'كاشير صفا مكرم',
    createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    bankAccountUsed: 'alrawda.pos@instapay',
    customerPhone: '01288334455',
  },
  {
    id: 'tx_103',
    branchName: 'محل مودرن',
    branchId: 'b_modern',
    invoiceNo: 'طلب #4398',
    amount: 4720.50,
    screenshotUrl: SAMPLE_RECEIPT_1,
    images: [SAMPLE_INVOICE, SAMPLE_RECEIPT_1],
    status: 'pending',
    referenceNo: 'IP20261005663910',
    senderName: 'سارة خالد الديب',
    senderIpaOrPhone: 'sara.eldeeb@instapay',
    cashierName: 'كاشير محل مودرن',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    bankAccountUsed: 'alrawda.store@instapay',
    customerPhone: '01155443322',
  },
  {
    id: 'tx_104',
    branchName: 'مخزن النادي',
    branchId: 'b_nadi',
    invoiceNo: 'طلب #4389',
    amount: 1200.00,
    screenshotUrl: SAMPLE_RECEIPT_2,
    images: [SAMPLE_INVOICE, SAMPLE_RECEIPT_2],
    status: 'verified',
    referenceNo: 'IP20261005550182',
    senderName: 'أشرف عبد الرحيم سليمان',
    senderIpaOrPhone: '01001122334',
    cashierName: 'أمين مخزن النادي',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    verifiedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    verifiedBy: 'المراجع المالي (الروضة الشريفة)',
    bankAccountUsed: 'alrawda.store@instapay',
    accountantNotes: 'تمت مطابقة الإيداع في كشف البنك الأهلي رقم حركة 98823',
  },
  {
    id: 'tx_105',
    branchName: 'مخزن النحاس',
    branchId: 'b_nahas',
    invoiceNo: 'طلب #4385',
    amount: 3600.00,
    screenshotUrl: SAMPLE_RECEIPT_1,
    images: [SAMPLE_INVOICE, SAMPLE_RECEIPT_1],
    status: 'verified',
    referenceNo: 'IP20261005441920',
    senderName: 'هبة فوزي رضوان',
    senderIpaOrPhone: 'heba.fawzy@instapay',
    cashierName: 'أمين مخزن النحاس',
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    verifiedAt: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
    verifiedBy: 'المراجع المالي (الروضة الشريفة)',
    bankAccountUsed: 'alrawda.pos@instapay',
  },
];

// Helper functions for user session
export function loadUserSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(session: UserSession) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session', err);
  }
}

export function clearUserSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
}

// Helper functions for storage management
export function loadTransfers(): TransferItem[] {
  if (typeof window === 'undefined') return INITIAL_TRANSFERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(INITIAL_TRANSFERS));
      return INITIAL_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TRANSFERS;
  }
}

export function saveTransfers(transfers: TransferItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));
  } catch (err) {
    console.error('Failed to save transfers to localStorage', err);
  }
}

export function loadBranches(): Branch[] {
  if (typeof window === 'undefined') return DEFAULT_BRANCHES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(DEFAULT_BRANCHES));
      return DEFAULT_BRANCHES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_BRANCHES;
  }
}

export function saveBranches(branches: Branch[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  } catch (err) {
    console.error('Failed to save branches', err);
  }
}

export function loadBankAccounts(): BankAccount[] {
  if (typeof window === 'undefined') return DEFAULT_BANK_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BANK_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(DEFAULT_BANK_ACCOUNTS));
      return DEFAULT_BANK_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_BANK_ACCOUNTS;
  }
}

export function saveBankAccounts(accounts: BankAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save bank accounts', err);
  }
}

export function getLastBranchId(): string {
  if (typeof window === 'undefined') return 'b_nadi';
  return localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_BRANCH) || 'b_nadi';
}

export function setLastBranchId(branchId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_BRANCH, branchId);
}

export function getLastCashierName(): string {
  if (typeof window === 'undefined') return 'أحمد محمود';
  return localStorage.getItem(STORAGE_KEYS.LAST_CASHIER_NAME) || 'أحمد محمود';
}

export function setLastCashierName(name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_CASHIER_NAME, name);
}

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
}

export function resetAllDataToDefault(): { transfers: TransferItem[]; branches: Branch[]; bankAccounts: BankAccount[] } {
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(INITIAL_TRANSFERS));
  localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(DEFAULT_BRANCHES));
  localStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify(DEFAULT_BANK_ACCOUNTS));
  return {
    transfers: INITIAL_TRANSFERS,
    branches: DEFAULT_BRANCHES,
    bankAccounts: DEFAULT_BANK_ACCOUNTS,
  };
}

export function exportAllDataAsJSON(): string {
  const data = {
    exportDate: new Date().toISOString(),
    system: 'Rakeeza InstaPay Verification System',
    transfers: loadTransfers(),
    branches: loadBranches(),
    bankAccounts: loadBankAccounts(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataFromJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.transfers && Array.isArray(parsed.transfers)) {
      saveTransfers(parsed.transfers);
    }
    if (parsed.branches && Array.isArray(parsed.branches)) {
      saveBranches(parsed.branches);
    }
    if (parsed.bankAccounts && Array.isArray(parsed.bankAccounts)) {
      saveBankAccounts(parsed.bankAccounts);
    }
    return true;
  } catch (err) {
    console.error('Failed to import JSON data', err);
    return false;
  }
}
