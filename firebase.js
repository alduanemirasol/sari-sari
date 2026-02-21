// ============================================================
// FIREBASE INTEGRATION — Tindahan ni Duane
// ============================================================
// Strategy:
//   1. On startup, load all Firestore collections into the local
//      `db` object so the rest of the app works unchanged.
//   2. Every write that mutates `db` is shadowed by a Firestore
//      write via the FireDB helpers below.
//   3. Static / seed data (categories, units, payment_types,
//      unit_conversions) is kept in data.js; only transactional /
//      mutable collections are synced to Firestore.
// ============================================================

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    writeBatch,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

// ── Collections that live in Firestore ───────────────────────
// (Static lookup tables stay in data.js / memory only)
const SYNCED_COLLECTIONS = [
    "products",
    "product_pricing",
    "bundles",
    "bundle_items",
    "stock_batches",
    "stock_logs",
    "customers",
    "sales",
    "sale_items",
    "sale_bundle_items",
    "credit_transactions",
    "credit_payments",
    "expenses",
];

// ── Low-level helpers ─────────────────────────────────────────

/**
 * Return the Firestore collection ref for a given table name.
 */
function col(tableName) {
    return collection(firestore, tableName);
}

/**
 * Return a doc ref using the numeric id as the Firestore document id.
 */
function docRef(tableName, id) {
    return doc(firestore, tableName, String(id));
}

/**
 * Strip undefined values — Firestore rejects them.
 */
function clean(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined)
    );
}

// ── Public FireDB API ─────────────────────────────────────────

/**
 * Write (create or overwrite) a document.
 * Uses the record's `id` field as the Firestore doc id.
 */
async function fbSet(tableName, record) {
    try {
        await setDoc(docRef(tableName, record.id), clean(record));
    } catch (e) {
        console.error(`[Firebase] fbSet ${tableName}/${record.id}:`, e);
    }
}

/**
 * Partially update a document.
 */
async function fbUpdate(tableName, id, fields) {
    try {
        await updateDoc(docRef(tableName, id), clean(fields));
    } catch (e) {
        console.error(`[Firebase] fbUpdate ${tableName}/${id}:`, e);
    }
}

/**
 * Delete a document (use only for hard deletes; prefer fbUpdate for soft deletes).
 */
async function fbDelete(tableName, id) {
    try {
        await deleteDoc(docRef(tableName, id));
    } catch (e) {
        console.error(`[Firebase] fbDelete ${tableName}/${id}:`, e);
    }
}

/**
 * Batch-write an entire array (used during seed / migration).
 */
async function fbBatchWrite(tableName, records) {
    const CHUNK = 499; // Firestore batch limit
    for (let i = 0; i < records.length; i += CHUNK) {
        const batch = writeBatch(firestore);
        records.slice(i, i + CHUNK).forEach((r) => {
            batch.set(docRef(tableName, r.id), clean(r));
        });
        await batch.commit();
    }
}

/**
 * Load all documents from a Firestore collection into a JS array.
 * Documents are converted back to their original numeric types where
 * needed (Firestore stores strings as-is but numbers stay numbers).
 */
async function fbLoadAll(tableName) {
    const snap = await getDocs(col(tableName));
    return snap.docs.map((d) => {
        const data = d.data();
        // Ensure numeric id field (we store it explicitly)
        if (data.id !== undefined) data.id = Number(data.id);
        return data;
    });
}

// ── Startup: load Firestore → db ─────────────────────────────

/**
 * Load all synced collections from Firestore into the in-memory `db`.
 * Falls back to the seed data already in `db` if Firestore is empty.
 */
async function loadFirestoreIntoDb() {
    const banner = showLoadingBanner("📡 Nag-kokonekta sa cloud…");
    try {
        for (const tableName of SYNCED_COLLECTIONS) {
            const records = await fbLoadAll(tableName);
            if (records.length > 0) {
                db[tableName] = records;
                console.log(`[Firebase] Loaded ${records.length} records from ${tableName}`);
            } else {
                // Empty collection → seed Firestore with the demo data from data.js
                console.log(`[Firebase] Seeding ${tableName} with ${db[tableName].length} demo records…`);
                await fbBatchWrite(tableName, db[tableName]);
            }
        }

        // Recalculate nextId counters from loaded data
        recalculateNextIds();

        hideLoadingBanner(banner);
        showToast("✅ Nakakonekta sa Firebase!", "success");
        return true;
    } catch (e) {
        console.error("[Firebase] loadFirestoreIntoDb error:", e);
        hideLoadingBanner(banner);
        showToast("⚠️ Firebase error — nag-offline mode.", "warning");
        return false;
    }
}

function recalculateNextIds() {
    const tables = [
        "products", "product_pricing", "customers", "sales",
        "sale_items", "sale_bundle_items", "credit_transactions",
        "credit_payments", "expenses", "stock_logs", "stock_batches",
        "bundles", "bundle_items", "units",
    ];
    tables.forEach((t) => {
        if (db[t] && db[t].length > 0) {
            const maxId = Math.max(...db[t].map((r) => r.id || 0));
            db.nextId[t] = maxId + 1;
        }
    });
}

// ── Loading banner ────────────────────────────────────────────
function showLoadingBanner(msg) {
    const el = document.createElement("div");
    el.id = "firebase-loading-banner";
    el.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:9999;" +
        "background:var(--accent,#f59e0b);color:#fff;" +
        "text-align:center;padding:10px;font-weight:600;font-size:14px;";
    el.textContent = msg;
    document.body.prepend(el);
    return el;
}
function hideLoadingBanner(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ── Expose helpers globally so script.js can call them ───────
window.fbSet = fbSet;
window.fbUpdate = fbUpdate;
window.fbDelete = fbDelete;

// ── Bootstrap ─────────────────────────────────────────────────
// Called by index.html after all scripts have loaded.
window.initFirebase = async function () {
    await loadFirestoreIntoDb();
    // Re-run the initial renders now that real data is loaded
    renderDashboard();
    updateUtangBadge();
};
