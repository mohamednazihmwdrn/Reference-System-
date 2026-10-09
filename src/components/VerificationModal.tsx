import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Eye, 
  Check, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  Calendar,
  DollarSign,
  Hash,
  User,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Contrast,
  RotateCcw,
  Layers,
  Receipt,
  Smartphone,
  SplitSquareVertical,
  Printer,
  Undo2,
  Trash2
} from 'lucide-react';
import { TransferItem } from '../types';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { soundManager } from '../utils/audio';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface VerificationModalProps {
  transfer: TransferItem | null;
  allPendingTransfers: TransferItem[];
  isOpen: boolean;
  onClose: () => void;
  onApprove: (transferId: string, notes?: string, confirmedAmount?: number, confirmedInvoice?: string) => void;
  onReject: (transferId: string, reason: string, notes?: string) => void;
  onNavigate: (transfer: TransferItem) => void;
  onPrintVoucher?: (transfer: TransferItem) => void;
  onReturnToReception?: (transferId: string) => void;
  onDeleteTransfer?: (transferId: string) => void;
  isAuditor?: boolean;
}

const COMMON_REJECTION_REASONS = [
  'المبلغ المحول في الإيصال أقل من قيمة الفاتورة المطلوبة',
  'الإيصال مكرر ومسجل مسبقاً في عملية أخرى',
  'لم يرد أي قيد أو إيداع مطابق في الحساب البنكي حتى الآن',
  'صورة الإيصال غير واضحة أو مقصوصة (التاريخ أو الرقم المرجعي غير ظاهر)',
  'تاريخ التحويل قديم ولا يخص حركة اليوم',
  'تم إرسال إيصال لمصرف أو حساب مختلف عن حسابات الشركة',
];

