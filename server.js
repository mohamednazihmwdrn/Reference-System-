import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const isProduction = process.env.NODE_ENV === "production";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DEFAULT_SEED = {
  branches: [
    {
      id: "b_rawda",
      name: "\u0645\u062D\u0644 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629",
      code: "ST-01",
      city: "\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A",
      phone: "01029190615",
      pinCode: "1001",
      type: "store",
      isActive: true,
      defaultCashier: "\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629"
    },
    {
      id: "b_safa",
      name: "\u0645\u062D\u0644 \u0635\u0641\u0627 \u0645\u0643\u0631\u0645",
      code: "ST-02",
      city: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629",
      phone: "01022334455",
      pinCode: "2002",
      type: "store",
      isActive: true,
      defaultCashier: "\u0643\u0627\u0634\u064A\u0631 \u0635\u0641\u0627 \u0645\u0643\u0631\u0645"
    },
    {
      id: "b_modern",
      name: "\u0645\u062D\u0644 \u0645\u0648\u062F\u0631\u0646",
      code: "ST-03",
      city: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629",
      phone: "01033445566",
      pinCode: "3003",
      type: "store",
      isActive: true,
      defaultCashier: "\u0643\u0627\u0634\u064A\u0631 \u0645\u062D\u0644 \u0645\u0648\u062F\u0631\u0646"
    },
    {
      id: "b_nadi",
      name: "\u0645\u062E\u0632\u0646 \u0627\u0644\u0646\u0627\u062F\u064A",
      code: "WH-01",
      city: "\u0627\u0644\u0645\u0639\u0627\u062F\u064A",
      phone: "01044556677",
      pinCode: "4004",
      type: "warehouse",
      isActive: true,
      defaultCashier: "\u0623\u0645\u064A\u0646 \u0645\u062E\u0632\u0646 \u0627\u0644\u0646\u0627\u062F\u064A"
    },
    {
      id: "b_nahas",
      name: "\u0645\u062E\u0632\u0646 \u0627\u0644\u0646\u062D\u0627\u0633",
      code: "WH-02",
      city: "\u0645\u0635\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629",
      phone: "01055667788",
      pinCode: "5005",
      type: "warehouse",
      isActive: true,
      defaultCashier: "\u0623\u0645\u064A\u0646 \u0645\u062E\u0632\u0646 \u0627\u0644\u0646\u062D\u0627\u0633"
    }
  ],
  transfers: [
    {
      id: "tx_101",
      branchName: "\u0645\u062D\u0644 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629",
      branchId: "b_rawda",
      invoiceNo: "\u0637\u0644\u0628 #4401",
      amount: 2450,
      screenshotUrl: "/src/assets/images/instapay_sample_receipt_1791231113924.jpg",
      images: [
        "/src/assets/images/paper_invoice_receipt_1791231743153.jpg",
        "/src/assets/images/instapay_sample_receipt_1791231113924.jpg"
      ],
      status: "pending",
      referenceNo: "IP20261005882194",
      senderName: "\u0637\u0627\u0631\u0642 \u062D\u0633\u0627\u0645 \u0639\u0628\u062F \u0627\u0644\u0631\u062D\u0645\u0646",
      senderIpaOrPhone: "tarek.hossam@instapay",
      cashierName: "\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629",
      createdAt: new Date(Date.now() - 1e3 * 60 * 12).toISOString(),
      bankAccountUsed: "alrawda.store@instapay",
      customerPhone: "01099234567"
    },
    {
      id: "tx_102",
      branchName: "\u0645\u062D\u0644 \u0635\u0641\u0627 \u0645\u0643\u0631\u0645",
      branchId: "b_safa",
      invoiceNo: "\u0637\u0644\u0628 #4402",
      amount: 850,
      screenshotUrl: "/src/assets/images/instapay_sample_receipt_two_1791231126875.jpg",
      images: [
        "/src/assets/images/paper_invoice_receipt_1791231743153.jpg",
        "/src/assets/images/instapay_sample_receipt_two_1791231126875.jpg"
      ],
      status: "pending",
      referenceNo: "IP20261005771029",
      senderName: "\u0645\u064A\u0646\u0627 \u0643\u0645\u0627\u0644 \u063A\u0637\u0627\u0633",
      senderIpaOrPhone: "01288334455",
      cashierName: "\u0643\u0627\u0634\u064A\u0631 \u0635\u0641\u0627 \u0645\u0643\u0631\u0645",
      createdAt: new Date(Date.now() - 1e3 * 60 * 28).toISOString(),
      bankAccountUsed: "alrawda.pos@instapay",
      customerPhone: "01288334455"
    },
    {
      id: "tx_103",
      branchName: "\u0645\u062D\u0644 \u0645\u0648\u062F\u0631\u0646",
      branchId: "b_modern",
      invoiceNo: "\u0637\u0644\u0628 #4398",
      amount: 4720.5,
      screenshotUrl: "/src/assets/images/instapay_sample_receipt_1791231113924.jpg",
      images: [
        "/src/assets/images/paper_invoice_receipt_1791231743153.jpg",
        "/src/assets/images/instapay_sample_receipt_1791231113924.jpg"
      ],
      status: "pending",
      referenceNo: "IP20261005663910",
      senderName: "\u0633\u0627\u0631\u0629 \u062E\u0627\u0644\u062F \u0627\u0644\u062F\u064A\u0628",
      senderIpaOrPhone: "sara.eldeeb@instapay",
      cashierName: "\u0643\u0627\u0634\u064A\u0631 \u0645\u062D\u0644 \u0645\u0648\u062F\u0631\u0646",
      createdAt: new Date(Date.now() - 1e3 * 60 * 45).toISOString(),
      bankAccountUsed: "alrawda.store@instapay",
      customerPhone: "01155443322"
    }
  ],
  bankAccounts: [
    {
      id: "ba_nbe",
      bankName: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0623\u0647\u0644\u064A \u0627\u0644\u0645\u0635\u0631\u064A (NBE)",
      accountName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629",
      accountNumber: "10293847561001",
      instapayIpa: "alrawda.store@instapay",
      phone: "01029190615",
      isActive: true
    },
    {
      id: "ba_cib",
      bankName: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0627\u0644\u062F\u0648\u0644\u064A (CIB)",
      accountName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629 - \u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A",
      accountNumber: "100049281723",
      instapayIpa: "alrawda.pos@instapay",
      phone: "01029190615",
      isActive: true
    },
    {
      id: "ba_misr",
      bankName: "\u0628\u0646\u0643 \u0645\u0635\u0631 (BM)",
      accountName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0631\u0648\u0636\u0629 \u0627\u0644\u0634\u0631\u064A\u0641\u0629",
      accountNumber: "124009837162",
      instapayIpa: "alrawda.co@instapay",
      phone: "01029190615",
      isActive: true
    }
  ],
  auditorPin: "9999"
};
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_SEED, null, 2), "utf-8");
      return DEFAULT_SEED;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading db file:", err);
    return DEFAULT_SEED;
  }
}
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    notifyClients();
  } catch (err) {
    console.error("Error writing db file:", err);
  }
}
let sseClients = [];
function notifyClients() {
  sseClients.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify({ type: "UPDATE", timestamp: Date.now() })}

