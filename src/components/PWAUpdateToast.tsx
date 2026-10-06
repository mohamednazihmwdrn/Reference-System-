import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const PWAUpdateToast: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodically check for updates every 60 seconds across all devices
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('SW registration error', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-500/60 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <div className="font-bold text-xs flex items-center gap-1">
            <span>تحديث جديد متوفر للمنظومة! 🚀</span>
          </div>
          <p className="text-[10px] text-slate-300 mt-0.5">
            تم إرسال تحديث جديد من الإدارة، اضغط للتحديث فوراً
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>تحديث</span>
        </button>

        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-slate-400 hover:text-white p-1"
          title="تخطي مؤقتاً"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