export const VerificationModal: React.FC<VerificationModalProps> = ({
  transfer,
  allPendingTransfers,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onNavigate,
  onPrintVoucher,
  onReturnToReception,
  onDeleteTransfer,
  isAuditor = true,
}) => {
  // All hooks must be top-level unconditional
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [splitView, setSplitView] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [inverted, setInverted] = useState<boolean>(false);
  const [fullLightboxImage, setFullLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Accountant confirmed amount & invoice if cashier didn't type them
  const [inputAmount, setInputAmount] = useState<string>('');
  const [inputInvoice, setInputInvoice] = useState<string>('');

  // Accountant notes & rejection
  const [accountantNotes, setAccountantNotes] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  // Checklist states
  const [chkAmount, setChkAmount] = useState<boolean>(false);
  const [chkRef, setChkRef] = useState<boolean>(false);
  const [chkBank, setChkBank] = useState<boolean>(false);

  // Reset transforms when navigating between transfers
  useEffect(() => {
    if (!transfer) return;
    setActivePhotoIndex(0);
    setSplitView(false);
    setZoomLevel(1);
    setRotation(0);
    setInverted(false);
    setShowRejectForm(false);
    setAccountantNotes('');
    setChkAmount(false);
    setChkRef(false);
    setChkBank(false);
    setInputAmount(transfer.amount > 0 ? transfer.amount.toString() : '');
    setInputInvoice(transfer.invoiceNo || '');
  }, [transfer?.id]);

  if (!isOpen || !transfer) return null;

  const photos = (transfer.images && transfer.images.length > 0) 
    ? transfer.images 
    : [transfer.screenshotUrl];

  const currentPhoto = photos[activePhotoIndex] || photos[0];

  const currentIndex = allPendingTransfers.findIndex((t) => t.id === transfer.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allPendingTransfers.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigate(allPendingTransfers[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigate(allPendingTransfers[currentIndex + 1]);
  };

  const handleApproveClick = () => {
    const parsedAmt = parseFloat(inputAmount);
    const finalAmount = !isNaN(parsedAmt) && parsedAmt > 0 ? parsedAmt : transfer.amount;
    const finalInvoice = inputInvoice.trim() ? inputInvoice.trim() : transfer.invoiceNo;

    onApprove(transfer.id, accountantNotes, finalAmount, finalInvoice);
    soundManager.playSuccess();
    if (hasNext) {
      handleNext();
    } else {
      onClose();
    }
  };

  const handleRejectClick = () => {
    const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
    if (!finalReason) {
      alert('يرجى تحديد سبب الرفض');
      return;
    }
    onReject(transfer.id, finalReason, accountantNotes);
    soundManager.playReject();
    if (hasNext) {
      handleNext();
    } else {
      onClose();
    }
  };

  const displayAmount = parseFloat(inputAmount) || transfer.amount || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-1 sm:p-4 overflow-hidden">
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[92vh] flex flex-col overflow-hidden border border-slate-700">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">فحص ومطابقة الصور</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm">
                  {transfer.invoiceNo}
                </span>
                <span className="text-[11px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  {photos.length} صور
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-md">
                {transfer.branchName} · {new Date(transfer.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Queue Navigation & Close */}
          <div className="flex items-center gap-1.5">
            {allPendingTransfers.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className={`p-1 rounded hover:bg-slate-700 ${!hasPrev ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="الطلب السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-1.5 font-mono text-[11px]">
                  {currentIndex + 1} / {allPendingTransfers.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className={`p-1 rounded hover:bg-slate-700 ${!hasNext ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="الطلب التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split view (Image inspection on right / Details on left) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">
          
          {/* Main Inspection Canvas (Col 8) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-slate-950 border-l border-slate-800 relative overflow-hidden">
            
            {/* Top Photo Switcher Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
              
              {/* Photo Selector Tabs */}
              <div className="flex items-center gap-1.5">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActivePhotoIndex(idx);
                      setSplitView(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      !splitView && activePhotoIndex === idx
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {idx === 0 ? <Receipt className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                    <span>{idx === 0 ? 'صورة 1 (الفاتورة)' : idx === 1 ? 'صورة 2 (إنستاباي)' : `صورة ${idx + 1}`}</span>
                  </button>
                ))}

                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSplitView(!splitView)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                      splitView
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                    title="عرض الصورتين معاً جنباً إلى جنب"
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">معاينة الصورتين معاً</span>
                  </button>
                )}
              </div>

              {/* Image Controls */}
              <div className="flex items-center gap-1 text-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 3.5))}
                  className="p-1 rounded hover:bg-slate-800 hover:text-white"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.6))}
                  className="p-1 rounded hover:bg-slate-800 hover:text-white"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded hover:bg-slate-800 hover:text-white"
                  title="تدوير"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setInverted((inv) => !inv)}
                  className={`p-1 rounded ${inverted ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800'}`}
                  title="عكس الألوان لكشف الخطوط المعدلة بالفوتوشوب"
                >
                  <Contrast className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                    setInverted(false);
                  }}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400"
                  title="إعادة ضبط"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <a
                  href={currentPhoto}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded hover:bg-slate-800 text-blue-400"
                  title="فتح في نافذة جديدة"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

            </div>

            {/* Canvas: Single zoomed photo OR side-by-side split */}
            <div className="flex-1 overflow-auto p-3 flex items-center justify-center relative select-none">
              
              {/* Floating Full-Screen Trigger Badge */}
              <button
                type="button"
                onClick={() => setFullLightboxImage({
                  url: currentPhoto,
                  title: `${transfer.invoiceNo} - ${transfer.branchName}`
                })}
                className="absolute top-3 right-3 z-20 bg-black/80 hover:bg-black text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="فتح الصورة بملء الشاشة بالكامل"
              >
                <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold">فتح بملء الشاشة بالكامل 🔍</span>
              </button>

              {splitView && photos.length >= 2 ? (
                <div className="grid grid-cols-2 gap-3 w-full h-full max-h-[70vh]">
                  <div 
                    onClick={() => setFullLightboxImage({
                      url: photos[0],
                      title: `${transfer.invoiceNo} - صورة 1: الفاتورة الورقية (${transfer.branchName})`
                    })}
                    className="bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center border border-slate-800 cursor-pointer hover:border-blue-500 transition-colors group relative"
                    title="انقر لفتح الفاتورة بملء الشاشة"
                  >
                    <span className="text-[10px] text-slate-400 font-bold mb-1">صورة 1: الفاتورة الورقية (انقر للتكبير)</span>
                    <img
                      src={photos[0]}
                      alt="Invoice"
                      className="max-h-[60vh] max-w-full object-contain rounded group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div 
                    onClick={() => setFullLightboxImage({
                      url: photos[1],
                      title: `${transfer.invoiceNo} - صورة 2: إيصال إنستا باي (${transfer.branchName})`
                    })}
                    className="bg-slate-900 rounded-xl p-2 flex flex-col items-center justify-center border border-slate-800 cursor-pointer hover:border-blue-500 transition-colors group relative"
                    title="انقر لفتح إيصال إنستاباي بملء الشاشة"
                  >
                    <span className="text-[10px] text-emerald-400 font-bold mb-1">صورة 2: إيصال إنستا باي (انقر للتكبير)</span>
                    <img
                      src={photos[1]}
                      alt="InstaPay"
                      className="max-h-[60vh] max-w-full object-contain rounded group-hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setFullLightboxImage({
                    url: currentPhoto,
                    title: `${transfer.invoiceNo} - صورة ${activePhotoIndex + 1} (${transfer.branchName})`
                  })}
                  className="transition-transform duration-150 ease-out origin-center cursor-pointer group"
                  title="انقر لفتح الصورة بملء الشاشة بالكامل"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    filter: inverted ? 'invert(1) hue-rotate(180deg) contrast(1.2)' : 'none',
                  }}
                >
                  <img
                    src={currentPhoto}
                    alt={`Photo ${activePhotoIndex + 1}`}
                    className="max-h-[70vh] sm:max-h-[75vh] max-w-full rounded-lg shadow-2xl object-contain group-hover:opacity-95 transition-opacity"
                  />
                </div>
              )}
            </div>

            {/* Invert indicator */}
            {inverted && (
              <div className="absolute bottom-2 left-3 bg-amber-950/90 text-amber-300 text-xs px-2.5 py-1 rounded shadow pointer-events-none">
                وضع فحص التزوير نشط (عكس الألوان)
              </div>
            )}
          </div>

          {/* Side Verification Pane (Col 4) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white flex flex-col h-full overflow-y-auto p-4 text-slate-800">
            
            {/* Amount from Photo input (Accountant can verify or edit) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">المبلغ المقروء من الصور (ج.م):</label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  تأكيد المحاسب
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="أدخل المبلغ المقروء في الإيصال (مثال: 2450)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">ج.م</span>
              </div>

              {displayAmount > 0 && (
                <div className="text-[11px] text-emerald-800 font-medium bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                  {numberToArabicWords(displayAmount)}
                </div>
              )}
            </div>

            {/* Invoice tracking code */}
            <div className="space-y-2 text-xs border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">كود / رقم الفاتورة:</span>
                <input
                  type="text"
                  value={inputInvoice}
                  onChange={(e) => setInputInvoice(e.target.value)}
                  className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-left text-xs w-36"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">المخزن / الفرع:</span>
                <span className="font-bold text-slate-900">{transfer.branchName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">عدد الصور المرفقة:</span>
                <span className="font-bold text-slate-900 font-mono">{photos.length} صور</span>
              </div>

              {transfer.cashierNote && (
                <div className="bg-amber-50 text-amber-900 p-2 rounded-lg border border-amber-200">
                  <span className="font-bold">ملاحظة الكاشير: </span>
                  <span>{transfer.cashierNote}</span>
                </div>
              )}
            </div>

            {/* Fast Accountant Checklist */}
            <div className="mb-3 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chkAmount}
                  onChange={(e) => setChkAmount(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>مبلغ الفاتورة يطابق إيصال إنستا باي</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chkRef}
                  onChange={(e) => setChkRef(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>تاريخ وتوقيت التحويل لحظي ومطابق لحركة اليوم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chkBank}
                  onChange={(e) => setChkBank(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>تم التأكد من قيد التحويل بالحساب البنكي</span>
              </label>
            </div>

            {/* Rejection Form Box if active */}
            {showRejectForm ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs font-bold text-red-900">
                  <span>تأكيد رفض الإيصال</span>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="text-slate-500 hover:text-slate-800 text-xs"
                  >
                    إلغاء
                  </button>
                </div>

                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full bg-white border border-red-300 text-slate-900 rounded-lg p-2 text-xs"
                >
                  {COMMON_REJECTION_REASONS.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="سبب مخصص إضافي إن وجد..."
                  className="w-full bg-white border border-red-300 text-slate-900 rounded-lg p-1.5 text-xs"
                />

                <button
                  type="button"
                  onClick={handleRejectClick}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs"
                >
                  تأكيد الرفض وإشعار الفرع فوراً
                </button>
              </div>
            ) : null}

            {/* Action Buttons based on Transfer Status & Role */}
            <div className="mt-auto pt-2 border-t border-slate-100 space-y-2">
              {!isAuditor ? (
                /* Non-Auditor (Cashier / Warehouse) Read-Only Card */
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-slate-700 text-xs text-center space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5 text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>صلاحية العرض والمتابعة فقط</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    الاعتماد والرفض وإدارة الحسابات مقتصرة بالكامل على المراجع المالي فقط.
                  </p>
                </div>
              ) : transfer.status === 'verified' ? (
                /* Verified Transfer Actions */
                <div className="space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-900 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>معاملة معتمدة ومرحلة للأرشيف ✓</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>المعتمد: <b>{transfer.verifiedBy || 'المراجع المالي'}</b></span>
                      {transfer.verifiedAt && (
                        <span>التاريخ: {new Date(transfer.verifiedAt).toLocaleString('ar-EG')}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {onPrintVoucher && (
                      <button
                        type="button"
                        onClick={() => onPrintVoucher(transfer)}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        title="طباعة سند تحويل رسمي منفرد"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة السند</span>
                      </button>
                    )}

                    {onReturnToReception && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('هل تريد إلغاء الاعتماد وإعادة المعاملة إلى صندوق الاستقبال المباشر؟')) {
                            onReturnToReception(transfer.id);
                            onClose();
                          }
                        }}
                        className="w-full bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="إلغاء الاعتماد وإعادة الحركة للاستقبال"
                      >
                        <Undo2 className="w-4 h-4 text-amber-600" />
                        <span>إعادة للاستقبال</span>
                      </button>
                    )}
                  </div>

                  {onDeleteTransfer && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف هذه المعاملة (فاتورة: ${transfer.invoiceNo || 'غير محدد'}) نهائياً؟\nاستخدم هذا الخيار في حال تم إرسال الإيصال بالخطأ.`)) {
                          onDeleteTransfer(transfer.id);
                          onClose();
                        }
                      }}
                      className="w-full bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold py-2 px-3 rounded-xl text-xs border border-red-200 hover:border-red-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="حذف العملية نهائياً إذا كانت مرسلة بالخطأ"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>حذف العملية (أُرسلت بالخطأ)</span>
                    </button>
                  )}
                </div>
              ) : transfer.status === 'rejected' ? (
                /* Rejected Transfer Actions */
                <div className="space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-red-900 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>معاملة مرفوضة ✗</span>
                    </div>
                    <div className="text-[11px] text-red-700 mt-1">
                      السبب: <b>{transfer.rejectionReason || 'غير محدد'}</b>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApproveClick}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>تغيير الحالة إلى معتمد وترحيل للأرشيف</span>
                  </button>

                  {onDeleteTransfer && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف هذه المعاملة (فاتورة: ${transfer.invoiceNo || 'غير محدد'}) نهائياً؟\nاستخدم هذا الخيار في حال تم إرسال الإيصال بالخطأ.`)) {
                          onDeleteTransfer(transfer.id);
                          onClose();
                        }
                      }}
                      className="w-full bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold py-2 px-3 rounded-xl text-xs border border-red-200 hover:border-red-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="حذف العملية نهائياً إذا كانت مرسلة بالخطأ"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>حذف العملية (أُرسلت بالخطأ)</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Pending Transfer Actions */
                <>
                  <button
                    type="button"
                    onClick={handleApproveClick}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex flex-col items-center justify-center gap-0.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-sm sm:text-base">
                      <Check className="w-5 h-5" />
                      <span>اعتماد الوصل وترحيله للأرشيف ✓</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 font-normal">
                      يتم إخلاء مكان هذا الوصل فوراً من الاستقبال لتنظيفه أولاً بأول
                    </span>
                  </button>

                  {!showRejectForm && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض التحويل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onReject(transfer.id, 'صورة غير واضحة - يرجى إعادة التصوير', accountantNotes);
                          soundManager.playReject();
                          if (hasNext) handleNext();
                          else onClose();
                        }}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>طلب إعادة تصوير</span>
                      </button>
                    </div>
                  )}

                  {onDeleteTransfer && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف هذه المعاملة (فاتورة: ${transfer.invoiceNo || 'غير محدد'}) نهائياً؟\nاستخدم هذا الخيار في حال تم إرسال الإيصال بالخطأ.`)) {
                          onDeleteTransfer(transfer.id);
                          onClose();
                        }
                      }}
                      className="w-full bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-bold py-2 px-3 rounded-xl text-xs border border-red-200 hover:border-red-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="حذف العملية نهائياً إذا كانت مرسلة بالخطأ"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>حذف العملية (أُرسلت بالخطأ)</span>
                    </button>
                  )}
                </>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Full-Screen Zoom Lightbox Modal */}
      {fullLightboxImage && (
        <PhotoLightboxModal
          imageUrl={fullLightboxImage.url}
          title={fullLightboxImage.title}
          onClose={() => setFullLightboxImage(null)}
        />
      )}

    </div>
  );
};
