// ============================================================
// DATA STORE — New Schema (new_schema.txt)
// Persisted to localStorage under the key "tindahan_db"
// ============================================================

const DB_KEY = "tindahan_db";

/** Seed / factory-reset data */
const DEFAULT_DB = {
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
  sale_types: [
    { id: 1, name: "retail" },
    { id: 2, name: "wholesale" },
  ],
  stock_log_reasons: [
    { id: 1, name: "restocked" },
    { id: 2, name: "sold" },
    { id: 3, name: "damaged" },
    { id: 4, name: "expired" },
    { id: 5, name: "adjustment" },
  ],
  units: [
    { id: 1, name: "piece", abbreviation: "pc" },
    { id: 2, name: "liter", abbreviation: "L" },
    { id: 3, name: "milliliter", abbreviation: "ml" },
    { id: 4, name: "kilogram", abbreviation: "kg" },
    { id: 5, name: "gram", abbreviation: "g" },
    { id: 6, name: "pack", abbreviation: "pk" },
  ],
  // unit_conversions now has optional product_id for product-specific conversions
  unit_conversions: [
    { id: 1, product_id: null, from_unit_id: 2, to_unit_id: 3, factor: 1000 },
    { id: 2, product_id: null, from_unit_id: 4, to_unit_id: 5, factor: 1000 },
  ],
  product_package_conversions: [],
  products: [],
  // product_pricing: unit_id + label support multi-unit pricing rows
  product_pricing: [],
  bundles: [],
  bundle_items: [],
  customers: [],
  sales: [],
  sale_items: [],
  sale_bundles: [], // bundle sale header rows
  sale_bundle_items: [], // per-product deductions for bundle sales
  credit: [], // renamed from credit_transactions
  credit_payments: [],
  expenses: [],
  stock_logs: [],
  stock_batches: [],

  nextId: {
    products: 1,
    product_pricing: 1,
    product_package_conversions: 1,
    bundles: 1,
    bundle_items: 1,
    customers: 1,
    sales: 1,
    sale_items: 1,
    sale_bundles: 1,
    sale_bundle_items: 1,
    credit: 1,
    credit_payments: 1,
    expenses: 1,
    stock_logs: 1,
    stock_batches: 1,
    unit_conversions: 3,
    units: 7,
  },
};
