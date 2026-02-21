// ============================================================
// DATA STORE — Updated Schema
// ============================================================
let db = {
  product_categories: [
    { id: 1, name: "Candy" },
    { id: 2, name: "Drinks" },
    { id: 3, name: "Snacks" },
    { id: 4, name: "Condiments" },
    { id: 5, name: "Personal Care" },
    { id: 6, name: "Cigarettes" },
    { id: 7, name: "Others" },
  ],
  expense_categories: [
    { id: 1, name: "Kumpra" },
    { id: 2, name: "Tubig" },
    { id: 3, name: "Kuryente" },
    { id: 4, name: "Transportasyon" },
    { id: 5, name: "Mga Bayronon" },
    { id: 6, name: "Uban Pa" },
  ],
  payment_types: [
    { id: 1, name: "cash" },
    { id: 2, name: "credit" },
  ],
  units: [
    { id: 1, name: "piece", abbreviation: "pc" },
    { id: 2, name: "liter", abbreviation: "L" },
    { id: 3, name: "milliliter", abbreviation: "ml" },
    { id: 4, name: "kilogram", abbreviation: "kg" },
    { id: 5, name: "gram", abbreviation: "g" },
    { id: 6, name: "pack", abbreviation: "pk" },
  ],
  unit_conversions: [
    { id: 1, from_unit_id: 2, to_unit_id: 3, factor: 1000 }, // 1L = 1000ml
    { id: 2, from_unit_id: 4, to_unit_id: 5, factor: 1000 }, // 1kg = 1000g
  ],
  products: [
    { id: 1, name: "Snow Bear", product_category_id: 1, unit_id: 1, stock_quantity: 200, image_url: "🍬", is_active: true },
    { id: 2, name: "Chippy", product_category_id: 3, unit_id: 1, stock_quantity: 45, image_url: "🍟", is_active: true },
    { id: 3, name: "Coke 237ml", product_category_id: 2, unit_id: 1, stock_quantity: 24, image_url: "🥤", is_active: true },
    { id: 4, name: "Milo Sachet", product_category_id: 2, unit_id: 1, stock_quantity: 8, image_url: "☕", is_active: true },
    { id: 5, name: "Marlboro Red", product_category_id: 6, unit_id: 1, stock_quantity: 3, image_url: "🚬", is_active: true },
    { id: 6, name: "Lucky Me Pansit", product_category_id: 3, unit_id: 1, stock_quantity: 60, image_url: "🍜", is_active: true },
    { id: 7, name: "Surf Sachet", product_category_id: 5, unit_id: 1, stock_quantity: 80, image_url: "🧼", is_active: true },
    { id: 8, name: "Toyo (soy sauce)", product_category_id: 4, unit_id: 1, stock_quantity: 30, image_url: "🍶", is_active: true },
    { id: 9, name: "Magic Sarap", product_category_id: 4, unit_id: 1, stock_quantity: 120, image_url: "🧂", is_active: true },
    { id: 10, name: "Skyflakes", product_category_id: 3, unit_id: 1, stock_quantity: 15, image_url: "🍘", is_active: true },
  ],
  // product_pricing: one row per product with effective_date for price history
  product_pricing: [
    { id: 1, product_id: 1, retail_price: 1.00, wholesale_price: 0.65, wholesale_min_qty: 100, effective_date: "2025-02-01" },
    { id: 2, product_id: 2, retail_price: 7.00, wholesale_price: 5.00, wholesale_min_qty: 24, effective_date: "2025-02-01" },
    { id: 3, product_id: 3, retail_price: 20.00, wholesale_price: 15.00, wholesale_min_qty: 24, effective_date: "2025-02-01" },
    { id: 4, product_id: 4, retail_price: 8.00, wholesale_price: 6.00, wholesale_min_qty: 50, effective_date: "2025-02-01" },
    { id: 5, product_id: 5, retail_price: 7.00, wholesale_price: 5.50, wholesale_min_qty: 100, effective_date: "2025-02-01" },
    { id: 6, product_id: 6, retail_price: 12.00, wholesale_price: 9.00, wholesale_min_qty: 24, effective_date: "2025-02-01" },
    { id: 7, product_id: 7, retail_price: 6.00, wholesale_price: 4.50, wholesale_min_qty: 36, effective_date: "2025-02-01" },
    { id: 8, product_id: 8, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 20, effective_date: "2025-02-01" },
    { id: 9, product_id: 9, retail_price: 2.00, wholesale_price: 1.50, wholesale_min_qty: 50, effective_date: "2025-02-01" },
    { id: 10, product_id: 10, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 30, effective_date: "2025-02-01" },
  ],
  bundles: [
    { id: 1, bundle_name: "5-pc Snow Bear Deal", bundle_price: 4.00, is_active: true },
    { id: 2, bundle_name: "Chippy 3-pack", bundle_price: 18.00, is_active: true },
    { id: 3, bundle_name: "Merienda Combo", bundle_price: 29.00, is_active: true },
  ],
  bundle_items: [
    { id: 1, bundle_id: 1, product_id: 1, unit_id: 1, quantity: 5 },
    { id: 2, bundle_id: 2, product_id: 2, unit_id: 1, quantity: 3 },
    { id: 3, bundle_id: 3, product_id: 3, unit_id: 1, quantity: 1 },
    { id: 4, bundle_id: 3, product_id: 2, unit_id: 1, quantity: 1 },
    { id: 5, bundle_id: 3, product_id: 1, unit_id: 1, quantity: 3 },
  ],
  sales: [],
  sale_items: [],
  // sale_bundle_items: tracks individual product deductions for bundle sales
  sale_bundle_items: [],
  // stock_batches: tracks incoming stock with expiry info
  stock_batches: [
    {
      id: 1,
      product_id: 1,
      unit_id: 1,
      quantity_received: 200,
      expiration_date: "2026-06-01",
      created_at: "2025-02-15",
      notes: "Opening stock",
    },
  ],
  stock_logs: [
    {
      id: 1,
      product_id: 1,
      unit_id: 1,
      stock_batch_id: 1,
      change_qty: 200,
      reason: "restocked",
      notes: "Opening stock",
      created_at: "2025-02-15",
    },
    {
      id: 2,
      product_id: 5,
      unit_id: 1,
      stock_batch_id: null,
      change_qty: -2,
      reason: "damaged",
      notes: "Basang basang",
      created_at: "2025-02-18",
    },
  ],
  customers: [
    { id: 1, first_name: "Maria", middle_name: "", last_name: "Santos", contact_number: "09171234567", municipality: "", barangay: "Brgy. San Jose", street: "", credit_limit: 1000 },
    { id: 2, first_name: "Jose", middle_name: "", last_name: "Reyes", contact_number: "09281234567", municipality: "", barangay: "Brgy. Poblacion", street: "", credit_limit: 500 },
    { id: 3, first_name: "Ana", middle_name: "", last_name: "Cruz", contact_number: "09391234567", municipality: "", barangay: "Brgy. Santa Cruz", street: "", credit_limit: 1500 },
  ],
  // credit_transactions: fixed at creation; never mutated
  credit_transactions: [
    { id: 1, customer_id: 1, sale_id: null, amount_owed: 85.00, due_date: "2025-03-15", created_at: "2025-02-10" },
    { id: 2, customer_id: 2, sale_id: null, amount_owed: 150.00, due_date: "2025-03-01", created_at: "2025-02-05" },
  ],
  // credit_payments: append-only payment ledger per credit_transaction
  credit_payments: [
    { id: 1, credit_transaction_id: 1, amount_paid: 20.00, paid_at: "2025-02-14", notes: "" },
  ],
  expenses: [
    { id: 1, expense_category_id: 1, amount: 500.00, notes: "Nabili na produkto sa supplier", created_at: "2025-02-15" },
    { id: 2, expense_category_id: 3, amount: 220.00, notes: "Bayad sa kuryente", created_at: "2025-02-01" },
    { id: 3, expense_category_id: 2, amount: 50.00, notes: "Tubig ngayong buwan", created_at: "2025-02-01" },
  ],
  nextId: {
    products: 11,
    product_pricing: 11,
    customers: 4,
    sales: 1,
    sale_items: 1,
    sale_bundle_items: 1,
    credit_transactions: 3,
    credit_payments: 2,
    expenses: 4,
    stock_logs: 3,
    stock_batches: 2,
    bundles: 4,
    bundle_items: 6,
    units: 7,
  },
};

