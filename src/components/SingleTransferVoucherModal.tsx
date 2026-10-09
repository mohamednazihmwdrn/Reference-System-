import React, { useState } from 'react';
import { X, Printer, ShieldCheck, Building2, Calendar, Hash, User, CheckCircle2, ZoomIn } from 'lucide-react';
import { TransferItem } from '../types';
import { numberToArabicWords } from '../utils/numberToWordsArabic';
import { COMPANY_INFO } from '../utils/storage';
import { PhotoLightboxModal } from './PhotoLightboxModal';

interface SingleTransferVoucherModalProps {
  transfer: TransferItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SingleTransferVoucherModal: React.FC<SingleTransferVoucherModalProps> = ({
  transfer,
  isOpen,
  onClose,
}) => {
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  if (!isOpen || !transfer) return null;

  const photos = (transfer.images && transfer.images.length > 0)
    ? transfer.images
    : [transfer.screenshotUrl];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto printable-modal-wrapper">
      
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-300 printable-card">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">معاينة سند الحركة الفردية للطباعة و PDF</span>
            <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              {transfer.invoiceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="طباعة السند أو حفظه كملف PDF"
            >
              <span>📄 طباعة / حفظ بتنسيق PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة 🖨️</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-slate-900 bg-white space-y-6 printable-document" id="printable-voucher">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xl font-bold text-slate-900">
                شركة الروضة الشريفة للتجارة والتوريدات
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                الإدارة المالية والمراجعة العامة · قسم تدقيق مدفوعات إنستا باي
              </div>
              <div className="text-xs text-blue-700 font-bold mt-1">
                سند تدقيق واعتماد حركة دفع إلكتروني (IPN)
              </div>
            </div>

            <div className="text-left font-mono text-xs text-slate-600 space-y-1">
              <div><strong>رقم السند:</strong> {transfer.invoiceNo}</div>
              <div><strong>التاريخ:</strong> {new Date(transfer.createdAt).toLocaleDateString('ar-EG')}</div>
              <div><strong>الوقت:</strong> {new Date(transfer.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">الفرع / المخزن:</span>
              <span className="font-bold text-slate-900 text-sm">{transfer.branchName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">المبلغ المعتمد:</span>
              <span className="font-mono font-bold text-emerald-700 text-base">
                {transfer.amount > 0 ? `${transfer.amount.toLocaleString()} ج.م` : 'قيد المراجعة'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">الرقم المرجعي (Ref):</span>
              <span className="font-mono font-semibold text-slate-900">
                {transfer.referenceNo || 'IPN-VERIFIED'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">حالة الاعتماد:</span>
              <span className={`font-bold inline-flex items-center gap-1 ${
                transfer.status === 'verified' ? 'text-emerald-700' : transfer.status === 'pending' ? 'text-amber-700' : 'text-red-700'
              }`}>
                {transfer.status === 'verified' ? 'معتمد ومطابق ✓' : transfer.status === 'pending' ? 'بانتظار المراجعة' : 'مرفوض ✗'}
              </span>
            </div>
          </div>

          {transfer.amount > 0 && (
            <div className="text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 font-medium">
              المبلغ بالحروف: {numberToArabicWords(transfer.amount)}
            </div>
          )}

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-4 text-xs border border-slate-200 p-3.5 rounded-xl">
            <div>
              <span className="text-slate-500">مسؤول الإرسال (الكاشير): </span>
              <span className="font-semibold text-slate-800">{transfer.cashierName || 'كاشير الفرع'}</span>
            </div>
            <div>
              <span className="text-slate-500">اسم الراسل / العميل: </span>
              <span className="font-semibold text-slate-800">{transfer.senderName || 'تحويل إنستاباي مباشر'}</span>
            </div>
            {transfer.verifiedBy && (
              <div>
                <span className="text-slate-500">المراجع المالي المعتمد: </span>
                <span className="font-bold text-emerald-800">{transfer.verifiedBy}</span>
              </div>
            )}
            {transfer.accountantNotes && (
              <div>
                <span className="text-slate-500">ملاحظات الحسابات: </span>
                <span className="text-slate-800">{transfer.accountantNotes}</span>
              </div>
            )}
          </div>

          {/* Both Photos Printed Clearly */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>صور المستندات والإيصالات المرفقة بالسند ({photos.length} صور):</span>
              <span className="text-blue-600 font-normal text-[11px]">🔍 انقر على أي صورة لتكبيرها بملء الشاشة</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((imgSrc, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setLightboxImage({
                    url: imgSrc,
                    title: `${transfer.invoiceNo} - ${idx === 0 ? 'صورة الفاتورة' : 'صورة إيصال إنستاباي'} (${transfer.branchName})`
                  })}
                  className="border border-slate-300 rounded-xl p-2 bg-slate-50 text-center space-y-1 cursor-pointer hover:border-blue-500 transition-colors group"
                  title="انقر لتكبير هذه الصورة بملء الشاشة"
                >
                  <div className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                    <span>{idx === 0 ? 'صورة 1: الفاتورة / أمر الصرف' : 'صورة 2: إيصال تحويل إنستا باي'}</span>
                    <ZoomIn className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="h-64 rounded-lg overflow-hidden border border-slate-200 bg-black flex items-center justify-center relative">
                    <img
                      src={imgSrc}
                      alt={`Receipt ${idx + 1}`}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="bg-white/90 text-slate-900 text-[11px] font-bold px-2 py-1 rounded-md shadow">
                        🔍 تكبير كامل
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
            <div>
              <div className="font-bold text-slate-900 mb-8">مسؤول الفرع / الكاشير</div>
              <div className="border-t border-slate-300 pt-1 font-mono">التوقيع: .....................</div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-8">المراجع المالي المعتمد</div>
              <div className="border-t border-slate-300 pt-1 font-mono">التوقيع: .....................</div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-8">ختم إدارة الحسابات</div>
              <div className="border-t border-slate-300 pt-1 font-mono">شركة الروضة الشريفة</div>
            </div>
          </div>

          {/* Mandatory Footer with Mohamed Nazih 01029190615 */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5 font-mono">
            <div>
              {COMPANY_INFO.copyrightNotice}
            </div>
            <div className="text-slate-400">
              مستخرج رسمياً من منظومة الروضة الشريفة لتدقيق تحويلات إنستا باي · جميع الحقوق محفوظة
            </div>
          </div>

        </div>

      </div>

      {/* Full-Screen Zoom Lightbox Modal */}
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
