import { TransferItem, Branch, BankAccount, ChatMessage } from '../types';
import { 
  loadTransfers, 
  saveTransfers, 
  loadBranches, 
  saveBranches, 
  DEFAULT_BRANCHES, 
  INITIAL_TRANSFERS,
  AuditorProfile,
  loadAuditorCredentials,
  saveAuditorCredentials
} from './storage';
import { 
  saveTransferToFirestore, 
  deleteTransferFromFirestore,
  subscribeToTransfers, 
  sendMessageToFirestore, 
  deleteMessageFromFirestore,
  updateMessageInFirestore,
  subscribeToChatMessages, 
  saveBranchToFirestore, 
  subscribeToBranches 
} from './firebase';

// API client for cross-device real-time communication between separated phones
export async function apiFetchTransfers(): Promise<TransferItem[]> {
  try {
    const res = await fetch('/api/transfers');
    if (!res.ok) throw new Error('Failed to fetch transfers');
    const data = await res.json();
    saveTransfers(data);
    return data;
  } catch (err) {
    // Offline / fallback to local storage
    return loadTransfers();
  }
}

export async function apiCreateTransfer(
  transfer: Omit<TransferItem, 'id' | 'createdAt' | 'status'>
): Promise<TransferItem> {
  const newTransfer: TransferItem = {
    ...transfer,
    id: `tx_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  // 1. Immediately push to Firebase Firestore for instant 0-second sync across all devices
  saveTransferToFirestore(newTransfer).catch((err) => {
    console.warn('Firestore live push fallback:', err);
  });

  try {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransfer),
    });
    if (!res.ok) throw new Error('Server error');
    const saved = await res.json();
    return saved;
  } catch (err) {
    console.warn('Network error, saving locally:', err);
    const local = loadTransfers();
    const updated = [newTransfer, ...local];
    saveTransfers(updated);
    return newTransfer;
  }
}

export async function apiUpdateTransfer(
  id: string,
  updates: Partial<TransferItem>
): Promise<TransferItem | null> {
  // Push update to Firebase Firestore immediately
  const local = loadTransfers();
  const existing = local.find((t) => t.id === id);
  if (existing) {
    const merged = { ...existing, ...updates };
    saveTransferToFirestore(merged).catch((err) => {
      console.warn('Firestore update fallback:', err);
    });
  }

  try {
    const res = await fetch(`/api/transfers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Server update failed');
    return await res.json();
  } catch (err) {
    console.warn('Network error updating transfer, saving locally:', err);
    const updated = local.map((t) => (t.id === id ? { ...t, ...updates } : t));
    saveTransfers(updated);
    return updated.find((t) => t.id === id) || null;
  }
}

export async function apiDeleteTransfer(id: string): Promise<boolean> {
  // 1. Delete from Firestore immediately
  deleteTransferFromFirestore(id).catch((err) => {
    console.warn('Firestore transfer delete fallback:', err);
  });

  // 2. Delete locally
  const local = loadTransfers();
  const updated = local.filter((t) => t.id !== id);
  saveTransfers(updated);

  // 3. Delete from Express server
  try {
    const res = await fetch(`/api/transfers/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Network error deleting transfer:', err);
    return true;
  }
}

export async function apiClearAllTransfers(): Promise<boolean> {
  try {
    const res = await fetch('/api/transfers/clear', { method: 'POST' });
    saveTransfers([]);
    return res.ok;
  } catch (err) {
    saveTransfers([]);
    return true;
  }
}

// Branches API (For Reviewer Administration)
export async function apiFetchBranches(): Promise<Branch[]> {
  try {
    const res = await fetch('/api/branches');
    if (!res.ok) throw new Error('Failed to fetch branches');
    const data = await res.json();
    saveBranches(data);
    return data;
  } catch (err) {
    return loadBranches();
  }
}

export async function apiCreateBranch(branch: Omit<Branch, 'id'>): Promise<Branch> {
  const newBranch: Branch = {
    ...branch,
    id: `b_${Date.now()}`,
  };

  saveBranchToFirestore(newBranch).catch((err) => console.warn('Firestore branch write:', err));

  try {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBranch),
    });
    if (!res.ok) throw new Error('Failed to create branch');
    return await res.json();
  } catch (err) {
    const local = loadBranches();
    const updated = [...local, newBranch];
    saveBranches(updated);
    return newBranch;
  }
}

export async function apiUpdateBranch(
  id: string,
  updates: Partial<Branch>
): Promise<Branch | null> {
  const local = loadBranches();
  const existing = local.find((b) => b.id === id);
  if (existing) {
    saveBranchToFirestore({ ...existing, ...updates }).catch((err) => console.warn('Firestore branch update:', err));
  }

  try {
    const res = await fetch(`/api/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update branch');
    return await res.json();
  } catch (err) {
    const updated = local.map((b) => (b.id === id ? { ...b, ...updates } : b));
    saveBranches(updated);
    return updated.find((b) => b.id === id) || null;
  }
}

export async function apiDeleteBranch(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete branch');
    return true;
  } catch (err) {
    const local = loadBranches();
    const updated = local.filter((b) => b.id !== id);
    saveBranches(updated);
    return true;
  }
}

// 2.5 Auditor Profile API
export async function apiFetchAuditor(): Promise<AuditorProfile> {
  try {
    const res = await fetch('/api/auditor');
    if (!res.ok) throw new Error('Failed to fetch auditor');
    const data = await res.json();
    saveAuditorCredentials(data);
    return data;
  } catch (err) {
    return loadAuditorCredentials();
  }
}

