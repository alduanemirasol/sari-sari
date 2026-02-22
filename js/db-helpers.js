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
