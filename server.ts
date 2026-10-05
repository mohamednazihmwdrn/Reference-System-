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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Seed Data
const DEFAULT_SEED = {
  branches: [
    {
      id: 'b_rawda',
      name: 'محل الروضة الشريفة',
      code: 'ST-01',
      city: 'الفرع الرئيسي',
      phone: '01029190615',
      pinCode: '1001',
      type: 'store',
      isActive: true,
      defaultCashier: 'كاشير الروضة الشريفة',
    },
    {
      id: 'b_safa',
      name: 'محل صفا مكرم',
      code: 'ST-02',
      city: 'القاهرة',
      phone: '01022334455',
      pinCode: '2002',
      type: 'store',
      isActive: true,
      defaultCashier: 'كاشير صفا مكرم',
    },
    {
      id: 'b_modern',
      name: 'محل مودرن',
      code: 'ST-03',
      city: 'القاهرة',
      phone: '01033445566',
      pinCode: '3003',
      type: 'store',
      isActive: true,
      defaultCashier: 'كاشير محل مودرن',
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
  transfers: [
    {
      id: 'tx_101',
      branchName: 'محل الروضة الشريفة',
      branchId: 'b_rawda',
      invoiceNo: 'طلب #4401',
      amount: 2450.00,
      screenshotUrl: '/src/assets/images/instapay_sample_receipt_1791231113924.jpg',
      images: [
        '/src/assets/images/paper_invoice_receipt_1791231743153.jpg',
        '/src/assets/images/instapay_sample_receipt_1791231113924.jpg'
      ],
      status: 'pending',
      referenceNo: 'IP20261005882194',
      senderName: 'طارق حسام عبد الرحمن',
      senderIpaOrPhone: 'tarek.hossam@instapay',
      cashierName: 'كاشير الروضة الشريفة',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      bankAccountUsed: 'alrawda.store@instapay',
      customerPhone: '01099234567',
    },
    {
      id: 'tx_102',
      branchName: 'محل صفا مكرم',
      branchId: 'b_safa',
      invoiceNo: 'طلب #4402',
      amount: 850.00,
      screenshotUrl: '/src/assets/images/instapay_sample_receipt_two_1791231126875.jpg',
      images: [
        '/src/assets/images/paper_invoice_receipt_1791231743153.jpg',
        '/src/assets/images/instapay_sample_receipt_two_1791231126875.jpg'
      ],
      status: 'pending',
      referenceNo: 'IP20261005771029',
      senderName: 'مينا كمال غطاس',
      senderIpaOrPhone: '01288334455',
      cashierName: 'كاشير صفا مكرم',
      createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
      bankAccountUsed: 'alrawda.pos@instapay',
      customerPhone: '01288334455',
    },
    {
      id: 'tx_103',
      branchName: 'محل مودرن',
      branchId: 'b_modern',
      invoiceNo: 'طلب #4398',
      amount: 4720.50,
      screenshotUrl: '/src/assets/images/instapay_sample_receipt_1791231113924.jpg',
      images: [
        '/src/assets/images/paper_invoice_receipt_1791231743153.jpg',
        '/src/assets/images/instapay_sample_receipt_1791231113924.jpg'
      ],
      status: 'pending',
      referenceNo: 'IP20261005663910',
      senderName: 'سارة خالد الديب',
      senderIpaOrPhone: 'sara.eldeeb@instapay',
      cashierName: 'كاشير محل مودرن',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      bankAccountUsed: 'alrawda.store@instapay',
      customerPhone: '01155443322',
    },
  ],
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

function notifyClients() {
  sseClients.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'UPDATE', timestamp: Date.now() })}\n\n`);
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
  const newTransfer = {
    ...req.body,
    id: req.body.id || `tx_${Date.now()}`,
    createdAt: req.body.createdAt || new Date().toISOString(),
    status: req.body.status || 'pending',
  };

  db.transfers = [newTransfer, ...(db.transfers || [])];
  writeDb(db);
  res.status(201).json(newTransfer);
});

app.put('/api/transfers/:id', (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const index = (db.transfers || []).findIndex((t: { id: string }) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Transfer not found' });
  }

  db.transfers[index] = { ...db.transfers[index], ...req.body };
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
    return res.status(404).json({ error: 'Branch not found' });
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
