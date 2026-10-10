import { TransferItem, Branch, BankAccount, UserSession, TrashItem } from '../types';

const STORAGE_KEYS = {
  TRANSFERS: 'rawda_instapay_transfers_v3',
  BRANCHES: 'rawda_instapay_branches_v3',
  BANK_ACCOUNTS: 'rawda_instapay_bank_accounts_v3',
  LAST_SELECTED_BRANCH: 'rawda_last_branch_id',
  LAST_CASHIER_NAME: 'rawda_last_cashier_name',
  SOUND_ENABLED: 'rawda_sound_enabled',
  USER_SESSION: 'rawda_user_session_v3',
  AUDITOR_CREDENTIALS: 'rawda_auditor_credentials_v3',
  TRASH_ITEMS: 'rawda_trash_items_v1',
};

export interface AuditorProfile {
  id: string;
  name: string;
  role: 'auditor';
  pinCode: string;
  phone?: string;
  code?: string;
  city?: string;
  description?: string;
}

export const DEFAULT_AUDITOR: AuditorProfile = {
  id: 'auditor_main',
  name: 'المراجع',
  role: 'auditor',
  pinCode: '9999',
  phone: '01029190615',
  code: 'AUD-01',
  city: 'الإدارة المركزية',
  description: 'صلاحية كاملة لمراجعة واستلام واعتماد إيصالات الفروع والطباعة والأرشفة وحذف العمليات',
};

export const AUDITOR_CREDENTIALS = DEFAULT_AUDITOR;

export function loadAuditorCredentials(): AuditorProfile {
  if (typeof window === 'undefined') return DEFAULT_AUDITOR;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDITOR_CREDENTIALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.AUDITOR_CREDENTIALS, JSON.stringify(DEFAULT_AUDITOR));
      return DEFAULT_AUDITOR;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AUDITOR, ...parsed };
  } catch {
    return DEFAULT_AUDITOR;
  }
}

export function saveAuditorCredentials(creds: AuditorProfile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUDITOR_CREDENTIALS, JSON.stringify(creds));
  } catch (err) {
    console.error('Failed to save auditor credentials', err);
  }
}

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

export function normalizeBranchName(name: string): string {
  const trimmed = (name || '').trim();
  if (trimmed.includes('الروضة') || trimmed.includes('روضة')) return 'الروضة مكرم';
  if (trimmed.includes('صفا') || trimmed.includes('الصفا')) return 'الصفا مكرم';
  if (trimmed.includes('مودرن')) return 'مودرن';
  if (trimmed.includes('بيس')) return 'بيس';
  if (trimmed.includes('النحاس') || trimmed.includes('نحاس')) return 'النحاس';
  if (trimmed.includes('النادي') || trimmed.includes('نادي')) return 'النادي';
  return trimmed.replace(/^(محل|معرض|مخزن|كاشير|فرع|أمين)\s+/g, '').trim() || trimmed;
}

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'b_rawda',
    name: 'الروضة مكرم',
    code: 'ST-01',
    city: 'الفرع الرئيسي',
    phone: '01029190615',
    pinCode: '1001',
    type: 'store',
    isActive: true,
    defaultCashier: 'الروضة مكرم',
  },
  {
    id: 'b_safa',
    name: 'الصفا مكرم',
    code: 'ST-02',
    city: 'القاهرة',
    phone: '01022334455',
    pinCode: '2002',
    type: 'store',
    isActive: true,
    defaultCashier: 'الصفا مكرم',
  },
  {
    id: 'b_modern',
    name: 'مودرن',
    code: 'ST-03',
    city: 'القاهرة',
    phone: '01033445566',
    pinCode: '3003',
    type: 'store',
    isActive: true,
    defaultCashier: 'مودرن',
  },
  {
    id: 'b_peace',
    name: 'بيس',
    code: 'ST-04',
    city: 'القاهرة',
    phone: '01066778899',
    pinCode: '6006',
    type: 'store',
    isActive: true,
    defaultCashier: 'بيس',
  },
  {
    id: 'b_nadi',
    name: 'النادي',
    code: 'WH-01',
    city: 'المعادي',
    phone: '01044556677',
    pinCode: '4004',
    type: 'warehouse',
    isActive: true,
    defaultCashier: 'النادي',
  },
  {
    id: 'b_nahas',
    name: 'النحاس',
    code: 'WH-02',
    city: 'مصر الجديدة',
    phone: '01055667788',
    pinCode: '5005',
    type: 'warehouse',
    isActive: true,
    defaultCashier: 'النحاس',
  },
];

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [];

