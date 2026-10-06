import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Share, 
  PlusSquare, 
  Check, 
  X, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner' | 'compact';
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed on mobile home screen, do not show install prompt
  if (isInstalled || isDismissed) {
    return null;
  }

  // Handle click on install
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback for browsers without beforeinstallprompt
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className={`bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-lg border border-blue-700/60 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <span>تثبيت تطبيق الروضة على هاتفك</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold border border-emerald-500/40">
                  تطبيق أصلي
                </span>
              </div>
              <p className="text-[11px] text-blue-200 mt-0.5">
                ثبّت المنظومة على الشاشة الرئيسية للوصول السريع بدون كتابة الرابط كل مرة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>تثبيت الآن 📱</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-white/60 hover:text-white p-1"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 ${className}`}
          title="تثبيت التطبيق على الشاشة الرئيسية لهاتفك"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق 📱</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${className}`}
          title="تثبيت التطبيق على الشاشة الرئيسية للهاتف"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق 📱</span>
        </button>
      )}

      {/* ========================================================================= */}
      {/* iOS Safari / Universal Installation Instructions Modal */}
      {/* ========================================================================= */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  تثبيت المنظومة على الشاشة الرئيسية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900">
                يمكنك تشغيل هذا النظام كتطبيق موبايل مستقل وسريع باتباع هذه الخطوات:
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">اضغط على زر المشاركة (Share):</span>
                  <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                    ستجده أسفل الشاشة في Safari أو بأعلى المتصفح في Chrome <Share className="w-3 h-3 text-blue-600 inline" />
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">اختر "إضافة إلى الشاشة الرئيسية":</span>
                  <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                    (Add to Home Screen) <PlusSquare className="w-3 h-3 text-emerald-600 inline" />
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">اضغط "إضافة" (Add):</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    سيظهر أيقونة التطبيق باسم <strong>الروضة</strong> على شاشة هاتفك وسيعمل بكامل الشاشة وبدون متصفح!
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              فهمت ذلك ✓
            </button>

          </div>
        </div>
      )}
    </>
  );
};