// ============================================================
// SCHEMA HELPERS
// ============================================================

/** Get the current (latest) pricing for a product */
function getProductPricing(product_id) {
  const rows = db.product_pricing
    .filter(p => p.product_id === product_id)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || null;
}

/** Get the pricing that was active on a given ISO date string */
function getProductPricingAt(product_id, dateStr) {
  const rows = db.product_pricing
    .filter(p => p.product_id === product_id && p.effective_date <= dateStr)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || getProductPricing(product_id);
}

/** Get category name for a product */
function getProductCategory(product) {
  const cat = db.product_categories.find(c => c.id === product.product_category_id);
  return cat ? cat.name : "Others";
}

/** Compute outstanding balance for a credit_transaction */
function getCreditBalance(ct) {
  const paid = db.credit_payments
    .filter(p => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  return Math.max(0, ct.amount_owed - paid);
}

/** Compute credit status for a credit_transaction */
function getCreditStatus(ct) {
  const paid = db.credit_payments
    .filter(p => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  if (paid <= 0) return "unpaid";
  if (paid >= ct.amount_owed) return "paid";
  return "partial";
}

/** Total unpaid balance for a customer */
function getCustomerDebt(customer_id) {
  return db.credit_transactions
    .filter(ct => ct.customer_id === customer_id)
    .reduce((sum, ct) => sum + getCreditBalance(ct), 0);
}

/** Get bundle_items rows for a bundle */
function getBundleItems(bundle_id) {
  return db.bundle_items.filter(bi => bi.bundle_id === bundle_id);
}

/** Calculate retail total for a bundle */
function getBundleRetailTotal(bundle_id) {
  return getBundleItems(bundle_id).reduce((sum, bi) => {
    const p = db.products.find(x => x.id === bi.product_id);
    const pricing = p ? getProductPricing(p.id) : null;
    return sum + (pricing ? pricing.retail_price * bi.quantity : 0);
  }, 0);
}

// ============================================================
// APP STATE
// ============================================================
let cart = [];
let cartBundles = []; // { bundle_id, quantity }
let payType = "cash";
let editingProductId = null;
let editingBundleId = null;
let payingCreditTransactionId = null;
let posMode = "products"; // 'products' | 'bundles'
let bundleSelectedItems = {}; // { product_id: qty } for multi bundle modal
let posCategory = "All";
let posSearch = "";