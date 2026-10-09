import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Sparkles,
  Link,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Clock,
  Calendar,
  Building2,
  DollarSign,
  Filter,
  Check,
  X,
  RefreshCw,
  Layers,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { TransferItem, BankAccount, Branch, BankStatementRecord } from '../types';
import { soundManager } from '../utils/audio';

interface BankReconciliationViewProps {
  transfers: TransferItem[];
  bankAccounts: BankAccount[];
  branches?: Branch[];
  onUpdateBankAccounts?: (accounts: BankAccount[]) => void;
  onApproveTransfer: (transferId: string, notes?: string) => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all';
type GroupViewMode = 'transactions' | 'breakdown';

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  transfers,
  bankAccounts,
  branches = [],
  onUpdateBankAccounts,
  onApproveTransfer,
}) => {
  // Selected Bank Account: 'all' or specific account id
  const [selectedBankId, setSelectedBankId] = useState<string>(bankAccounts[0]?.id || 'all');
  
  // Period Filter: today, week, month, all
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // Search query & Branch & Status filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');

  // View toggle: Transactions Stream vs Daily/Weekly/Monthly Breakdown table
  const [viewMode, setViewMode] = useState<GroupViewMode>('transactions');

  // New Bank Account Modal
  const [showAddBankModal, setShowAddBankModal] = useState<boolean>(false);
  const [newBankForm, setNewBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: 'شركة الروضة الشريفة',
    instapayIpa: '',
    phone: '',
  });

  // SMS / Notification parser
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedNotification, setParsedNotification] = useState<{
    amount?: number;
    ref?: string;
    sender?: string;
  } | null>(null);

  // Active selected bank object
  const activeBank = bankAccounts.find((b) => b.id === selectedBankId);

  // Helper date calculators
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday or start of current week
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekTime = startOfWeek.getTime();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // 1. Filter transfers matching the selected bank account and period
  const bankTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // 1. Bank Account match:
      // If a specific bank is selected, match either by bankAccountUsed, or by IPA/account name if provided
      if (selectedBankId !== 'all') {
        const matchesBank = 
          t.bankAccountUsed === selectedBankId ||
          t.bankAccountUsed === activeBank?.bankName ||
          t.bankAccountUsed === activeBank?.accountNumber ||
          t.bankAccountUsed === activeBank?.instapayIpa ||
          // If no specific bank is assigned to the transfer, include it if it's the primary default account
          (!t.bankAccountUsed && selectedBankId === bankAccounts[0]?.id);
        
        if (!matchesBank) return false;
      }

      // 2. Period Filter:
      const tTime = new Date(t.createdAt).getTime();
      if (period === 'today' && tTime < startOfToday) return false;
      if (period === 'week' && tTime < startOfWeekTime) return false;
      if (period === 'month' && tTime < startOfMonth) return false;

      // 3. Status Filter:
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // 4. Branch Filter:
      if (selectedBranchId !== 'all' && t.branchId !== selectedBranchId) return false;

      // 5. Search Query (Invoice, Reference, Sender, Amount):
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = t.invoiceNo?.toLowerCase().includes(q);
        const matchRef = t.referenceNo?.toLowerCase().includes(q);
        const matchSender = t.senderName?.toLowerCase().includes(q);
        const matchBranch = t.branchName?.toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        if (!matchInvoice && !matchRef && !matchSender && !matchBranch && !matchAmount) {
          return false;
        }
      }

      return true;
    });
  }, [
    transfers, 
    selectedBankId, 
    activeBank, 
    period, 
    statusFilter, 
    selectedBranchId, 
    searchQuery,
    startOfToday,
    startOfWeekTime,
    startOfMonth,
    bankAccounts
  ]);

  // 2. Recognition & Aggregation KPIs
  const stats = useMemo(() => {
    const totalAmount = bankTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    const verifiedTransfers = bankTransfers.filter((t) => t.status === 'verified');
    const verifiedAmount = verifiedTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingTransfers = bankTransfers.filter((t) => t.status === 'pending');
    const pendingAmount = pendingTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const count = bankTransfers.length;
    const verifiedCount = verifiedTransfers.length;
    const matchPercentage = count > 0 ? Math.round((verifiedCount / count) * 100) : 100;

    return {
      totalAmount,
      verifiedAmount,
      pendingAmount,
      count,
      verifiedCount,
      pendingCount: pendingTransfers.length,
      matchPercentage,
    };
  }, [bankTransfers]);

  // 3. Breakdown by Day / Week / Month grouping
  const breakdownGroups = useMemo(() => {
    const map = new Map<string, { label: string; date: string; transfers: TransferItem[] }>();

    bankTransfers.forEach((t) => {
      const d = new Date(t.createdAt);
      let key = '';
      let label = '';

      if (period === 'today') {
        // Group by hour
        const hour = d.getHours();
        key = `hour_${hour}`;
        label = `الساعة ${hour}:00 - ${hour}:59`;
      } else if (period === 'week' || period === 'month') {
        // Group by day (YYYY-MM-DD)
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
      } else {
        // Group by month (YYYY-MM)
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      }

      if (!map.has(key)) {
        map.set(key, { label, date: key, transfers: [] });
      }
      map.get(key)!.transfers.push(t);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [bankTransfers, period]);

  // Handler: Add new company bank account
  const handleAddNewBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankForm.bankName.trim() || !newBankForm.accountNumber.trim()) return;

    const newAcc: BankAccount = {
      id: `ba_${Date.now()}`,
      bankName: newBankForm.bankName.trim(),
      accountNumber: newBankForm.accountNumber.trim(),
      accountName: newBankForm.accountName.trim() || 'شركة الروضة الشريفة',
      instapayIpa: newBankForm.instapayIpa.trim() || `${newBankForm.bankName.toLowerCase().replace(/\s+/g, '')}@instapay`,
      phone: newBankForm.phone.trim() || '01029190615',
      isActive: true,
    };

    if (onUpdateBankAccounts) {
      onUpdateBankAccounts([...bankAccounts, newAcc]);
    }
    setSelectedBankId(newAcc.id);
    setShowAddBankModal(false);
    setNewBankForm({
      bankName: '',
      accountNumber: '',
      accountName: 'شركة الروضة الشريفة',
      instapayIpa: '',
      phone: '',
    });
    soundManager.playSuccess();
  };

  // Handler: Parse SMS
  const handleParseSMS = () => {
    if (!pastedText.trim()) return;
    const amountMatch = pastedText.match(/(?:EGP|ج\.م|LE|مبلغ)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                        pastedText.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:EGP|ج\.م|LE|جنيه)/i);
    const refMatch = pastedText.match(/(?:Ref|المرجع|رقم العملية|مرجع|IPN|IP)[\s:#]*([A-Z0-9]{6,20})/i);

    const parsedAmt = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined;
    const parsedRef = refMatch ? refMatch[1] : undefined;

    setParsedNotification({
      amount: parsedAmt,
      ref: parsedRef,
      sender: 'إشعار وارد بنكي',
    });
  };

  const handleMatchFromSMS = (matchedTransfer: TransferItem) => {
    onApproveTransfer(
      matchedTransfer.id,
      `مطابقة مع إشعار البنك مرجع #${parsedNotification?.ref || 'مؤكد'}`
    );
    setPastedText('');
    setParsedNotification(null);
    soundManager.playSuccess();
  };

  return (
    <div className="py-2 pb-6 px-2.5 sm:px-4 max-w-6xl mx-auto space-y-3">
      
      {/* 1. Header Toolbar with Bank Account Picker and "+ Add Bank" */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                مطابقة حسابات البنك مع إيصالات إنستاباي
              </h2>
              <div className="text-[11px] text-slate-500 font-medium">
                التعرف اللحظي على كافة المبالغ الداخلة لحسابات الشركة ومطابقتها يومياً وأسبوعياً وشهرياً
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bank Accounts Dropdown */}
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="all">🏦 كافة حسابات الشركة ({bankAccounts.length})</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountNumber} ({acc.instapayIpa})
                </option>
              ))}
            </select>

            {/* Quick Add Bank Account Button */}
            <button
              type="button"
              onClick={() => setShowAddBankModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              title="إضافة حساب بنكي جديد للشركة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حساب بنكي</span>
            </button>
          </div>
        </div>

        {/* Selected Bank Info Bar */}
        {activeBank && selectedBankId !== 'all' && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-950">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-900">{activeBank.bankName}</span>
              <span className="text-emerald-700 font-mono">رقم الحساب: <b>{activeBank.accountNumber}</b></span>
              <span className="text-emerald-600 font-mono text-[11px]">معرف إنستاباي: {activeBank.instapayIpa}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>الحساب نشط ويستقبل التحويلات</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Recognition & Financial KPI Strip (التعرف على المبالغ الداخلة للبنك) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* KPI 1: Total Received Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>المبالغ الداخلة للبنك</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-emerald-700 leading-tight">
            {stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-500 mr-1">ج.م</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            إجمالي {stats.count} حركة واردة
          </div>
        </div>

        {/* KPI 2: Verified & Matched */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>المعتمد والمطابق</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-blue-700 leading-tight">
            {stats.verifiedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-500 mr-1">ج.م</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold">
            ✓ مطابق بنسبة {stats.matchPercentage}% ({stats.verifiedCount} حركة)
          </div>
        </div>

        {/* KPI 3: Pending Reconciliation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>معلق قيد المطابقة</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-amber-700 leading-tight">
            {stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            <span className="text-xs font-sans text-slate-500 mr-1">ج.م</span>
          </div>
          <div className="text-[10px] text-amber-700 font-medium">
            {stats.pendingCount} حركة بانتظار التأكيد
          </div>
        </div>

        {/* KPI 4: Period Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>نطاق المطابقة</span>
            <Calendar className="w-4 h-4 text-slate-600" />
          </div>
          <div className="font-black text-sm sm:text-base text-slate-900 leading-tight">
            {period === 'today' && 'إيرادات اليوم'}
            {period === 'week' && 'إيرادات هذا الأسبوع'}
            {period === 'month' && 'إيرادات هذا الشهر'}
            {period === 'all' && 'كافة الفترات المسجلة'}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            تحديث مباشر مع كل قيد
          </div>
        </div>
      </div>

      {/* 3. Period Tabs & Search / Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          
          {/* Period Tabs: اليوم / هذا الأسبوع / هذا الشهر / الكل */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'today' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'week' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'month' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                period === 'all' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
          </div>

          {/* View Mode Toggle: Movements list vs Grouped breakdown table */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('transactions')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'transactions' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>قائمة الإيصالات ({bankTransfers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('breakdown')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'breakdown' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>جدول تفصيل المبالغ ({breakdownGroups.length})</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالراسل، الفاتورة، الرقم المرجعي للبنك، أو المبلغ..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Branch Filter */}
            {branches.length > 0 && (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">كل الفروع ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="verified">المطابق والمعتمد فقط</option>
              <option value="pending">المعلق قيد المطابقة</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. SMS / Push Notification Fast Match Tool (Accordion / Quick Box) */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>مطابقة آلية سريعة بنص إشعار البنك (SMS / IPN)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPastedText('تم استلام تحويل لحظي إنستاباي EGP 2,450.00 مرجع IP20261005882194 من طارق حسام');
            }}
            className="text-[11px] text-blue-300 hover:underline cursor-pointer"
          >
            تجربة نص عينة
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="الصق نص رسالة البنك SMS لاستخراج المبلغ والرقم المرجعي فوراً..."
            className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-400 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleParseSMS}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            استخراج ومطابقة
          </button>
        </div>

        {/* Extracted preview */}
        {parsedNotification && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-emerald-200">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>بيانات الإشعار:</span>
              </span>
              <span className="font-mono text-emerald-300 font-bold text-sm">
                المبلغ: {parsedNotification.amount?.toLocaleString()} ج.م
              </span>
              {parsedNotification.ref && (
                <span className="font-mono text-[11px] text-slate-300">
                  مرجع: {parsedNotification.ref}
                </span>
              )}
            </div>

            {/* Candidate matches in current transfers */}
            {(() => {
              const matches = bankTransfers.filter((t) => {
                if (t.status !== 'pending') return false;
                const amtMatch = parsedNotification.amount && Math.abs(t.amount - parsedNotification.amount) < 0.05;
                const refMatch = parsedNotification.ref && t.referenceNo && t.referenceNo.includes(parsedNotification.ref);
                return amtMatch || refMatch;
              });

              if (matches.length === 0) {
                return (
                  <div className="text-[11px] text-amber-300 font-medium">
                    ⚠️ لم يتم العثور على تحويل معلق مطابق لنفس المبلغ ({parsedNotification.amount} ج.م). يمكنك المطابقة يدوياً من القائمة بالأسفل.
                  </div>
                );
              }

              return (
                <div className="space-y-1 pt-1 border-t border-emerald-800/80">
                  <span className="text-[11px] text-emerald-300 font-bold block">
                    وجدنا {matches.length} تحويل مطابق — اختر للتأكيد الفوري:
                  </span>
                  {matches.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-emerald-900/60 p-2 rounded-lg text-[11px]">
                      <div>
                        <b>فاتورة #{m.invoiceNo}</b> — فرع: {m.branchName} — الراسل: {m.senderName || 'الكاشير'} ({m.amount.toLocaleString()} ج.م)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMatchFromSMS(m)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-2.5 py-1 rounded-md text-[11px] cursor-pointer"
                      >
                        تأكيد المطابقة والاعتماد ✓
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 5. Main Content: Grouped Breakdown Table OR Transactions Stream */}
      {viewMode === 'breakdown' ? (
        /* Breakdown by Day / Week / Month */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800">
              جدول تجميع الإيرادات والمطابقة البنكية حسب الفترات
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              إجمالي: {stats.totalAmount.toLocaleString()} ج.م
            </span>
          </div>

          {breakdownGroups.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              لا توجد بيانات مطابقة في الفترة المحددة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">الفترة الزمنية</th>
                    <th className="p-3">عدد العمليات</th>
                    <th className="p-3">إجمالي المبالغ الداخلة للبنك</th>
                    <th className="p-3">المطابق والمعتمد</th>
                    <th className="p-3">المعلق</th>
                    <th className="p-3">نسبة المطابقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdownGroups.map((g) => {
                    const groupTotal = g.transfers.reduce((s, t) => s + (t.amount || 0), 0);
                    const groupVerified = g.transfers
                      .filter((t) => t.status === 'verified')
                      .reduce((s, t) => s + (t.amount || 0), 0);
                    const groupPending = g.transfers
                      .filter((t) => t.status === 'pending')
                      .reduce((s, t) => s + (t.amount || 0), 0);
                    const pct = groupTotal > 0 ? Math.round((groupVerified / groupTotal) * 100) : 100;

                    return (
                      <tr key={g.date} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{g.label}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{g.transfers.length} إيصال</td>
                        <td className="p-3 font-mono font-black text-emerald-700">
                          {groupTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          {groupVerified.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-700">
                          {groupPending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            pct === 100 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : pct > 50 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {pct}% مطابق
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Detailed Transactions Stream */
        <div className="space-y-1.5">
          {bankTransfers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 space-y-2 shadow-2xs">
              <Landmark className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
              <div className="font-bold text-slate-700 text-xs sm:text-sm">لا توجد تحويلات مسجلة لهذا الحساب في هذه الفترة</div>
              <p className="text-[11px] text-slate-500">
                يمكنك تغيير نطاق البحث أو تصفية الحسابات لرؤية باقي العمليات
              </p>
            </div>
          ) : (
            bankTransfers.map((item) => {
              const isVerified = item.status === 'verified';
              const isPending = item.status === 'pending';

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-2.5 sm:p-3 transition-all flex items-center justify-between gap-2.5 shadow-2xs ${
                    isVerified
                      ? 'border-slate-200 hover:border-emerald-300'
                      : 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
                  }`}
                >
                  {/* Right Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                        #{item.invoiceNo || 'فاتورة'}
                      </span>
                      <span className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded font-bold text-slate-700">
                        {item.branchName}
                      </span>
                      {item.referenceNo && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1 py-0.2 rounded border border-slate-200">
                          مرجع: {item.referenceNo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span>الراسل: <b className="text-slate-800">{item.senderName || item.cashierName || 'كاشير الفرع'}</b></span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}{' '}
                        {new Date(item.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Left Amount & Match Action */}
                  <div className="flex items-center gap-2 shrink-0 text-left">
                    <div className="text-left font-mono font-black text-xs sm:text-sm text-emerald-700">
                      {item.amount > 0 ? item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '—'}
                      <span className="text-[10px] font-sans text-slate-400 mr-0.5">ج.م</span>
                    </div>

                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-1 rounded-lg">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>مطابق بنكياً</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onApproveTransfer(item.id, 'مطابقة بنكية مؤكدة عبر كشف الحساب');
                          soundManager.playSuccess();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="تأكيد مطابقة المبلغ مع كشف حساب البنك واعتماده فوراً"
                      >
                        <Check className="w-3 h-3" />
                        <span>مطابقة الآن</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Modal: Add New Company Bank Account */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <span>إضافة حساب بنكي جديد للشركة</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewBankSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم البنك: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBankForm.bankName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                  placeholder="مثال: البنك الأهلي المصري (NBE) أو بنك مصر أو CIB"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الحساب البنكي (أو الآيبان IBAN): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBankForm.accountNumber}
                  onChange={(e) => setNewBankForm({ ...newBankForm, accountNumber: e.target.value })}
                  placeholder="أدخل رقم الحساب المخصص للتحصيلات..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم صاحب الحساب:
                </label>
                <input
                  type="text"
                  value={newBankForm.accountName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, accountName: e.target.value })}
                  placeholder="شركة الروضة الشريفة للتجارة"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  معرف إنستاباي اللحظي (IPA):
                </label>
                <input
                  type="text"
                  value={newBankForm.instapayIpa}
                  onChange={(e) => setNewBankForm({ ...newBankForm, instapayIpa: e.target.value })}
                  placeholder="مثال: alrawda.store@instapay"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ وتفعيل الحساب البنكي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
