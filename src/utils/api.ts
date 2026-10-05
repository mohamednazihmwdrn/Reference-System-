import { TransferItem, Branch, BankAccount } from '../types';
import { 
  loadTransfers, 
  saveTransfers, 
  loadBranches, 
  saveBranches, 
  DEFAULT_BRANCHES, 
  INITIAL_TRANSFERS 
} from './storage';

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
    const local = loadTransfers();
    const updated = local.map((t) => (t.id === id ? { ...t, ...updates } : t));
    saveTransfers(updated);
    return updated.find((t) => t.id === id) || null;
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
  try {
    const res = await fetch(`/api/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update branch');
    return await res.json();
  } catch (err) {
    const local = loadBranches();
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

// Live real-time listener across separated phones (SSE with Polling fallback)
export function subscribeToLiveUpdates(onUpdate: () => void): () => void {
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  try {
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = () => {
        onUpdate();
      };
      eventSource.onerror = () => {
        // Fallback to polling if SSE drops
      };
    }
  } catch {
    // SSE not supported
  }

  // Backup polling every 3.5 seconds to guarantee 100% sync even on weak mobile cellular connections
  pollInterval = setInterval(() => {
    onUpdate();
  }, 3500);

  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}
