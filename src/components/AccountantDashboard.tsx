import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  FileSpreadsheet, 
  Printer, 
  ExternalLink, 
  Eye, 
  Building2, 
  ArrowUpDown, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  Download, 
  ZoomIn, 
  Store, 
  Package, 
  Layers, 
  ChevronLeft, 
  ArrowRight, 
  User, 
  Hash, 
  Calendar, 
  FileText, 
  Check, 
  X,
  Inbox,
  Archive,
  Sparkles,
  Undo2,
  CheckCheck,
  Send,
  Settings
} from 'lucide-react';
import { TransferItem, Branch } from '../types';
import { soundManager } from '../utils/audio';
import { PhotoLightboxModal } from './PhotoLightboxModal';

export type AuditorViewMode = 'reception' | 'archive' | 'all';

interface AccountantDashboardProps {
  transfers: TransferItem[];
  branches: Branch[];
  onOpenVerifyModal: (transfer: TransferItem) => void;
  onQuickApprove: (transferId: string) => void;
  onQuickReject: (transferId: string, reason: string) => void;
  onBulkApprove: (transferIds: string[]) => void;
  onOpenPrintReport: () => void;
  onPrintSingleVoucher: (transfer: TransferItem) => void;
  onReturnToReception?: (transferId: string) => void;
  onGoToSettings?: () => void;
  onClearAllTransfers?: () => void;
}

