// ============================================================
// DB HELPERS — schema query helpers
// Depends on: db-store.js (db)
// ============================================================

/** Get all sellable unit options for a product (from product_units table) */
function getProductUnitOptions(product_id) {
  return db.product_units.filter((pu) => pu.product_id === product_id);
}

/** Get a specific product_unit row by product_id + unit_id */
function getProductUnitPricing(product_id, unit_id) {
  return (
    db.product_units.find(
      (pu) => pu.product_id === product_id && pu.unit_id === unit_id,
    ) || null
  );
}

/** Get the current (latest) pricing for a product */
function getProductPricing(product_id) {
  const rows = db.product_pricing
    .filter((p) => p.product_id === product_id)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || null;
}

/** Get the pricing that was active on a given ISO date string */
function getProductPricingAt(product_id, dateStr) {
  const rows = db.product_pricing
    .filter((p) => p.product_id === product_id && p.effective_date <= dateStr)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || getProductPricing(product_id);
}

/** Get category name for a product */
function getProductCategory(product) {
  const cat = db.product_categories.find(
    (c) => c.id === product.product_category_id,
  );
  return cat ? cat.name : "Others";
}

/** Compute outstanding balance for a credit_transaction */
function getCreditBalance(ct) {
  const paid = db.credit_payments
    .filter((p) => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  return Math.max(0, ct.amount_owed - paid);
}

/** Compute credit status for a credit_transaction */
function getCreditStatus(ct) {
  const paid = db.credit_payments
    .filter((p) => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  if (paid <= 0) return "unpaid";
  if (paid >= ct.amount_owed) return "paid";
  return "partial";
}

/** Total unpaid balance for a customer */
function getCustomerDebt(customer_id) {
  return db.credit_transactions
    .filter((ct) => ct.customer_id === customer_id)
    .reduce((sum, ct) => sum + getCreditBalance(ct), 0);
}

/** Get bundle_items rows for a bundle */
function getBundleItems(bundle_id) {
  return db.bundle_items.filter((bi) => bi.bundle_id === bundle_id);
}

/** Calculate retail total for a bundle */
function getBundleRetailTotal(bundle_id) {
  return getBundleItems(bundle_id).reduce((sum, bi) => {
    const p = db.products.find((x) => x.id === bi.product_id);
    const pricing = p ? getProductPricing(p.id) : null;
    return sum + (pricing ? pricing.retail_price * bi.quantity : 0);
  }, 0);
}

// ============================================================
// UNIT + PRICING HELPERS
// ============================================================

/**
 * Returns true for continuous/measurable units (kg, g, L, ml) where
 * fractional quantities are meaningful.  Discrete units (pc, pk) return false.
 */
function isContinuousUnit(unit_id) {
  // unit_ids: 1=pc, 2=L, 3=ml, 4=kg, 5=g, 6=pk
  return [2, 3, 4, 5].includes(unit_id);
}

/**
 * Natural step size for incrementing a continuous unit in the cart UI.
 *   kg / L  → 0.5
 *   g / ml  → 100
 */
function unitStep(unit_id) {
  if (unit_id === 4 || unit_id === 2) return 0.5; // kg, L
  if (unit_id === 5 || unit_id === 3) return 100; // g, ml
  return 1;
}

/**
 * Format a quantity with its unit abbreviation, trimming unnecessary decimals.
 *   fmtQty(1.5, 4)  → "1.5 kg"
 *   fmtQty(3,   1)  → "3"          (no label for piece)
 *   fmtQty(0.5, 2)  → "0.5 L"
 */
function fmtQty(qty, unit_id) {
  const u = db.units.find((x) => x.id === unit_id);
  const num = parseFloat(qty.toFixed(3)); // trim floating-point noise
  const numStr = Number.isInteger(num) ? String(num) : String(num);
  return u && u.id !== 1 && u.id !== 6 ? `${numStr} ${u.abbreviation}` : numStr;
}

/**
 * Resolve the correct unit price for a cart item, correctly gating wholesale
 * behind the "wholesale enabled" check (wholesale_price > 0 && min_qty > 0).
 * Checks product_units first, falls back to product_pricing.
 * Pass dateStr (ISO) for historical snapshot pricing; null = latest.
 *
 * @returns {{ unitPrice: number, saleType: 'retail'|'wholesale' }}
 */
function resolveUnitPrice(product_id, unit_id, quantity, dateStr) {
  const puPricing = getProductUnitPricing(product_id, unit_id);
  if (puPricing) {
    const wsEnabled =
      puPricing.wholesale_price > 0 && puPricing.wholesale_min_qty > 0;
    const isWS = wsEnabled && quantity >= puPricing.wholesale_min_qty;
    return {
      unitPrice: isWS ? puPricing.wholesale_price : puPricing.retail_price,
      saleType: isWS ? "wholesale" : "retail",
    };
  }

  const pricing = dateStr
    ? getProductPricingAt(product_id, dateStr)
    : getProductPricing(product_id);
  if (!pricing) return { unitPrice: 0, saleType: "retail" };

  const wsEnabled =
    pricing.wholesale_price > 0 && pricing.wholesale_min_qty > 0;
  const isWS = wsEnabled && quantity >= pricing.wholesale_min_qty;
  return {
    unitPrice: isWS ? pricing.wholesale_price : pricing.retail_price,
    saleType: isWS ? "wholesale" : "retail",
  };
}

/**
 * Convert a quantity from sold_unit_id into the product's base unit_id
 * using the unit_conversions table.  Returns quantity unchanged if same unit
 * or no conversion path is found (logs a warning).
 */
function convertToBaseUnits(quantity, sold_unit_id, base_unit_id) {
  if (sold_unit_id === base_unit_id) return quantity;

  // Direct: sold → base
  const direct = db.unit_conversions.find(
    (uc) => uc.from_unit_id === sold_unit_id && uc.to_unit_id === base_unit_id,
  );
  if (direct) return quantity * direct.factor;

  // Inverse: base → sold  (divide)
  const inverse = db.unit_conversions.find(
    (uc) => uc.from_unit_id === base_unit_id && uc.to_unit_id === sold_unit_id,
  );
  if (inverse) return quantity / inverse.factor;

  console.warn(
    `tindahan: no unit_conversion found from unit_id ${sold_unit_id} → ${base_unit_id}. Assuming 1:1.`,
  );
  return quantity;
}
