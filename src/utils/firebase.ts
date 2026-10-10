import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  getDocFromServer,
  deleteDoc,
  updateDoc 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TransferItem, ChatMessage, Branch } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
// CRITICAL: Must pass databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Compliant Error Handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email || null,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on application boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or network restricted. Checking config...");
    }
  }
}
testConnection();

// --- Realtime Firestore Collections Listeners & Actions ---

/**
 * Realtime listener for Transfers across separated devices & phones
 */
export function subscribeToTransfers(
  onUpdate: (transfers: TransferItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const transfersColl = collection(db, 'transfers');
  const q = query(transfersColl, orderBy('createdAt', 'desc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: TransferItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as TransferItem;
        items.push({
          ...data,
          id: docSnap.id
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Transfers onSnapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'transfers');
    }
  );
}

/**
 * Save or update a transfer in Firestore
 */
export async function saveTransferToFirestore(transfer: TransferItem): Promise<void> {
  const path = `transfers/${transfer.id}`;
  try {
    const docRef = doc(db, 'transfers', transfer.id);
    // Sanitize undefined fields
    const cleanData = JSON.parse(JSON.stringify(transfer));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a transfer from Firestore
 */
export async function deleteTransferFromFirestore(id: string): Promise<void> {
  const path = `transfers/${id}`;
  try {
    const docRef = doc(db, 'transfers', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Realtime listener for Chat & Instant Walkie-Talkie broadcasts across phones
 */
export function subscribeToChatMessages(
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  const messagesColl = collection(db, 'messages');
  const q = query(messagesColl, orderBy('createdAt', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ChatMessage;
        msgs.push({
          ...data,
          id: docSnap.id
        });
      });
      onUpdate(msgs);
    },
    (error) => {
      console.warn('Messages onSnapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'messages');
    }
  );
}

/**
 * Send an instant chat message or Walkie-Talkie voice transmission to Firestore
 */
export async function sendMessageToFirestore(msg: ChatMessage): Promise<void> {
  const path = `messages/${msg.id}`;
  try {
    const docRef = doc(db, 'messages', msg.id);
    const cleanMsg = JSON.parse(JSON.stringify(msg));
    await setDoc(docRef, cleanMsg, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Permanently delete a chat message from Firestore so it disappears for all devices
 */
export async function deleteMessageFromFirestore(id: string): Promise<void> {
  const path = `messages/${id}`;
  try {
    const docRef = doc(db, 'messages', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Update a chat message in Firestore (e.g. edit text)
 */
export async function updateMessageInFirestore(id: string, updates: Partial<ChatMessage>): Promise<void> {
  const path = `messages/${id}`;
  try {
    const docRef = doc(db, 'messages', id);
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Realtime listener for Branches configuration across all stores
 */
export function subscribeToBranches(
  onUpdate: (branches: Branch[]) => void,
  onError?: (err: any) => void
): () => void {
  const branchesColl = collection(db, 'branches');

  return onSnapshot(
    branchesColl,
    (snapshot) => {
      const branches: Branch[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Branch;
        branches.push({
          ...data,
          id: docSnap.id
        });
      });
      if (branches.length > 0) {
        onUpdate(branches);
      }
    },
    (error) => {
      console.warn('Branches onSnapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'branches');
    }
  );
}

/**
 * Save or update branch in Firestore
 */
export async function saveBranchToFirestore(branch: Branch): Promise<void> {
  const path = `branches/${branch.id}`;
  try {
    const docRef = doc(db, 'branches', branch.id);
    const cleanData = JSON.parse(JSON.stringify(branch));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
