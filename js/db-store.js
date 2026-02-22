// ============================================================
// DB STORE — localStorage persistence + schema migration
// Depends on: db-seed.js (DEFAULT_DB, DB_KEY)
// ============================================================

function cloneDefaultDb() {
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function migrateDb(parsed) {
  // ── Lookup tables ──────────────────────────────────────────
  if (!parsed.sale_types) parsed.sale_types = DEFAULT_DB.sale_types;
  if (!parsed.stock_log_reasons)
    parsed.stock_log_reasons = DEFAULT_DB.stock_log_reasons;
  if (!parsed.sale_statuses) parsed.sale_statuses = DEFAULT_DB.sale_statuses;
  if (!parsed.return_reasons) parsed.return_reasons = DEFAULT_DB.return_reasons;

  // Add "returned" reason if missing
  if (!parsed.stock_log_reasons.find((r) => r.id === 6)) {
    parsed.stock_log_reasons.push({ id: 6, name: "returned" });
  }

  // ── RBAC tables ────────────────────────────────────────────
  if (!parsed.roles) parsed.roles = DEFAULT_DB.roles;
  if (!parsed.permissions) parsed.permissions = DEFAULT_DB.permissions;
  if (!parsed.role_permissions)
    parsed.role_permissions = DEFAULT_DB.role_permissions;
  if (!parsed.users) parsed.users = DEFAULT_DB.users;
  if (!parsed.user_sessions) parsed.user_sessions = [];
  if (!parsed.password_reset_tokens) parsed.password_reset_tokens = [];
  if (!parsed.audit_logs) parsed.audit_logs = [];

  // ── Shift / Session tables ─────────────────────────────────
  if (!parsed.pos_sessions) parsed.pos_sessions = [];
  if (!parsed.session_cash_movements) parsed.session_cash_movements = [];

  // ── Returns tables ─────────────────────────────────────────
  if (!parsed.sale_returns) parsed.sale_returns = [];
  if (!parsed.sale_return_items) parsed.sale_return_items = [];

  // ── nextId entries ─────────────────────────────────────────
  const missingIds = {
    sale_returns: 1,
    sale_return_items: 1,
    users: 2,
    user_sessions: 1,
    password_reset_tokens: 1,
    audit_logs: 1,
    pos_sessions: 1,
    session_cash_movements: 1,
    role_permissions: 80,
  };
  Object.entries(missingIds).forEach(([k, v]) => {
    if (!parsed.nextId[k]) parsed.nextId[k] = v;
  });

  // ── credit_transactions → credit ──────────────────────────
  if (parsed.credit_transactions && !parsed.credit) {
    parsed.credit = parsed.credit_transactions.map((ct) => ({
      id: ct.id,
      customer_id: ct.customer_id,
      sale_id: ct.sale_id,
      amount_owed: ct.amount_owed,
      due_date: ct.due_date || "",
      created_at: ct.created_at,
      created_by: null,
    }));
    delete parsed.credit_transactions;
  }
  if (!parsed.credit) parsed.credit = [];

  if (!parsed.nextId.credit) {
    parsed.nextId.credit = parsed.nextId.credit_transactions || 1;
  }

  // ── Ensure new fields on existing rows ────────────────────

  // sales: add cashier_id, sale_status_id, session_id, voided_by, voided_at, void_reason, discount_approved_by
  if (parsed.sales) {
    parsed.sales = parsed.sales.map((s) => ({
      cashier_id: 1, // default to admin for historical records
      sale_status_id: 1, // completed
      session_id: null,
      voided_by: null,
      voided_at: null,
      void_reason: null,
      discount_approved_by: null,
      ...s,
    }));
  }

  // products: add created_by, updated_by
  if (parsed.products) {
    parsed.products = parsed.products.map((p) => ({
      created_by: p.created_by !== undefined ? p.created_by : 1,
      updated_by: p.updated_by !== undefined ? p.updated_by : 1,
      ...p,
    }));
  }

  // product_pricing: ensure unit_id and label fields + created_by
  if (parsed.product_pricing) {
    parsed.product_pricing = parsed.product_pricing.map((pp) => ({
      unit_id: pp.unit_id !== undefined ? pp.unit_id : null,
      label: pp.label !== undefined ? pp.label : null,
      created_by: pp.created_by !== undefined ? pp.created_by : 1,
      ...pp,
    }));
  }

  // customers: add is_active, created_by, updated_by
  if (parsed.customers) {
    parsed.customers = parsed.customers.map((c) => ({
      is_active: c.is_active !== undefined ? c.is_active : true,
      created_by: c.created_by !== undefined ? c.created_by : 1,
      updated_by: c.updated_by !== undefined ? c.updated_by : 1,
      ...c,
    }));
  }

  // stock_batches: add received_by
  if (parsed.stock_batches) {
    parsed.stock_batches = parsed.stock_batches.map((b) => ({
      received_by: b.received_by !== undefined ? b.received_by : 1,
      ...b,
    }));
  }

  // stock_logs: add performed_by + migrate string reason → reason_id
  const reasonMap = {
    restocked: 1,
    sold: 2,
    damaged: 3,
    expired: 4,
    adjustment: 5,
    returned: 6,
  };
  if (parsed.stock_logs) {
    parsed.stock_logs = parsed.stock_logs.map((l) => ({
      performed_by: l.performed_by !== undefined ? l.performed_by : 1,
      stock_log_reason_id: l.stock_log_reason_id || reasonMap[l.reason] || 5,
      ...l,
    }));
  }

  // credit: add created_by
  if (parsed.credit) {
    parsed.credit = parsed.credit.map((ct) => ({
      created_by: ct.created_by !== undefined ? ct.created_by : 1,
      ...ct,
    }));
  }

  // credit_payments: add received_by
  if (parsed.credit_payments) {
    parsed.credit_payments = parsed.credit_payments.map((cp) => ({
      received_by: cp.received_by !== undefined ? cp.received_by : 1,
      ...cp,
    }));
  }

  // expenses: add recorded_by, approved_by, expense_date
  if (parsed.expenses) {
    parsed.expenses = parsed.expenses.map((e) => ({
      recorded_by: e.recorded_by !== undefined ? e.recorded_by : 1,
      approved_by: e.approved_by !== undefined ? e.approved_by : null,
      expense_date: e.expense_date || e.created_at || "",
      ...e,
    }));
  }

  // bundles: add created_by
  if (parsed.bundles) {
    parsed.bundles = parsed.bundles.map((b) => ({
      created_by: b.created_by !== undefined ? b.created_by : 1,
      ...b,
    }));
  }

  // sale_items: ensure sale_type is a string
  if (parsed.sale_items) {
    parsed.sale_items = parsed.sale_items.map((si) => ({
      ...si,
      sale_type: si.sale_type || "retail",
    }));
  }

  // unit_conversions: add product_id if missing
  if (parsed.unit_conversions) {
    parsed.unit_conversions = parsed.unit_conversions.map((uc) => ({
      ...uc,
      product_id: uc.product_id !== undefined ? uc.product_id : null,
    }));
  }

  // ── sale_bundles migration ─────────────────────────────────
  if (!parsed.nextId.sale_bundles) parsed.nextId.sale_bundles = 1;
  if (!parsed.sale_bundles) parsed.sale_bundles = [];

  if (parsed.sale_items && parsed.sale_bundles.length === 0) {
    const bundleSaleItems = parsed.sale_items.filter((si) => si.bundle_id);
    if (bundleSaleItems.length > 0) {
      let sbId = parsed.nextId.sale_bundles || 1;
      bundleSaleItems.forEach((si) => {
        parsed.sale_bundles.push({
          id: sbId,
          sale_id: si.sale_id,
          bundle_id: si.bundle_id,
          quantity_sold: si.quantity_sold,
          unit_price: si.unit_price,
        });
        if (parsed.sale_bundle_items) {
          parsed.sale_bundle_items.forEach((sbi) => {
            if (sbi.sale_item_id === si.id) sbi.sale_bundle_id = sbId;
          });
        }
        sbId++;
      });
      parsed.nextId.sale_bundles = sbId;
      parsed.sale_items = parsed.sale_items.filter((si) => !si.bundle_id);
    }
  }

  // ── product_units migration ────────────────────────────────
  if (parsed.product_units && !parsed._product_units_migrated) {
    parsed.product_units.forEach((pu) => {
      const exists = parsed.product_pricing.some(
        (pp) => pp.product_id === pu.product_id && pp.unit_id === pu.unit_id,
      );
      if (!exists) {
        parsed.product_pricing.push({
          id: parsed.nextId.product_pricing++,
          product_id: pu.product_id,
          unit_id: pu.unit_id,
          label: pu.label || null,
          retail_price: pu.retail_price,
          wholesale_price: pu.wholesale_price || 0,
          wholesale_min_qty: pu.wholesale_min_qty || 0,
          effective_date: "2020-01-01",
          created_by: 1,
        });
      }
    });
    parsed._product_units_migrated = true;
  }

  return parsed;
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return cloneDefaultDb();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.nextId) return cloneDefaultDb();
    return migrateDb(parsed);
  } catch (e) {
    console.warn("tindahan: failed to parse stored DB, using defaults.", e);
    return cloneDefaultDb();
  }
}

function saveDb() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("tindahan: could not save to localStorage.", e);
  }
}

function resetDb() {
  localStorage.removeItem(DB_KEY);
  db = cloneDefaultDb();
  saveDb();
}

let db = loadDb();
