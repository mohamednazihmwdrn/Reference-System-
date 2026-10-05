import React, { useState } from 'react';
import { 
  Building2, 
  Volume2, 
  VolumeX, 
  Printer, 
  ChevronDown,
  Sparkles,
  Check,
  LogOut,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { Branch, UserSession } from '../types';

export type ActiveTab = 'cashier' | 'cashier_feed' | 'dashboard' | 'bank_recon' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  soundEnabled: boolean;
  toggleSound: () => void;
  onOpenPrintReport: () => void;
  branches: Branch[];
  currentBranchId: string;
  onBranchChange?: (branchId: string) => void;
  currentSession: UserSession | null;
  onLogout: () => void;
  onOpenPrivacyPolicy: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  soundEnabled,
  toggleSound,
  onOpenPrintReport,
  branches,
  currentBranchId,
  currentSession,
  onLogout,
  onOpenPrivacyPolicy,
}) => {
  const isAuditor = currentSession?.role === 'auditor';
  const branchName = currentSession?.branchName || branches.find((b) => b.id === currentBranchId)?.name || 'الفرع';

  return (
    <>
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-xs select-none no-print">
        <div className="max-w-md md:max-w-4xl mx-auto px-3.5 h-14 flex items-center justify-between gap-2">
          
          {/* Brand & Active Branch Badge - strictly locked per account */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-inner shrink-0">
              الروضة
            </div>
            
            {isAuditor ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/70 border border-emerald-700/70 rounded-full text-xs font-semibold text-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>المراجع العام (الإدارة)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold text-slate-200 border border-slate-700/80 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="truncate max-w-[150px] sm:max-w-[220px] font-bold text-white">{branchName}</span>
              </div>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5">
            {isAuditor && pendingCount > 0 && activeTab !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-2 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>{pendingCount}</span>
                <span className="hidden sm:inline">معلق</span>
              </button>
            )}

            <button
              onClick={toggleSound}
              className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white rounded-full active:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Sound notification"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Privacy Policy Trigger */}
            <button
              onClick={onOpenPrivacyPolicy}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-full active:bg-slate-800 transition-colors cursor-pointer"
              title="سياسة الخصوصية لشركة الروضة الشريفة"
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* Print daily sheet button (Auditor only) */}
            {isAuditor && (
              <button
                onClick={onOpenPrintReport}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
            )}

            {/* Logout button */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-300 hover:text-red-100 hover:bg-red-950/40 rounded-lg border border-red-900/60 transition-colors mr-1 cursor-pointer"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>

        </div>
      </header>
    </>
  );
};
