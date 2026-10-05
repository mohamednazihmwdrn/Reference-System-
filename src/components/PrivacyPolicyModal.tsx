import React from 'react';
import { X, ShieldCheck, Printer, FileText, Phone, Building2, Lock, CheckCircle2 } from 'lucide-react';
import { COMPANY_INFO } from '../utils/storage';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print">
      
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">سياسة الخصوصية وحقوق الملكية</h2>
              <div className="text-xs text-slate-400">
                شركة الروضة الشريفة للتجارة والتوريدات
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الوثيقة</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800 text-xs sm:text-sm leading-relaxed" id="printable-privacy">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-4 text-center space-y-1">
            <div className="text-base font-bold text-slate-900">
              وثيقة سياسة الخصوصية وحماية البيانات وحقوق الملكية الفكرية
            </div>
            <div className="text-xs text-slate-500 font-medium">
              المنظومة الرقمية للتحقق من تحويلات شبكة المدفوعات اللحظية (إنستا باي - IPN)
            </div>
            <div className="text-xs text-blue-700 font-semibold font-mono">
              تاريخ الاعتماد: 2026 · سارية المفعول على كافة الفروع والمخازن
            </div>
          </div>

          {/* Section 1: مقدمة ونطاق العمل */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-blue-900">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>1. مقدمة ونطاق التطبيق:</span>
            </h3>
            <p className="text-slate-600 pr-6">
              تم إعداد هذه الوثيقة الرسمية لتنظيم حماية وسرية البيانات المالية لعمليات الدفع والتحويل اللحظي عبر تطبيق إنستا باي (InstaPay) المعتمد من البنك المركزي المصري لصالح <strong>شركة الروضة الشريفة للتجارة والتوريدات</strong>. تسري هذه السياسة على جميع نقاط البيع والمتاجر والمستودعات التابعة للشركة، وتشمل: (محل الروضة الشريفة، محل صفا مكرم، محل مودرن، مخزن النادي، ومخزن النحاس) بالإضافة إلى الإدارة المالية وقسم المراجعة والتدقيق.
            </p>
          </div>

          {/* Section 2: حقوق الملكية التجارية وبيانات المنشأة */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-blue-900">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>2. حقوق الملكية التجارية وسرية الحسابات (شركة الروضة الشريفة):</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pr-6">
              <li>
                <strong>ملكية البيانات:</strong> تعتبر كافة البيانات المحاسبية، وحركات الإيداع، وأرقام المعاملات المرجعية، وصور إيصالات إنستا باي، وفواتير المبيعات ملكية حصرية وخاصة بـ <strong>شركة الروضة الشريفة</strong>، ويحظر تداولها أو إفشاؤها خارج نطاق العمليات المحاسبية الرسمية.
              </li>
              <li>
                <strong>الحماية المالية:</strong> تلتزم المنظومة بتطبيق إجراءات تحقق صارمة تمنع ازدواجية استخدام الإيصالات أو التلاعب في المبالغ المحولة، وتضمن توريد كافة المبالغ مباشرة إلى الحسابات البنكية الرسمية المعتمدة لشركة الروضة الشريفة.
              </li>
              <li>
                <strong>الوصول المشفر برمز PIN:</strong> يلتزم كل فرع ومخزن باستخدام الرقم السري المخصص له فقط، وتتحمل إدارة الفرع المسؤولية الكاملة عن سرية الرمز وعدم مشاركته مع غير المخولين.
              </li>
            </ul>
          </div>

          {/* Section 3: حقوق الملكية الفكرية والبرمجية (Mohamed Nazih) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-blue-900">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>3. حقوق الملكية الفكرية والبرمجية (Intellectual Property Rights):</span>
            </h3>
            <p className="text-slate-700 leading-relaxed">
              تم تصميم وبرمجة وتطوير هذه المنظومة الرقمية بالكامل (بما يشمل واجهات الهواتف المحمولة، وخوارزميات المعاينة البصرية المجهرية للصور، وآلية المطابقة اللحظية، والشيفرة البرمجية المصدرية) بواسطة المبرمج المهندس:
            </p>
            <div className="bg-white border border-slate-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono">
              <div>
                <span className="text-xs text-slate-500 block">المطور وصاحب حقوق الملكية الفكرية:</span>
                <span className="font-bold text-slate-900 text-sm">Eng. Mohamed Nazih</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">رقم التواصل المعتمد والدعم الفني:</span>
                <a href="tel:01029190615" className="font-bold text-blue-700 hover:underline text-sm">
                  01029190615
                </a>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              جميع حقوق الملكية الفكرية، وحقوق الطبع والنشر والتوزيع والترخيص البرمجي محفوظة بالكامل باسم <strong>Mohamed Nazih</strong>، ومحمية بموجب القوانين المصرية والدولية لحماية حقوق الملكية الفكرية والبرمجيات.
            </p>
          </div>

          {/* Section 4: جمع البيانات وإجراءات التدقيق */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-blue-900">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>4. سياسة جمع الصور والتحقق المحاسبي:</span>
            </h3>
            <p className="text-slate-600 pr-6">
              تعتمد المنظومة على مبدأ <em>(التصوير الفوري والمطابقة المباشرة)</em> دون الحاجة لتسجيل بيانات شخصية حساسة للعميل؛ حيث تقتصر الصور المرفوعة على صورة الفاتورة التجارية للفرع وصورة إيصال التحويل البنكي اللحظي فقط. يتم أرشفة هذه الصور لأغراض المراجعة الضريبية والمطابقة البنكية الدورية مع دفاتر شركة الروضة الشريفة.
            </p>
          </div>

          {/* Section 5: الأرشفة والتقارير القانونية */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-blue-900">
              <Printer className="w-4 h-4 text-purple-600" />
              <span>5. الأرشفة والتقارير المطبوعة:</span>
            </h3>
            <p className="text-slate-600 pr-6">
              تُطبع التقارير اليومية وسندات التدقيق الفردية ممهورة بتذييل رسمي يحمل اسم شركة الروضة الشريفة، بالإضافة إلى إسناد حقوق الملكية الفكرية البرمجية للمهندس <strong>Mohamed Nazih</strong> (هاتف: 01029190615) كعلامة توثيق وضمان معتمد للنظام.
            </p>
          </div>

          {/* Signatures block */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-slate-600">
            <div>
              <div className="font-bold text-slate-900 mb-6">اعتماد إدارة شركة الروضة الشريفة</div>
              <div className="border-t border-slate-300 pt-1 font-mono">الختم والتوقيع: .....................</div>
            </div>
            <div>
              <div className="font-bold text-slate-900 mb-6">المطور التقني للمنظومة</div>
              <div className="border-t border-slate-300 pt-1 font-mono">Eng. Mohamed Nazih (01029190615)</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>حقوق الملكية لشركة الروضة الشريفة · برمجة: Mohamed Nazih (01029190615)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>

    </div>
  );
};
