import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Support large image payloads (e.g. 50MB for multiple photos)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Data storage file
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded photos statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper to save base64 image to server disk file
function saveBase64Image(dataStr: string): string {
  if (!dataStr || typeof dataStr !== 'string') return dataStr;
  if (!dataStr.startsWith('data:image/')) return dataStr; // already an HTTP / relative URL
  try {
    const matches = dataStr.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length < 3) return dataStr;
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save base64 image to disk:', err);
    return dataStr;
  }
}

// Default Seed Data
const DEFAULT_SEED = {
  branches: [
    {
      id: 'b_rawda',
      name: 'معرض الروضة الشريفة',
      code: 'ST-01',
      city: 'الفرع الرئيسي',
      phone: '01029190615',
      pinCode: '1001',
      type: 'store',
      isActive: true,
      defaultCashier: 'كاشير معرض الروضة الشريفة',
    },
    {
      id: 'b_safa',
      name: 'معرض صفا مكرم',
      code: 'ST-02',
      city: 'القاهرة',
      phone: '01022334455',
      pinCode: '2002',
      type: 'store',
      isActive: true,
      defaultCashier: 'كاشير معرض صفا مكرم',
    },
    {
      id: 'b_modern',
      name: 'معرض مودرن',
      code: 'ST-03',
      city: 'القاهرة',
      phone: '01033445566',
      pinCode: '3003',
      type: 'store',
      isActive: true,
      defaultCashier: 'كاشير معرض مودرن',
    },
    {
      id: 'b_nadi',
      name: 'مخزن النادي',
      code: 'WH-01',
      city: 'المعادي',
      phone: '01044556677',
      pinCode: '4004',
      type: 'warehouse',
      isActive: true,
      defaultCashier: 'أمين مخزن النادي',
    },
    {
      id: 'b_nahas',
      name: 'مخزن النحاس',
      code: 'WH-02',
      city: 'مصر الجديدة',
      phone: '01055667788',
      pinCode: '5005',
      type: 'warehouse',
      isActive: true,
      defaultCashier: 'أمين مخزن النحاس',
    },
  ],
  transfers: [] as Array<any>,
  messages: [] as Array<any>,
  bankAccounts: [
    {
      id: 'ba_nbe',
      bankName: 'البنك الأهلي المصري (NBE)',
      accountName: 'شركة الروضة الشريفة',
      accountNumber: '10293847561001',
      instapayIpa: 'alrawda.store@instapay',
      phone: '01029190615',
      isActive: true,
    },
    {
      id: 'ba_cib',
      bankName: 'البنك التجاري الدولي (CIB)',
      accountName: 'شركة الروضة الشريفة - حساب التحصيلات',
      accountNumber: '100049281723',
      instapayIpa: 'alrawda.pos@instapay',
      phone: '01029190615',
      isActive: true,
    },
    {
      id: 'ba_misr',
      bankName: 'بنك مصر (BM)',
      accountName: 'شركة الروضة الشريفة',
      accountNumber: '124009837162',
      instapayIpa: 'alrawda.co@instapay',
      phone: '01029190615',
      isActive: true,
    },
  ],
  auditorPin: '9999',
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_SEED, null, 2), 'utf-8');
      return DEFAULT_SEED;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db file:', err);
    return DEFAULT_SEED;
  }
}

function writeDb(data: typeof DEFAULT_SEED) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    // Notify all SSE clients
    notifyClients();
  } catch (err) {
    console.error('Error writing db file:', err);
  }
}

// Server-Sent Events (SSE) for Real-Time synchronization across separated phones
let sseClients: express.Response[] = [];