export const AccountantDashboard: React.FC<AccountantDashboardProps> = ({
  transfers,
  branches,
  onOpenVerifyModal,
  onQuickApprove,
  onQuickReject,
  onBulkApprove,
  onOpenPrintReport,
  onPrintSingleVoucher,
  onReturnToReception,
  onGoToSettings,
  onClearAllTransfers,
}) => {
  // Main Auditor Mode: 'reception' (Default - clears on approve) vs 'archive' vs 'all'
  const [viewMode, setViewMode] = useState<AuditorViewMode>('reception');

  // Branch filter (All or specific store/warehouse)
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Archive sub-filter
  const [selectedArchiveStatus, setSelectedArchiveStatus] = useState<'all_archived' | 'verified' | 'rejected'>('all_archived');

  // Global status filter (used only in 'all' view)
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [searchGlobalScope, setSearchGlobalScope] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'createdAt' | 'amount'>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Lightbox Zoom state for any photo
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Quick Reject Modal state
  const [rejectingItem, setRejectingItem] = useState<TransferItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('المبلغ غير مطابق للفاتورة');
  const [customRejectNote, setCustomRejectNote] = useState<string>('');

  // Multi-selection for bulk operations in reception
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Instant action feedback notification banner / toast
  const [toastMessage, setToastMessage] = useState<{ id: string; text: string; type: 'success' | 'info' | 'reject' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Overall Financial KPIs
  const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
  const pendingTransfers = transfers.filter((t) => t.status === 'pending');
  const pendingAmount = pendingTransfers.reduce((sum, t) => sum + t.amount, 0);
  const verifiedTransfers = transfers.filter((t) => t.status === 'verified');
  const verifiedAmount = verifiedTransfers.reduce((sum, t) => sum + t.amount, 0);
  const rejectedTransfers = transfers.filter((t) => t.status === 'rejected');
  const archivedTransfers = transfers.filter((t) => t.status !== 'pending');
  const archivedAmount = archivedTransfers.filter((t) => t.status === 'verified').reduce((sum, t) => sum + t.amount, 0);

  // Real-Time Stats for Request 8: (Pending count, Amount verified today, Rejected count)
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const verifiedTodayTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (t.status !== 'verified') return false;
      const vDate = t.verifiedAt ? t.verifiedAt.slice(0, 10) : t.createdAt.slice(0, 10);
      return vDate === todayDateStr;
    });
  }, [transfers, todayDateStr]);

  const verifiedTodayAmount = useMemo(() => {
    return verifiedTodayTransfers.reduce((sum, t) => sum + t.amount, 0);
  }, [verifiedTodayTransfers]);

  // Global search matches across all records for instant discovery
  const searchResultsGlobal = useMemo(() => {
    if (!searchQuery.trim()) {
      return { total: 0, pending: 0, verified: 0, rejected: 0, items: [] };
    }
    const q = searchQuery.toLowerCase().trim();
    const items = transfers.filter((t) => {
      const matchInvoice = t.invoiceNo?.toLowerCase().includes(q);
      const matchBranch = t.branchName?.toLowerCase().includes(q);
      const matchRef = t.referenceNo ? t.referenceNo.toLowerCase().includes(q) : false;
      const matchSender = t.senderName ? t.senderName.toLowerCase().includes(q) : false;
      const matchAmount = t.amount?.toString().includes(q);
      return matchInvoice || matchBranch || matchRef || matchSender || matchAmount;
    });

    return {
      total: items.length,
      pending: items.filter((t) => t.status === 'pending').length,
      verified: items.filter((t) => t.status === 'verified').length,
      rejected: items.filter((t) => t.status === 'rejected').length,
      items,
    };
  }, [transfers, searchQuery]);

  // Filtered & Sorted Transfers based on current viewMode & search scope
  const filteredTransfers = useMemo(() => {
    const isGlobalSearching = searchGlobalScope && searchQuery.trim().length > 0;

    return transfers
      .filter((t) => {
        // If user enabled global search, search across all records without tab restrictions!
        if (!isGlobalSearching) {
          // Mode 1: Reception view -> strictly show pending items that need approval!
          if (viewMode === 'reception') {
            if (t.status !== 'pending') return false;
          } 
          // Mode 2: Archive view -> strictly show items that have been verified or rejected!
          else if (viewMode === 'archive') {
            if (t.status === 'pending') return false;
            if (selectedArchiveStatus === 'verified' && t.status !== 'verified') return false;
            if (selectedArchiveStatus === 'rejected' && t.status !== 'rejected') return false;
          } 
          // Mode 3: All view -> full history
          else if (viewMode === 'all') {
            if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
          }

          // Branch filter (Drill-down to specific store or warehouse)
          if (selectedBranch !== 'all' && t.branchId !== selectedBranch) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchInvoice = t.invoiceNo?.toLowerCase().includes(q);
          const matchBranch = t.branchName?.toLowerCase().includes(q);
          const matchRef = t.referenceNo ? t.referenceNo.toLowerCase().includes(q) : false;
          const matchSender = t.senderName ? t.senderName.toLowerCase().includes(q) : false;
          const matchAmount = t.amount?.toString().includes(q);
          if (!matchInvoice && !matchBranch && !matchRef && !matchSender && !matchAmount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'amount') {
          return sortAsc ? a.amount - b.amount : b.amount - a.amount;
        }
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortAsc ? timeA - timeB : timeB - timeA;
      });
  }, [transfers, viewMode, selectedArchiveStatus, selectedStatus, selectedBranch, searchQuery, searchGlobalScope, sortField, sortAsc]);

  // Currently selected branch object (if any)
  const activeBranchObj = branches.find((b) => b.id === selectedBranch);

  // Selected branch stats
  const activeBranchTransfers = selectedBranch === 'all' 
    ? transfers 
    : transfers.filter((t) => t.branchId === selectedBranch);
  const activeBranchPendingTransfers = activeBranchTransfers.filter((t) => t.status === 'pending');
  const activeBranchVerifiedTransfers = activeBranchTransfers.filter((t) => t.status === 'verified');
  const activeBranchVerifiedSum = activeBranchVerifiedTransfers.reduce((sum, t) => sum + t.amount, 0);

  // 1-Tap Quick Approve with immediate archiving and toast notification
  const handleQuickApproveWithFeedback = (item: TransferItem) => {
    onQuickApprove(item.id);
    soundManager.playSuccess();
    setToastMessage({
      id: String(Date.now()),
      text: `تم اعتماد الوصل ${item.invoiceNo} (${item.amount > 0 ? item.amount.toLocaleString() + ' ج.م' : 'بدون تحديد مبلغ'}) وترحيله فوراً إلى الأرشيف وإخلاء مكانه من الاستقبال بنجاح ✓`,
      type: 'success',
    });
  };

  // Un-archive (return to reception) handler
  const handleReturnToReceptionClick = (item: TransferItem) => {
    if (onReturnToReception) {
      onReturnToReception(item.id);
      setToastMessage({
        id: String(Date.now()),
        text: `تم إلغاء أرشفة الوصل ${item.invoiceNo} وإعادته إلى صندوق الاستقبال للمراجعة ✓`,
        type: 'info',
      });
    }
  };

  // Bulk selection handlers
  const handleSelectAllPending = () => {
    const pendingInCurrentView = filteredTransfers.filter((t) => t.status === 'pending').map((t) => t.id);
    if (selectedIds.length === pendingInCurrentView.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingInCurrentView);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApproveClick = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من اعتماد ${selectedIds.length} فواتير وترحيلها دفعة واحدة إلى الأرشيف وإخلاء مكانها من صندوق الاستقبال؟`)) {
      const count = selectedIds.length;
      onBulkApprove(selectedIds);
      setSelectedIds([]);
      soundManager.playSuccess();
      setToastMessage({
        id: String(Date.now()),
        text: `تم اعتماد وترحيل ${count} فواتير إلى الأرشيف بنجاح، وتم تنظيف وتفريغ صندوق الاستقبال أولاً بأول ✓`,
        type: 'success',
      });
    }
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    const finalReason = customRejectNote.trim() 
      ? `${rejectionReason} - ${customRejectNote.trim()}`
      : rejectionReason;
    
    onQuickReject(rejectingItem.id, finalReason);
    soundManager.playReject();
    setToastMessage({
      id: String(Date.now()),
      text: `تم رفض الوصل ${rejectingItem.invoiceNo} وترحيله لسجل المرفوضات وإشعار الفرع فوراً ✗`,
      type: 'reject',
    });
    setRejectingItem(null);
    setCustomRejectNote('');
  };

  // Export to CSV/Excel
  const handleExportCSV = () => {
    const headers = [
      'رقم الفاتورة',
      'الفرع / المخزن',
      'المبلغ (ج.م)',
      'الرقم المرجعي',
      'اسم الراسل',
      'الحالة',
      'تاريخ الإرسال',
      'المحاسب المعتمد',
      'ملاحظات',
    ];

    const rows = filteredTransfers.map((t) => [
      `"${t.invoiceNo}"`,
      `"${t.branchName}"`,
      t.amount.toFixed(2),
      `"${t.referenceNo || ''}"`,
      `"${t.senderName || ''}"`,
      t.status === 'verified' ? 'معتمد ومرحل للأرشيف' : t.status === 'pending' ? 'معلق بالاستقبال' : 'مرفوض',
      `"${new Date(t.createdAt).toLocaleString('ar-EG')}"`,
      `"${t.verifiedBy || ''}"`,
      `"${(t.rejectionReason || t.accountantNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ارشيف_الروضة_الشريفة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 space-y-3.5 pb-6 select-none animate-in fade-in duration-150">
      
      {/* ========================================================================= */}
      {/* Toast Notification Banner (Real-time Feedback on Approval & Archiving) */}
      {/* ========================================================================= */}
      {toastMessage && (
        <div className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-lg transition-all animate-in slide-in-from-top-3 duration-200 border ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-900/95 text-white border-emerald-500 shadow-emerald-900/20' 
            : toastMessage.type === 'reject'
            ? 'bg-red-900/95 text-white border-red-500 shadow-red-900/20'
            : 'bg-blue-900/95 text-white border-blue-500 shadow-blue-900/20'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' && <CheckCheck className="w-5 h-5 text-emerald-300 shrink-0" />}
            {toastMessage.type === 'reject' && <XCircle className="w-5 h-5 text-red-300 shrink-0" />}
            {toastMessage.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-300 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Top Banner: Accountant Identity & High-Level Financial Pulse */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">منظومة تدقيق الحسابات والاستقبال</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  مباشر
                </span>
              </div>
              <p className="text-xs text-slate-400">
                شركة الروضة الشريفة · استقبال ومطابقة إيصالات إنستاباي لجميع الفروع والمخازن
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onGoToSettings && (
              <button
                type="button"
                onClick={onGoToSettings}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                title="الإعدادات الكاملة لإدارة المعارض والمخازن وكلمات السر"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">إدارة المعارض والمخازن</span>
                <span className="sm:hidden">الإعدادات</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenPrintReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الأرشيف</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              title="تصدير كشف إكسيل (CSV)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Compact Real-Time KPI Strip (High information density, Zero wasted space) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800">
          {/* 1. Pending Transfers */}
          <button
            type="button"
            onClick={() => { setViewMode('reception'); setSelectedBranch('all'); }}
            className={`p-2.5 rounded-xl border transition-all text-right flex items-center justify-between cursor-pointer ${
              viewMode === 'reception'
                ? 'bg-amber-950/70 border-amber-400 ring-1 ring-amber-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>الاستقبال المعلق (الوارد)</span>
              </div>
              <div className="text-lg font-black font-mono text-white mt-0.5">
                {pendingTransfers.length} <span className="text-xs text-slate-400 font-sans font-normal">إيصال</span>
                {pendingAmount > 0 && (
                  <span className="text-[11px] text-amber-400 font-mono mr-2">
                    ({pendingAmount.toLocaleString()} ج.م)
                  </span>
                )}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              pendingTransfers.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
            }`}>
              {pendingTransfers.length > 0 ? 'بانتظار الاعتماد' : 'نظيف ✨'}
            </span>
          </button>

          {/* 2. Amount Verified Today */}
          <button
            type="button"
            onClick={() => { setViewMode('archive'); setSelectedArchiveStatus('verified'); }}
            className={`p-2.5 rounded-xl border transition-all text-right flex items-center justify-between cursor-pointer ${
              viewMode === 'archive' && selectedArchiveStatus === 'verified'
                ? 'bg-emerald-950/70 border-emerald-400 ring-1 ring-emerald-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>المعتمد اليوم في الأرشيف</span>
              </div>
              <div className="text-lg font-black font-mono text-emerald-300 mt-0.5">
                {verifiedTodayAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                <span className="text-[10px] text-emerald-400 font-sans mr-1">ج.م</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {verifiedTodayTransfers.length} معتمد
            </span>
          </button>

          {/* 3. Rejected Transfers */}
          <button
            type="button"
            onClick={() => { setViewMode('archive'); setSelectedArchiveStatus('rejected'); }}
            className={`p-2.5 rounded-xl border transition-all text-right flex items-center justify-between cursor-pointer ${
              viewMode === 'archive' && selectedArchiveStatus === 'rejected'
                ? 'bg-red-950/70 border-red-400 ring-1 ring-red-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-red-500/50'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>المرفوضات والملاحظات</span>
              </div>
              <div className="text-lg font-black font-mono text-white mt-0.5">
                {rejectedTransfers.length} <span className="text-xs text-slate-400 font-sans font-normal">طلب</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              rejectedTransfers.length > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-400'
            }`}>
              {rejectedTransfers.length > 0 ? 'يحتاج مراجعة' : 'لا يوجد'}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🧭 Integrated Sleek Control Bar (Search + Mode Switcher + Branch Pills) */}
      {/* Maximum space efficiency - Combines search, modes, and filters compactly */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2">
        
        {/* Row 1: Quick Search Input + Primary Mode Switcher Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          
          {/* Smart Search Bar */}
          <div className="relative flex-1">
            <div className="absolute right-3 top-2.5 text-blue-600 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة، أو اسم المعرض/الفرع، أو المبلغ، أو اسم المرسل..."
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl pr-9 pl-9 py-2 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchGlobalScope(false); }}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700 p-0.5 rounded-lg cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Primary View Mode Tabs (استقبال / أرشيف / كل السجلات) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('reception')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'reception'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="صفحة الاستقبال المباشر (تنظف أولاً بأول)"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>الاستقبال</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                viewMode === 'reception' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {pendingTransfers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('archive')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'archive'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="الأرشيف العام والمرحلات"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>الأرشيف</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                viewMode === 'archive' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {archivedTransfers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="السجل المالي الشامل"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكل</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                viewMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {transfers.length}
              </span>
            </button>
          </div>

        </div>

        {/* Row 2: Branch Quick Filter Pills + Archive Sub-Tabs + Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          
          {/* Branch Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar max-w-full">
            <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-1">الفرع:</span>
            
            <button
              type="button"
              onClick={() => setSelectedBranch('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedBranch === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              🌐 كافة الفروع ({branches.length})
            </button>

            {branches.map((b) => {
              const isSelected = selectedBranch === b.id;
              const bCount = transfers.filter((t) => t.branchId === b.id && (viewMode === 'reception' ? t.status === 'pending' : true)).length;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranch(b.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{b.type === 'store' ? '🏪' : '📦'}</span>
                  <span>{b.name}</span>
                  {bCount > 0 && (
                    <span className={`text-[9px] font-mono px-1 rounded ${
                      isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {bCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-Filters: Archive sub-filters or Bulk select */}
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === 'archive' && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedArchiveStatus('all_archived')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    selectedArchiveStatus === 'all_archived' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  الكل ({archivedTransfers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArchiveStatus('verified')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    selectedArchiveStatus === 'verified' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  معتمد ✓ ({verifiedTransfers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArchiveStatus('rejected')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    selectedArchiveStatus === 'rejected' ? 'bg-white text-red-800 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  مرفوض ✗ ({rejectedTransfers.length})
                </button>
              </div>
            )}

            {/* Bulk select for reception */}
            {viewMode === 'reception' && filteredTransfers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllPending}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer bg-blue-50 px-2 py-1 rounded-lg"
                >
                  {selectedIds.length > 0 && selectedIds.length === filteredTransfers.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>تحديد الكل ({filteredTransfers.length})</span>
                </button>

                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkApproveClick}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all text-[11px]"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>اعتماد ({selectedIds.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Global Search Scope alert if user searched */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-600">
              نتائج البحث: {searchResultsGlobal.total} مطابقة 
              ({searchResultsGlobal.pending} معلق · {searchResultsGlobal.verified} معتمد بالأرشيف)
            </span>
            <button
              type="button"
              onClick={() => setSearchGlobalScope(!searchGlobalScope)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                searchGlobalScope ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {searchGlobalScope ? '✓ بحث شامل بكافة الأقسام' : 'بحث بالتبويب الحالي فقط'}
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* PROFESSIONAL VERTICAL CARDS STREAM (تحت بعض بدون أي تمرير أفقي) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        
        {/* Empty State Handler */}
        {filteredTransfers.length === 0 ? (
          searchQuery.trim() ? (
            /* Search Not Found State */
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-3 shadow-2xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Search className="w-7 h-7" />
              </div>
              <div className="font-bold text-slate-800 text-base">
                لم يتم العثور على أي إيصال يطابق: &quot;{searchQuery}&quot;
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                تأكد من كتابة رقم الفاتورة بشكل صحيح أو اسم المعرض/المخزن، أو جرب تفعيل البحث الشامل.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchGlobalScope(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  مسح البحث وعرض كافة الفواتير
                </button>
                {searchResultsGlobal.total > 0 && !searchGlobalScope && (
                  <button
                    type="button"
                    onClick={() => setSearchGlobalScope(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    عرض {searchResultsGlobal.total} نتائج في كافة الأقسام (شامل الأرشيف) 🔍
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'reception' ? (
            /* Clean Reception Inbox Empty State (Requested by user: cleans up item by item) */
            <div className="bg-gradient-to-b from-white to-emerald-50/40 border-2 border-emerald-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                  ✨ صندوق الاستقبال نظيف تماماً ومُخلى أولاً بأول!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  تم اعتماد ومراجعة كافة الفواتير والوصولات الواردة وترحيلها بنجاح إلى الأرشيف العام. بمجرد قيام أي كاشير في الفروع بالتقاط وإرسال وصل جديد سيصلك هنا فوراً للإشعار والاعتماد.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('archive')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Archive className="w-4 h-4" />
                  <span>فتح صفحة الأرشيف والمُرحّلات ({verifiedTransfers.length} معتمد)</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPrintReport}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>طباعة تقرير الأرشيف المالي</span>
                </button>
              </div>
            </div>
          ) : (
            /* Archive or All Empty State */
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-2xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-7 h-7" />
              </div>
              <div className="font-bold text-slate-800 text-base">لا توجد سجلات مطابقة في هذا القسم</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                جرب تغيير خيارات التصفية أو البحث برقم فاتورة آخر.
              </p>
            </div>
          )
        ) : (
          /* Render Movements as Compact Cells / Rows ("نظام خانة" لاستغلال أقصى مساحة ممكنة) */
          filteredTransfers.map((item) => {
            const isPending = item.status === 'pending';
            const isVerified = item.status === 'verified';
            const isRejected = item.status === 'rejected';
            const photos = item.images && item.images.length > 0 ? item.images : [item.screenshotUrl];
            const primaryThumb = photos[0];
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onOpenVerifyModal(item)}
                className={`group bg-white rounded-2xl border transition-all duration-150 shadow-2xs hover:shadow-sm cursor-pointer p-2.5 sm:p-3 flex items-center justify-between gap-2.5 select-none active:scale-[0.99] ${
                  isPending
                    ? 'border-amber-200/90 hover:border-amber-400 bg-amber-50/15'
                    : isVerified
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-red-200 bg-red-50/15'
                } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                title="اضغط لفتح بطاقة المعاملة وتدقيق الصور والاعتماد"
              >
                {/* Right side: Checkbox + Photo Thumbnail + Transaction Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Bulk Select Checkbox (only for pending in reception) */}
                  {isPending && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(item.id);
                      }}
                      className="p-1 -m-1 text-slate-400 hover:text-blue-600 shrink-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Compact Thumbnail with photo count indicator */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage({
                        url: primaryThumb,
                        title: `${item.invoiceNo} - ${item.branchName}`
                      });
                    }}
                    className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 group/thumb shadow-2xs"
                    title="انقر لتكبير صورة الإيصال"
                  >
                    <img 
                      src={primaryThumb} 
                      alt="وصل" 
                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" 
                    />
                    {photos.length > 1 && (
                      <span className="absolute bottom-0 right-0 left-0 bg-black/75 text-[9px] font-mono text-white text-center py-0.2 font-bold backdrop-blur-2xs">
                        {photos.length} 📷
                      </span>
                    )}
                  </div>

                  {/* Core Movement Info ("نظام خانة" مدمج ومنظم) */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {/* Line 1: Sender Name + Branch + Invoice */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[130px] sm:max-w-[180px] flex items-center gap-1">
                        <span className="text-blue-600">👤</span>
                        <span className="truncate">{item.senderName || item.cashierName || 'الفرع'}</span>
                      </span>

                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1 truncate max-w-[110px] sm:max-w-[160px]">
                        <span>{item.branchName.includes('مخزن') ? '📦' : '🏪'}</span>
                        <span className="truncate">{item.branchName}</span>
                      </span>

                      <span className="font-mono font-black text-[11px] sm:text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        #{item.invoiceNo}
                      </span>
                    </div>

                    {/* Line 2: Date & Time + Status / Rejection note */}
                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium">
                      <span className="font-mono text-slate-500 whitespace-nowrap flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}
                        </span>
                        <span>·</span>
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <span>
                          {new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>

                      {item.referenceNo && (
                        <span className="text-[10px] font-mono text-slate-400 hidden lg:inline truncate max-w-[100px]">
                          مرجع: {item.referenceNo}
                        </span>
                      )}

                      {isRejected && item.rejectionReason && (
                        <span className="text-red-600 font-bold truncate max-w-[140px] bg-red-50 px-1 rounded text-[10px]">
                          {item.rejectionReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Left side: Amount + Status Badge + Quick Approve */}
                <div className="flex items-center gap-2 shrink-0 text-left">
                  {/* Amount */}
                  <div className="text-left">
                    {item.amount > 0 ? (
                      <div className="font-mono font-black text-xs sm:text-sm text-emerald-700">
                        {item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        <span className="text-[10px] font-sans text-slate-400 mr-0.5">ج.م</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        راجع الصور
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="hidden xs:block">
                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                        <span>معلق</span>
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <span>✓ معتمد</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <span>✗ مرفوض</span>
                      </span>
                    )}
                  </div>

                  {/* Actions: Quick 1-tap Approve or Open Card */}
                  {isPending ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickApproveWithFeedback(item);
                        }}
                        className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                        title="اعتماد فوري وترحيل للأرشيف بنقرة واحدة"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">اعتماد</span>
                      </button>
                      <div className="p-1 text-slate-400 hover:text-blue-600 rounded-lg group-hover:text-blue-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {onReturnToReception && isVerified && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReturnToReceptionClick(item);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                          title="إعادة المعاملة للاستقبال"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="p-1 text-slate-400 hover:text-blue-600 rounded-lg group-hover:text-blue-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* Quick Rejection Modal with Standard Reasons */}
      {/* ========================================================================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in duration-200 text-right">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <XCircle className="w-5 h-5" />
                <span>تأكيد رفض الإيصال {rejectingItem.invoiceNo}</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">اختر سبب الرفض لإشعار الفرع وترحيله للأرشيف:</label>
              
              {[
                'المبلغ في الإيصال غير مطابق لقيمة الفاتورة المطلوبة',
                'لم يصل إشعار إيداع في الحساب البنكي حتى الآن',
                'الرقم المرجعي غير صحيح أو وهمي',
                'صورة الإيصال غير واضحة أو غير مكتملة الأركان',
                'إيصال مكرر تم استخدامه واعتماده سابقاً',
              ].map((reasonText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectionReason(reasonText)}
                  className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer ${
                    rejectionReason === reasonText
                      ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {reasonText}
                </button>
              ))}

              <div className="pt-1">
                <input
                  type="text"
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="ملاحظة إضافية للكاشير (اختياري)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>تأكيد الرفض والترحيل</span>
              </button>

              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Instant Full-Screen Zoom Lightbox Modal */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <PhotoLightboxModal
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}

    </div>
  );
};
