import React, { useState } from 'react';
import { X, Printer, Building2, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';
import { TransferItem, Branch } from '../types';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: TransferItem[];
  branches: Branch[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  transfers,
  branches,
}) => {
  const [filterBranchId, setFilterBranchId] = useState<string>('all');

  if (!isOpen) return null;

  const displayedTransfers = filterBranchId === 'all'
    ? transfers
    : transfers.filter((t) => t.branchId === filterBranchId);

  const selectedBranchObj = branches.find((b) => b.id === filterBranchId);
  const branchReportTitle = filterBranchId === 'all'
    ? 'تقرير المطابقة والتحقق اليومي - كافة الفروع والمخازن'
    : `تقرير المطابقة والتحقق الخاص بـ: ${selectedBranchObj?.name || 'الفرع'}`;

  const totalAmount = displayedTransfers.reduce((sum, t) => sum + t.amount, 0);
  const verifiedTransfers = displayedTransfers.filter((t) => t.status === 'verified');
  const verifiedAmount = verifiedTransfers.reduce((sum, t) => sum + t.amount, 0);
  const pendingTransfers = displayedTransfers.filter((t) => t.status === 'pending');
  const pendingAmount = pendingTransfers.reduce((sum, t) => sum + t.amount, 0);
  const rejectedTransfers = displayedTransfers.filter((t) => t.status === 'rejected');

  const todayStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
      
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
        
        {/* Modal Controls Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">معاينة تقرير المطابقة اليومية للطباعة</span>
          </div>

          {/* Quick Branch Filter for Print */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">تخصيص الطباعة:</span>
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">كافة الفروع والمخازن المشتركة</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة هذا التقرير الآن</span>
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
        <div className="flex-1 overflow-y-auto p-8 text-slate-900 bg-white" id="printable-sheet">
          
          {/* Company & Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">شركة الروضة الشريفة للتجارة والتوريدات</h1>
              <div className="text-sm font-semibold text-slate-600 mt-1">
                الإدارة المالية · قسم المراجعة والتدقيق المحاسبي المعتمد
              </div>
              <div className="text-xs text-blue-800 font-bold mt-1">
                {branchReportTitle}
              </div>
            </div>

            <div className="text-left font-mono text-xs text-slate-700 space-y-1">
              <div><strong>تاريخ التقرير:</strong> {todayStr}</div>
              <div><strong>وقت الاستخراج:</strong> {new Date().toLocaleTimeString('ar-EG')}</div>
              <div><strong>حالة الاعتماد:</strong> تقرير مالي معتمد</div>
            </div>
          </div>

          {/* Financial Summary Boxes */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-center">
              <div className="text-[11px] text-slate-500">إجمالي الحركات</div>
              <div className="text-lg font-bold font-mono text-slate-900">{transfers.length}</div>
              <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                {totalAmount.toLocaleString()} ج.م
              </div>
            </div>

            <div className="border border-emerald-300 rounded-lg p-3 bg-emerald-50 text-center">
              <div className="text-[11px] text-emerald-800">الحركات المعتمدة</div>
              <div className="text-lg font-bold font-mono text-emerald-700">{verifiedTransfers.length}</div>
              <div className="text-xs font-mono font-semibold text-emerald-800 mt-0.5">
                {verifiedAmount.toLocaleString()} ج.م
              </div>
            </div>

            <div className="border border-amber-300 rounded-lg p-3 bg-amber-50 text-center">
              <div className="text-[11px] text-amber-800">حركات قيد التدقيق</div>
              <div className="text-lg font-bold font-mono text-amber-700">{pendingTransfers.length}</div>
              <div className="text-xs font-mono font-semibold text-amber-800 mt-0.5">
                {pendingAmount.toLocaleString()} ج.م
              </div>
            </div>

            <div className="border border-red-300 rounded-lg p-3 bg-red-50 text-center">
              <div className="text-[11px] text-red-800">الحركات المرفوضة</div>
              <div className="text-lg font-bold font-mono text-red-700">{rejectedTransfers.length}</div>
              <div className="text-[10px] text-red-600 mt-0.5">غير مطابقة</div>
            </div>
          </div>

          {/* Transfers Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">رقم الفاتورة</th>
                  <th className="p-2.5">الفرع / المخزن</th>
                  <th className="p-2.5 text-left font-mono">المبلغ (ج.م)</th>
                  <th className="p-2.5">الرقم المرجعي (Ref)</th>
                  <th className="p-2.5">اسم الراسل</th>
                  <th className="p-2.5">الحالة</th>
                  <th className="p-2.5">المحاسب المعتمد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      لا توجد حركات مسجلة لهذا الفرع في الفترة الحالية
                    </td>
                  </tr>
                ) : (
                  displayedTransfers.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{item.invoiceNo}</td>
                      <td className="p-2 font-medium">{item.branchName}</td>
                      <td className="p-2 font-mono font-bold text-slate-900 text-left">
                        {item.amount > 0 ? item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'قيد المراجعة'}
                      </td>
                      <td className="p-2 font-mono text-slate-600 text-[11px]">
                        {item.referenceNo || '-'}
                      </td>
                      <td className="p-2 text-slate-700">{item.senderName || '-'}</td>
                      <td className="p-2 font-semibold">
                        {item.status === 'verified' ? (
                          <span className="text-emerald-700 font-bold">معتمد ✓</span>
                        ) : item.status === 'pending' ? (
                          <span className="text-amber-700">معلق</span>
                        ) : (
                          <span className="text-red-700">مرفوض ✗</span>
                        )}
                      </td>
                      <td className="p-2 text-slate-500 text-[11px]">{item.verifiedBy || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Branch summary row */}
          <div className="mb-8">
            <h4 className="text-xs font-bold text-slate-800 mb-2">توزيع المبيعات المعتمدة حسب المخازن:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {branches.map((b) => {
                const bSum = transfers
                  .filter((t) => t.branchId === b.id && t.status === 'verified')
                  .reduce((s, t) => s + t.amount, 0);
                return (
                  <div key={b.id} className="border border-slate-200 p-2 rounded bg-slate-50 flex justify-between">
                    <span className="text-slate-700">{b.name}:</span>
                    <span className="font-mono font-bold text-slate-900">{bSum.toLocaleString()} ج.م</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-8 text-center text-xs text-slate-700">
            <div>
              <div className="font-bold text-slate-900 mb-8">أمين الخزينة / الكاشير</div>
              <div className="border-t border-slate-300 pt-1 font-mono">التوقيع: .....................</div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-8">المراجع المالي المعتمد</div>
              <div className="border-t border-slate-300 pt-1 font-mono">التوقيع: .....................</div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-8">اعتماد المدير المالي</div>
              <div className="border-t border-slate-300 pt-1 font-mono">شركة الروضة الشريفة</div>
            </div>
          </div>

          {/* Mandatory Footer with Mohamed Nazih 01029190615 */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5 font-mono">
            <div>
              حقوق الملكية الفكرية وبرمجة المنظومة محفوظة للمهندس: Mohamed Nazih (هاتف: 01029190615)
            </div>
            <div className="text-slate-400">
              تقرير رسمي معتمد مستخرج من منظومة الروضة الشريفة لإدارة ومراجعة تحويلات إنستا باي
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