export async function apiUpdateAuditor(creds: Partial<AuditorProfile>): Promise<AuditorProfile> {
  const current = loadAuditorCredentials();
  const merged: AuditorProfile = { ...current, ...creds };
  saveAuditorCredentials(merged);

  try {
    const res = await fetch('/api/auditor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    if (!res.ok) throw new Error('Failed to update auditor');
    return await res.json();
  } catch (err) {
    console.warn('Network error updating auditor, saved locally:', err);
    return merged;
  }
}

// 4. Messages & Walkie-Talkie API
export async function apiFetchMessages(): Promise<ChatMessage[]> {
  try {
    const res = await fetch('/api/messages');
    if (!res.ok) throw new Error('Failed to fetch messages');
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function apiSendMessage(msg: Partial<ChatMessage>): Promise<ChatMessage | null> {
  const finalMsg: ChatMessage = {
    id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderId: msg.senderId || 'unknown',
    senderName: msg.senderName || 'مستخدم',
    senderRole: msg.senderRole || 'branch_cashier',
    targetBranchId: msg.targetBranchId || 'all',
    text: msg.text || '',
    audioUrl: msg.audioUrl,
    audioDuration: msg.audioDuration,
    imageUrl: msg.imageUrl,
    isWalkieTalkie: !!msg.isWalkieTalkie,
    createdAt: msg.createdAt || new Date().toISOString(),
  };

  // 1. Instantly push to Firebase Firestore for instant global cross-device broadcast
  sendMessageToFirestore(finalMsg).catch((err) => {
    console.warn('Firestore instant message send fallback:', err);
  });

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalMsg),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return await res.json();
  } catch (err) {
    console.error('Failed to send message to server:', err);
    return finalMsg;
  }
}

export async function apiUpdateMessage(id: string, text: string): Promise<boolean> {
  // 1. Update in Firestore
  updateMessageInFirestore(id, { text, isEdited: true, editedAt: new Date().toISOString() }).catch((err) => {
    console.warn('Firestore message update fallback:', err);
  });

  // 2. Update on server
  try {
    const res = await fetch(`/api/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Error updating message on server:', err);
    return true;
  }
}

export async function apiDeleteMessage(id: string): Promise<boolean> {
  // 1. Delete from Firestore immediately so other devices lose it in real-time
  deleteMessageFromFirestore(id).catch((err) => {
    console.warn('Firestore message delete fallback:', err);
  });

  // 2. Delete from server
  try {
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Error deleting message from server:', err);
    return true;
  }
}

export async function apiDeleteMessagesBatch(ids: string[]): Promise<boolean> {
  // 1. Delete each from Firestore
  ids.forEach((id) => {
    deleteMessageFromFirestore(id).catch(() => {});
  });

  // 2. Delete batch from server
  try {
    const res = await fetch('/api/messages/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Error deleting messages batch on server:', err);
    return true;
  }
}

export async function apiClearMessages(): Promise<boolean> {
  try {
    const res = await fetch('/api/messages/clear', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

// Live real-time listener across separated phones (Firebase Cloud Firestore + SSE with Polling fallback)
export function subscribeToLiveUpdates(onUpdate: (eventData?: any) => void): () => void {
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let unsubFirestoreChat: (() => void) | null = null;
  let unsubFirestoreTransfers: (() => void) | null = null;
  let unsubFirestoreBranches: (() => void) | null = null;

  // Track known message IDs to only notify on genuinely new messages
  let knownMessageIds = new Set<string>();
  let initialMessagesLoaded = false;

  // 1. Firebase Firestore Instant Real-time Listeners (WebSockets / gRPC Cloud Push)
  try {
    unsubFirestoreChat = subscribeToChatMessages((messages) => {
      if (!initialMessagesLoaded) {
        messages.forEach((m) => knownMessageIds.add(m.id));
        initialMessagesLoaded = true;
        return;
      }

      // Check for newly arrived messages
      for (const m of messages) {
        if (!knownMessageIds.has(m.id)) {
          knownMessageIds.add(m.id);
          // Trigger instant live walkie-talkie / chat alert
          onUpdate({
            type: 'NEW_MESSAGE',
            message: m,
          });
        }
      }
    });

    unsubFirestoreTransfers = subscribeToTransfers((transfers) => {
      if (Array.isArray(transfers) && transfers.length > 0) {
        onUpdate({
          type: 'NEW_TRANSFER',
          transfers: transfers,
        });
      }
    });

    unsubFirestoreBranches = subscribeToBranches((branches) => {
      if (Array.isArray(branches) && branches.length > 0) {
        onUpdate({
          type: 'BRANCHES_UPDATE',
          branches: branches,
        });
      }
    });
  } catch (err) {
    console.warn('Firebase Firestore listeners initialization notice:', err);
  }

  // 2. Server-Sent Events (SSE) fallback
  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onUpdate(parsed);
        } catch {
          onUpdate();
        }
      };
      eventSource.onerror = () => {
        // Fallback to polling if SSE drops
      };
    }
  } catch {
    // SSE not supported
  }

  // 3. Backup polling every 3 seconds to guarantee 100% sync even on low network
  pollInterval = setInterval(() => {
    onUpdate();
  }, 3000);

  return () => {
    if (unsubFirestoreChat) unsubFirestoreChat();
    if (unsubFirestoreTransfers) unsubFirestoreTransfers();
    if (unsubFirestoreBranches) unsubFirestoreBranches();
    if (eventSource) {
      eventSource.close();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}