export const SAMPLE_RECEIPT_1 = '/src/assets/images/instapay_sample_receipt_1791231113924.jpg';
export const SAMPLE_RECEIPT_2 = '/src/assets/images/instapay_sample_receipt_two_1791231126875.jpg';
export const SAMPLE_INVOICE = '/src/assets/images/paper_invoice_receipt_1791231743153.jpg';

export const INITIAL_TRANSFERS: TransferItem[] = [];

// Helper functions for user session
export function loadUserSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (!raw) return null;
    const session: UserSession = JSON.parse(raw);
    if (session.role === 'auditor') {
      session.branchName = 'المراجع';
      session.userName = 'المراجع';
    } else if (session.branchName) {
      session.branchName = normalizeBranchName(session.branchName);
      session.userName = session.branchName;
    }
    return session;
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge any residual mock seed transfers (tx_101 through tx_105)
      const clean = parsed.filter((t: TransferItem) => !t.id.startsWith('tx_10'));
      if (clean.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(clean));
      }
      return clean;
    }
    return [];
  } catch {
    return [];
  }
}

export function clearAllTransfers() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify([]));
}

export function saveTransfers(transfers: TransferItem[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep local cache lightweight by preventing heavy base64 strings from overflowing localStorage
    const safeTransfers = transfers.map((t, idx) => {
      if (idx > 3 && t.screenshotUrl?.startsWith('data:image/')) {
        return { ...t, screenshotUrl: '', images: [] };
      }
      return t;
    });
    localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(safeTransfers));
  } catch (err: any) {
    console.warn('LocalStorage quota limit reached, trimming local cache:', err);
    try {
      const minimal = transfers.slice(0, 8).map((t) => ({
        ...t,
        screenshotUrl: t.screenshotUrl?.startsWith('data:image/') ? '' : t.screenshotUrl,
        images: [],
      }));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(minimal));
    } catch {
      // Local storage full; server remains authoritative
    }
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
    const list: Branch[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) {
      return DEFAULT_BRANCHES;
    }
    return list;
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BANK_ACCOUNTS);
    if (!raw) return [];
    const parsed: BankAccount[] = JSON.parse(raw);
    // If it contains the old mock demo accounts from previous testing, purge for clean live launch
    if (Array.isArray(parsed) && parsed.some(b => b.id === 'ba_nbe' || b.id === 'ba_cib' || b.id === 'ba_misr')) {
      localStorage.setItem(STORAGE_KEYS.BANK_ACCOUNTS, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch {
    return [];
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
  if (typeof window === 'undefined') return 'كاشير المعرض';
  return localStorage.getItem(STORAGE_KEYS.LAST_CASHIER_NAME) || 'كاشير المعرض';
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

// -------------------------------------------------------------
// RECYCLE BIN (سلة المحذوفات) - Automatic 15-day purge and manual empty
// -------------------------------------------------------------
export const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export function loadTrashItems(): TrashItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRASH_ITEMS);
    if (!raw) return [];
    const items: TrashItem[] = JSON.parse(raw);
    if (!Array.isArray(items)) return [];

    const now = Date.now();
    // Auto-purge items deleted more than 15 days ago
    const validItems = items.filter((item) => {
      const deletedTime = new Date(item.deletedAt).getTime();
      return now - deletedTime < FIFTEEN_DAYS_MS;
    });

    // Save back if any old items were purged
    if (validItems.length !== items.length) {
      saveTrashItems(validItems);
    }
    return validItems;
  } catch (err) {
    console.error('Failed to load trash items', err);
    return [];
  }
}

export function saveTrashItems(items: TrashItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TRASH_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save trash items', err);
  }
}

export function addToTrash(
  item: Omit<TrashItem, 'id' | 'deletedAt'> & { id?: string; deletedAt?: string }
): TrashItem {
  const current = loadTrashItems();
  const newItem: TrashItem = {
    ...item,
    id: item.id || `trash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    deletedAt: item.deletedAt || new Date().toISOString(),
  };
  const updated = [newItem, ...current];
  saveTrashItems(updated);
  return newItem;
}

export function clearTrash(): void {
  if (typeof window === 'undefined') return;
  saveTrashItems([]);
}

export function removeTrashItem(id: string): TrashItem[] {
  const current = loadTrashItems();
  const updated = current.filter((item) => item.id !== id);
  saveTrashItems(updated);
  return updated;
}

