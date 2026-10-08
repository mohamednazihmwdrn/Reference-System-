import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  ImagePlus, 
  Trash2, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight, 
  Plus, 
  Receipt, 
  Smartphone, 
  Layers,
  ArrowRight,
  FileText,
  ZoomIn,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { TransferItem, Branch, BankAccount } from '../types';
import { soundManager } from '../utils/audio';
import { SAMPLE_RECEIPT_1, SAMPLE_RECEIPT_2, SAMPLE_INVOICE } from '../utils/storage';
import { compressMultipleImages } from '../utils/imageCompressor';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface CashierUploadViewProps {
  branches: Branch[];
  bankAccounts: BankAccount[];
  transfers: TransferItem[];
  currentBranchId: string;
  onBranchChange: (branchId: string) => void;
  onAddTransfer: (newTransfer: Omit<TransferItem, 'id' | 'createdAt' | 'status'>) => void;
  onReuploadTransfer: (transferId: string, newScreenshot: string, notes?: string) => void;
  onViewFeedTab: () => void;
}

export const CashierUploadView: React.FC<CashierUploadViewProps> = ({
  branches,
  bankAccounts,
  transfers,
  currentBranchId,
  onAddTransfer,
  onViewFeedTab,
}) => {
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];

  // Images state: array of base64 strings or URLs
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastSentCode, setLastSentCode] = useState<string>('');

  // Lightbox Zoom state for inspection
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Optional note (accordion or quick field, never required)
  const [showOptionalNote, setShowOptionalNote] = useState(false);
  const [optionalNote, setOptionalNote] = useState('');

  // Hidden native inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Paste from clipboard support (for WhatsApp web or desktop)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFiles([file]);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [capturedImages]);

  // Read and compress multiple files to prevent memory limit errors
  const processImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedList = await compressMultipleImages(fileArray);
      if (compressedList.length > 0) {
        setCapturedImages((prev) => [...prev, ...compressedList]);
        soundManager.playSuccess();
      }
    } catch (err) {
      console.warn('Image compression fallback:', err);
      // Fallback
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setCapturedImages((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
    }
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // 1-Tap Sample: Automatically loads 2 realistic photos (Paper Invoice + InstaPay Receipt)
  const handleLoadSampleTwoPhotos = () => {
    setCapturedImages([SAMPLE_INVOICE, SAMPLE_RECEIPT_1]);
    soundManager.playSuccess();
  };

  // 1-Tap Submit: No typing required!
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (capturedImages.length === 0) {
      alert('يرجى التقاط صورة أو اختيار صور من الهاتف أولاً');
      return;
    }

    setIsSubmitting(true);

    // Auto-generate instant tracking code (e.g. طلب #4829)
    const randomCode = `طلب #${Math.floor(1000 + Math.random() * 9000)}`;
    setLastSentCode(randomCode);

    const cleanRoleTitle = currentBranch?.type === 'warehouse'
      ? (currentBranch?.name.startsWith('مخزن') ? `أمين ${currentBranch?.name}` : `أمين مخزن ${currentBranch?.name}`)
      : (currentBranch?.name.startsWith('معرض') ? `كاشير ${currentBranch?.name}` : `كاشير معرض ${currentBranch?.name}`);

    onAddTransfer({
      branchName: currentBranch?.name || 'الفرع',
      branchId: currentBranch?.id || currentBranchId,
      invoiceNo: randomCode,
      amount: 0, // Accountant will verify and extract from the photos
      screenshotUrl: capturedImages[0], // primary for backwards compatibility
      images: capturedImages,
      cashierName: currentBranch?.defaultCashier || cleanRoleTitle,
      cashierNote: optionalNote.trim() || undefined,
    });

    soundManager.playSuccess();
    setCapturedImages([]);
    setOptionalNote('');
    setShowOptionalNote(false);
    setIsSubmitting(false);

    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4500);
  };

  // Today's stats for this branch
  const branchTransfers = transfers.filter((t) => t.branchId === currentBranch?.id);
  const pendingCount = branchTransfers.filter((t) => t.status === 'pending').length;
  const verifiedCount = branchTransfers.filter((t) => t.status === 'verified').length;

  return (
    <div className="max-w-md mx-auto px-3 sm:px-4 pt-2 pb-4 space-y-3.5">
      
      {/* Processing & Compression Loader */}
      {isCompressing && (
        <div className="bg-blue-600 text-white rounded-2xl p-3.5 shadow-md flex items-center justify-center gap-2.5 text-xs font-bold animate-pulse">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>جاري معالجة وضغط الصور بدقة عالية لتسريع الإرسال ومنع امتلاء الذاكرة...</span>
        </div>
      )}

      {/* Success Notification Banner */}
      {showSuccessToast && (
        <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">تم إرسال الصور للحسابات بنجاح! 🚀</div>
              <div className="text-xs text-emerald-100 font-mono mt-0.5">
                كود المتابعة: {lastSentCode}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewFeedTab}
            className="text-xs font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform"
          >
            عرض الحالة
          </button>
        </div>
      )}

      {/* Quick Summary Pill for Branch */}
      <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>حساب الفرع:</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">{currentBranch?.name}</span>
        </div>
        <button
          type="button"
          onClick={onViewFeedTab}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50/70 px-2.5 py-1 rounded-lg active:scale-95 transition-transform cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{pendingCount} معلق · {verifiedCount} معتمد</span>
        </button>
      </div>

      {/* Main Action Box: Compact, Ergonomic, Zero Wasted Space */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3 text-center">
        
        {/* Header guide */}
        <div className="text-right sm:text-center">
          <h2 className="text-sm sm:text-base font-black text-slate-900">
            تصوير وإرسال الإيصالات للحسابات فوراً ⚡
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            صور الفاتورة الورقية وإيصال إنستاباي بنقرة واحدة بدون كتابة أي بيانات
          </p>
        </div>

        {/* Ergonomic Dual Capture Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          {/* Button 1: Live Camera */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="h-16 sm:h-20 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center gap-2 p-2.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <span className="font-black text-xs sm:text-sm block">الكاميرا</span>
              <span className="text-[10px] text-blue-100 block">تصوير فوري</span>
            </div>
          </button>

          {/* Button 2: Photo Gallery */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="h-16 sm:h-20 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 flex items-center justify-center gap-2 p-2.5 border border-slate-200 transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
              <ImagePlus className="w-5 h-5 text-slate-700" />
            </div>
            <div className="text-right">
              <span className="font-black text-xs sm:text-sm block">المعرض</span>
              <span className="text-[10px] text-slate-500 block">من الموبايل</span>
            </div>
          </button>
        </div>

        {/* Quick Demo Button for Testing */}
        <button
          type="button"
          onClick={handleLoadSampleTwoPhotos}
          className="w-full py-2 px-3 bg-amber-50/80 hover:bg-amber-100 active:scale-98 text-amber-900 border border-amber-200/80 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>تجربة سريعة بصورتين جاهزتين (فاتورة + إيصال إنستاباي)</span>
        </button>

        {/* Native file inputs (hidden) */}
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleCameraChange}
          className="hidden"
        />
        <input
          type="file"
          ref={galleryInputRef}
          accept="image/*"
          multiple
          onChange={handleGalleryChange}
          className="hidden"
        />

        {/* Photo Tray Preview (If captured) */}
        {capturedImages.length > 0 ? (
          <div className="space-y-2 pt-1 text-right">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>الصور الملتقطة جاهزة ({capturedImages.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setCapturedImages([])}
                className="text-red-600 hover:text-red-800 text-[11px] font-normal cursor-pointer"
              >
                مسح الكل ✕
              </button>
            </div>

            {/* Thumbnails Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {capturedImages.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl overflow-hidden border-2 border-emerald-500 bg-black aspect-[3/4] shadow-xs cursor-pointer"
                  onClick={() => setLightboxImage({
                    url: imgSrc,
                    title: idx === 0 ? 'معاينة صورة الفاتورة' : idx === 1 ? 'معاينة إيصال إنستاباي' : `معاينة صورة #${idx + 1}`
                  })}
                  title="انقر لتكبير ومعاينة الصورة"
                >
                  <img
                    src={imgSrc}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />

                  {/* Zoom badge indicator */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 text-slate-900 rounded-full p-1.5 shadow-lg flex items-center gap-1 text-[10px] font-bold">
                      <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                      <span>تكبير</span>
                    </div>
                  </div>

                  <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    {idx === 0 ? 'الفاتورة' : idx === 1 ? 'إنستاباي' : `صورة ${idx + 1}`}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(idx);
                    }}
                    className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md z-10 cursor-pointer"
                    title="حذف هذه الصورة"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add More Photos Card */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 flex flex-col items-center justify-center gap-1 aspect-[3/4] text-slate-500 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold">إضافة صورة</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-slate-500 text-[11px] flex items-center justify-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
            <span>التقط صورة الفاتورة الورقية وسكرين شوت إنستاباي بنقرة واحدة أعلاه</span>
          </div>
        )}

        {/* Optional Note Accordion */}
        <div className="pt-0.5 text-right">
          <button
            type="button"
            onClick={() => setShowOptionalNote(!showOptionalNote)}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{showOptionalNote ? '- إخفاء الملاحظة' : '+ كتابة ملاحظة اختيارية للكاشير'}</span>
          </button>
          
          {showOptionalNote && (
            <div className="mt-1.5 animate-in fade-in duration-150">
              <input
                type="text"
                value={optionalNote}
                onChange={(e) => setOptionalNote(e.target.value)}
                placeholder="مثال: دفع العميل جزء كاش وجزء إنستاباي..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Primary Submit Button - Inside card flow when ready, zero dead space */}
        {capturedImages.length > 0 && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit()}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all animate-bounce"
          >
            <Send className="w-4 h-4 -rotate-90" />
            <span>
              إرسال {capturedImages.length === 1 ? 'الصورة' : capturedImages.length === 2 ? 'الصورتين' : `${capturedImages.length} صور`} للحسابات فوراً 🚀
            </span>
          </button>
        )}

      </div>

      {/* Photo Lightbox Preview Modal for Zooming before send */}
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