`);
    } catch {
    }
  });
}
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  sseClients.push(res);
  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});
app.get("/api/transfers", (_req, res) => {
  const db = readDb();
  res.json(db.transfers || []);
});
app.post("/api/transfers", (req, res) => {
  const db = readDb();
  const newTransfer = {
    ...req.body,
    id: req.body.id || `tx_${Date.now()}`,
    createdAt: req.body.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    status: req.body.status || "pending"
  };
  db.transfers = [newTransfer, ...db.transfers || []];
  writeDb(db);
  res.status(201).json(newTransfer);
});
app.put("/api/transfers/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const index = (db.transfers || []).findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Transfer not found" });
  }
  db.transfers[index] = { ...db.transfers[index], ...req.body };
  writeDb(db);
  res.json(db.transfers[index]);
});
app.delete("/api/transfers/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.transfers = (db.transfers || []).filter((t) => t.id !== id);
  writeDb(db);
  res.json({ success: true });
});
app.get("/api/branches", (_req, res) => {
  const db = readDb();
  res.json(db.branches || DEFAULT_SEED.branches);
});
app.post("/api/branches", (req, res) => {
  const db = readDb();
  const newBranch = {
    id: req.body.id || `b_${Date.now()}`,
    name: req.body.name,
    code: req.body.code || `BR-${Math.floor(10 + Math.random() * 90)}`,
    city: req.body.city || "\u0627\u0644\u0641\u0631\u0639",
    phone: req.body.phone || "",
    pinCode: req.body.pinCode || `${Math.floor(1e3 + Math.random() * 9e3)}`,
    type: req.body.type || "store",
    isActive: req.body.isActive !== false,
    defaultCashier: req.body.defaultCashier || "\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0641\u0631\u0639"
  };
  db.branches = [...db.branches || [], newBranch];
  writeDb(db);
  res.status(201).json(newBranch);
});
app.put("/api/branches/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const index = (db.branches || []).findIndex((b) => b.id === id);
  if (index === -1) {
    const newBranch = {
      id,
      name: req.body.name || "\u0641\u0631\u0639 \u062C\u062F\u064A\u062F",
      code: req.body.code || `BR-${Math.floor(10 + Math.random() * 90)}`,
      city: req.body.city || "\u0627\u0644\u0641\u0631\u0639",
      phone: req.body.phone || "",
      address: req.body.address || "",
      notes: req.body.notes || "",
      pinCode: req.body.pinCode || `${Math.floor(1e3 + Math.random() * 9e3)}`,
      type: req.body.type || "store",
      isActive: req.body.isActive !== false,
      defaultCashier: req.body.defaultCashier || "\u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0641\u0631\u0639"
    };
    db.branches = [...db.branches || [], newBranch];
    writeDb(db);
    return res.status(201).json(newBranch);
  }
  db.branches[index] = { ...db.branches[index], ...req.body };
  writeDb(db);
  res.json(db.branches[index]);
});
app.delete("/api/branches/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  db.branches = (db.branches || []).filter((b) => b.id !== id);
  writeDb(db);
  res.json({ success: true });
});
app.get("/api/bank-accounts", (_req, res) => {
  const db = readDb();
  res.json(db.bankAccounts || DEFAULT_SEED.bankAccounts);
});
app.post("/api/reset", (_req, res) => {
  writeDb(DEFAULT_SEED);
  res.json({ success: true });
});
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Rawda InstaPay Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
