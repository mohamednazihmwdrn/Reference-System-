import React, { useState, useMemo } from 'react';
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
  X 
} from 'lucide-react';
import { TransferItem, Branch } from '../types';
import { soundManager } from '../utils/audio';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface AccountantDashboardProps {
  transfers: TransferItem[];
  branches: Branch[];
  onOpenVerifyModal: (transfer: TransferItem) => void;
  onQuickApprove: (transferId: string) => void;
  onQuickReject: (transferId: string, reason: string) => void;
  onBulkApprove: (transferIds: string[]) => void;
  onOpenPrintReport: () => void;
  onPrintSingleVoucher: (transfer: TransferItem) => void;
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
}) => {
  // Navigation & Filter State
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'amount'>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Lightbox Zoom state for any image
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Quick Reject Modal state
  const [rejectingItem, setRejectingItem] = useState<TransferItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('المبلغ غير مطابق للفاتورة');
  const [customRejectNote, setCustomRejectNote] = useState<string>('');

  // Multi-selection for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtered & Sorted Transfers
  const filteredTransfers = useMemo(() => {
    return transfers
      .filter((t) => {
        // Status filter
        if (selectedStatus !== 'all' && t.status !== selectedStatus) {
          return false;
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
  }, [transfers, searchQuery, selectedBranch, selectedStatus, sortField, sortAsc]);

  // Overall Financial KPIs
  const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
  const pendingTransfers = transfers.filter((t) => t.status === 'pending');
  const pendingAmount = pendingTransfers.reduce((sum, t) => sum + t.amount, 0);
  const verifiedTransfers = transfers.filter((t) => t.status === 'verified');
  const verifiedAmount = verifiedTransfers.reduce((sum, t) => sum + t.amount, 0);
  const rejectedTransfers = transfers.filter((t) => t.status === 'rejected');

  // Currently selected branch object (if any)
  const activeBranchObj = branches.find((b) => b.id === selectedBranch);

  // Selected branch stats
  const activeBranchTransfers = selectedBranch === 'all' 
    ? transfers 
    : transfers.filter((t) => t.branchId === selectedBranch);
  const activeBranchVerifiedSum = activeBranchTransfers
    .filter((t) => t.status === 'verified')
    .reduce((sum, t) => sum + t.amount, 0);
  const activeBranchPendingCount = activeBranchTransfers.filter((t) => t.status === 'pending').length;

  // Bulk selection handlers
  const handleSelectAllPending = () => {
    const pendingIds = filteredTransfers.filter((t) => t.status === 'pending').map((t) => t.id);
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkApproveClick = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من اعتماد ${selectedIds.length} تحويلات دفعة واحدة؟`)) {
      onBulkApprove(selectedIds);
      setSelectedIds([]);
      soundManager.playSuccess();
    }
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    const finalReason = customRejectNote.trim() 
      ? `${rejectionReason} - ${customRejectNote.trim()}`
      : rejectionReason;
    
    onQuickReject(rejectingItem.id, finalReason);
    soundManager.playReject();
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
      t.status === 'verified' ? 'معتمد' : t.status === 'pending' ? 'معلق' : 'مرفوض',
      `"${new Date(t.createdAt).toLocaleString('ar-EG')}"`,
      `"${t.verifiedBy || ''}"`,
      `"${(t.rejectionReason || t.accountantNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `instapay_export_${selectedBranch}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-4 px-3 sm:px-6 max-w-4xl mx-auto space-y-4 select-none">
      
      {/* Top Banner & Title */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>لوحة الإدارة والمراجعة المالية المعتمدة</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              صندوق استقبال ومراجعة تحويلات الفروع والمخازن ⚡
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              استقبال لحظي لإيصالات إنستا باي، مطابقة المبالغ، والاعتماد الفوري بنظام الكروت الذكية
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenPrintReport}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف المطابقة</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
              title="تصدير كشف إكسيل (CSV)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Financial Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <div className="text-[11px] text-amber-400 font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              <span>بانتظار الاعتماد</span>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {pendingTransfers.length}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {pendingAmount.toLocaleString()} ج.م
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>إجمالي المعتمد</span>
            </div>
            <div className="text-lg font-bold font-mono text-white mt-0.5">
              {verifiedTransfers.length}
            </div>
            <div className="text-[10px] font-mono text-emerald-300">
              {verifiedAmount.toLocaleString()} ج.م
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-2.5">
            <div className="text-[11px] text-slate-300 font-semibold flex items-center justify-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>إجمالي الحركات</span>
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
      {/* 1. Branch Drill-Down Selector Tabs (الرئيسية + كل محل ومخزن على حدة) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Store className="w-4 h-4 text-blue-600" />
            <span>أقسام ومحلات المنظومة (حدد لمراجعة فرع معين):</span>
          </div>
          {selectedBranch !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedBranch('all')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>العودة للرئيسية</span>
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
            <span>🌐 كافة الفروع (الرئيسية)</span>
            {pendingTransfers.length > 0 && (
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
                {bPending > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-amber-200 text-amber-900 font-bold'
                  }`}>
                    {bPending}
                  </span>
                )}
              </button>
            );
          })}

        </div>

        {/* If a specific branch is selected, show its dedicated Spotlight Header */}
        {activeBranchObj && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                {activeBranchObj.type === 'store' ? '🏪' : '📦'}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>أنت الآن تراجع أرشيف: {activeBranchObj.name}</span>
                  <span className="text-[10px] font-mono bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded">
                    {activeBranchObj.code}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  الموقع: {activeBranchObj.city} · مسؤول الإرسال الافتراضي: {activeBranchObj.defaultCashier || 'كاشير الفرع'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-blue-100 text-right">
              <div>
                <span className="text-[10px] text-slate-400 block">معتمد الفرع:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {activeBranchVerifiedSum.toLocaleString()} ج.م
                </span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div>
                <span className="text-[10px] text-slate-400 block">المعلق الآن:</span>
                <span className="font-mono font-bold text-amber-700 text-xs">
                  {activeBranchPendingCount} طلبات
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. Search, Status Filter & Controls Bar */}
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

        {/* Status Filter Chips */}
        <div className="flex items-center justify-between gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto text-xs font-bold">
          
          <button
            onClick={() => setSelectedStatus('all')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({activeBranchTransfers.length})
          </button>

          <button
            onClick={() => setSelectedStatus('pending')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
              selectedStatus === 'pending'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>بانتظار المراجعة</span>
            <span className="font-mono text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full text-[10px]">
              {activeBranchTransfers.filter((t) => t.status === 'pending').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('verified')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
              selectedStatus === 'verified'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>معتمد ✓</span>
            <span className="font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full text-[10px]">
              {activeBranchTransfers.filter((t) => t.status === 'verified').length}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus('rejected')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap text-center flex items-center justify-center gap-1 cursor-pointer ${
              selectedStatus === 'rejected'
                ? 'bg-white text-red-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>مرفوض ✗</span>
            <span className="font-mono text-red-700 bg-red-100 px-1.5 py-0.2 rounded-full text-[10px]">
              {activeBranchTransfers.filter((t) => t.status === 'rejected').length}
            </span>
          </button>

        </div>

        {/* Bulk select tool for pending */}
        {filteredTransfers.some((t) => t.status === 'pending') && (
          <div className="flex items-center justify-between pt-1 text-xs text-slate-600 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSelectAllPending}
              className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredTransfers.filter((t) => t.status === 'pending').length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>تحديد كافة المعلقات للاعتماد الجماعي</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkApproveClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد {selectedIds.length} فواتير معاً</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. Professional Vertical Cards Stream (تحت بعض بدون أي تمرير أفقي) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-2xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-7 h-7" />
            </div>
            <div className="font-bold text-slate-800 text-base">لا توجد تحويلات مسجلة في هذا القسم</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              بمجرد قيام أي كاشير في المحلات أو أمناء المخازن بالتقاط وإرسال صور الفواتير ستصلك هنا فوراً للمراجعة والاعتماد.
            </p>
          </div>
        ) : (
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
                    ? 'border-emerald-200'
                    : 'border-red-200'
                }`}
              >
                {/* Card Top Row: Branch Badge + Time + Status */}
                <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Checkbox for bulk actions */}
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        title="تحديد للاعتماد الجماعي"
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

                  {/* Status Indicator Pill */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>بانتظار الاعتماد</span>
                      </span>
                    )}

                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معتمد ومطابق ✓</span>
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>مرفوض ✗</span>
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
                        <span>تكبير كامل</span>
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
                      <div className="pt-1 border-t border-emerald-200 text-emerald-800 flex items-center justify-between font-semibold">
                        <span>المحاسب المعتمد: {item.verifiedBy || 'المراجع المالي'}</span>
                        <span className="text-emerald-700">تمت مطابقة الحساب البنكي ✓</span>
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

                {/* Card Action Buttons (Thumb-friendly & 1-tap) */}
                <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  
                  {isPending ? (
                    <>
                      {/* Action 1: Instant 1-tap Approve */}
                      <button
                        type="button"
                        onClick={() => {
                          onQuickApprove(item.id);
                          soundManager.playSuccess();
                        }}
                        className="flex-1 min-w-[120px] h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اعتماد فوري ✓</span>
                      </button>

                      {/* Action 2: Deep Inspection Modal */}
                      <button
                        type="button"
                        onClick={() => onOpenVerifyModal(item)}
                        className="flex-1 min-w-[110px] h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-98 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>تدقيق وتعديل</span>
                      </button>

                      {/* Action 3: Reject button */}
                      <button
                        type="button"
                        onClick={() => setRejectingItem(item)}
                        className="h-11 px-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-1 active:scale-98 transition-all cursor-pointer"
                        title="رفض الإيصال"
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
                    <>
                      <div className="flex items-center gap-2">
                        {isVerified && (
                          <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>معاملة معتمدة وجاهزة للتسليم</span>
                          </div>
                        )}
                        {isRejected && (
                          <div className="text-xs text-red-800 font-bold flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span>إيصال مرفوض وتم إشعار الفرع</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mr-auto">
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
              <label className="font-bold text-slate-700 block">اختر سبب الرفض لإشعار الفرع فوراً:</label>
              
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
                <span>تأكيد الرفض وإرساله للفرع</span>
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
