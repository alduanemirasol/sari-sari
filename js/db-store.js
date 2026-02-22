// ============================================================
// DB STORE — localStorage persistence + schema migration
// Depends on: db-seed.js (DEFAULT_DB, DB_KEY)
// ============================================================

function cloneDefaultDb() {
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

/**
 * Migrate old schema data to new schema.
 * Safe to run multiple times (idempotent).
 */
function migrateDb(parsed) {
  // Ensure all new lookup tables exist
  if (!parsed.sale_types) parsed.sale_types = DEFAULT_DB.sale_types;
  if (!parsed.stock_log_reasons)
    parsed.stock_log_reasons = DEFAULT_DB.stock_log_reasons;

  // Migrate credit_transactions → credit
  if (parsed.credit_transactions && !parsed.credit) {
    parsed.credit = parsed.credit_transactions.map((ct) => ({
      id: ct.id,
      customer_id: ct.customer_id,
      sale_id: ct.sale_id,
      amount_owed: ct.amount_owed,
      due_date: ct.due_date || "",
      created_at: ct.created_at,
    }));
    delete parsed.credit_transactions;
  }
  if (!parsed.credit) parsed.credit = [];

  // Ensure nextId has credit key (renamed from credit_transactions)
  if (!parsed.nextId.credit) {
    parsed.nextId.credit = parsed.nextId.credit_transactions || 1;
  }
  if (!parsed.nextId.sale_bundles) parsed.nextId.sale_bundles = 1;

  // Migrate unit_conversions: add product_id field if missing
  if (parsed.unit_conversions) {
    parsed.unit_conversions = parsed.unit_conversions.map((uc) => ({
      ...uc,
      product_id: uc.product_id !== undefined ? uc.product_id : null,
    }));
  }

  // Migrate sale_items: ensure sale_type is a string (retail/wholesale/bundle)
  if (parsed.sale_items) {
    parsed.sale_items = parsed.sale_items.map((si) => ({
      ...si,
      sale_type: si.sale_type || "retail",
    }));
  }

  // Migrate expenses: add expense_date if missing (use created_at)
  if (parsed.expenses) {
    parsed.expenses = parsed.expenses.map((e) => ({
      ...e,
      expense_date: e.expense_date || e.created_at || "",
    }));
  }

  // Ensure sale_bundles table exists
  if (!parsed.sale_bundles) parsed.sale_bundles = [];

  // Migrate old bundle sale_items (bundle_id set) → sale_bundles + update sale_items
  // Only run if we have old-style bundle items that haven't been migrated
  if (parsed.sale_items && parsed.sale_bundles.length === 0) {
    const bundleSaleItems = parsed.sale_items.filter((si) => si.bundle_id);
    if (bundleSaleItems.length > 0) {
      let sbId = parsed.nextId.sale_bundles || 1;
      bundleSaleItems.forEach((si) => {
        // Create a sale_bundles row
        parsed.sale_bundles.push({
          id: sbId,
          sale_id: si.sale_id,
          bundle_id: si.bundle_id,
          quantity_sold: si.quantity_sold,
          unit_price: si.unit_price,
        });
        // Update any sale_bundle_items that referenced sale_item_id → sale_bundle_id
        if (parsed.sale_bundle_items) {
          parsed.sale_bundle_items.forEach((sbi) => {
            if (sbi.sale_item_id === si.id) {
              sbi.sale_bundle_id = sbId;
            }
          });
        }
        sbId++;
      });
      parsed.nextId.sale_bundles = sbId;
      // Remove bundle rows from sale_items
      parsed.sale_items = parsed.sale_items.filter((si) => !si.bundle_id);
    }
  }

  // Migrate stock_logs: string reason → stock_log_reason_id
  if (parsed.stock_logs) {
    const reasonMap = {
      restocked: 1,
      sold: 2,
      damaged: 3,
      expired: 4,
      adjustment: 5,
    };
    parsed.stock_logs = parsed.stock_logs.map((l) => ({
      ...l,
      stock_log_reason_id: l.stock_log_reason_id || reasonMap[l.reason] || 5,
    }));
  }

  // Ensure product_pricing has unit_id and label fields
  if (parsed.product_pricing) {
    parsed.product_pricing = parsed.product_pricing.map((pp) => ({
      ...pp,
      unit_id: pp.unit_id !== undefined ? pp.unit_id : null,
      label: pp.label !== undefined ? pp.label : null,
    }));
  }

  // Remove legacy product_units table (now merged into product_pricing)
  // Keep it in memory for fallback reads but flag as migrated
  if (parsed.product_units && !parsed._product_units_migrated) {
    parsed.product_units.forEach((pu) => {
      // Only add if no product_pricing row exists for this product+unit already
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
          effective_date: "2020-01-01", // historical placeholder
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
