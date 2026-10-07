/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginScreen } from './components/LoginScreen';
import { CashierUploadView } from './components/CashierUploadView';
import { BranchFeedView } from './components/BranchFeedView';
import { AccountantDashboard } from './components/AccountantDashboard';
import { VerificationModal } from './components/VerificationModal';
import { BankReconciliationView } from './components/BankReconciliationView';
import { SettingsView } from './components/SettingsView';
import { PrintReportModal } from './components/PrintReportModal';
import { SingleTransferVoucherModal } from './components/SingleTransferVoucherModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { PWAUpdateToast } from './components/PWAUpdateToast';
import { CompanyChatView } from './components/CompanyChatView';
import { Radio, Bell, X, MessageSquare, CheckCircle2 } from 'lucide-react';

import { TransferItem, Branch, BankAccount, UserSession } from './types';
import {
  loadTransfers,
  saveTransfers,
  loadBranches,
  saveBranches,
  loadBankAccounts,
  saveBankAccounts,
  loadUserSession,
  saveUserSession,
  clearUserSession,
  getSoundEnabled,
  setSoundEnabled,
  COMPANY_INFO,
} from './utils/storage';
import {
  apiFetchTransfers,
  apiCreateTransfer,
  apiUpdateTransfer,
  apiFetchBranches,
  apiCreateBranch,
  apiUpdateBranch,
  apiDeleteBranch,
  apiClearAllTransfers,
  subscribeToLiveUpdates,
} from './utils/api';
import { soundManager } from './utils/audio';

