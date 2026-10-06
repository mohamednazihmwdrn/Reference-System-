import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export const PWAUpdateToast: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Only register service worker in browser environment when supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In local dev mode, skip service worker registration to prevent Vite dev server errors
    if (import.meta.env.DEV) {
      return;
    }

    const handleServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Check for updates periodically every 60 seconds
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);

        // If a new service worker is already waiting to activate
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setNeedRefresh(true);
        }

        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setNeedRefresh(true);
              }
            });
          }
        });
      } catch (err) {
        console.warn('PWA service worker registration notice:', err);
      }
    };

    if (document.readyState === 'complete') {
      handleServiceWorker();
    } else {
      window.addEventListener('load', handleServiceWorker);
    }

    // Listen for controllerchange to reload page when new service worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      window.removeEventListener('load', handleServiceWorker);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
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
          <RefreshCw className="w-3.5 h-3.5" />
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
