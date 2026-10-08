import React, { useState } from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Eye, 
  Building2, 
  Camera,
  Layers,
  ChevronLeft,
  ZoomIn
} from 'lucide-react';
import { TransferItem, Branch } from '../types';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface BranchFeedViewProps {
  transfers: TransferItem[];
  currentBranch: Branch;
  onOpenVerifyModal: (transfer: TransferItem) => void;
  onGoToCamera: () => void;
  onReupload: (transferId: string, newScreenshot: string, notes?: string) => void;
}

export const BranchFeedView: React.FC<BranchFeedViewProps> = ({
  transfers,
  currentBranch,
  onOpenVerifyModal,
  onGoToCamera,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const branchTransfers = transfers.filter((t) => t.branchId === currentBranch?.id);

  const filtered = branchTransfers.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const pendingCount = branchTransfers.filter((t) => t.status === 'pending').length;
  const verifiedCount = branchTransfers.filter((t) => t.status === 'verified').length;
  const rejectedCount = branchTransfers.filter((t) => t.status === 'rejected').length;

  return (
    <div className="max-w-md mx-auto px-2.5 sm:px-4 pt-1 pb-4 space-y-2.5">
      
      {/* Top Banner - Compact & Clean */}
      <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-slate-900 truncate">
            <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">سجل إيصالات {currentBranch?.name} اليوم</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            متابعة حالة الاعتماد اللحظية من الحسابات
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToCamera}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1 shrink-0 transition-transform cursor-pointer"
          title="تصوير إيصال جديد"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>تصوير</span>
        </button>
      </div>

      {/* Filter Tabs - Compact Slim */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          الكل ({branchTransfers.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-white text-amber-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>معلق</span>
          <span className="font-mono text-amber-700">({pendingCount})</span>
        </button>
        <button
          onClick={() => setFilterStatus('verified')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
            filterStatus === 'verified'
              ? 'bg-white text-emerald-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>معتمد</span>
          <span className="font-mono text-emerald-700">({verifiedCount})</span>
        </button>
        {rejectedCount > 0 && (
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              filterStatus === 'rejected'
                ? 'bg-white text-red-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>مرفوض</span>
            <span className="font-mono text-red-700">({rejectedCount})</span>
          </button>
        )}
      </div>

      {/* Submissions List - Compact Cells ("نظام خانة") */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-slate-400 space-y-2 shadow-2xs">
            <ClipboardList className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
            <div className="font-bold text-slate-700 text-xs sm:text-sm">لا توجد إيصالات في هذه القائمة</div>
            <p className="text-[11px] text-slate-500">
              اضغط على زر الكاميرا لتصوير وإرسال إيصال جديد فوراً
            </p>
            <button
              type="button"
              onClick={onGoToCamera}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>تصوير الآن</span>
            </button>
          </div>
        ) : (
          filtered.map((item) => {
            const photos = item.images && item.images.length > 0 ? item.images : [item.screenshotUrl];
            const primaryThumb = photos[0];

            return (
              <div
                key={item.id}
                onClick={() => onOpenVerifyModal(item)}
                className={`group bg-white rounded-2xl border transition-all duration-150 shadow-2xs hover:shadow-xs p-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none active:scale-[0.99] ${
                  item.status === 'verified'
                    ? 'border-slate-200 hover:border-emerald-300'
                    : item.status === 'rejected'
                    ? 'border-red-200 bg-red-50/15'
                    : 'border-amber-200 bg-amber-50/15'
                }`}
                title="اضغط لمعاينة وتدقيق الإيصال"
              >
                {/* Right side: Thumbnail + Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage({
                        url: primaryThumb,
                        title: `${item.invoiceNo} - ${item.branchName}`
                      });
                    }}
                    className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 group/thumb shadow-2xs"
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

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[140px] flex items-center gap-1">
                        <span className="text-blue-600">👤</span>
                        <span className="truncate">{item.senderName || item.cashierName || 'كاشير الفرع'}</span>
                      </span>

                      <span className="font-mono font-black text-[11px] sm:text-xs text-slate-600 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                        #{item.invoiceNo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500">
                      <span className="font-mono text-slate-500 whitespace-nowrap flex items-center gap-1">
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>

                      {item.cashierNote ? (
                        <span className="truncate max-w-[130px] text-slate-600">({item.cashierNote})</span>
                      ) : (
                        <span className="text-slate-400">إيصال إنستاباي</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Left side: Amount + Status */}
                <div className="flex items-center gap-2 shrink-0 text-left">
                  <div className="text-left">
                    {item.amount > 0 ? (
                      <div className="font-mono font-black text-xs sm:text-sm text-emerald-700">
                        {item.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        <span className="text-[10px] font-sans text-slate-400 mr-0.5">ج.م</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                        بالصورة
                      </span>
                    )}
                  </div>

                  <div>
                    {item.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <Clock className="w-2.5 h-2.5 animate-spin text-amber-700" />
                        <span>معلق</span>
                      </span>
                    )}
                    {item.status === 'verified' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <span>✓ معتمد</span>
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <span>✗ مرفوض</span>
                      </span>
                    )}
                  </div>

                  <div className="p-1 text-slate-400 hover:text-blue-600 rounded-lg group-hover:text-blue-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Photo Lightbox Modal for Zooming */}
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
