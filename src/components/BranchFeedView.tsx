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
    <div className="max-w-md mx-auto px-4 pt-3 pb-36 sm:pb-44 space-y-4">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <span>سجل إيصالات {currentBranch?.name} اليوم</span>
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            متابعة حالة اعتماد الفواتير المحولة من الكاشير
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToCamera}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white p-2.5 rounded-xl shadow-xs"
          title="تصوير إيصال جديد"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setFilterStatus('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filterStatus === 'all'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          الكل ({branchTransfers.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
            filterStatus === 'pending'
              ? 'bg-white text-amber-800 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          <span>معلق</span>
          <span className="font-mono text-amber-700">({pendingCount})</span>
        </button>
        <button
          onClick={() => setFilterStatus('verified')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
            filterStatus === 'verified'
              ? 'bg-white text-emerald-800 shadow-2xs'
              : 'text-slate-600'
          }`}
        >
          <span>معتمد</span>
          <span className="font-mono text-emerald-700">({verifiedCount})</span>
        </button>
        {rejectedCount > 0 && (
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
              filterStatus === 'rejected'
                ? 'bg-white text-red-800 shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            <span>مرفوض</span>
            <span className="font-mono text-red-700">({rejectedCount})</span>
          </button>
        )}
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <div className="font-bold text-slate-700 text-sm">لا توجد إيصالات في هذه القائمة</div>
            <p className="text-xs text-slate-500">
              اضغط على زر الكاميرا لتصوير وإرسال إيصال جديد فوراً
            </p>
            <button
              type="button"
              onClick={onGoToCamera}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform"
            >
              <Camera className="w-4 h-4" />
              <span>تصوير الآن</span>
            </button>
          </div>
        ) : (
          filtered.map((item) => {
            const photosCount = item.images?.length || 1;
            const primaryThumb = item.images?.[0] || item.screenshotUrl;

            return (
              <div
                key={item.id}
                onClick={() => onOpenVerifyModal(item)}
                className={`bg-white border rounded-2xl p-3.5 shadow-2xs space-y-2.5 transition-all active:scale-98 cursor-pointer ${
                  item.status === 'verified'
                    ? 'border-emerald-200'
                    : item.status === 'rejected'
                    ? 'border-red-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Header row: ID & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {item.invoiceNo}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {item.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>بانتظار التحقق</span>
                      </span>
                    )}

                    {item.status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>معتمد ومطابق ✓</span>
                      </span>
                    )}

                    {item.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>مرفوض ✗</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle row: Image Thumbnails + Amount if available */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  
                  {/* Photos Row - Clickable to zoom */}
                  <div className="flex items-center gap-1.5">
                    {item.images && item.images.length > 0 ? (
                      item.images.slice(0, 3).map((img, i) => (
                        <div
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage({
                              url: img,
                              title: `${item.invoiceNo} - صورة ${i + 1} (${i === 0 ? 'الفاتورة' : 'إيصال إنستاباي'})`
                            });
                          }}
                          className="relative group w-12 h-14 rounded-lg bg-black overflow-hidden border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:border-blue-500"
                          title="انقر لتكبير هذه الصورة بالحجم الكامل"
                        >
                          <img
                            src={img}
                            alt="thumb"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({
                            url: primaryThumb,
                            title: `${item.invoiceNo} - صورة التحويل`
                          });
                        }}
                        className="relative group w-12 h-14 rounded-lg bg-black overflow-hidden border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:border-blue-500"
                        title="انقر لتكبير هذه الصورة بالحجم الكامل"
                      >
                        <img
                          src={primaryThumb}
                          alt="thumb"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    )}

                    {photosCount > 1 && (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        +{photosCount} صور
                      </span>
                    )}
                  </div>

                  {/* Amount / Note */}
                  <div className="text-left">
                    {item.amount > 0 ? (
                      <div className="font-mono font-bold text-emerald-700 text-sm">
                        {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium">
                        المبلغ في الصورة
                      </div>
                    )}

                    {item.cashierNote && (
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {item.cashierNote}
                      </div>
                    )}
                  </div>

                </div>

                {/* Rejection alert banner */}
                {item.status === 'rejected' && item.rejectionReason && (
                  <div className="pt-2 border-t border-red-100 text-xs text-red-700">
                    <span className="font-bold">سبب الرفض: </span>
                    <span>{item.rejectionReason}</span>
                  </div>
                )}

                {/* Verified footer */}
                {item.status === 'verified' && item.verifiedBy && (
                  <div className="pt-1.5 border-t border-emerald-100 text-[11px] text-emerald-800 flex items-center justify-between">
                    <span>اعتمد بواسطة: {item.verifiedBy}</span>
                    <span className="font-bold text-emerald-700">يمكن تسليم البضاعة ✓</span>
                  </div>
                )}

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
