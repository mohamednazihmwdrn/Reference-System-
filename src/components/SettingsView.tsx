import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Check, 
  Landmark, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2,
  FileCode,
  Store,
  Package,
  KeyRound,
  Eye,
  EyeOff,
  Edit3,
  Copy,
  Printer,
  Search,
  Phone,
  MapPin,
  User,
  AlertTriangle,
  Sparkles,
  Dice5,
  X,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck,
  Power,
  SlidersHorizontal,
  Info,
  HardDrive,
  Server,
  Cloud,
  Database
} from 'lucide-react';
import { Branch, BankAccount, TransferItem, TrashItem } from '../types';
import { 
  exportAllDataAsJSON, 
  importAllDataFromJSON, 
  resetAllDataToDefault,
  COMPANY_INFO,
  AuditorProfile,
  loadAuditorCredentials,
  saveAuditorCredentials,
  loadTrashItems,
  saveTrashItems,
  addToTrash,
  clearTrash,
  removeTrashItem,
  FIFTEEN_DAYS_MS
} from '../utils/storage';
import { apiUpdateAuditor } from '../utils/api';

interface SettingsViewProps {
  branches: Branch[];
  transfers?: TransferItem[];
  bankAccounts: BankAccount[];
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateBankAccounts: (accounts: BankAccount[]) => void;
  onDataReset: () => void;
  onGoToDashboard?: () => void;
  onClearAllTransfers?: () => void;
  onRestoreTransfer?: (transfer: TransferItem) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branches,
  transfers = [],
  bankAccounts,
  onUpdateBranches,
  onUpdateBankAccounts,
  onDataReset,
  onGoToDashboard,
  onClearAllTransfers,
  onRestoreTransfer,
}) => {
  // Navigation / Filter inside Settings
  const [activeTab, setActiveTab] = useState<'branches' | 'banks' | 'backup' | 'storage' | 'trash'>('branches');
  const [branchFilter, setBranchFilter] = useState<'all' | 'store' | 'warehouse' | 'auditor' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Recycle Bin (سلة المحذوفات) State
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => loadTrashItems());
  const [trashFilter, setTrashFilter] = useState<'all' | 'transfer' | 'branch' | 'bank_account' | 'message'>('all');

  // Auditor account profile state & modal
  const [auditorProfile, setAuditorProfile] = useState<AuditorProfile>(loadAuditorCredentials());
  const [isEditingAuditor, setIsEditingAuditor] = useState<boolean>(false);
  const [auditorEditForm, setAuditorEditForm] = useState<AuditorProfile>(loadAuditorCredentials());
  const [showAuditorPin, setShowAuditorPin] = useState<boolean>(false);

  // PIN visibility state: global toggle + per-branch individual toggle
  const [showAllPins, setShowAllPins] = useState(false);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Status feedback toast
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Modals state
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [showCredentialsPrintModal, setShowCredentialsPrintModal] = useState(false);

  // Form State for Adding New Branch
  const [addForm, setAddForm] = useState<{
    name: string;
    code: string;
    city: string;
    address: string;
    phone: string;
    cashier: string;
    pin: string;
    type: 'store' | 'warehouse';
    notes: string;
  }>({
    name: '',
    code: '',
    city: 'القاهرة',
    address: '',
    phone: '',
    cashier: '',
    pin: '',
    type: 'store',
    notes: '',
  });

  // Edit Bank Account modal/form state
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Helper: Trigger Feedback Toast
  const triggerToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Generate random 4-digit PIN
  const generateRandomPin = () => {
    return `${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // Toggle single PIN reveal
  const togglePinReveal = (branchId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  // Copy PIN to clipboard
  const handleCopyPin = (pin: string, branchName: string) => {
    navigator.clipboard.writeText(pin);
    triggerToast(`تم نسخ الرقم السري لـ (${branchName}): ${pin} بنجاح إلى الحافظة 📋`);
  };

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      // Type/Status filter
      if (branchFilter === 'store' && b.type !== 'store') return false;
      if (branchFilter === 'warehouse' && b.type !== 'warehouse') return false;
      if (branchFilter === 'inactive' && b.isActive !== false) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.name.toLowerCase().includes(q);
        const matchCode = b.code.toLowerCase().includes(q);
        const matchCity = b.city.toLowerCase().includes(q);
        const matchCashier = b.defaultCashier ? b.defaultCashier.toLowerCase().includes(q) : false;
        const matchPhone = b.phone ? b.phone.includes(q) : false;
        const matchPin = b.pinCode.includes(q);
        if (!matchName && !matchCode && !matchCity && !matchCashier && !matchPhone && !matchPin) {
          return false;
        }
      }

      return true;
    });
  }, [branches, branchFilter, searchQuery]);

  // Statistics calculation
  const storeCount = branches.filter((b) => b.type === 'store').length;
  const warehouseCount = branches.filter((b) => b.type === 'warehouse').length;
  const activeCount = branches.filter((b) => b.isActive).length;

  // Branch statistics lookup
  const getBranchStats = (branchId: string) => {
    const branchTransfers = transfers.filter((t) => t.branchId === branchId);
    const verifiedSum = branchTransfers
      .filter((t) => t.status === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      count: branchTransfers.length,
      verifiedSum,
      pendingCount: branchTransfers.filter((t) => t.status === 'pending').length,
    };
  };

  // Auditor search match
  const matchAuditorSearch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      auditorProfile.name.toLowerCase().includes(q) ||
      (auditorProfile.code || 'aud-01').toLowerCase().includes(q) ||
      auditorProfile.pinCode.includes(q) ||
      (auditorProfile.phone ? auditorProfile.phone.includes(q) : false) ||
      (auditorProfile.city ? auditorProfile.city.toLowerCase().includes(q) : false) ||
      'المراجع'.includes(q) ||
      'إدارة'.includes(q)
    );
  }, [searchQuery, auditorProfile]);

  // Auditor profile edit handler
  const handleSaveAuditorEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorEditForm.name.trim() || !auditorEditForm.pinCode.trim()) return;

    saveAuditorCredentials(auditorEditForm);
    setAuditorProfile(auditorEditForm);
    apiUpdateAuditor(auditorEditForm).catch(() => {});
    setIsEditingAuditor(false);
    triggerToast(`تم تحديث بيانات ورقم سري (${auditorEditForm.name}) بنجاح! الرقم السري الجديد: ${auditorEditForm.pinCode} ✓`);
  };

  // Quick reset auditor PIN
  const handleQuickResetAuditorPin = () => {
    const newPin = generateRandomPin();
    const updated = { ...auditorProfile, pinCode: newPin };
    saveAuditorCredentials(updated);
    setAuditorProfile(updated);
    apiUpdateAuditor(updated).catch(() => {});
    triggerToast(`تم توليد رقم سري جديد للمراجع: ${newPin} 🎲`);
  };

  // 1. ADD NEW BRANCH HANDLER
  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    const autoCode = addForm.code.trim().toUpperCase() || 
      (addForm.type === 'store' ? `ST-0${storeCount + 1}` : `WH-0${warehouseCount + 1}`);

    const cleanName = addForm.name.trim();

    const newBranch: Branch = {
      id: `b_${Date.now()}`,
      name: cleanName,
      code: autoCode,
      city: addForm.city.trim() || 'القاهرة',
      address: addForm.address.trim(),
      phone: addForm.phone.trim(),
      pinCode: addForm.pin.trim() || generateRandomPin(),
      type: addForm.type,
      isActive: true,
      defaultCashier: addForm.cashier.trim() || cleanName,
      notes: addForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onUpdateBranches([...branches, newBranch]);
    setShowAddBranchModal(false);
    setAddForm({
      name: '',
      code: '',
      city: 'القاهرة',
      address: '',
      phone: '',
      cashier: '',
      pin: '',
      type: 'store',
      notes: '',
    });

    triggerToast(`تمت إضافة ${newBranch.name} بنجاح! الرقم السري المخصص: ${newBranch.pinCode}`);
  };

  // 2. SAVE FULL EDIT HANDLER
  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name.trim()) return;

    const updated = branches.map((b) =>
      b.id === editingBranch.id ? editingBranch : b
    );

    onUpdateBranches(updated);
    triggerToast(`تم حفظ وتحديث بيانات (${editingBranch.name}) والرقم السري بنجاح ✓`);
    setEditingBranch(null);
  };

  // 3. DELETE BRANCH HANDLER (Moves to Recycle Bin)
  const handleConfirmDeleteBranch = () => {
    if (!deletingBranch) return;

    addToTrash({
      originalId: deletingBranch.id,
      type: 'branch',
      title: `فرع / مخزن: ${deletingBranch.name} (${deletingBranch.code})`,
      deletedBy: 'المراجع المالي',
      data: deletingBranch,
    });
    setTrashItems(loadTrashItems());

    const updated = branches.filter((b) => b.id !== deletingBranch.id);
    onUpdateBranches(updated);
    triggerToast(`تم نقل (${deletingBranch.name}) إلى سلة المحذوفات بنجاح 🗑️`);
    setDeletingBranch(null);
  };

  // 4. TOGGLE ACTIVE / INACTIVE
  const handleToggleActive = (branch: Branch) => {
    const nextStatus = !branch.isActive;
    const updated = branches.map((b) =>
      b.id === branch.id ? { ...b, isActive: nextStatus } : b
    );
    onUpdateBranches(updated);
    triggerToast(
      nextStatus
        ? `تم تفعيل حساب (${branch.name}) - يمكن للكاشير تسجيل الدخول الآن ✓`
        : `تم تعطيل حساب (${branch.name}) مؤقتاً - لن يتمكن الكاشير من الدخول ⚠️`
    );
  };

  // 5. QUICK PIN RESET
  const handleQuickResetPin = (branch: Branch) => {
    const newPin = generateRandomPin();
    const updated = branches.map((b) =>
      b.id === branch.id ? { ...b, pinCode: newPin } : b
    );
    onUpdateBranches(updated);
    triggerToast(`تم توليد رقم سري جديد لـ (${branch.name}): ${newPin} 🎲`);
  };

  // 6. BANK ACCOUNT ACTIONS
  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newIpa.trim()) return;

    const newAcc: BankAccount = {
      id: `acc_${Date.now()}`,
      bankName: newBankName.trim(),
      accountName: newAccountName.trim() || 'شركة الروضة الشريفة',
      accountNumber: '•••• ••••',
      instapayIpa: newIpa.trim().toLowerCase(),
      phone: newPhone.trim(),
      isActive: true,
    };

    onUpdateBankAccounts([...bankAccounts, newAcc]);
    setNewBankName('');
    setNewAccountName('');
    setNewIpa('');
    setNewPhone('');
    setShowAddBank(false);
    triggerToast('تمت إضافة حساب إنستا باي بنجاح');
  };

  const handleDeleteBank = (id: string, name: string) => {
    const acc = bankAccounts.find((b) => b.id === id);
    if (confirm(`هل أنت متأكد من حذف الحساب البنكي (${name}) ونقله لسلة المحذوفات؟`)) {
      if (acc) {
        addToTrash({
          originalId: acc.id,
          type: 'bank_account',
          title: `حساب بنكي: ${acc.bankName} - ${acc.accountName} (${acc.accountNumber})`,
          deletedBy: 'المراجع المالي',
          data: acc,
        });
        setTrashItems(loadTrashItems());
      }
      onUpdateBankAccounts(bankAccounts.filter((b) => b.id !== id));
      triggerToast(`تم نقل الحساب البنكي (${name}) لسلة المحذوفات 🗑️`);
    }
  };

  // 7. RECYCLE BIN ACTIONS
  const handleRestoreTrashItem = (item: TrashItem) => {
    if (item.type === 'transfer' && onRestoreTransfer) {
      onRestoreTransfer(item.data);
    } else if (item.type === 'branch') {
      onUpdateBranches([...branches, item.data]);
    } else if (item.type === 'bank_account') {
      onUpdateBankAccounts([...bankAccounts, item.data]);
    }
    const updated = removeTrashItem(item.id);
    setTrashItems(updated);
    triggerToast(`تمت استعادة (${item.title}) إلى المنظومة بنجاح ↩️`);
  };

  const handlePermanentDeleteTrashItem = (item: TrashItem) => {
    if (!confirm(`هل أنت متأكد من الحذف النهائي لـ "${item.title}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    const updated = removeTrashItem(item.id);
    setTrashItems(updated);
    triggerToast(`تم حذف (${item.title}) نهائياً ❌`);
  };

  const handleEmptyTrash = () => {
    if (trashItems.length === 0) return;
    if (!confirm(`هل أنت متأكد من تفريغ سلة المحذوفات بالكامل وحذف كافة الـ (${trashItems.length}) عناصر نهائياً؟`)) return;
    clearTrash();
    setTrashItems([]);
    triggerToast('تم تفريغ سلة المحذوفات بالكامل 🗑️');
  };

  const handleToggleBankActive = (id: string) => {
    const updated = bankAccounts.map((b) =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    onUpdateBankAccounts(updated);
  };

  // 7. BACKUP / RESTORE ACTIONS
  const handleExportBackup = () => {
    const jsonStr = exportAllDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rawda_accounts_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    triggerToast('تم تنزيل النسخة الاحتياطية بنجاح 💾');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const success = importAllDataFromJSON(event.target.result as string);
          if (success) {
            alert('تم استرجاع النسخة الاحتياطية بنجاح!');
            window.location.reload();
          } else {
            alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetData = () => {
    if (confirm('تحذير: هل أنت متأكد من إعادة ضبط المنظومة للقيم الافتراضية؟ سيتم مسح أي فروع أو حسابات مضافة يدوياً.')) {
      resetAllDataToDefault();
      onDataReset();
      triggerToast('تمت إعادة ضبط النظام للقيم الافتراضية بنجاح');
    }
  };

  return (
    <div className="py-4 px-3 sm:px-6 max-w-7xl mx-auto space-y-5 pb-4 select-none animate-in fade-in duration-150">
      
      {/* ========================================================================= */}
      {/* Toast Notification Banner */}
      {/* ========================================================================= */}
      {statusMessage && (
        <div className="bg-emerald-900 border border-emerald-500 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Top Banner: Reviewer Full Administration Hub */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-white">
                  الإعدادات الكاملة لإدارة المعارض والمخازن
                </h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">
                  لوحة المراجع
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                شركة الروضة الشريفة · تحكم شامل: إضافة، تعديل كامل، إدارة الأرقام السرية (PIN)، حذف، وتفعيل وتعطيل الحسابات
              </p>
            </div>
          </div>

          {/* Quick Buttons in Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCredentialsPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              title="طباعة كشف سري لكافة بيانات وأرقام الفروع السرية"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>كشف الأرقام السرية (سري)</span>
            </button>

            {onGoToDashboard && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>العودة للاستقبال والأرشيف</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-slate-800 text-center text-xs">
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-2.5">
            <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>حساب المراجع</span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">1</div>
            <div className="text-[10px] text-emerald-400/80">الإدارة المركزية (نشط)</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-2.5">
            <div className="text-[11px] text-blue-400 font-bold flex items-center justify-center gap-1">
              <Store className="w-3.5 h-3.5" />
              <span>المعارض والمحلات</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{storeCount}</div>
            <div className="text-[10px] text-slate-400">معارض بيع مباشرة</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-2.5">
            <div className="text-[11px] text-amber-400 font-bold flex items-center justify-center gap-1">
              <Package className="w-3.5 h-3.5" />
              <span>المخازن والتوريد</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{warehouseCount}</div>
            <div className="text-[10px] text-slate-400">مستودعات بضائع</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-2.5">
            <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
              <Power className="w-3.5 h-3.5" />
              <span>الحسابات النشطة</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{activeCount + 1} / {branches.length + 1}</div>
            <div className="text-[10px] text-emerald-300">جاهزة للاستخدام</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-2.5">
            <div className="text-[11px] text-indigo-400 font-bold flex items-center justify-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              <span>حسابات إنستا باي</span>
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{bankAccounts.length}</div>
            <div className="text-[10px] text-slate-400">حسابات بنكية معتمدة</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Primary Section Segmented Tabs */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-xs text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'branches'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>إدارة كافة الحسابات والمراجع وكلمات السر ({branches.length + 1})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banks')}
          className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'banks'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>حسابات إنستا باي البنكية ({bankAccounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>النسخ الاحتياطي والضبط</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('storage')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'storage'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>سعة الصور (1M+)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trash')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
            activeTab === 'trash'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          <span>سلة المحذوفات ({trashItems.length})</span>
          {trashItems.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: FULL BRANCHES & WAREHOUSES MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          
          {/* Action Toolbar & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Action Buttons: Add Branch + Quick Edit Auditor */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddForm({
                      name: '',
                      code: `ST-0${storeCount + 1}`,
                      city: 'القاهرة',
                      address: '',
                      phone: '',
                      cashier: '',
                      pin: generateRandomPin(),
                      type: 'store',
                      notes: '',
                    });
                    setShowAddBranchModal(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة معرض أو مخزن جديد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuditorEditForm({ ...auditorProfile });
                    setIsEditingAuditor(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                  title="تعديل اسم أو رقم سري أو بيانات حساب المراجع"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>تعديل حساب المراجع (PIN: {auditorProfile.pinCode})</span>
                </button>
              </div>

              {/* Reveal/Hide All PINs Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllPins(!showAllPins)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    showAllPins
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                  }`}
                  title="إظهار أو إخفاء كافة الأرقام السرية"
                >
                  {showAllPins ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{showAllPins ? 'إخفاء الأرقام السرية' : 'كشف الأرقام السرية للجميع'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCredentialsPrintModal(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                  title="طباعة تقرير معتمد بالأرقام السرية"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>طباعة الكشف</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المعرض، المخزن، الكود، المدينة، المسؤول، أو الرقم السري..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setBranchFilter('all')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
                  branchFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كافة الحسابات ({branches.length + 1})
              </button>

              <button
                type="button"
                onClick={() => setBranchFilter('auditor')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
                  branchFilter === 'auditor' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>حساب المراجع</span>
                <span className="font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full text-[10px]">1</span>
              </button>

              <button
                type="button"
                onClick={() => setBranchFilter('store')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
                  branchFilter === 'store' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>المعارض والمحلات</span>
                <span className="font-mono text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full text-[10px]">{storeCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setBranchFilter('warehouse')}
                className={`flex-1 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
                  branchFilter === 'warehouse' ? 'bg-white text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>المخازن والتوريد</span>
                <span className="font-mono text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full text-[10px]">{warehouseCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setBranchFilter('inactive')}
                className={`py-1.5 px-3 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
                  branchFilter === 'inactive' ? 'bg-white text-red-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>المعطلة</span>
                <span className="font-mono text-red-700 bg-red-100 px-1.5 py-0.2 rounded-full text-[10px]">
                  {branches.filter((b) => !b.isActive).length}
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid: Complete Branches & Reviewer Accounts Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Reviewer Account Card (حساب المراجع المالي والإدارة) */}
            {(branchFilter === 'all' || branchFilter === 'auditor') && matchAuditorSearch && (
              <div className="bg-gradient-to-br from-white via-emerald-50/20 to-slate-50 rounded-3xl border-2 border-emerald-300 transition-all p-4 space-y-3.5 shadow-2xs hover:border-emerald-500 relative">
                {/* Card Top: Identity, Name, Code, Status */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md shadow-emerald-600/30">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm sm:text-base">{auditorProfile.name}</h3>
                        <span className="font-mono text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {auditorProfile.code || 'AUD-01'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-bold px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-900">
                          الإدارة المالية والتدقيق
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{auditorProfile.city || 'الإدارة المركزية'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>حساب نشط دائم</span>
                  </span>
                </div>

                {/* Body Details: PIN Code & Description */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-700">الرقم السري للمراجع (PIN):</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-black tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {showAllPins || showAuditorPin ? auditorProfile.pinCode : '••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAuditorPin(!showAuditorPin)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                        title={showAuditorPin ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                      >
                        {showAuditorPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPin(auditorProfile.pinCode, auditorProfile.name)}
                        className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                        title="نسخ الرقم السري"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {auditorProfile.phone && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pr-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>الهاتف: <b className="font-mono text-slate-700">{auditorProfile.phone}</b></span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 bg-white/80 p-2 rounded-xl border border-slate-100">
                    🛡️ {auditorProfile.description || 'صلاحية كاملة لمراجعة واستلام واعتماد إيصالات الفروع والطباعة والأرشفة وحذف العمليات'}
                  </div>
                </div>

                {/* Actions: Edit Auditor & Reset PIN */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditorEditForm({ ...auditorProfile });
                      setIsEditingAuditor(true);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="تعديل اسم أو رقم سري أو بيانات حساب المراجع"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل بيانات المراجع</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickResetAuditorPin}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
                    title="توليد رقم سري عشوائي جديد للمراجع"
                  >
                    <Dice5 className="w-3.5 h-3.5 text-slate-500" />
                    <span>توليد PIN جديد</span>
                  </button>
                </div>
              </div>
            )}
            {filteredBranches.map((branch) => {
              const stats = getBranchStats(branch.id);
              const isStore = branch.type === 'store';
              const isPinVisible = showAllPins || !!revealedPins[branch.id];

              return (
                <div
                  key={branch.id}
                  className={`bg-white rounded-3xl border transition-all p-4 space-y-3.5 shadow-2xs ${
                    branch.isActive
                      ? 'border-slate-200 hover:border-blue-400'
                      : 'border-slate-200 bg-slate-50/70 opacity-80'
                  }`}
                >
                  {/* Card Top: Type Badge, Name, Code, Status */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-sm ${
                        isStore ? 'bg-blue-600' : 'bg-amber-600'
                      }`}>
                        {isStore ? <Store className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-sm sm:text-base">{branch.name}</h3>
                          <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                            {branch.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                            isStore ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isStore ? 'معرض بيع' : 'مخزن بضائع'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{branch.city}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active / Inactive Pill */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(branch)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        branch.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                      }`}
                      title="انقر لتغيير حالة الحساب (نشط / معطل)"
                    >
                      <span className={`w-2 h-2 rounded-full ${branch.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span>{branch.isActive ? 'نشط' : 'معطل مؤقتاً'}</span>
                    </button>
                  </div>

                  {/* Contact & Assignment Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">المسمى الوظيفي للحساب:</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{branch.defaultCashier || (isStore ? 'كاشير المعرض' : 'أمين المخزن')}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">هاتف التواصل:</span>
                      <span className="font-bold font-mono text-slate-800 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{branch.phone || 'غير مسجل'}</span>
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">إجمالي الحركات المعتمدة:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {stats.verifiedSum.toLocaleString()} ج.م ({stats.count} حركة)
                      </span>
                    </div>
                  </div>

                  {/* Secret PIN Box (Requested by user: Full Reviewer Control) */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-900/80 font-bold block">الرقم السري لتسجيل الدخول (PIN):</span>
                        <div className="font-mono font-black text-slate-900 text-sm tracking-wider flex items-center gap-1">
                          {isPinVisible ? (
                            <span className="bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950">
                              {branch.pinCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 tracking-widest text-base font-bold">••••</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PIN Quick Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePinReveal(branch.id)}
                        className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-xs transition-colors cursor-pointer"
                        title={isPinVisible ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
                      >
                        {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyPin(branch.pinCode, branch.name)}
                        className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-xs transition-colors cursor-pointer"
                        title="نسخ الرقم السري"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickResetPin(branch)}
                        className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 text-xs transition-colors cursor-pointer"
                        title="توليد رقم سري جديد عشوائياً"
                      >
                        <Dice5 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom: Management Actions (Edit, Delete, Suspend) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    
                    {/* Full Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditingBranch(branch)}
                      className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الحساب والـ PIN</span>
                    </button>

                    {/* Suspend / Activate Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(branch)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        branch.isActive
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                      title={branch.isActive ? 'تعطيل الحساب مؤقتاً' : 'تفعيل الحساب'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingBranch(branch)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-red-200"
                      title="حذف هذا المعرض أو المخزن نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: BANK ACCOUNTS (INSTAPAY HANDLES) */}
      {/* ========================================================================= */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <Landmark className="w-5 h-5 text-emerald-600" />
                <span>حسابات إنستا باي البنكية المعتمدة للشركة ({bankAccounts.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBank(!showAddBank)}
                className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حساب بنكي جديد</span>
              </button>
            </div>

            {/* Add Bank Form */}
            {showAddBank && (
              <form onSubmit={handleAddBank} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-xs text-slate-800">بيانات الحساب البنكي / عنوان الدفع اللحظي:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="اسم البنك (مثال: البنك الأهلي المصري NBE)"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="عنوان إنستاباي IPA (مثال: alrawda.store@instapay)"
                    value={newIpa}
                    onChange={(e) => setNewIpa(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono text-left focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="اسم صاحب الحساب الرسمي"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="رقم الهاتف المرتبط بالحساب"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm cursor-pointer"
                  >
                    حفظ الحساب البنكي
                  </button>
                </div>
              </form>
            )}

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bankAccounts.map((acc) => (
                <div key={acc.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{acc.bankName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{acc.accountName}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {acc.instapayIpa}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="font-mono text-slate-500">هاتف: {acc.phone}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleBankActive(acc.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          acc.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {acc.isActive ? 'نشط' : 'معطل'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBank(acc.id, acc.bankName)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="حذف هذا الحساب البنكي"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: BACKUP, RESTORE & DATA RESET */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">إدارة النسخ الاحتياطية وإعادة الضبط</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تصدير قاعدة البيانات بالكامل (كافة الفروع، الحسابات، والفواتير) أو استرجاعها عند تغيير الأجهزة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Export Backup */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-slate-900">تصدير نسخة احتياطية (JSON)</div>
              <p className="text-xs text-slate-500">
                حفظ كشف كامل لكافة حسابات الفروع والمخازن والأرقام السرية في ملف آمن على جهازك.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل النسخة الاحتياطية</span>
              </button>
            </div>

            {/* 2. Import Backup */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-slate-900">استرجاع نسخة احتياطية</div>
              <p className="text-xs text-slate-500">
                رفع ملف JSON محفوظ مسبقاً لاستعادة الحسابات والفواتير السابقة.
              </p>
              <label className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                <Upload className="w-4 h-4" />
                <span>اختيار ملف النسخة الاحتياطية</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            {/* 3. Reset Defaults */}
            <div className="border border-red-200 rounded-2xl p-4 space-y-3 bg-red-50/50">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-red-900">إعادة ضبط المصنع الافتراضي</div>
              <p className="text-xs text-red-700">
                استرجاع الفروع الخمسة الأساسية (الروضة، صفا، مودرن، النادي، النحاس) ومسح الإضافات.
              </p>
              <button
                type="button"
                onClick={handleResetData}
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط البيانات</span>
              </button>
            </div>

            {/* 4. Clean Slate / Wipe All Transactions for Live Production */}
            <div className="border-2 border-amber-300 rounded-2xl p-4 space-y-3 bg-amber-50/70 md:col-span-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-amber-950">تصفير وتنظيف كافة الحركات والوصولات (بدء التشغيل الفعلي)</div>
                    <div className="text-xs text-amber-800 mt-0.5">
                      تفريغ صندوق الاستقبال والأرشيف بالكامل من أي فواتير وتجارب سابقة، مع الحفاظ الكامل على كافة حسابات الفروع والمخازن والبنوك وأرقامها السرية.
                    </div>
                  </div>
                </div>
                {onClearAllTransfers && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('هل أنت متأكد تماماً من تصفير ومسح كافة الفواتير والوصولات السابقة للبدء الفعلي؟ (ستبقى كافة الفروع والمخازن والبنوك محفوظة كما هي)')) {
                        onClearAllTransfers();
                        triggerToast('تم تنظيف وتصفير النظام بنجاح! المنظومة الآن خالية تماماً من أي وصولات ومستعدة لبدء العمل الفعلي ✓');
                      }
                    }}
                    className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>تصفير وتنظيف الحركات الآن 🧹</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: IMAGE DATABASE CAPACITY & 1,000,000+ PHOTOS ARCHITECTURE */}
      {/* ========================================================================= */}
      {activeTab === 'storage' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-5 text-right">
          
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-black text-base text-slate-900">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                <span>تنظيم وسعة استقبال الصور وقاعدة البيانات (1,000,000 صورة على الأقل شهرياً)</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                دراسة هندسية ومعمارية توضح كيف يستقبل النظام مليون صورة وأكثر شهرياً بأقصى سرعة وأقل تكلفة.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold font-mono">
              جاهز لاستيعاب 1M+ صور/شهر 🚀
            </span>
          </div>

          {/* 4 Core Pillars of Image Scaling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 1. Monthly Volume */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Database className="w-4 h-4 text-blue-600" />
                <span>المعدل الشهري المستهدف</span>
              </div>
              <div className="text-xl font-black font-mono text-slate-900">
                1,000,000 <span className="text-xs font-sans text-slate-500">صورة/شهر</span>
              </div>
              <div className="text-[11px] text-slate-500">
                معدل: ~33,333 صورة يومياً (حوالي 45 صورة بالدقيقة لكافة الفروع).
              </div>
            </div>

            {/* 2. Client-Side Compression */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>كفاءة الضغط الفوري للهواتف</span>
              </div>
              <div className="text-xl font-black font-mono text-emerald-800">
                من 10MB إلى ~85KB
              </div>
              <div className="text-[11px] text-emerald-700">
                توفير 99% من حجم البيانات مع الحفاظ الكامل على دقة قراءة الفواتير.
              </div>
            </div>

            {/* 3. Monthly Storage Footprint */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>إجمالي التخزين الفعلي شهرياً</span>
              </div>
              <div className="text-xl font-black font-mono text-blue-800">
                ~85 إلى 100 GB <span className="text-xs font-sans text-blue-600">/شهر</span>
              </div>
              <div className="text-[11px] text-blue-700">
                بدلاً من 10,000 جيجابايت لو تم رفع الصور الخام بدون ضغط!
              </div>
            </div>

            {/* 4. Infrastructure Cost */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Server className="w-4 h-4 text-amber-600" />
                <span>التكلفة السحابية الشهرية</span>
              </div>
              <div className="text-xl font-black font-mono text-amber-800">
                ~1.5$ إلى 2.5$ <span className="text-xs font-sans text-amber-600">شهرياً فقط</span>
              </div>
              <div className="text-[11px] text-amber-700">
                تكلفة استضافة 100GB في Firebase Storage أو Cloudflare R2 شبه مجانية.
              </div>
            </div>

          </div>

          {/* Architecture Pipeline Explanation */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>🏗️ المعمارية المنظمة لاستيعاب مليون صورة بدون بطء أو امتلاء الذاكرة:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-mono">1</span>
                  <span>الضغط المباشر على هاتف الكاشير</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  يقوم محرك <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700">imageCompressor.ts</code> عبر تقنية Canvas بضغط الصورة فور التقاطها في أجزاء من الثانية إلى أبعاد 960×960px بصيغة JPEG عالية الوضوح. هذا يمنع بطء الهاتف ويوفر باقة الإنترنت.
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-mono">2</span>
                  <span>تخزين كائنات الصور (Object Storage)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  تُرفع الصور كملفات ثنائية إلى مستودع الكائنات (Firebase Cloud Storage / Cloudflare R2). قاعدة بيانات Firestore <b>لا تخزن ملف الصورة نفسه</b>، بل تخزن فقط رابط الصورة (URL) الذي حجمه أقل من 100 بايت!
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-mono">3</span>
                  <span>الأرشفة الباردة والتحميل عند الطلب</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  تطبيق المحاسب لا يحمل مليون صورة في الذاكرة دفعة واحدة؛ بل يعرض "نظام الخانات" المصغر المدمج، ولا يتم تحميل الصورة الكاملة إلا عند نقر المحاسب على خانة المعاملة لفحصها وتكبيرها.
                </p>
              </div>

            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <b>الخلاصة:</b> منظومة الروضة الشريفة مهيأة معمارياً لاستيعاب أكثر من <b>1,000,000 صورة شهرياً</b> بأمان تام وسرعة استجابة فائقة.
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200 text-[11px] shrink-0">
                الصور الحالية: {transfers.reduce((acc, t) => acc + (t.images?.length || 1), 0)} صورة
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: RECYCLE BIN / TRASH (سلة المحذوفات - تفريغ تلقائي 15 يوم ويدوي) */}
      {/* ========================================================================= */}
      {activeTab === 'trash' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs space-y-5 text-right">
          
          {/* Header & Controls */}
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-black text-base text-slate-900">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span>سلة المحذوفات والمهملات ({trashItems.length})</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                يتم نقل كافة عمليات التحويل والحسابات والفروع المحذوفة بواسطة المراجع إلى هذه السلة. 
                يتم تفريغ العناصر تلقائياً بعد مرور <b>15 يوماً</b> من تاريخ الحذف، أو يمكنك استعادتها وتفريغ السلة يدوياً الآن.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={trashItems.length === 0}
                onClick={handleEmptyTrash}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>تفريغ السلة يدوياً</span>
              </button>
            </div>
          </div>

          {/* Auto-Purge Security Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>
              <b>نظام الحماية المزدوجة:</b> تُحفظ العناصر المحذوفة لمدة 15 يوماً كمهلة أمان لتفادي أخطاء الحذف العفوي. بعد انتهاء الـ 15 يوماً يتم تنظيف وتفريغ العنصر نهائياً وبشكل تلقائي.
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setTrashFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trashFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              كافة العناصر ({trashItems.length})
            </button>
            <button
              type="button"
              onClick={() => setTrashFilter('transfer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trashFilter === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              عمليات التحويل ({trashItems.filter((i) => i.type === 'transfer').length})
            </button>
            <button
              type="button"
              onClick={() => setTrashFilter('branch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trashFilter === 'branch'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              الفروع والمخازن ({trashItems.filter((i) => i.type === 'branch').length})
            </button>
            <button
              type="button"
              onClick={() => setTrashFilter('bank_account')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                trashFilter === 'bank_account'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              الحسابات البنكية ({trashItems.filter((i) => i.type === 'bank_account').length})
            </button>
          </div>

          {/* Items List */}
          {trashItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="font-bold text-slate-700 text-sm">سلة المحذوفات فارغة حالياً</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                عند قيام المراجع بحذف أي عملية تحويل أو فرع أو حساب بنكي، سيتم نقله إلى هنا تلقائياً ليكون متاحاً للاستعادة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trashItems
                .filter((item) => trashFilter === 'all' || item.type === trashFilter)
                .map((item) => {
                  const deletedDate = new Date(item.deletedAt);
                  const daysElapsed = (Date.now() - deletedDate.getTime()) / (24 * 60 * 60 * 1000);
                  const daysRemaining = Math.max(0, Math.ceil(15 - daysElapsed));

                  const typeLabel = 
                    item.type === 'transfer' ? 'عملية تحويل' :
                    item.type === 'branch' ? 'فرع / مخزن' :
                    item.type === 'bank_account' ? 'حساب بنكي' : 'رسالة';

                  const typeBadgeClass =
                    item.type === 'transfer' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    item.type === 'branch' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    item.type === 'bank_account' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                    'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 transition-all hover:shadow-xs hover:border-slate-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${typeBadgeClass}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 font-mono">
                            {deletedDate.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          متبقي {daysRemaining} يوم
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                          {item.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                          <span>حُذفت بواسطة: <b>{item.deletedBy}</b></span>
                        </div>
                      </div>

                      {/* Action Buttons: Restore or Delete Permanently */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleRestoreTrashItem(item)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استعادة للمنظومة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePermanentDeleteTrashItem(item)}
                          className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="حذف نهائي فوري"
                        >
                          <span>حذف نهائي</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 text-right my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>إضافة معرض أو مخزن جديد للمنظومة</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBranchSubmit} className="space-y-3.5 text-xs">
              
              {/* Type Switcher */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, type: 'store' })}
                  className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    addForm.type === 'store' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>معرض / محل بيع تجاري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, type: 'warehouse' })}
                  className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    addForm.type === 'warehouse' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>مخزن بضائع وتوريد</span>
                </button>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المعرض أو المخزن: *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: معرض الروضة - فرع النزهة"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود الفرع (اختياري):</label>
                  <input
                    type="text"
                    placeholder="مثال: ST-04 أو WH-03"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* PIN Code Setup */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 block">الرقم السري لتسجيل الدخول (PIN): *</label>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, pin: generateRandomPin() })}
                    className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>توليد رقم سري عشوائي</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="مثال: 7007"
                  value={addForm.pin}
                  onChange={(e) => setAddForm({ ...addForm, pin: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-center font-mono text-lg font-black tracking-widest text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-800/80 block">
                  هذا هو الرقم الذي سيكتبه كاشير هذا الفرع للدخول إلى صفحته المعزولة.
                </span>
              </div>

              {/* Cashier & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المسمى الوظيفي للحساب (كاشير / أمين مخزن):</label>
                  <input
                    type="text"
                    placeholder={addForm.type === 'store' ? 'مثال: كاشير معرض صفا مكرم' : 'مثال: أمين مخزن النادي'}
                    value={addForm.cashier}
                    onChange={(e) => setAddForm({ ...addForm, cashier: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم تليفون التواصل:</label>
                  <input
                    type="text"
                    placeholder="مثال: 01011223344"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المحافظة / المدينة:</label>
                  <input
                    type="text"
                    placeholder="مثال: القاهرة، الجيزة، الإسكندرية"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">العنوان التفصيلي (اختياري):</label>
                  <input
                    type="text"
                    placeholder="مثال: شارع الحجاز، النزهة"
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  حفظ المعرض / المخزن الجديد ✓
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FULL EDIT BRANCH MODAL (Requested: تعديل شامل للحسابات) */}
      {/* ========================================================================= */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 text-right my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>تعديل بيانات الحساب: {editingBranch.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBranch} className="space-y-3.5 text-xs">
              
              {/* Type Switcher */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setEditingBranch({ ...editingBranch, type: 'store' })}
                  className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    editingBranch.type === 'store' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>معرض / محل بيع تجاري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBranch({ ...editingBranch, type: 'warehouse' })}
                  className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    editingBranch.type === 'warehouse' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>مخزن بضائع وتوريد</span>
                </button>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المعرض أو المخزن: *</label>
                  <input
                    type="text"
                    required
                    value={editingBranch.name}
                    onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود الفرع:</label>
                  <input
                    type="text"
                    value={editingBranch.code}
                    onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* PIN Code Edit */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 block">الرقم السري لتسجيل الدخول (PIN): *</label>
                  <button
                    type="button"
                    onClick={() => setEditingBranch({ ...editingBranch, pinCode: generateRandomPin() })}
                    className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>توليد رقم سري عشوائي</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={editingBranch.pinCode}
                  onChange={(e) => setEditingBranch({ ...editingBranch, pinCode: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-center font-mono text-xl font-black tracking-widest text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-800/80 block">
                  يمكنك تعديل الرقم السري هنا أو إعادة توليده بضغطة زر.
                </span>
              </div>

              {/* Cashier & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المسمى الوظيفي للحساب (كاشير / أمين مخزن):</label>
                  <input
                    type="text"
                    placeholder={editingBranch.type === 'store' ? 'مثال: كاشير معرض صفا مكرم' : 'مثال: أمين مخزن النادي'}
                    value={editingBranch.defaultCashier || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, defaultCashier: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم تليفون التواصل:</label>
                  <input
                    type="text"
                    value={editingBranch.phone || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* City & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المدينة / المحافظة:</label>
                  <input
                    type="text"
                    value={editingBranch.city}
                    onChange={(e) => setEditingBranch({ ...editingBranch, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">العنوان التفصيلي:</label>
                  <input
                    type="text"
                    value={editingBranch.address || ''}
                    onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status Switcher */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="font-bold text-slate-900 block">حالة الحساب:</span>
                  <span className="text-[10px] text-slate-500">
                    {editingBranch.isActive ? 'الحساب نشط ويمكن للكاشير الدخول' : 'الحساب معطل مؤقتاً'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBranch({ ...editingBranch, isActive: !editingBranch.isActive })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    editingBranch.isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {editingBranch.isActive ? 'نشط ✓' : 'معطل ✗'}
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  حفظ كافة التعديلات ✓
                </button>

                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2.5: EDIT AUDITOR ACCOUNT MODAL (تعديل حساب المراجع والرقم السري) */}
      {/* ========================================================================= */}
      {isEditingAuditor && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 text-right my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    تعديل حساب المراجع (الإدارة المالية)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    التحكم الكامل في الاسم، الرقم السري (PIN)، الهاتف، والصلاحيات
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAuditor(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuditorEdit} className="space-y-3.5 text-xs">
              
              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المراجع: *</label>
                  <input
                    type="text"
                    required
                    value={auditorEditForm.name}
                    onChange={(e) => setAuditorEditForm({ ...auditorEditForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="مثال: المراجع"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود الحساب الإداري:</label>
                  <input
                    type="text"
                    value={auditorEditForm.code || 'AUD-01'}
                    onChange={(e) => setAuditorEditForm({ ...auditorEditForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* PIN Code Edit */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-950 block">الرقم السري للمراجع (PIN): *</label>
                  <button
                    type="button"
                    onClick={() => setAuditorEditForm({ ...auditorEditForm, pinCode: generateRandomPin() })}
                    className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer text-[11px] bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-2xs"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>توليد PIN عشوائي</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAuditorPin ? "text" : "password"}
                    maxLength={10}
                    required
                    value={auditorEditForm.pinCode}
                    onChange={(e) => setAuditorEditForm({ ...auditorEditForm, pinCode: e.target.value })}
                    className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-center font-mono text-2xl font-black tracking-widest text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuditorPin(!showAuditorPin)}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showAuditorPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <span className="text-[10px] text-emerald-800 block">
                  هذا هو الرقم السري الذي يستخدمه المراجع لتسجيل الدخول إلى لوحة التحكم والاعتماد.
                </span>
              </div>

              {/* Phone & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم هاتف المراجع للتواصل:</label>
                  <input
                    type="text"
                    value={auditorEditForm.phone || ''}
                    onChange={(e) => setAuditorEditForm({ ...auditorEditForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                    placeholder="01029190615"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">المقر الإداري / المدينة:</label>
                  <input
                    type="text"
                    value={auditorEditForm.city || 'الإدارة المركزية'}
                    onChange={(e) => setAuditorEditForm({ ...auditorEditForm, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description / Permissions Note */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">وصف الصلاحيات والملاحظات:</label>
                <textarea
                  rows={2}
                  value={auditorEditForm.description || ''}
                  onChange={(e) => setAuditorEditForm({ ...auditorEditForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="صلاحية كاملة لمراجعة واستلام واعتماد إيصالات الفروع والطباعة والأرشفة وحذف العمليات"
                />
              </div>

              {/* Status Banner */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  حساب المراجع هو الحساب الإداري الأعلى في المنظومة وله صلاحية الاعتماد والرفض والحذف والطباعة.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  حفظ تعديلات حساب المراجع ✓
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingAuditor(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE BRANCH CONFIRMATION (Requested: حذف أي معرض أو مخزن) */}
      {/* ========================================================================= */}
      {deletingBranch && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 text-right">
            
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">تأكيد حذف الحساب نهائياً</h3>
                <span className="text-xs text-red-600 font-bold">{deletingBranch.name}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-200">
              <p className="font-bold text-red-950">
                هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً من المنظومة؟
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>لن يتمكن كاشير أو أمين هذا الفرع من تسجيل الدخول بعد الآن.</li>
                <li>سيتم إزالة الرمز السري ({deletingBranch.pinCode}) الخاص بهذا الحساب.</li>
                {transfers.filter((t) => t.branchId === deletingBranch.id).length > 0 && (
                  <li className="font-bold text-amber-900">
                    ملاحظة: يوجد {transfers.filter((t) => t.branchId === deletingBranch.id).length} فواتير مسجلة تاريخياً، وستظل محفوظة في كشوف الأرشيف العام.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmDeleteBranch}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
              >
                تأكيد الحذف نهائياً 🗑️
              </button>

              <button
                type="button"
                onClick={() => setDeletingBranch(null)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIDENTIAL CREDENTIALS SHEET PRINT MODAL */}
      {/* ========================================================================= */}
      {showCredentialsPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 text-right my-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">
                  كشف بيانات واعتمادات الدخول للمعارض والمخازن (سري للإدارة)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCredentialsPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Credentials Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">شركة الروضة الشريفة لتجارة الأجهزة والكماليات</div>
                  <div className="text-[11px] text-slate-400">سجل كلمات المرور والأرقام السرية لجميع المعارض والمخازن</div>
                </div>
                <div className="text-left font-mono text-[10px] text-slate-300">
                  تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>

              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-2.5">المعرض / المخزن</th>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">الكود</th>
                    <th className="p-2.5">المسؤول</th>
                    <th className="p-2.5">الهاتف</th>
                    <th className="p-2.5 bg-amber-100 text-amber-950 font-mono">الرقم السري (PIN)</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {/* Auditor Principal Row */}
                  <tr className="bg-emerald-50/70 border-b-2 border-emerald-200">
                    <td className="p-2.5 font-black text-emerald-950 flex items-center gap-1.5">
                      <span>🛡️ {auditorProfile.name}</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">حساب الإدارة والمراجع</span>
                    </td>
                    <td className="p-2.5 text-emerald-800 font-bold">المراجع العام</td>
                    <td className="p-2.5 font-mono text-emerald-900 font-bold">{auditorProfile.code || 'AUD-01'}</td>
                    <td className="p-2.5 text-emerald-900 font-bold">{auditorProfile.name}</td>
                    <td className="p-2.5 font-mono text-emerald-800">{auditorProfile.phone || '01029190615'}</td>
                    <td className="p-2.5 bg-amber-100 font-mono font-black text-amber-950 text-sm tracking-widest">
                      {auditorProfile.pinCode}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        نشط دائم
                      </span>
                    </td>
                  </tr>

                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{b.name}</td>
                      <td className="p-2.5 text-slate-600">{b.type === 'store' ? 'معرض' : 'مخزن'}</td>
                      <td className="p-2.5 font-mono text-slate-700">{b.code}</td>
                      <td className="p-2.5 text-slate-700">{b.defaultCashier || 'كاشير'}</td>
                      <td className="p-2.5 font-mono text-slate-600">{b.phone || '-'}</td>
                      <td className="p-2.5 bg-amber-50 font-mono font-black text-amber-950 text-sm tracking-wider">
                        {b.pinCode}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {b.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mandatory Intellectual Property Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono space-y-0.5">
                <div>{COMPANY_INFO.copyrightNotice}</div>
                <div className="text-slate-400">مستخرج رسمياً للإدارة المالية والمراجع العام · جميع الحقوق محفوظة</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكشف الآن 🖨️</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCredentialsPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