export default function App() {
  // Session Authentication State
  const [currentSession, setCurrentSession] = useState<UserSession | null>(() => loadUserSession());

  // Active Tab: cashier for branch staff, dashboard for auditor
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const s = loadUserSession();
    return s?.role === 'auditor' ? 'dashboard' : 'cashier';
  });

  // Core Data States
  const [transfers, setTransfers] = useState<TransferItem[]>(() => loadTransfers());
  const [branches, setBranches] = useState<Branch[]>(() => loadBranches());
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => loadBankAccounts());
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    const s = loadUserSession();
    return s?.branchId || 'b_rawda';
  });

  // Sound preference
  const [soundEnabled, setSoundState] = useState<boolean>(() => {
    const s = getSoundEnabled();
    soundManager.setEnabled(s);
    return s;
  });

  // Modal States
  const [inspectingTransfer, setInspectingTransfer] = useState<TransferItem | null>(null);
  const [voucherModalTransfer, setVoucherModalTransfer] = useState<TransferItem | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Helper openers that push to history stack for hardware back button support
  const openInspectingTransfer = (t: TransferItem) => {
    try {
      window.history.pushState({ modal: 'inspect' }, '');
    } catch {}
    setInspectingTransfer(t);
  };

  const openVoucherModal = (t: TransferItem) => {
    try {
      window.history.pushState({ modal: 'voucher' }, '');
    } catch {}
    setVoucherModalTransfer(t);
  };

  const openPrintReport = () => {
    try {
      window.history.pushState({ modal: 'report' }, '');
    } catch {}
    setIsPrintReportOpen(true);
  };

  const openPrivacyModal = () => {
    try {
      window.history.pushState({ modal: 'privacy' }, '');
    } catch {}
    setIsPrivacyModalOpen(true);
  };

  const handleTabChange = (nextTab: ActiveTab) => {
    if (nextTab !== activeTab) {
      try {
        window.history.pushState({ tab: nextTab }, '');
      } catch {}
      setActiveTab(nextTab);
    }
  };

  // Live real-time incoming alert banner (Transfers, Chat, Walkie-talkie)
  const [liveAlertBanner, setLiveAlertBanner] = useState<{
    id: string;
    text: string;
    senderName?: string;
    type: 'transfer' | 'walkie' | 'chat';
    imageUrl?: string;
    transfer?: TransferItem;
  } | null>(null);

  // Request browser Notification permissions on launch
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Auto-dismiss live alert
  useEffect(() => {
    if (!liveAlertBanner) return;
    const t = setTimeout(() => setLiveAlertBanner(null), 7000);
    return () => clearTimeout(t);
  }, [liveAlertBanner]);

  // Mobile Hardware / Browser Back Button Integration (ربط زر الرجوع للتنقل بدل الخروج)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.history.state === null) {
      window.history.replaceState({ appState: 'main' }, '');
    }

    const handlePopState = () => {
      // 1. Close any open modal first
      if (inspectingTransfer) {
        setInspectingTransfer(null);
        return;
      }
      if (voucherModalTransfer) {
        setVoucherModalTransfer(null);
        return;
      }
      if (isPrintReportOpen) {
        setIsPrintReportOpen(false);
        return;
      }
      if (isPrivacyModalOpen) {
        setIsPrivacyModalOpen(false);
        return;
      }

      // 2. If user is in a secondary view (chat, settings, feed, recon), return to primary tab
      const defaultTab: ActiveTab = currentSession?.role === 'auditor' ? 'dashboard' : 'cashier';
      if (activeTab !== defaultTab) {
        setActiveTab(defaultTab);
        try {
          window.history.pushState({ appState: 'main' }, '');
        } catch {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [inspectingTransfer, voucherModalTransfer, isPrintReportOpen, isPrivacyModalOpen, activeTab, currentSession]);

  // Sync with Server & Subscribe to Real-Time Updates from other phones
  useEffect(() => {
    // Initial fetch from backend server
    apiFetchTransfers().then((data) => {
      if (Array.isArray(data)) {
        setTransfers(data);
        saveTransfers(data);
      }
    });
    apiFetchBranches().then((data) => {
      if (data && data.length > 0) setBranches(data);
    });

    // Real-time live synchronization (SSE + Polling)
    const unsubscribe = subscribeToLiveUpdates(async (eventData?: any) => {
      // 1. Check for incoming transfers
      const serverTransfers = await apiFetchTransfers();
      if (Array.isArray(serverTransfers)) {
        setTransfers((prev) => {
          // Play chime & alert if new items arrived from another phone
          if (serverTransfers.length > prev.length) {
            const newest = serverTransfers[0];
            soundManager.playNewIncoming();
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`وصول إيصال جديد من ${newest?.branchName || 'الفرع'} ⚡`, {
                  body: `رقم الطلب: ${newest?.invoiceNo || 'جديد'} - اضغط للاعتماد`,
                  icon: newest?.screenshotUrl || '/pwa-192x192.png',
                });
              } catch {}
            }

            setLiveAlertBanner({
              id: String(Date.now()),
              text: `وصول إيصال جديد من (${newest?.branchName || 'الفرع'}) للإعتماد ⚡`,
              type: 'transfer',
              imageUrl: newest?.screenshotUrl,
              transfer: newest,
            });
          }
          return serverTransfers;
        });
        saveTransfers(serverTransfers);
      }

      // 2. Handle specific SSE event payloads (Walkie-talkie & Chat)
      if (eventData?.type === 'NEW_MESSAGE' && eventData.message) {
        const msg = eventData.message;
        const currentUserId = currentSession?.role === 'auditor' ? 'auditor_main' : currentSession?.branchId;
        
        // Notify if message is from another phone
        if (msg.senderId !== currentUserId) {
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          if (msg.isWalkieTalkie) {
            soundManager.playWalkieTalkieChirp();
            // Automatically play walkie-talkie audio directly out of the phone speaker
            if (msg.audioUrl) {
              soundManager.playAudioData(msg.audioUrl);
            }
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`🎙️ بث لاسلكي مباشر من: ${msg.senderName}`, {
                  body: 'اضغط للاستماع والرد السريع',
                  icon: '/pwa-192x192.png',
                });
              } catch {}
            }
            setLiveAlertBanner({
              id: String(Date.now()),
              text: `🎙️ بث لاسلكي مباشر وارد الآن من: ${msg.senderName}`,
              senderName: msg.senderName,
              type: 'walkie',
            });
          } else {
            soundManager.playMessageReceived();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`💬 رسالة جديدة من: ${msg.senderName}`, {
                  body: msg.text || 'رسالة جديدة',
                  icon: '/pwa-192x192.png',
                });
              } catch {}
            }
            setLiveAlertBanner({
              id: String(Date.now()),
              text: `💬 رسالة جديدة من: ${msg.senderName}`,
              senderName: msg.senderName,
              type: 'chat',
              imageUrl: msg.imageUrl || undefined,
            });
          }
        }
      }

      // 3. Sync branches
      const serverBranches = await apiFetchBranches();
      if (serverBranches && serverBranches.length > 0) {
        setBranches(serverBranches);
      }
    });

    return () => unsubscribe();
  }, [currentSession]);

  // Strict role boundaries guard
  useEffect(() => {
    if (currentSession?.role === 'branch_cashier') {
      if (activeTab !== 'cashier' && activeTab !== 'cashier_feed' && activeTab !== 'chat') {
        setActiveTab('cashier');
      }
      if (currentSession.branchId && currentBranchId !== currentSession.branchId) {
        setCurrentBranchId(currentSession.branchId);
      }
    }
  }, [currentSession, activeTab, currentBranchId]);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundState(nextVal);
    setSoundEnabled(nextVal);
    soundManager.setEnabled(nextVal);
    if (nextVal) {
      soundManager.playSuccess();
    }
  };

  const handleBranchChange = (branchId: string) => {
    setCurrentBranchId(branchId);
  };

  // Login handler
  const handleLoginSuccess = (session: UserSession) => {
    saveUserSession(session);
    setCurrentSession(session);
    if (session.branchId) {
      setCurrentBranchId(session.branchId);
    }
    setActiveTab(session.role === 'auditor' ? 'dashboard' : 'cashier');
  };

  // Logout handler
  const handleLogout = () => {
    clearUserSession();
    setCurrentSession(null);
  };

  // Add new transfer from cashier (Zero typing, instant photo upload across phones!)
  const handleAddTransfer = async (
    newTransferData: Omit<TransferItem, 'id' | 'createdAt' | 'status'>
  ) => {
    const created = await apiCreateTransfer(newTransferData);
    setTransfers((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
    soundManager.playNewIncoming();
  };

  // Approve transfer
  const handleApproveTransfer = async (
    transferId: string, 
    notes?: string, 
    confirmedAmount?: number, 
    confirmedInvoice?: string
  ) => {
    const existing = transfers.find((t) => t.id === transferId);
    const updates: Partial<TransferItem> = {
      status: 'verified',
      amount: confirmedAmount !== undefined && confirmedAmount > 0 ? confirmedAmount : (existing?.amount || 0),
      invoiceNo: confirmedInvoice || existing?.invoiceNo,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'المراجع المالي (الروضة الشريفة)',
      accountantNotes: notes || existing?.accountantNotes,
    };

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, ...updates } : t))
    );

    await apiUpdateTransfer(transferId, updates);
  };

  // Reject transfer
  const handleRejectTransfer = async (transferId: string, reason: string, notes?: string) => {
    const existing = transfers.find((t) => t.id === transferId);
    const updates: Partial<TransferItem> = {
      status: 'rejected',
      rejectionReason: reason,
      accountantNotes: notes || existing?.accountantNotes,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'المراجع المالي (الروضة الشريفة)',
    };

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, ...updates } : t))
    );

    await apiUpdateTransfer(transferId, updates);
  };

  // Return archived transfer back to reception (un-archive)
  const handleReturnToReception = async (transferId: string) => {
    const existing = transfers.find((t) => t.id === transferId);
    const updates: Partial<TransferItem> = {
      status: 'pending',
      verifiedAt: undefined,
      verifiedBy: undefined,
      accountantNotes: existing?.accountantNotes ? `${existing.accountantNotes} (أعيد للاستقبال)` : undefined,
    };

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, ...updates } : t))
    );

    await apiUpdateTransfer(transferId, updates);
    soundManager.playNewIncoming();
  };

  // Cashier re-upload for rejected item
  const handleReuploadTransfer = async (transferId: string, newScreenshot: string, notes?: string) => {
    const existing = transfers.find((t) => t.id === transferId);
    const updates: Partial<TransferItem> = {
      screenshotUrl: newScreenshot,
      images: [newScreenshot, ...(existing?.images?.slice(1) || [])],
      status: 'pending',
      rejectionReason: undefined,
      createdAt: new Date().toISOString(),
      accountantNotes: notes ? `تم التعديل: ${notes}` : existing?.accountantNotes,
    };

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, ...updates } : t))
    );

    await apiUpdateTransfer(transferId, updates);
    soundManager.playSuccess();
  };

  // Bulk approve multiple transfers
  const handleBulkApprove = async (transferIds: string[]) => {
    const idSet = new Set(transferIds);
    setTransfers((prev) =>
      prev.map((t) => {
        if (idSet.has(t.id)) {
          return {
            ...t,
            status: 'verified',
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'المراجع المالي (اعتماد جماعي)',
          };
        }
        return t;
      })
    );

    for (const id of transferIds) {
      await apiUpdateTransfer(id, {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'المراجع المالي (اعتماد جماعي)',
      });
    }
  };

  // Branches Management Handlers (Reviewer / Admin)
  const handleUpdateBranches = async (updatedBranches: Branch[]) => {
    const previousBranches = branches;
    const updatedIds = new Set(updatedBranches.map((b) => b.id));
    const deletedBranches = previousBranches.filter((b) => !updatedIds.has(b.id));

    setBranches(updatedBranches);
    saveBranches(updatedBranches);

    // Delete removed branches from server
    for (const d of deletedBranches) {
      await apiDeleteBranch(d.id);
    }

    // Sync with server API
    for (const b of updatedBranches) {
      await apiUpdateBranch(b.id, b);
    }
  };

  // Clear all transactions/transfers for clean slate production start
  const handleClearAllTransfers = async () => {
    await apiClearAllTransfers();
    setTransfers([]);
    saveTransfers([]);
  };

  const handleDataReset = () => {
    setTransfers(loadTransfers());
    setBranches(loadBranches());
    setBankAccounts(loadBankAccounts());
  };

  // If not logged in, show Login Screen with 5 branches + Auditor
  if (!currentSession) {
    return (
      <>
        <PWAUpdateToast />
        <LoginScreen
          branches={branches}
          onLoginSuccess={handleLoginSuccess}
          onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
        />
      </>
    );
  }

  const pendingTransfers = transfers.filter((t) => t.status === 'pending');
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  const isAuditor = currentSession.role === 'auditor';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* PWA Auto-Update Notification Banner */}
      <PWAUpdateToast />

      {/* Mobile Top App Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        pendingCount={pendingTransfers.length}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        onOpenPrintReport={openPrintReport}
        branches={branches}
        currentBranchId={currentBranchId}
        currentSession={currentSession}
        onLogout={handleLogout}
        onOpenPrivacyPolicy={openPrivacyModal}
      />

      {/* Real-time Alert Banner for Incoming Transfers, Chats & Walkie-Talkie */}
      {liveAlertBanner && (
        <div className={`mx-3 sm:mx-auto max-w-2xl mt-2 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-lg transition-all animate-in slide-in-from-top-3 duration-200 border z-30 ${
          liveAlertBanner.type === 'walkie'
            ? 'bg-amber-950 text-amber-200 border-amber-500 shadow-amber-950/40 ring-2 ring-amber-400'
            : liveAlertBanner.type === 'transfer'
            ? 'bg-blue-950 text-white border-blue-500 shadow-blue-950/40'
            : 'bg-emerald-950 text-white border-emerald-500 shadow-emerald-950/40'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {liveAlertBanner.type === 'walkie' && <Radio className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />}
            {liveAlertBanner.type === 'transfer' && (
              liveAlertBanner.imageUrl ? (
                <img 
                  src={liveAlertBanner.imageUrl} 
                  alt="إيصال" 
                  className="w-10 h-10 object-cover rounded-xl border border-white/30 shrink-0 shadow-xs" 
                />
              ) : (
                <Bell className="w-5 h-5 text-blue-300 shrink-0 animate-pulse" />
              )
            )}
            {liveAlertBanner.type === 'chat' && (
              liveAlertBanner.imageUrl ? (
                <img 
                  src={liveAlertBanner.imageUrl} 
                  alt="مرفق" 
                  className="w-9 h-9 object-cover rounded-xl border border-white/30 shrink-0 shadow-xs" 
                />
              ) : (
                <MessageSquare className="w-5 h-5 text-emerald-300 shrink-0" />
              )
            )}
            <div className="min-w-0">
              <span className="truncate block font-bold">{liveAlertBanner.text}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {liveAlertBanner.type === 'transfer' && liveAlertBanner.transfer && (
              <button
                type="button"
                onClick={() => {
                  openInspectingTransfer(liveAlertBanner.transfer!);
                  setLiveAlertBanner(null);
                }}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs rounded-xl font-bold transition-all cursor-pointer shadow-xs"
              >
                معاينة واعتماد 👁️
              </button>
            )}

            {(liveAlertBanner.type === 'walkie' || liveAlertBanner.type === 'chat') && (
              <button
                type="button"
                onClick={() => {
                  handleTabChange('chat');
                  setLiveAlertBanner(null);
                }}
                className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs rounded-xl font-bold transition-all cursor-pointer"
              >
                {liveAlertBanner.type === 'walkie' ? 'فتح اللاسلكي والرد' : 'فتح المحادثة'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setLiveAlertBanner(null)}
              className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router with generous bottom clearance for navigation bar */}
      <main className="flex-1 pb-36 sm:pb-44 overflow-x-hidden">
        {activeTab === 'cashier' && (
          <CashierUploadView
            branches={branches}
            bankAccounts={bankAccounts}
            transfers={transfers}
            currentBranchId={currentBranchId}
            onBranchChange={handleBranchChange}
            onAddTransfer={handleAddTransfer}
            onReuploadTransfer={handleReuploadTransfer}
            onViewFeedTab={() => handleTabChange('cashier_feed')}
          />
        )}

        {activeTab === 'cashier_feed' && (
          <BranchFeedView
            transfers={transfers}
            currentBranch={currentBranch}
            onOpenVerifyModal={openInspectingTransfer}
            onGoToCamera={() => handleTabChange('cashier')}
            onReupload={handleReuploadTransfer}
          />
        )}

        {activeTab === 'dashboard' && (
          <AccountantDashboard
            transfers={transfers}
            branches={branches}
            onOpenVerifyModal={openInspectingTransfer}
            onQuickApprove={(id) => handleApproveTransfer(id, 'اعتماد فوري وترحيل للأرشيف')}
            onQuickReject={(id, reason) => handleRejectTransfer(id, reason)}
            onBulkApprove={handleBulkApprove}
            onOpenPrintReport={openPrintReport}
            onPrintSingleVoucher={openVoucherModal}
            onReturnToReception={handleReturnToReception}
            onGoToSettings={() => handleTabChange('settings')}
            onClearAllTransfers={handleClearAllTransfers}
          />
        )}

        {activeTab === 'chat' && (
          <CompanyChatView
            currentSession={currentSession}
            branches={branches}
            onOpenVerifyModal={(tId) => {
              const item = transfers.find((t) => t.id === tId);
              if (item) openInspectingTransfer(item);
            }}
          />
        )}

        {activeTab === 'bank_recon' && (
          <BankReconciliationView
            transfers={transfers}
            bankAccounts={bankAccounts}
            onApproveTransfer={handleApproveTransfer}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            branches={branches}
            transfers={transfers}
            bankAccounts={bankAccounts}
            onUpdateBranches={handleUpdateBranches}
            onUpdateBankAccounts={setBankAccounts}
            onDataReset={handleDataReset}
            onGoToDashboard={() => handleTabChange('dashboard')}
            onClearAllTransfers={handleClearAllTransfers}
          />
        )}

        {/* Subtle, Non-Intrusive Page Footer (Placed inside scrollable flow with bottom margin) */}
        <footer className="text-center py-4 px-4 text-[10px] text-slate-400 border-t border-slate-200/80 bg-slate-50/90 mt-8 mb-4 no-print select-none">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>{COMPANY_INFO.name}</span>
            <span>·</span>
            <span>برمجة وتطوير: <strong className="font-semibold text-slate-500">Mohamed Nazih</strong></span>
            <span>·</span>
            <span>هاتف الدعم: <a href="tel:01029190615" className="font-mono text-slate-500 hover:underline">01029190615</a></span>
            <span>·</span>
            <button
              type="button"
              onClick={openPrivacyModal}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              سياسة الخصوصية
            </button>
          </div>
        </footer>
      </main>

      {/* Ergonomic Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        pendingCount={pendingTransfers.length}
        userRole={currentSession.role}
      />

      {/* Verification Lightbox Modal (with Multi-photo dual inspection) */}
      {inspectingTransfer && (
        <VerificationModal
          transfer={inspectingTransfer}
          allPendingTransfers={pendingTransfers}
          isOpen={!!inspectingTransfer}
          onClose={() => setInspectingTransfer(null)}
          onApprove={(id, notes, confirmedAmount, confirmedInvoice) => 
            handleApproveTransfer(id, notes, confirmedAmount, confirmedInvoice)
          }
          onReject={(id, reason, notes) => handleRejectTransfer(id, reason, notes)}
          onNavigate={(nextItem) => setInspectingTransfer(nextItem)}
        />
      )}

      {/* Printable Single Transaction Voucher */}
      {voucherModalTransfer && (
        <SingleTransferVoucherModal
          transfer={voucherModalTransfer}
          isOpen={!!voucherModalTransfer}
          onClose={() => setVoucherModalTransfer(null)}
        />
      )}

      {/* Printable Daily Reconciliation Report */}
      {isPrintReportOpen && (
        <PrintReportModal
          isOpen={isPrintReportOpen}
          onClose={() => setIsPrintReportOpen(false)}
          transfers={transfers}
          branches={branches}
        />
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyModalOpen && (
        <PrivacyPolicyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      )}

    </div>
  );
}
