// ============================================================
// APP STATE — shared UI state variables
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
