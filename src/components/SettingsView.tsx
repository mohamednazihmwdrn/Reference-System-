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
  Info
} from 'lucide-react';
import { Branch, BankAccount, TransferItem } from '../types';
import { 
  exportAllDataAsJSON, 
  importAllDataFromJSON, 
  resetAllDataToDefault,
  COMPANY_INFO
} from '../utils/storage';

interface SettingsViewProps {
  branches: Branch[];
  transfers?: TransferItem[];
  bankAccounts: BankAccount[];
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateBankAccounts: (accounts: BankAccount[]) => void;
  onDataReset: () => void;
  onGoToDashboard?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branches,
  transfers = [],
  bankAccounts,
  onUpdateBranches,
  onUpdateBankAccounts,
  onDataReset,
  onGoToDashboard,
}) => {
  // Navigation / Filter inside Settings
  const [activeTab, setActiveTab] = useState<'branches' | 'banks' | 'backup'>('branches');
  const [branchFilter, setBranchFilter] = useState<'all' | 'store' | 'warehouse' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // 1. ADD NEW BRANCH HANDLER
  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    const autoCode = addForm.code.trim().toUpperCase() || 
      (addForm.type === 'store' ? `ST-0${storeCount + 1}` : `WH-0${warehouseCount + 1}`);

    const newBranch: Branch = {
      id: `b_${Date.now()}`,
      name: addForm.name.trim(),
      code: autoCode,
      city: addForm.city.trim() || 'القاهرة',
      address: addForm.address.trim(),
      phone: addForm.phone.trim(),
      pinCode: addForm.pin.trim() || generateRandomPin(),
      type: addForm.type,
      isActive: true,
      defaultCashier: addForm.cashier.trim() || (addForm.type === 'store' ? 'كاشير المحل' : 'أمين المخزن'),
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

  // 3. DELETE BRANCH HANDLER
  const handleConfirmDeleteBranch = () => {
    if (!deletingBranch) return;

    const updated = branches.filter((b) => b.id !== deletingBranch.id);
    onUpdateBranches(updated);
    triggerToast(`تم حذف (${deletingBranch.name}) نهائياً من المنظومة وحسابات الدخول 🗑️`);
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
    if (confirm(`هل أنت متأكد من حذف الحساب البنكي (${name})؟`)) {
      onUpdateBankAccounts(bankAccounts.filter((b) => b.id !== id));
      triggerToast(`تم حذف الحساب البنكي (${name}) بنجاح`);
    }
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
    <div className="py-5 px-3 sm:px-6 max-w-7xl mx-auto space-y-6 pb-24 select-none animate-in fade-in duration-150">
      
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800 text-center text-xs">
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
            <div className="text-xl font-bold font-mono text-white mt-0.5">{activeCount} / {branches.length}</div>
            <div className="text-[10px] text-emerald-300">جاهزة لإرسال الإيصالات</div>
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
          <span>إدارة المعارض والمخازن وكلمات السر ({branches.length})</span>
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
          className={`py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>النسخ الاحتياطي والضبط</span>
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
              
              {/* Add New Branch Button */}
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
                كافة الفروع ({branches.length})
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

          {/* Cards Grid: Complete Branches Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <span className="text-[10px] text-slate-400 font-semibold block">المسؤول / الكاشير:</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{branch.defaultCashier || 'كاشير الفرع'}</span>
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

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW BRANCH (FULL FORM) */}
      {/* ========================================================================= */}
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
                  <label className="font-bold text-slate-700 block mb-1">اسم المسؤول / الكاشير:</label>
                  <input
                    type="text"
                    placeholder="مثال: حسام علي"
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
                  <label className="font-bold text-slate-700 block mb-1">المسؤول / الكاشير:</label>
                  <input
                    type="text"
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
