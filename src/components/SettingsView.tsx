import React, { useState } from 'react';
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
  Store
} from 'lucide-react';
import { Branch, BankAccount, TransferItem } from '../types';
import { 
  exportAllDataAsJSON, 
  importAllDataFromJSON, 
  resetAllDataToDefault 
} from '../utils/storage';

interface SettingsViewProps {
  branches: Branch[];
  bankAccounts: BankAccount[];
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateBankAccounts: (accounts: BankAccount[]) => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branches,
  bankAccounts,
  onUpdateBranches,
  onUpdateBankAccounts,
  onDataReset,
}) => {
  // New Branch Form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchCashier, setNewBranchCashier] = useState('');
  const [newBranchPin, setNewBranchPin] = useState('');
  const [newBranchType, setNewBranchType] = useState<'store' | 'warehouse'>('store');
  const [showAddBranch, setShowAddBranch] = useState(false);

  // Edit PIN Modal state
  const [editingBranchPin, setEditingBranchPin] = useState<Branch | null>(null);
  const [updatedPinValue, setUpdatedPinValue] = useState<string>('');

  // New Bank Account Form
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddBank, setShowAddBank] = useState(false);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      name: newBranchName.trim(),
      code: newBranchCode.trim().toUpperCase() || (newBranchType === 'store' ? `ST-0${branches.length + 1}` : `WH-0${branches.length + 1}`),
      city: newBranchCity.trim() || 'الفرع الرئيسي',
      pinCode: newBranchPin.trim() || `${Math.floor(1000 + Math.random() * 9000)}`,
      type: newBranchType,
      isActive: true,
      defaultCashier: newBranchCashier.trim() || 'كاشير الفرع',
    };

    onUpdateBranches([...branches, newBranch]);
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchCity('');
    setNewBranchCashier('');
    setNewBranchPin('');
    setShowAddBranch(false);
    setStatusMessage(`تمت إضافة ${newBranch.name} وتعيين الرمز السري: ${newBranch.pinCode}`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSavePin = (branch: Branch) => {
    if (!updatedPinValue.trim()) return;
    const updated = branches.map((b) =>
      b.id === branch.id ? { ...b, pinCode: updatedPinValue.trim() } : b
    );
    onUpdateBranches(updated);
    setEditingBranchPin(null);
    setUpdatedPinValue('');
    setStatusMessage(`تم تحديث الرقم السري لـ ${branch.name} بنجاح إلى: ${updatedPinValue}`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDeleteBranch = (branch: Branch) => {
    if (confirm(`هل أنت متأكد من حذف ${branch.name} نهائياً من المنظومة؟`)) {
      const updated = branches.filter((b) => b.id !== branch.id);
      onUpdateBranches(updated);
      setStatusMessage(`تم حذف ${branch.name} بنجاح`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleToggleBranchActive = (id: string) => {
    const updated = branches.map((b) =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    onUpdateBranches(updated);
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newIpa.trim()) return;

    const newAcc: BankAccount = {
      id: `acc_${Date.now()}`,
      bankName: newBankName.trim(),
      accountName: newAccountName.trim() || 'شركة ركيزة',
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
    setStatusMessage('تمت إضافة حساب إنستا باي بنجاح');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleExportBackup = () => {
    const jsonStr = exportAllDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rakeeza_instapay_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
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
    if (confirm('هل أنت متأكد من إعادة ضبط البيانات إلى القيم الافتراضية؟ سيتم مسح أي عمليات مضافة يدوياً.')) {
      resetAllDataToDefault();
      onDataReset();
      setStatusMessage('تمت إعادة ضبط النظام للقيم الافتراضية بنجاح');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">إعدادات المنظومة والفروع والحسابات</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة فروع الشركة والمخازن، وربط حسابات إنستا باي البنكية المعتمدة، وإدارة النسخ الاحتياطية.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid: Branches Management & Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Branches & Warehouses */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>فروع ومخازن الشركة ({branches.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBranch(!showAddBranch)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة فرع / مخزن</span>
            </button>
          </div>

          {/* Add Branch Form */}
          {showAddBranch && (
            <form onSubmit={handleAddBranch} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>إضافة محل أو مخزن جديد للمنظومة:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setNewBranchType('store')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${newBranchType === 'store' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                  >
                    محل
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBranchType('warehouse')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${newBranchType === 'warehouse' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                  >
                    مخزن
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="اسم المحل / المخزن (مثال: فرع وسط البلد)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="كود الفرع (اختياري، يولد تلقائياً)"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="المدينة / المنطقة"
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="اسم المسؤول / الكاشير الافتراضي"
                  value={newBranchCashier}
                  onChange={(e) => setNewBranchCashier(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="الرقم السري لدخول هذا الفرع PIN (مثال: 6006)"
                    value={newBranchPin}
                    onChange={(e) => setNewBranchPin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">إذا تركته فارغاً سيتم تعيين رمز سري عشوائي تلقائياً</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddBranch(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  حفظ المحل / المخزن
                </button>
              </div>
            </form>
          )}

          {/* Branches List */}
          <div className="divide-y divide-slate-100 space-y-2">
            {branches.map((b) => (
              <div key={b.id} className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{b.name}</span>
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {b.code}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      b.type === 'warehouse' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {b.type === 'warehouse' ? 'مخزن' : 'محل'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{b.city} {b.defaultCashier ? `· ${b.defaultCashier}` : ''}</span>
                    <span>·</span>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                      PIN: {b.pinCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBranchPin(b);
                      setUpdatedPinValue(b.pinCode);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                    title="تعديل الرقم السري لهذا الفرع"
                  >
                    تعديل PIN 🔑
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleBranchActive(b.id)}
                    className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${
                      b.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {b.isActive ? 'نشط' : 'معطل'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBranch(b)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="حذف هذا الفرع"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit PIN Modal */}
          {editingBranchPin && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
                <div className="font-bold text-slate-900 text-base">
                  تعديل الرقم السري لـ {editingBranchPin.name}
                </div>
                <div className="text-xs text-slate-500">
                  أدخل الرقم السري الجديد الذي سيستخدمه الكاشير لتسجيل الدخول:
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={updatedPinValue}
                  onChange={(e) => setUpdatedPinValue(e.target.value)}
                  placeholder="مثال: 8899"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center font-mono text-xl font-bold tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingBranchPin(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSavePin(editingBranchPin)}
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    حفظ الرقم السري الجديد
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Section 2: Bank Accounts & InstaPay Handles */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <span>حسابات إنستا باي المعتمدة ({bankAccounts.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBank(!showAddBank)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حساب بنكي</span>
            </button>
          </div>

          {/* Add Bank Form */}
          {showAddBank && (
            <form onSubmit={handleAddBank} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="font-bold text-xs text-slate-800">إضافة حساب بنكي / عنوان إنستا باي:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="اسم البنك (مثال: بنك QNB الأهلي)"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="عنوان الدفع IPA (مثال: rakeeza@instapay)"
                  value={newIpa}
                  onChange={(e) => setNewIpa(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-left"
                />
                <input
                  type="text"
                  placeholder="اسم الحساب الرسمي"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="رقم الهاتف المرتبط بالإنستاباي"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-left"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddBank(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          )}

          {/* Accounts List */}
          <div className="divide-y divide-slate-100 space-y-2">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="pt-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">{acc.bankName}</div>
                  <div className="font-mono text-xs text-emerald-700 font-semibold mt-0.5">
                    {acc.instapayIpa}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {acc.accountName} {acc.phone ? `· هاتف: ${acc.phone}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-100">
                    مستقبل رسمي
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Section 3: Data Backup & Maintenance */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-base text-slate-900 pb-2 border-b border-slate-100">
          <FileCode className="w-5 h-5 text-slate-700" />
          <span>النسخ الاحتياطي وإدارة بيانات المنظومة</span>
        </div>

        <p className="text-xs text-slate-500">
          تُحفظ جميع التحويلات وحالات الاعتماد محلياً بشكل فوري. يمكنك تنزيل نسخة احتياطية بصيغة JSON أو استرجاعها في أي وقت.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية كاملة (JSON)</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>استيراد نسخة احتياطية</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors mr-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة ضبط البيانات الافتراضية (Demo Reset)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
