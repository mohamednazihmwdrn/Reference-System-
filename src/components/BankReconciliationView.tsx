import React, { useState } from 'react';
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
  Clock
} from 'lucide-react';
import { TransferItem, BankAccount, BankStatementRecord } from '../types';
import { soundManager } from '../utils/audio';

interface BankReconciliationViewProps {
  transfers: TransferItem[];
  bankAccounts: BankAccount[];
  onApproveTransfer: (transferId: string, notes?: string) => void;
}

const INITIAL_BANK_ENTRIES: BankStatementRecord[] = [
  {
    id: 'bnk_1',
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    amount: 2450.00,
    senderIpaOrName: 'tarek.hossam@instapay',
    referenceNo: 'IP20261005882194',
  },
  {
    id: 'bnk_2',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    amount: 850.00,
    senderIpaOrName: '01288334455 / Mina Kamal',
    referenceNo: 'IP20261005771029',
  },
  {
    id: 'bnk_3',
    date: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    amount: 1200.00,
    senderIpaOrName: '01001122334 / Ashraf Abdelrahim',
    referenceNo: 'IP20261005550182',
    matchedTransferId: 'tx_104',
  },
  {
    id: 'bnk_4',
    date: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    amount: 3600.00,
    senderIpaOrName: 'heba.fawzy@instapay',
    referenceNo: 'IP20261005441920',
    matchedTransferId: 'tx_105',
  },
];

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  transfers,
  bankAccounts,
  onApproveTransfer,
}) => {
  const [bankEntries, setBankEntries] = useState<BankStatementRecord[]>(INITIAL_BANK_ENTRIES);
  const [activeBankId, setActiveBankId] = useState<string>(bankAccounts[0]?.id || '');
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedNotification, setParsedNotification] = useState<{
    amount?: number;
    ref?: string;
    sender?: string;
  } | null>(null);

  // Parse Egyptian Bank SMS format
  const handleParseSMS = () => {
    if (!pastedText.trim()) return;

    // Look for amounts (e.g. EGP 2,450.00 or 2450 ج.م or 2450.00)
    const amountMatch = pastedText.match(/(?:EGP|ج\.م|LE|مبلغ)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                        pastedText.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:EGP|ج\.م|LE|جنيه)/i);
    
    // Look for reference numbers
    const refMatch = pastedText.match(/(?:Ref|المرجع|رقم العملية|مرجع|IPN|IP)[\s:#]*([A-Z0-9]{6,20})/i);

    const parsedAmt = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined;
    const parsedRef = refMatch ? refMatch[1] : undefined;

    setParsedNotification({
      amount: parsedAmt,
      ref: parsedRef,
      sender: 'إشعار وارد بنكي',
    });
  };

  const handleAddParsedEntry = () => {
    if (!parsedNotification?.amount) {
      alert('تعذر استخراج المبلغ من الرسالة. يرجى إدخاله يدوياً');
      return;
    }
    const newEntry: BankStatementRecord = {
      id: `bnk_${Date.now()}`,
      date: new Date().toISOString(),
      amount: parsedNotification.amount,
      referenceNo: parsedNotification.ref || `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`,
      senderIpaOrName: parsedNotification.sender || 'إشعار بنكي',
    };
    setBankEntries([newEntry, ...bankEntries]);
    setPastedText('');
    setParsedNotification(null);
    soundManager.playSuccess();
  };

  // Match logic
  const handleAutoMatchAndApprove = (bankEntry: BankStatementRecord) => {
    // Find pending transfer with matching amount or reference
    const matched = transfers.find((t) => {
      if (t.status !== 'pending') return false;
      const refMatch = bankEntry.referenceNo && t.referenceNo && t.referenceNo.includes(bankEntry.referenceNo);
      const amtMatch = Math.abs(t.amount - bankEntry.amount) < 0.05;
      return refMatch || amtMatch;
    });

    if (matched) {
      onApproveTransfer(
        matched.id,
        `مطابقة آلية مع قيد البنك مرجع #${bankEntry.referenceNo}`
      );
      setBankEntries((prev) =>
        prev.map((e) => (e.id === bankEntry.id ? { ...e, matchedTransferId: matched.id } : e))
      );
      soundManager.playSuccess();
      alert(`تمت مطابقة قيد البنك مع الفاتورة ${matched.invoiceNo} بقيمة ${matched.amount.toLocaleString()} ج.م بنجاح!`);
    } else {
      alert('لم يتم العثور على تحويل معلق مطابق لنفس المبلغ أو الرقم المرجعي');
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              أداة مطابقة كشف الحساب البنكي لتحويلات إنستا باي
            </h2>
            <div className="text-xs text-slate-500">
              مطابقة القيود والإشعارات الواردة في حساب الشركة مع إيصالات الكاشير لضمان وصول الأموال
            </div>
          </div>
        </div>

        {/* Bank account picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-semibold">حساب البنك النشط:</span>
          <select
            value={activeBankId}
            onChange={(e) => setActiveBankId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
          >
            {bankAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bankName} ({acc.instapayIpa})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: SMS Parser on right, Reconciliation Table on left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Quick SMS & Notification Parser Tool (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>إدراج سريع من إشعار البنك (SMS / Push Notification)</span>
            </div>
            <p className="text-xs text-slate-500">
              الصق نص الرسالة الواردة من البنك الأهلي أو بنك مصر أو CIB وسيقوم النظام باستخراج المبلغ والرقم المرجعي تلقائياً.
            </p>

            <textarea
              rows={3}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="مثال: تم إيداع مبلغ EGP 2,450.00 في حسابكم عبر شبكة المدفوعات اللحظية IPN مرجع IP20261005882194 من Tarek Hossam"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleParseSMS}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                استخراج البيانات
              </button>

              <button
                type="button"
                onClick={() => {
                  setPastedText('تم استلام تحويل لحظي إنستاباي EGP 2,450.00 مرجع IP20261005882194 من طارق حسام');
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                تجربة بنص عينة
              </button>
            </div>

            {/* Extracted preview */}
            {parsedNotification && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2 mt-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>تم استخراج البيانات بنجاح:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-500 block">المبلغ المستخرج:</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {parsedNotification.amount?.toLocaleString()} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الرقم المرجعي:</span>
                    <span className="font-mono font-semibold">
                      {parsedNotification.ref || 'غير محدد'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddParsedEntry}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-md text-xs transition-colors"
                >
                  إضافة القيد لكشف حساب البنك
                </button>
              </div>
            )}

          </div>

          {/* Reconciliation tips */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800">كيف تضمن سلامة الإيرادات؟</div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pr-1">
              <li>كل عملية مطابقة تؤكد أن إيصال العميل ليس مفبركاً أو ملغياً.</li>
              <li>الرقم المرجعي (Ref) هو البصمة الوحيدة المؤكدة من البنك المركزي المصري وشبكة IPN.</li>
              <li>في نهاية اليوم، يجب أن يتطابق إجمالي مبيعات إنستا باي مع كشف الحساب البنكي تماماً.</li>
            </ul>
          </div>

        </div>

        {/* Bank Entries Table (Col 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                حركات الإيداع المسجلة في البنك اليوم ({bankEntries.length})
              </h3>
              <div className="text-xs text-slate-500">
                الحركات الواردة عبر إنستاباي بالحساب البنكي
              </div>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
              إجمالي القيود: {bankEntries.reduce((s, e) => s + e.amount, 0).toLocaleString()} ج.م
            </div>
          </div>

          <div className="space-y-3">
            {bankEntries.map((entry) => {
              const matchedTransfer = transfers.find((t) => t.id === entry.matchedTransferId);
              const isMatched = !!entry.matchedTransferId;

              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isMatched
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(entry.date).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 font-mono mt-0.5">
                        مرجع البنك: <span className="font-semibold">{entry.referenceNo}</span>
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5">
                        الطرف المحول: {entry.senderIpaOrName}
                      </div>
                    </div>

                    {/* Status & Match Action */}
                    <div className="text-left shrink-0">
                      {isMatched ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مطابق للفاتورة {matchedTransfer?.invoiceNo}</span>
                          </span>
                          <div className="text-[11px] text-slate-500 mt-1">
                            فرع: {matchedTransfer?.branchName}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAutoMatchAndApprove(entry)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>مطابقة واعتماد</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};
