// ============================================================
// DATA STORE — Updated Schema
// Persisted to localStorage under the key "tindahan_db"
// ============================================================

const DB_KEY = "tindahan_db";

/** Seed / factory-reset data */
const DEFAULT_DB = {
  // ── Lookup tables (required for the app to function) ───────
  product_categories: [
    { id: 1, name: "Candy" },
    { id: 2, name: "Drinks" },
    { id: 3, name: "Snacks" },
    { id: 4, name: "Condiments" },
    { id: 5, name: "Personal Care" },
    { id: 6, name: "Cigarettes" },
    { id: 7, name: "Rice & Grains" },
    { id: 8, name: "Cooking Oil" },
    { id: 9, name: "Canned Goods" },
    { id: 10, name: "Noodles & Pasta" },
    { id: 11, name: "Beverages (Coffee/Tea)" },
    { id: 12, name: "Frozen Foods" },
    { id: 13, name: "Cleaning Supplies" },
    { id: 14, name: "Household Essentials" },
    { id: 15, name: "Others" },
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
    { id: 1, from_unit_id: 2, to_unit_id: 3, factor: 1000 }, // 1 L  = 1000 ml
    { id: 2, from_unit_id: 4, to_unit_id: 5, factor: 1000 }, // 1 kg = 1000 g
  ],

  // ── User data — all empty on first run ─────────────────────
  product_package_conversions: [],
  product_units: [],
  products: [],
  product_pricing: [],
  bundles: [],
  bundle_items: [],
  customers: [],
  sales: [],
  sale_items: [],
  sale_bundle_items: [],
  credit_transactions: [],
  credit_payments: [],
  expenses: [],
  stock_logs: [],
  stock_batches: [],

  nextId: {
    products: 1,
    product_pricing: 1,
    product_units: 1,
    product_package_conversions: 1,
    bundles: 1,
    bundle_items: 1,
    customers: 1,
    sales: 1,
    sale_items: 1,
    sale_bundle_items: 1,
    credit_transactions: 1,
    credit_payments: 1,
    expenses: 1,
    stock_logs: 1,
    stock_batches: 1,
    units: 7, // 6 built-in units already exist
  },
};