function notifyClients(payload: any = { type: 'UPDATE', timestamp: Date.now() }) {
  const dataString = `data: ${JSON.stringify({ ...payload, timestamp: Date.now() })}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(dataString);
    } catch {
      // client disconnected
    }
  });
}

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// ==================== REST API ENDPOINTS ====================

// 1. TRANSFERS API
app.get('/api/transfers', (_req, res) => {
  const db = readDb();
  res.json(db.transfers || []);
});

app.post('/api/transfers', (req, res) => {
  const db = readDb();
  const transferData = { ...req.body };

  // Persist base64 images to server disk so network payloads and db remain tiny
  if (transferData.screenshotUrl) {
    transferData.screenshotUrl = saveBase64Image(transferData.screenshotUrl);
  }
  if (Array.isArray(transferData.images)) {
    transferData.images = transferData.images.map((img: string) => saveBase64Image(img));
  }

  const newTransfer = {
    ...transferData,
    id: transferData.id || `tx_${Date.now()}`,
    createdAt: transferData.createdAt || new Date().toISOString(),
    status: transferData.status || 'pending',
  };

  db.transfers = [newTransfer, ...(db.transfers || [])];
  writeDb(db);
  notifyClients({ type: 'NEW_TRANSFER', transfer: newTransfer });
  res.status(201).json(newTransfer);
});

app.put('/api/transfers/:id', (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const index = (db.transfers || []).findIndex((t: { id: string }) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Transfer not found' });
  }

  const updateData = { ...req.body };
  if (updateData.screenshotUrl) {
    updateData.screenshotUrl = saveBase64Image(updateData.screenshotUrl);
  }
  if (Array.isArray(updateData.images)) {
    updateData.images = updateData.images.map((img: string) => saveBase64Image(img));
  }

  db.transfers[index] = { ...db.transfers[index], ...updateData };
  writeDb(db);
  res.json(db.transfers[index]);
});

app.delete('/api/transfers/:id', (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.transfers = (db.transfers || []).filter((t: { id: string }) => t.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// Clear all transfers completely (System Wipe for production start)
app.post('/api/transfers/clear', (_req, res) => {
  const db = readDb();
  db.transfers = [];
  writeDb(db);
  res.json({ success: true, count: 0 });
});

app.delete('/api/transfers', (_req, res) => {
  const db = readDb();
  db.transfers = [];
  writeDb(db);
  res.json({ success: true, count: 0 });
});

// 2. CHAT & WALKIE-TALKIE (PTT) API
app.get('/api/messages', (_req, res) => {
  const db = readDb();
  res.json(db.messages || []);
});

app.post('/api/messages', (req, res) => {
  const db = readDb();
  const savedImageUrl = req.body.imageUrl ? saveBase64Image(req.body.imageUrl) : null;
  const newMsg = {
    id: req.body.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderId: req.body.senderId,
    senderName: req.body.senderName, // e.g. "كاشير معرض صفا مكرم"
    senderRole: req.body.senderRole,
    targetBranchId: req.body.targetBranchId || 'all', // 'all' for company group chat, or specific branchId
    text: req.body.text || '',
    audioUrl: req.body.audioUrl || null, // voice note / walkie-talkie audio data
    audioDuration: req.body.audioDuration || 0,
    imageUrl: savedImageUrl,
    isWalkieTalkie: Boolean(req.body.isWalkieTalkie), // instant push-to-talk broadcast
    createdAt: new Date().toISOString(),
  };

  db.messages = [...(db.messages || []), newMsg];
  // Retain last 250 messages
  if (db.messages.length > 250) {
    db.messages = db.messages.slice(-250);
  }
  writeDb(db);
  notifyClients({ type: 'NEW_MESSAGE', message: newMsg });
  res.status(201).json(newMsg);
});

app.delete('/api/messages/:id', (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.messages = (db.messages || []).filter((m: { id: string }) => m.id !== id);
  writeDb(db);
  res.json({ success: true });
});

app.post('/api/messages/clear', (_req, res) => {
  const db = readDb();
  db.messages = [];
  writeDb(db);
  notifyClients({ type: 'MESSAGES_CLEARED' });
  res.json({ success: true, count: 0 });
});

// 2. BRANCHES API (Add, Edit PIN, Delete by Reviewer/Admin)
app.get('/api/branches', (_req, res) => {
  const db = readDb();
  res.json(db.branches || DEFAULT_SEED.branches);
});

app.post('/api/branches', (req, res) => {
  const db = readDb();
  const newBranch = {
    id: req.body.id || `b_${Date.now()}`,
    name: req.body.name,
    code: req.body.code || `BR-${Math.floor(10 + Math.random() * 90)}`,
    city: req.body.city || 'الفرع',
    phone: req.body.phone || '',
    pinCode: req.body.pinCode || `${Math.floor(1000 + Math.random() * 9000)}`,
    type: req.body.type || 'store',
    isActive: req.body.isActive !== false,
    defaultCashier: req.body.defaultCashier || 'كاشير الفرع',
  };

  db.branches = [...(db.branches || []), newBranch];
  writeDb(db);
  res.status(201).json(newBranch);
});

app.put('/api/branches/:id', (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const index = (db.branches || []).findIndex((b: { id: string }) => b.id === id);

  if (index === -1) {
    const newBranch = {
      id,
      name: req.body.name || 'فرع جديد',
      code: req.body.code || `BR-${Math.floor(10 + Math.random() * 90)}`,
      city: req.body.city || 'الفرع',
      phone: req.body.phone || '',
      address: req.body.address || '',
      notes: req.body.notes || '',
      pinCode: req.body.pinCode || `${Math.floor(1000 + Math.random() * 9000)}`,
      type: req.body.type || 'store',
      isActive: req.body.isActive !== false,
      defaultCashier: req.body.defaultCashier || 'كاشير الفرع',
    };
    db.branches = [...(db.branches || []), newBranch];
    writeDb(db);
    return res.status(201).json(newBranch);
  }

  db.branches[index] = { ...db.branches[index], ...req.body };
  writeDb(db);
  res.json(db.branches[index]);
});

app.delete('/api/branches/:id', (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.branches = (db.branches || []).filter((b: { id: string }) => b.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// 3. BANK ACCOUNTS API
app.get('/api/bank-accounts', (_req, res) => {
  const db = readDb();
  res.json(db.bankAccounts || DEFAULT_SEED.bankAccounts);
});

// 4. RESET API
app.post('/api/reset', (_req, res) => {
  writeDb(DEFAULT_SEED);
  res.json({ success: true });
});

// Mount Vite or Serve Static Files
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Rawda InstaPay Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
