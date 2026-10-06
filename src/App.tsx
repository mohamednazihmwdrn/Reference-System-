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

  // Sync with Server & Subscribe to Real-Time Updates from other phones
  useEffect(() => {
    // Initial fetch from backend server
    apiFetchTransfers().then((data) => {
      if (data && data.length > 0) setTransfers(data);
    });
    apiFetchBranches().then((data) => {
      if (data && data.length > 0) setBranches(data);
    });

    // Real-time live synchronization (SSE + Polling)
    const unsubscribe = subscribeToLiveUpdates(async () => {
      const serverTransfers = await apiFetchTransfers();
      setTransfers((prev) => {
        // Play chime if new pending items arrived for auditor
        if (serverTransfers.length > prev.length) {
          soundManager.playNewIncoming();
        }
        return serverTransfers;
      });

      const serverBranches = await apiFetchBranches();
      if (serverBranches && serverBranches.length > 0) {
        setBranches(serverBranches);
      }
    });

    return () => unsubscribe();
  }, []);

  // Strict role boundaries guard
  useEffect(() => {
    if (currentSession?.role === 'branch_cashier') {
      if (activeTab !== 'cashier' && activeTab !== 'cashier_feed') {
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
        setActiveTab={setActiveTab}
        pendingCount={pendingTransfers.length}
        soundEnabled={soundEnabled}
        toggleSound={toggleSound}
        onOpenPrintReport={() => setIsPrintReportOpen(true)}
        branches={branches}
        currentBranchId={currentBranchId}
        currentSession={currentSession}
        onLogout={handleLogout}
        onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
      />

      {/* Main Content Router */}
      <main className="flex-1 pb-20">
        {activeTab === 'cashier' && (
          <CashierUploadView
            branches={branches}
            bankAccounts={bankAccounts}
            transfers={transfers}
            currentBranchId={currentBranchId}
            onBranchChange={handleBranchChange}
            onAddTransfer={handleAddTransfer}
            onReuploadTransfer={handleReuploadTransfer}
            onViewFeedTab={() => setActiveTab('cashier_feed')}
          />
        )}

        {activeTab === 'cashier_feed' && (
          <BranchFeedView
            transfers={transfers}
            currentBranch={currentBranch}
            onOpenVerifyModal={(t) => setInspectingTransfer(t)}
            onGoToCamera={() => setActiveTab('cashier')}
            onReupload={handleReuploadTransfer}
          />
        )}

        {activeTab === 'dashboard' && (
          <AccountantDashboard
            transfers={transfers}
            branches={branches}
            onOpenVerifyModal={(t) => setInspectingTransfer(t)}
            onQuickApprove={(id) => handleApproveTransfer(id, 'اعتماد فوري وترحيل للأرشيف')}
            onQuickReject={(id, reason) => handleRejectTransfer(id, reason)}
            onBulkApprove={handleBulkApprove}
            onOpenPrintReport={() => setIsPrintReportOpen(true)}
            onPrintSingleVoucher={(t) => setVoucherModalTransfer(t)}
            onReturnToReception={handleReturnToReception}
            onGoToSettings={() => setActiveTab('settings')}
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
            onGoToDashboard={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* Subtle, Non-Intrusive Page Footer (required by prompt) */}
      <footer className="text-center py-2 px-4 text-[10px] text-slate-400 border-t border-slate-200/80 bg-slate-50 no-print select-none">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>{COMPANY_INFO.name}</span>
          <span>·</span>
          <span>برمجة وتطوير: <strong className="font-semibold text-slate-500">Mohamed Nazih</strong></span>
          <span>·</span>
          <span>هاتف الدعم: <a href="tel:01029190615" className="font-mono text-slate-500 hover:underline">01029190615</a></span>
          <span>·</span>
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-blue-600 hover:underline"
          >
            سياسة الخصوصية
          </button>
        </div>
      </footer>

      {/* Ergonomic Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
