import React from 'react';
import { Camera, ClipboardList, ShieldCheck, Settings, Landmark } from 'lucide-react';
import { ActiveTab } from './Header';
import { UserRole } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  userRole?: UserRole;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  userRole = 'branch_cashier',
}) => {
  const isAuditor = userRole === 'auditor';

  // Branch Cashier Navigation: ONLY 2 buttons (Total isolation from other stores & accountant)
  if (!isAuditor) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-2 h-16 items-center px-4">
          
          {/* Cashier Tab 1: Camera & Shoot */}
          <button
            type="button"
            onClick={() => setActiveTab('cashier')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-transform active:scale-95 cursor-pointer ${
              activeTab === 'cashier'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'cashier' ? 'bg-blue-100/70 text-blue-700' : ''}`}>
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs mt-0.5 tracking-tight font-bold">تصوير وإرسال الإيصالات</span>
          </button>

          {/* Cashier Tab 2: Branch Feed (Only this branch's history) */}
          <button
            type="button"
            onClick={() => setActiveTab('cashier_feed')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-transform active:scale-95 cursor-pointer ${
              activeTab === 'cashier_feed'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'cashier_feed' ? 'bg-blue-100/70 text-blue-700' : ''}`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-xs mt-0.5 tracking-tight font-bold">سجل وإرشيف الفرع</span>
          </button>

        </div>
      </nav>
    );
  }

  // Auditor / Reviewer Navigation: Full access to verification, archive, bank recon, and settings
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
      <div className="max-w-md md:max-w-2xl mx-auto grid grid-cols-3 h-16 items-center px-2">
        
        {/* Auditor Tab 1: Verification & Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-transform active:scale-95 relative cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors relative ${activeTab === 'dashboard' ? 'bg-emerald-100/80 text-emerald-800' : ''}`}>
            <ShieldCheck className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {pendingCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">الاعتماد والأرشيف</span>
        </button>

        {/* Auditor Tab 2: Bank Statement Reconciliation */}
        <button
          type="button"
          onClick={() => setActiveTab('bank_recon')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-transform active:scale-95 cursor-pointer ${
            activeTab === 'bank_recon'
              ? 'text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'bank_recon' ? 'bg-blue-100/80 text-blue-800' : ''}`}>
            <Landmark className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">مطابقة البنك</span>
        </button>

        {/* Auditor Tab 3: Branches & PIN Settings */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-transform active:scale-95 cursor-pointer ${
            activeTab === 'settings'
              ? 'text-slate-900 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-slate-200 text-slate-900' : ''}`}>
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">إدارة الفروع والكلمات السرية</span>
        </button>

      </div>
    </nav>
  );
};
