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

  // Filtered & Sorted Transfers based on current viewMode
  const filteredTransfers = useMemo(() => {
    return transfers
      .filter((t) => {
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

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchInvoice = t.invoiceNo.toLowerCase().includes(q);
          const matchBranch = t.branchName.toLowerCase().includes(q);
          const matchRef = t.referenceNo ? t.referenceNo.toLowerCase().includes(q) : false;
          const matchSender = t.senderName ? t.senderName.toLowerCase().includes(q) : false;
          const matchAmount = t.amount.toString().includes(q);
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
  }, [transfers, viewMode, selectedArchiveStatus, selectedStatus, selectedBranch, searchQuery, sortField, sortAsc]);

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
    <div className="space-y-4 pb-36 sm:pb-44 select-none animate-in fade-in duration-150">
      
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
        {/* Real-Time Stats Summary Card (Request 8) */}
        {/* Shows: 1. Number of pending transfers */}
        {/*        2. Total amount verified today */}
        {/*        3. Number of rejected transfers */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black tracking-wide text-slate-200">
                المؤشرات اللحظية والمطابقة المباشرة (Real-Time Summary)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                اليوم: {todayDateStr}
              </span>
              {onClearAllTransfers && transfers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل أنت متأكد من تنظيف وتفريغ كافة الحركات والوصولات نهائياً لبدء العمل الفعلي على نظافة؟')) {
                      onClearAllTransfers();
                    }
                  }}
                  className="text-[10px] text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-700/60 px-2 py-0.5 rounded-full font-bold cursor-pointer transition-colors"
                  title="تصفير وتنظيف الحركات لبدء العمل الفعلي"
                >
                  تصفير السجلات 🧹
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-right">
            {/* 1. Number of pending transfers */}
            <div
              onClick={() => setViewMode('reception')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                viewMode === 'reception'
                  ? 'bg-amber-950/60 border-amber-400 ring-1 ring-amber-400/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>التحويلات المعلقة</span>
                </div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {pendingTransfers.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {pendingTransfers.length === 0 ? '✨ لا توجد معلقات (نظيف)' : 'بانتظار الاعتماد بالاستقبال'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono text-amber-400 font-bold text-sm">
                {pendingTransfers.length}
              </div>
            </div>

            {/* 2. Total amount verified today */}
            <div
              onClick={() => { setViewMode('archive'); setSelectedArchiveStatus('verified'); }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                viewMode === 'archive' && selectedArchiveStatus === 'verified'
                  ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>المبلغ المعتمد اليوم</span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-1">
                  {verifiedTodayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-[10px] text-emerald-400 font-sans mr-1">ج.م</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {verifiedTodayTransfers.length} إيصال معتمد ومرحل اليوم
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            {/* 3. Number of rejected transfers */}
            <div
              onClick={() => { setViewMode('archive'); setSelectedArchiveStatus('rejected'); }}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                viewMode === 'archive' && selectedArchiveStatus === 'rejected'
                  ? 'bg-red-950/60 border-red-400 ring-1 ring-red-400/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-red-500/50'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>التحويلات المرفوضة</span>
                </div>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {rejectedTransfers.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {rejectedTransfers.length === 0 ? 'لا توجد تحويلات مرفوضة' : 'مرفوضة وتحتاج تعديل'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center font-mono text-red-400 font-bold text-sm">
                {rejectedTransfers.length}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Quick Counters */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div 
            onClick={() => setViewMode('reception')}
            className={`rounded-xl p-2.5 cursor-pointer transition-all ${
              viewMode === 'reception' ? 'bg-amber-950/80 ring-2 ring-amber-400' : 'bg-slate-800/60 hover:bg-slate-800'
            }`}
          >
            <div className="text-[11px] text-amber-400 font-bold flex items-center justify-center gap-1">
              <Inbox className="w-3.5 h-3.5" />
              <span>بانتظار الاعتماد (الاستقبال)</span>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {pendingTransfers.length}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {pendingAmount.toLocaleString()} ج.م
            </div>
          </div>

          <div 
            onClick={() => setViewMode('archive')}
            className={`rounded-xl p-2.5 cursor-pointer transition-all ${
              viewMode === 'archive' ? 'bg-emerald-950/80 ring-2 ring-emerald-400' : 'bg-slate-800/60 hover:bg-slate-800'
            }`}
          >
            <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
              <Archive className="w-3.5 h-3.5" />
              <span>المعتمد والمُرحّل للأرشيف</span>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {verifiedTransfers.length}
            </div>
            <div className="text-[10px] font-mono text-emerald-300">
              {verifiedAmount.toLocaleString()} ج.م
            </div>
          </div>

          <div 
            onClick={() => setViewMode('all')}
            className={`rounded-xl p-2.5 cursor-pointer transition-all ${
              viewMode === 'all' ? 'bg-blue-950/80 ring-2 ring-blue-400' : 'bg-slate-800/60 hover:bg-slate-800'
            }`}
          >
            <div className="text-[11px] text-slate-300 font-bold flex items-center justify-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>إجمالي السجلات</span>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {transfers.length}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {totalAmount.toLocaleString()} ج.م
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY AUDITOR MODE SWITCHER (الاستقبال vs الأرشيف والتقارير) */}
      {/* Requested explicitly: Reception clears immediately upon approval */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-2 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          
          {/* 1. Reception Mode Button (ينظف أولاً بأول) */}
          <button
            type="button"
            onClick={() => setViewMode('reception')}
            className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              viewMode === 'reception'
                ? 'bg-gradient-to-l from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <Inbox className="w-4 h-4" />
                <span>📥 صفحة الاستقبال المباشر</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                viewMode === 'reception'
                  ? 'bg-white text-amber-900'
                  : pendingTransfers.length > 0
                  ? 'bg-amber-100 text-amber-900 animate-pulse'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {pendingTransfers.length} وارد معلق
              </span>
            </div>
            <div className={`text-[11px] font-medium leading-relaxed ${viewMode === 'reception' ? 'text-amber-50' : 'text-slate-500'}`}>
              تنظف أولاً بأول · يُرحّل كل وصل فوراً للأرشيف ويُخلى مكانه من هنا عند الاعتماد
            </div>
          </button>

          {/* 2. Archive & Reports Mode Button (المعتمد والمرحل) */}
          <button
            type="button"
            onClick={() => setViewMode('archive')}
            className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              viewMode === 'archive'
                ? 'bg-gradient-to-l from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <Archive className="w-4 h-4" />
                <span>🗄️ الأرشيف العام والتقارير</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                viewMode === 'archive'
                  ? 'bg-white text-emerald-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {archivedTransfers.length} وصل مؤرشف
              </span>
            </div>
            <div className={`text-[11px] font-medium leading-relaxed ${viewMode === 'archive' ? 'text-emerald-50' : 'text-slate-500'}`}>
              كافة الفواتير المعتمدة والمرحلة مع إمكانية طباعة الأرشيف كاملاً أو طباعة كل وصل
            </div>
          </button>

          {/* 3. Master Full Log (السجل الشامل) */}
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
              viewMode === 'all'
                ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20 ring-2 ring-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <Layers className="w-4 h-4" />
                <span>📋 كشف الحركات الشامل</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                viewMode === 'all' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {transfers.length} سجل
              </span>
            </div>
            <div className={`text-[11px] font-medium leading-relaxed ${viewMode === 'all' ? 'text-slate-200' : 'text-slate-500'}`}>
              عرض شامل لكافة الفواتير بجميع الحالات وتدقيق القيود التاريخية
            </div>
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* Branch Drill-Down Selector Pills (الرئيسية + كل محل ومخزن على حدة) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Store className="w-4 h-4 text-blue-600" />
            <span>تصفية بحسب المحل أو المخزن المرسل:</span>
          </div>
          {selectedBranch !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedBranch('all')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>عرض كافة الفروع</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable / Wrap Branch Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          
          {/* Master Stream Button (الرئيسية - كافة المحلات والمخازن) */}
          <button
            type="button"
            onClick={() => setSelectedBranch('all')}
            className={`px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              selectedBranch === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>🌐 كافة الفروع والمخازن</span>
            {viewMode === 'reception' && pendingTransfers.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                selectedBranch === 'all' ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-amber-200 text-amber-900 font-bold'
              }`}>
                {pendingTransfers.length} معلق
              </span>
            )}
          </button>

          {/* Individual Stores & Warehouses */}
          {branches.map((b) => {
            const bPending = transfers.filter((t) => t.branchId === b.id && t.status === 'pending').length;
            const bVerified = transfers.filter((t) => t.branchId === b.id && t.status === 'verified').length;
            const isSelected = selectedBranch === b.id;
            const isStore = b.type === 'store';

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranch(b.id)}
                className={`px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{isStore ? '🏪' : '📦'}</span>
                <span>{b.name}</span>
                {viewMode === 'reception' && bPending > 0 ? (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-amber-200 text-amber-900 font-bold'
                  }`}>
                    {bPending}
                  </span>
                ) : viewMode === 'archive' && bVerified > 0 ? (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-emerald-400 text-slate-900 font-bold' : 'bg-emerald-100 text-emerald-900 font-bold'
                  }`}>
                    {bVerified}
                  </span>
                ) : null}
              </button>
            );
          })}

        </div>

        {/* Spotlight Banner when a specific branch is selected */}
        {activeBranchObj && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                {activeBranchObj.type === 'store' ? '🏪' : '📦'}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>أنت الآن تراجع: {activeBranchObj.name}</span>
                  <span className="text-[10px] font-mono bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded">
                    {activeBranchObj.code}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  النوع: {activeBranchObj.type === 'store' ? 'محل تجاري' : 'مخزن بضائع'} · مسؤول الفرع: {activeBranchObj.defaultCashier || 'كاشير الفرع'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-blue-100 text-right">
              <div>
                <span className="text-[10px] text-slate-400 block">المعتمد في الأرشيف:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {activeBranchVerifiedSum.toLocaleString()} ج.م
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div>
                <span className="text-[10px] text-slate-400 block">المعلق بالاستقبال:</span>
                <span className="font-mono font-bold text-amber-700 text-xs">
                  {activeBranchPendingTransfers.length} طلبات
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* Search Bar & Mode-specific Sub-Filters */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-2xs space-y-3">
        
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة، المحل، المبلغ، أو اسم الراسل..."
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

        {/* Contextual Sub-filters based on viewMode */}
        {viewMode === 'reception' && (
          <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200/80 px-3.5 py-2.5 rounded-2xl text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>صندوق الوارد المباشر (المعلق): يعرض الفواتير الجديدة بانتظار الاعتماد والترحيل للأرشيف</span>
            </div>
            <span className="font-mono font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full text-xs">
              {filteredTransfers.length} إيصال
            </span>
          </div>
        )}

        {viewMode === 'archive' && (
          <div className="flex items-center justify-between gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setSelectedArchiveStatus('all_archived')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
                selectedArchiveStatus === 'all_archived'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة الأرشيف ({archivedTransfers.length})
            </button>

            <button
              onClick={() => setSelectedArchiveStatus('verified')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
                selectedArchiveStatus === 'verified'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المعتمد في الأرشيف ✓</span>
              <span className="font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full text-[10px]">
                {verifiedTransfers.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedArchiveStatus('rejected')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
                selectedArchiveStatus === 'rejected'
                  ? 'bg-white text-red-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المرفوض ✗</span>
              <span className="font-mono text-red-700 bg-red-100 px-1.5 py-0.2 rounded-full text-[10px]">
                {rejectedTransfers.length}
              </span>
            </button>
          </div>
        )}

        {viewMode === 'all' && (
          <div className="flex items-center justify-between gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
                selectedStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({transfers.length})
            </button>

            <button
              onClick={() => setSelectedStatus('pending')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
                selectedStatus === 'pending' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المعلق ({pendingTransfers.length})
            </button>

            <button
              onClick={() => setSelectedStatus('verified')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
                selectedStatus === 'verified' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المعتمد ({verifiedTransfers.length})
            </button>

            <button
              onClick={() => setSelectedStatus('rejected')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
                selectedStatus === 'rejected' ? 'bg-white text-red-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              المرفوض ({rejectedTransfers.length})
            </button>
          </div>
        )}

        {/* Bulk select tool for pending items in reception */}
        {viewMode === 'reception' && filteredTransfers.length > 0 && (
          <div className="flex items-center justify-between pt-1 text-xs text-slate-600 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSelectAllPending}
              className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredTransfers.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>تحديد كافة المعلقات للاعتماد والترحيل الجماعي</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkApproveClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد وترحيل {selectedIds.length} فواتير معاً للأرشيف</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* PROFESSIONAL VERTICAL CARDS STREAM (تحت بعض بدون أي تمرير أفقي) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        
        {/* Empty State Handler */}
        {filteredTransfers.length === 0 ? (
          viewMode === 'reception' ? (
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
          /* Render Cards Vertically */
          filteredTransfers.map((item) => {
            const isPending = item.status === 'pending';
            const isVerified = item.status === 'verified';
            const isRejected = item.status === 'rejected';
            const photos = item.images && item.images.length > 0 ? item.images : [item.screenshotUrl];
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-100/60'
                    : isVerified
                    ? 'border-emerald-200 hover:border-emerald-300'
                    : 'border-red-200'
                }`}
              >
                {/* Card Top Header: Branch Badge + Time + Status */}
                <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Checkbox for bulk actions (only for pending) */}
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        title="تحديد للاعتماد والترحيل الجماعي"
                      />
                    )}

                    {/* Sender Branch Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 border border-slate-200">
                      <span>{item.branchName.includes('مخزن') ? '📦' : '🏪'}</span>
                      <span>{item.branchName}</span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Status Indicator Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>بانتظار الاعتماد والترحيل</span>
                      </span>
                    )}

                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معتمد ومُرحّل للأرشيف ✓</span>
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>مرفوض ومؤرشف ✗</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="p-4 space-y-3.5">
                  
                  {/* Row: Invoice Code & Amount in EGP */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">كود الطلب / الفاتورة:</span>
                      <span className="text-base font-mono font-black text-slate-900">{item.invoiceNo}</span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 font-semibold block">المبلغ المعتمد:</span>
                      {item.amount > 0 ? (
                        <div className="text-xl font-mono font-black text-emerald-700">
                          {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className="text-xs font-sans font-bold text-slate-500 mr-1">ج.م</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          المبلغ داخل الصور المرفقة
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dual Photo Gallery: Click to Zoom High Resolution */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>الصور المرفقة بالعملية ({photos.length} صور) - انقر على أي صورة لتكبيرها:</span>
                      <span className="text-blue-600 flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>تكبير كامل بملء الشاشة</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {photos.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImage({
                            url: imgSrc,
                            title: `${item.invoiceNo} - ${idx === 0 ? 'صورة الفاتورة' : 'صورة إيصال إنستاباي'} (${item.branchName})`
                          })}
                          className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-blue-500 bg-black aspect-[4/5] shadow-xs cursor-pointer transition-all"
                        >
                          <img
                            src={imgSrc}
                            alt="receipt"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />

                          {/* Hover/Tap Zoom badge */}
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="bg-white/95 text-slate-900 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1 text-xs font-bold">
                              <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                              <span>تكبير</span>
                            </div>
                          </div>

                          <div className="absolute top-1.5 right-1.5 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-xs">
                            {idx === 0 ? 'الفاتورة' : 'إيصال إنستاباي'}
                          </div>

                          <div className="absolute bottom-1 right-1 left-1 bg-black/70 text-white text-[10px] text-center py-0.5 rounded-lg backdrop-blur-xs truncate">
                            🔍 اضغط للتكبير
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transfer Details Grid */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">الرقم المرجعي (Ref):</span>
                      <span className="font-mono font-bold text-slate-800">
                        {item.referenceNo || 'بدون رقم مرجعي'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">اسم الراسل / العميل:</span>
                      <span className="font-semibold text-slate-800">
                        {item.senderName || 'غير مسجل (في الإيصال)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">مسؤول الإرسال (الكاشير):</span>
                      <span className="font-semibold text-slate-700">
                        {item.cashierName || 'كاشير الفرع'}
                      </span>
                    </div>

                    {item.cashierNote && (
                      <div className="pt-1 border-t border-slate-200 text-slate-700">
                        <span className="font-bold text-slate-500">ملاحظة الكاشير: </span>
                        <span>{item.cashierNote}</span>
                      </div>
                    )}

                    {isVerified && (
                      <div className="pt-1 border-t border-emerald-200 text-emerald-800 flex flex-wrap items-center justify-between gap-1 font-semibold">
                        <span>المحاسب المعتمد: {item.verifiedBy || 'المراجع المالي'}</span>
                        <span className="text-emerald-700 text-[11px] font-mono">
                          مُرحّل للأرشيف بتاريخ: {item.verifiedAt ? new Date(item.verifiedAt).toLocaleDateString('ar-EG') : 'اليوم'}
                        </span>
                      </div>
                    )}

                    {isRejected && item.rejectionReason && (
                      <div className="pt-1.5 border-t border-red-200 text-red-700">
                        <span className="font-bold">سبب الرفض المسجل: </span>
                        <span>{item.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Card Action Buttons */}
                <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  
                  {isPending ? (
                    <>
                      {/* Action 1: Instant 1-tap Approve & Archive (Clears reception immediately) */}
                      <button
                        type="button"
                        onClick={() => handleQuickApproveWithFeedback(item)}
                        className="flex-1 min-w-[140px] h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                        title="اعتماد الوصل فوراً وترحيله للأرشيف وإخلاء مكانه من الاستقبال"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اعتماد وترحيل للأرشيف ✓</span>
                      </button>

                      {/* Action 2: Deep Inspection Modal */}
                      <button
                        type="button"
                        onClick={() => onOpenVerifyModal(item)}
                        className="min-w-[110px] h-11 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-98 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>تدقيق وتعديل</span>
                      </button>

                      {/* Action 3: Reject button */}
                      <button
                        type="button"
                        onClick={() => setRejectingItem(item)}
                        className="h-11 px-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer"
                        title="رفض الإيصال وترحيله للمرفوضات"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض</span>
                      </button>

                      {/* Action 4: Print Voucher */}
                      <button
                        type="button"
                        onClick={() => onPrintSingleVoucher(item)}
                        className="h-11 px-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer"
                        title="طباعة سند حركة فردي"
                      >
                        <Printer className="w-4 h-4" />
                        <span>سند</span>
                      </button>
                    </>
                  ) : (
                    /* Archived Item Controls */
                    <>
                      <div className="flex items-center gap-2">
                        {isVerified && (
                          <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>معاملة مؤرشفة ومعتمدة رسمياً</span>
                          </div>
                        )}
                        {isRejected && (
                          <div className="text-xs text-red-800 font-bold flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span>إيصال مرفوض في الأرشيف</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mr-auto">
                        {/* Option to un-archive back to reception if needed */}
                        {onReturnToReception && (
                          <button
                            type="button"
                            onClick={() => handleReturnToReceptionClick(item)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="إلغاء الترحيل وإعادة هذا الوصل إلى صندوق الاستقبال"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>إعادة للاستقبال</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenVerifyModal(item)}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          عرض التدقيق
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintSingleVoucher(item)}
                          className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة السند</span>
                        </button>
                      </div>
                    </>
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
