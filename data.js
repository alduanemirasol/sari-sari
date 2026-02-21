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
    // Candy
    { id: 1, name: "Snow Bear", product_category_id: 1, unit_id: 1, stock_quantity: 200, image_url: "🍬", is_active: true },
    { id: 11, name: "Gummy Bears", product_category_id: 1, unit_id: 1, stock_quantity: 150, image_url: "🐻", is_active: true },
    { id: 12, name: "Choc Nut", product_category_id: 1, unit_id: 1, stock_quantity: 80, image_url: "🍫", is_active: true },
    { id: 13, name: "Pik-nik Sticks", product_category_id: 1, unit_id: 1, stock_quantity: 120, image_url: "🍭", is_active: true },
    // Drinks
    { id: 3, name: "Coke 237ml", product_category_id: 2, unit_id: 1, stock_quantity: 24, image_url: "🥤", is_active: true },
    { id: 4, name: "Milo Sachet", product_category_id: 2, unit_id: 1, stock_quantity: 8, image_url: "☕", is_active: true },
    { id: 14, name: "Royal 237ml", product_category_id: 2, unit_id: 1, stock_quantity: 18, image_url: "🧃", is_active: true },
    { id: 15, name: "C2 Apple 230ml", product_category_id: 2, unit_id: 1, stock_quantity: 30, image_url: "🍵", is_active: true },
    { id: 16, name: "Zesto Orange 250ml", product_category_id: 2, unit_id: 1, stock_quantity: 48, image_url: "🍊", is_active: true },
    { id: 17, name: "Cobra Energy Drink", product_category_id: 2, unit_id: 1, stock_quantity: 12, image_url: "⚡", is_active: true },
    // Snacks
    { id: 2, name: "Chippy", product_category_id: 3, unit_id: 1, stock_quantity: 45, image_url: "🍟", is_active: true },
    { id: 6, name: "Lucky Me Pansit", product_category_id: 3, unit_id: 1, stock_quantity: 60, image_url: "🍜", is_active: true },
    { id: 10, name: "Skyflakes", product_category_id: 3, unit_id: 1, stock_quantity: 15, image_url: "🍘", is_active: true },
    { id: 18, name: "Nova Country Cheddar", product_category_id: 3, unit_id: 1, stock_quantity: 36, image_url: "🧀", is_active: true },
    { id: 19, name: "Piattos Cheese", product_category_id: 3, unit_id: 1, stock_quantity: 24, image_url: "🥔", is_active: true },
    { id: 20, name: "Oishi Prawn Crackers", product_category_id: 3, unit_id: 1, stock_quantity: 40, image_url: "🦐", is_active: true },
    { id: 21, name: "Rebisco Crackers", product_category_id: 3, unit_id: 1, stock_quantity: 50, image_url: "🫙", is_active: true },
    // Condiments
    { id: 8, name: "Toyo (soy sauce)", product_category_id: 4, unit_id: 1, stock_quantity: 30, image_url: "🍶", is_active: true },
    { id: 9, name: "Magic Sarap", product_category_id: 4, unit_id: 1, stock_quantity: 120, image_url: "🧂", is_active: true },
    { id: 22, name: "Knorr Sinigang Mix", product_category_id: 4, unit_id: 1, stock_quantity: 60, image_url: "🍲", is_active: true },
    { id: 23, name: "UFC Banana Ketchup", product_category_id: 4, unit_id: 1, stock_quantity: 25, image_url: "🍅", is_active: true },
    { id: 24, name: "Datu Puti Vinegar", product_category_id: 4, unit_id: 1, stock_quantity: 20, image_url: "🫗", is_active: true },
    // Personal Care
    { id: 7, name: "Surf Sachet", product_category_id: 5, unit_id: 1, stock_quantity: 80, image_url: "🧼", is_active: true },
    { id: 25, name: "Safeguard Bar Soap", product_category_id: 5, unit_id: 1, stock_quantity: 30, image_url: "🫧", is_active: true },
    { id: 26, name: "Colgate Sachet", product_category_id: 5, unit_id: 1, stock_quantity: 60, image_url: "🪥", is_active: true },
    { id: 27, name: "Head & Shoulders Sachet", product_category_id: 5, unit_id: 1, stock_quantity: 45, image_url: "💆", is_active: true },
    { id: 28, name: "Whisper Pad (solo)", product_category_id: 5, unit_id: 1, stock_quantity: 40, image_url: "🌸", is_active: true },
    // Cigarettes
    { id: 5, name: "Marlboro Red", product_category_id: 6, unit_id: 1, stock_quantity: 3, image_url: "🚬", is_active: true },
    { id: 29, name: "Philip Morris", product_category_id: 6, unit_id: 1, stock_quantity: 10, image_url: "🚬", is_active: true },
    { id: 30, name: "Fortune Menthol", product_category_id: 6, unit_id: 1, stock_quantity: 20, image_url: "🌿", is_active: true },
    // Others
    { id: 31, name: "Disposable Lighter", product_category_id: 7, unit_id: 1, stock_quantity: 15, image_url: "🔥", is_active: true },
    { id: 32, name: "Ballpen (black)", product_category_id: 7, unit_id: 1, stock_quantity: 25, image_url: "✏️", is_active: true },
    { id: 33, name: "Candle (small)", product_category_id: 7, unit_id: 1, stock_quantity: 50, image_url: "🕯️", is_active: true },
  ],
  product_pricing: [
    // Candy
    { id: 1, product_id: 1, retail_price: 1.00, wholesale_price: 0.65, wholesale_min_qty: 100, effective_date: "2025-01-01" },
    { id: 11, product_id: 11, retail_price: 1.00, wholesale_price: 0.70, wholesale_min_qty: 100, effective_date: "2025-01-01" },
    { id: 12, product_id: 12, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 50, effective_date: "2025-01-01" },
    { id: 13, product_id: 13, retail_price: 1.00, wholesale_price: 0.70, wholesale_min_qty: 100, effective_date: "2025-01-01" },
    // Drinks
    { id: 3, product_id: 3, retail_price: 20.00, wholesale_price: 15.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 4, product_id: 4, retail_price: 8.00, wholesale_price: 6.00, wholesale_min_qty: 50, effective_date: "2025-01-01" },
    { id: 14, product_id: 14, retail_price: 20.00, wholesale_price: 15.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 15, product_id: 15, retail_price: 25.00, wholesale_price: 20.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 16, product_id: 16, retail_price: 10.00, wholesale_price: 7.50, wholesale_min_qty: 48, effective_date: "2025-01-01" },
    { id: 17, product_id: 17, retail_price: 35.00, wholesale_price: 28.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    // Snacks
    { id: 2, product_id: 2, retail_price: 7.00, wholesale_price: 5.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 6, product_id: 6, retail_price: 12.00, wholesale_price: 9.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 10, product_id: 10, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 30, effective_date: "2025-01-01" },
    { id: 18, product_id: 18, retail_price: 8.00, wholesale_price: 6.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 19, product_id: 19, retail_price: 12.00, wholesale_price: 9.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 20, product_id: 20, retail_price: 7.00, wholesale_price: 5.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 21, product_id: 21, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 36, effective_date: "2025-01-01" },
    // Condiments
    { id: 8, product_id: 8, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 20, effective_date: "2025-01-01" },
    { id: 9, product_id: 9, retail_price: 2.00, wholesale_price: 1.50, wholesale_min_qty: 50, effective_date: "2025-01-01" },
    { id: 22, product_id: 22, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    { id: 23, product_id: 23, retail_price: 15.00, wholesale_price: 11.00, wholesale_min_qty: 12, effective_date: "2025-01-01" },
    { id: 24, product_id: 24, retail_price: 10.00, wholesale_price: 7.00, wholesale_min_qty: 12, effective_date: "2025-01-01" },
    // Personal Care
    { id: 7, product_id: 7, retail_price: 6.00, wholesale_price: 4.50, wholesale_min_qty: 36, effective_date: "2025-01-01" },
    { id: 25, product_id: 25, retail_price: 20.00, wholesale_price: 15.00, wholesale_min_qty: 12, effective_date: "2025-01-01" },
    { id: 26, product_id: 26, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 36, effective_date: "2025-01-01" },
    { id: 27, product_id: 27, retail_price: 6.00, wholesale_price: 4.50, wholesale_min_qty: 36, effective_date: "2025-01-01" },
    { id: 28, product_id: 28, retail_price: 8.00, wholesale_price: 6.00, wholesale_min_qty: 24, effective_date: "2025-01-01" },
    // Cigarettes
    { id: 5, product_id: 5, retail_price: 7.00, wholesale_price: 5.50, wholesale_min_qty: 100, effective_date: "2025-01-01" },
    { id: 29, product_id: 29, retail_price: 7.00, wholesale_price: 5.50, wholesale_min_qty: 100, effective_date: "2025-01-01" },
    { id: 30, product_id: 30, retail_price: 5.00, wholesale_price: 3.80, wholesale_min_qty: 100, effective_date: "2025-01-01" },
    // Others
    { id: 31, product_id: 31, retail_price: 15.00, wholesale_price: 10.00, wholesale_min_qty: 10, effective_date: "2025-01-01" },
    { id: 32, product_id: 32, retail_price: 10.00, wholesale_price: 7.00, wholesale_min_qty: 10, effective_date: "2025-01-01" },
    { id: 33, product_id: 33, retail_price: 5.00, wholesale_price: 3.50, wholesale_min_qty: 20, effective_date: "2025-01-01" },
    // Price update example — Coke raised Feb 15
    { id: 34, product_id: 3, retail_price: 22.00, wholesale_price: 16.00, wholesale_min_qty: 24, effective_date: "2025-02-15" },
  ],
  bundles: [
    { id: 1, bundle_name: "5-pc Snow Bear Deal", bundle_price: 4.00, is_active: true },
    { id: 2, bundle_name: "Chippy 3-pack", bundle_price: 18.00, is_active: true },
    { id: 3, bundle_name: "Merienda Combo", bundle_price: 29.00, is_active: true },
    { id: 4, bundle_name: "Softdrinks Pair", bundle_price: 38.00, is_active: true },
    { id: 5, bundle_name: "Breakfast Starter Pack", bundle_price: 22.00, is_active: true },
    { id: 6, bundle_name: "Ulam Essentials", bundle_price: 18.00, is_active: true },
    { id: 7, bundle_name: "Hygiene Sachet Bundle", bundle_price: 15.00, is_active: true },
  ],
  bundle_items: [
    // 5-pc Snow Bear Deal
    { id: 1, bundle_id: 1, product_id: 1, unit_id: 1, quantity: 5 },
    // Chippy 3-pack
    { id: 2, bundle_id: 2, product_id: 2, unit_id: 1, quantity: 3 },
    // Merienda Combo: Coke + Chippy + 3 Snow Bear
    { id: 3, bundle_id: 3, product_id: 3, unit_id: 1, quantity: 1 },
    { id: 4, bundle_id: 3, product_id: 2, unit_id: 1, quantity: 1 },
    { id: 5, bundle_id: 3, product_id: 1, unit_id: 1, quantity: 3 },
    // Softdrinks Pair: Coke + Royal
    { id: 6, bundle_id: 4, product_id: 3, unit_id: 1, quantity: 1 },
    { id: 7, bundle_id: 4, product_id: 14, unit_id: 1, quantity: 1 },
    // Breakfast Starter Pack: Milo + Skyflakes + Magic Sarap x2
    { id: 8, bundle_id: 5, product_id: 4, unit_id: 1, quantity: 1 },
    { id: 9, bundle_id: 5, product_id: 10, unit_id: 1, quantity: 1 },
    { id: 10, bundle_id: 5, product_id: 9, unit_id: 1, quantity: 2 },
    // Ulam Essentials: Toyo + Knorr Sinigang + Magic Sarap
    { id: 11, bundle_id: 6, product_id: 8, unit_id: 1, quantity: 1 },
    { id: 12, bundle_id: 6, product_id: 22, unit_id: 1, quantity: 1 },
    { id: 13, bundle_id: 6, product_id: 9, unit_id: 1, quantity: 2 },
    // Hygiene Sachet Bundle: Surf + Colgate + Head & Shoulders
    { id: 14, bundle_id: 7, product_id: 7, unit_id: 1, quantity: 1 },
    { id: 15, bundle_id: 7, product_id: 26, unit_id: 1, quantity: 1 },
    { id: 16, bundle_id: 7, product_id: 27, unit_id: 1, quantity: 1 },
  ],
  sales: [
    { id: 1, customer_id: null, payment_type_id: 1, sale_date: "2/10/2025, 8:12 AM" },
    { id: 2, customer_id: 1, payment_type_id: 2, sale_date: "2/10/2025, 9:45 AM" },
    { id: 3, customer_id: null, payment_type_id: 1, sale_date: "2/11/2025, 10:03 AM" },
    { id: 4, customer_id: 2, payment_type_id: 2, sale_date: "2/11/2025, 2:30 PM" },
    { id: 5, customer_id: null, payment_type_id: 1, sale_date: "2/12/2025, 7:55 AM" },
    { id: 6, customer_id: 3, payment_type_id: 1, sale_date: "2/12/2025, 4:10 PM" },
    { id: 7, customer_id: null, payment_type_id: 1, sale_date: "2/13/2025, 11:30 AM" },
    { id: 8, customer_id: null, payment_type_id: 1, sale_date: "2/14/2025, 3:00 PM" },
    { id: 9, customer_id: 1, payment_type_id: 2, sale_date: "2/15/2025, 9:00 AM" },
    { id: 10, customer_id: null, payment_type_id: 1, sale_date: "2/16/2025, 6:45 PM" },
    { id: 11, customer_id: null, payment_type_id: 1, sale_date: "2/17/2025, 8:20 AM" },
    { id: 12, customer_id: 4, payment_type_id: 1, sale_date: "2/17/2025, 12:00 PM" },
    { id: 13, customer_id: null, payment_type_id: 1, sale_date: "2/18/2025, 7:30 AM" },
    { id: 14, customer_id: null, payment_type_id: 1, sale_date: "2/18/2025, 5:15 PM" },
    { id: 15, customer_id: 2, payment_type_id: 2, sale_date: "2/19/2025, 10:00 AM" },
  ],
  sale_items: [
    // Sale 1 — walk-in cash: Snow Bear x10, Chippy x2
    { id: 1, sale_id: 1, product_id: 1, bundle_id: null, unit_id: 1, quantity_sold: 10, unit_price: 1.00, total_price: 10.00, sale_type: "retail" },
    { id: 2, sale_id: 1, product_id: 2, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 7.00, total_price: 14.00, sale_type: "retail" },
    // Sale 2 — Maria credit: Coke x1, Milo x2
    { id: 3, sale_id: 2, product_id: 3, bundle_id: null, unit_id: 1, quantity_sold: 1, unit_price: 20.00, total_price: 20.00, sale_type: "retail" },
    { id: 4, sale_id: 2, product_id: 4, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 8.00, total_price: 16.00, sale_type: "retail" },
    // Sale 3 — walk-in cash: Lucky Me x3, Magic Sarap x5
    { id: 5, sale_id: 3, product_id: 6, bundle_id: null, unit_id: 1, quantity_sold: 3, unit_price: 12.00, total_price: 36.00, sale_type: "retail" },
    { id: 6, sale_id: 3, product_id: 9, bundle_id: null, unit_id: 1, quantity_sold: 5, unit_price: 2.00, total_price: 10.00, sale_type: "retail" },
    // Sale 4 — Jose credit: Surf x2, Toyo x1
    { id: 7, sale_id: 4, product_id: 7, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 6.00, total_price: 12.00, sale_type: "retail" },
    { id: 8, sale_id: 4, product_id: 8, bundle_id: null, unit_id: 1, quantity_sold: 1, unit_price: 5.00, total_price: 5.00, sale_type: "retail" },
    // Sale 5 — walk-in: Marlboro x5, Lighter x1
    { id: 9, sale_id: 5, product_id: 5, bundle_id: null, unit_id: 1, quantity_sold: 5, unit_price: 7.00, total_price: 35.00, sale_type: "retail" },
    { id: 10, sale_id: 5, product_id: 31, bundle_id: null, unit_id: 1, quantity_sold: 1, unit_price: 15.00, total_price: 15.00, sale_type: "retail" },
    // Sale 6 — Ana cash: Merienda Combo bundle x1
    { id: 11, sale_id: 6, product_id: null, bundle_id: 3, unit_id: null, quantity_sold: 1, unit_price: 29.00, total_price: 29.00, sale_type: "bundle" },
    // Sale 7 — walk-in: Skyflakes x3, Zesto x5
    { id: 12, sale_id: 7, product_id: 10, bundle_id: null, unit_id: 1, quantity_sold: 3, unit_price: 5.00, total_price: 15.00, sale_type: "retail" },
    { id: 13, sale_id: 7, product_id: 16, bundle_id: null, unit_id: 1, quantity_sold: 5, unit_price: 10.00, total_price: 50.00, sale_type: "retail" },
    // Sale 8 — walk-in: Chippy 3-pack bundle x2, Snow Bear x5
    { id: 14, sale_id: 8, product_id: null, bundle_id: 2, unit_id: null, quantity_sold: 2, unit_price: 18.00, total_price: 36.00, sale_type: "bundle" },
    { id: 15, sale_id: 8, product_id: 1, bundle_id: null, unit_id: 1, quantity_sold: 5, unit_price: 1.00, total_price: 5.00, sale_type: "retail" },
    // Sale 9 — Maria credit: Wholesale Coke x24
    { id: 16, sale_id: 9, product_id: 3, bundle_id: null, unit_id: 1, quantity_sold: 24, unit_price: 15.00, total_price: 360.00, sale_type: "wholesale" },
    // Sale 10 — walk-in: Ulam Essentials bundle x1, Lucky Me x2
    { id: 17, sale_id: 10, product_id: null, bundle_id: 6, unit_id: null, quantity_sold: 1, unit_price: 18.00, total_price: 18.00, sale_type: "bundle" },
    { id: 18, sale_id: 10, product_id: 6, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 12.00, total_price: 24.00, sale_type: "retail" },
    // Sale 11 — walk-in: Hygiene bundle x1
    { id: 19, sale_id: 11, product_id: null, bundle_id: 7, unit_id: null, quantity_sold: 1, unit_price: 15.00, total_price: 15.00, sale_type: "bundle" },
    // Sale 12 — Pedro cash: Nova x2, Piattos x1, C2 x2
    { id: 20, sale_id: 12, product_id: 18, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 8.00, total_price: 16.00, sale_type: "retail" },
    { id: 21, sale_id: 12, product_id: 19, bundle_id: null, unit_id: 1, quantity_sold: 1, unit_price: 12.00, total_price: 12.00, sale_type: "retail" },
    { id: 22, sale_id: 12, product_id: 15, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 25.00, total_price: 50.00, sale_type: "retail" },
    // Sale 13 — walk-in: Candle x3, Ballpen x2
    { id: 23, sale_id: 13, product_id: 33, bundle_id: null, unit_id: 1, quantity_sold: 3, unit_price: 5.00, total_price: 15.00, sale_type: "retail" },
    { id: 24, sale_id: 13, product_id: 32, bundle_id: null, unit_id: 1, quantity_sold: 2, unit_price: 10.00, total_price: 20.00, sale_type: "retail" },
    // Sale 14 — walk-in: Breakfast Starter Pack bundle x2
    { id: 25, sale_id: 14, product_id: null, bundle_id: 5, unit_id: null, quantity_sold: 2, unit_price: 22.00, total_price: 44.00, sale_type: "bundle" },
    // Sale 15 — Jose credit: Choc Nut x10, Philip Morris x10
    { id: 26, sale_id: 15, product_id: 12, bundle_id: null, unit_id: 1, quantity_sold: 10, unit_price: 5.00, total_price: 50.00, sale_type: "retail" },
    { id: 27, sale_id: 15, product_id: 29, bundle_id: null, unit_id: 1, quantity_sold: 10, unit_price: 7.00, total_price: 70.00, sale_type: "retail" },
  ],
  sale_bundle_items: [
    // Sale 6 — Merienda Combo (sale_item 11): Coke x1, Chippy x1, Snow Bear x3
    { id: 1, sale_item_id: 11, bundle_item_id: 3, product_id: 3, unit_id: 1, quantity_deducted: 1 },
    { id: 2, sale_item_id: 11, bundle_item_id: 4, product_id: 2, unit_id: 1, quantity_deducted: 1 },
    { id: 3, sale_item_id: 11, bundle_item_id: 5, product_id: 1, unit_id: 1, quantity_deducted: 3 },
    // Sale 8 — Chippy 3-pack x2 (sale_item 14): Chippy x6 total
    { id: 4, sale_item_id: 14, bundle_item_id: 2, product_id: 2, unit_id: 1, quantity_deducted: 6 },
    // Sale 10 — Ulam Essentials (sale_item 17): Toyo x1, Knorr x1, Magic Sarap x2
    { id: 5, sale_item_id: 17, bundle_item_id: 11, product_id: 8, unit_id: 1, quantity_deducted: 1 },
    { id: 6, sale_item_id: 17, bundle_item_id: 12, product_id: 22, unit_id: 1, quantity_deducted: 1 },
    { id: 7, sale_item_id: 17, bundle_item_id: 13, product_id: 9, unit_id: 1, quantity_deducted: 2 },
    // Sale 11 — Hygiene bundle (sale_item 19): Surf x1, Colgate x1, H&S x1
    { id: 8, sale_item_id: 19, bundle_item_id: 14, product_id: 7, unit_id: 1, quantity_deducted: 1 },
    { id: 9, sale_item_id: 19, bundle_item_id: 15, product_id: 26, unit_id: 1, quantity_deducted: 1 },
    { id: 10, sale_item_id: 19, bundle_item_id: 16, product_id: 27, unit_id: 1, quantity_deducted: 1 },
    // Sale 14 — Breakfast Starter Pack x2 (sale_item 25): Milo x2, Skyflakes x2, Magic Sarap x4
    { id: 11, sale_item_id: 25, bundle_item_id: 8, product_id: 4, unit_id: 1, quantity_deducted: 2 },
    { id: 12, sale_item_id: 25, bundle_item_id: 9, product_id: 10, unit_id: 1, quantity_deducted: 2 },
    { id: 13, sale_item_id: 25, bundle_item_id: 10, product_id: 9, unit_id: 1, quantity_deducted: 4 },
  ],
  stock_batches: [
    { id: 1, product_id: 1, unit_id: 1, quantity_received: 200, expiration_date: "2026-06-01", created_at: "2025-01-15", notes: "Opening stock — Snow Bear" },
    { id: 2, product_id: 2, unit_id: 1, quantity_received: 60, expiration_date: "2026-03-01", created_at: "2025-01-15", notes: "Opening stock — Chippy" },
    { id: 3, product_id: 3, unit_id: 1, quantity_received: 48, expiration_date: "2026-12-01", created_at: "2025-01-15", notes: "Opening stock — Coke" },
    { id: 4, product_id: 6, unit_id: 1, quantity_received: 72, expiration_date: "2026-08-01", created_at: "2025-01-15", notes: "Opening stock — Lucky Me" },
    { id: 5, product_id: 9, unit_id: 1, quantity_received: 144, expiration_date: "2027-01-01", created_at: "2025-01-15", notes: "Opening stock — Magic Sarap" },
    { id: 6, product_id: 7, unit_id: 1, quantity_received: 96, expiration_date: null, created_at: "2025-01-20", notes: "Restocked detergent sachets" },
    { id: 7, product_id: 5, unit_id: 1, quantity_received: 10, expiration_date: null, created_at: "2025-02-01", notes: "Marlboro restock" },
    { id: 8, product_id: 16, unit_id: 1, quantity_received: 60, expiration_date: "2025-09-01", created_at: "2025-02-05", notes: "Zesto bulk buy" },
    { id: 9, product_id: 22, unit_id: 1, quantity_received: 72, expiration_date: "2026-10-01", created_at: "2025-02-10", notes: "Knorr restock from supplier" },
    { id: 10, product_id: 11, unit_id: 1, quantity_received: 200, expiration_date: "2026-05-01", created_at: "2025-02-12", notes: "Gummy Bears opening stock" },
  ],
  stock_logs: [
    { id: 1, product_id: 1, unit_id: 1, stock_batch_id: 1, change_qty: 200, reason: "restocked", notes: "Opening stock", created_at: "2025-01-15" },
    { id: 2, product_id: 2, unit_id: 1, stock_batch_id: 2, change_qty: 60, reason: "restocked", notes: "Opening stock", created_at: "2025-01-15" },
    { id: 3, product_id: 3, unit_id: 1, stock_batch_id: 3, change_qty: 48, reason: "restocked", notes: "Opening stock", created_at: "2025-01-15" },
    { id: 4, product_id: 6, unit_id: 1, stock_batch_id: 4, change_qty: 72, reason: "restocked", notes: "Opening stock", created_at: "2025-01-15" },
    { id: 5, product_id: 9, unit_id: 1, stock_batch_id: 5, change_qty: 144, reason: "restocked", notes: "Opening stock", created_at: "2025-01-15" },
    { id: 6, product_id: 7, unit_id: 1, stock_batch_id: 6, change_qty: 96, reason: "restocked", notes: "Restocked detergent sachets", created_at: "2025-01-20" },
    { id: 7, product_id: 5, unit_id: 1, stock_batch_id: null, change_qty: -2, reason: "damaged", notes: "Basang basang", created_at: "2025-02-01" },
    { id: 8, product_id: 5, unit_id: 1, stock_batch_id: 7, change_qty: 10, reason: "restocked", notes: "Marlboro restock", created_at: "2025-02-01" },
    { id: 9, product_id: 16, unit_id: 1, stock_batch_id: 8, change_qty: 60, reason: "restocked", notes: "Zesto bulk buy", created_at: "2025-02-05" },
    { id: 10, product_id: 4, unit_id: 1, stock_batch_id: null, change_qty: -3, reason: "expired", notes: "3 pcs expired, nalagpasan", created_at: "2025-02-08" },
    { id: 11, product_id: 22, unit_id: 1, stock_batch_id: 9, change_qty: 72, reason: "restocked", notes: "Knorr restock from supplier", created_at: "2025-02-10" },
    { id: 12, product_id: 11, unit_id: 1, stock_batch_id: 10, change_qty: 200, reason: "restocked", notes: "Gummy Bears opening stock", created_at: "2025-02-12" },
    { id: 13, product_id: 10, unit_id: 1, stock_batch_id: null, change_qty: -2, reason: "damaged", notes: "Nabasa ng ulan", created_at: "2025-02-14" },
    { id: 14, product_id: 1, unit_id: 1, stock_batch_id: null, change_qty: 1, reason: "adjustment", notes: "Miscounted, correcting +1", created_at: "2025-02-17" },
  ],
  customers: [
    { id: 1, first_name: "Maria", middle_name: "L.", last_name: "Santos", contact_number: "09171234567", municipality: "Consolacion", barangay: "Brgy. San Jose", street: "Purok 3", credit_limit: 1000 },
    { id: 2, first_name: "Jose", middle_name: "", last_name: "Reyes", contact_number: "09281234567", municipality: "Consolacion", barangay: "Brgy. Poblacion", street: "", credit_limit: 500 },
    { id: 3, first_name: "Ana", middle_name: "B.", last_name: "Cruz", contact_number: "09391234567", municipality: "Consolacion", barangay: "Brgy. Santa Cruz", street: "Purok 1", credit_limit: 1500 },
    { id: 4, first_name: "Pedro", middle_name: "", last_name: "Garcia", contact_number: "09451234567", municipality: "Consolacion", barangay: "Brgy. Tayud", street: "", credit_limit: 800 },
    { id: 5, first_name: "Lourdes", middle_name: "D.", last_name: "Villanueva", contact_number: "09561234567", municipality: "Consolacion", barangay: "Brgy. Lamac", street: "Sitio Upper", credit_limit: 600 },
    { id: 6, first_name: "Rodel", middle_name: "", last_name: "Bautista", contact_number: "09671234567", municipality: "Consolacion", barangay: "Brgy. San Jose", street: "Purok 5", credit_limit: 1200 },
  ],
  credit_transactions: [
    // Maria — sale 2 (Coke + Milo = ₱36)
    { id: 1, customer_id: 1, sale_id: 2, amount_owed: 36.00, due_date: "2025-03-10", created_at: "2025-02-10" },
    // Maria — sale 9 (Wholesale Coke = ₱360)
    { id: 2, customer_id: 1, sale_id: 9, amount_owed: 360.00, due_date: "2025-03-15", created_at: "2025-02-15" },
    // Jose — sale 4 (Surf + Toyo = ₱17)
    { id: 3, customer_id: 2, sale_id: 4, amount_owed: 17.00, due_date: "2025-03-11", created_at: "2025-02-11" },
    // Jose — sale 15 (Choc Nut + Philip Morris = ₱120)
    { id: 4, customer_id: 2, sale_id: 15, amount_owed: 120.00, due_date: "2025-03-19", created_at: "2025-02-19" },
    // Lourdes — old credit (no sale_id)
    { id: 5, customer_id: 5, sale_id: null, amount_owed: 85.00, due_date: "2025-03-01", created_at: "2025-02-05" },
    // Rodel — recent
    { id: 6, customer_id: 6, sale_id: null, amount_owed: 200.00, due_date: "2025-04-01", created_at: "2025-02-18" },
  ],
  credit_payments: [
    // Maria paid ₱36 for CT1 (fully paid)
    { id: 1, credit_transaction_id: 1, amount_paid: 36.00, paid_at: "2025-02-18", notes: "Full payment" },
    // Maria paid ₱100 partial on CT2
    { id: 2, credit_transaction_id: 2, amount_paid: 100.00, paid_at: "2025-02-20", notes: "Partial — magbabayad ulit" },
    // Jose paid ₱17 for CT3 (fully paid)
    { id: 3, credit_transaction_id: 3, amount_paid: 17.00, paid_at: "2025-02-16", notes: "" },
    // Lourdes paid ₱30 partial on CT5
    { id: 4, credit_transaction_id: 5, amount_paid: 30.00, paid_at: "2025-02-14", notes: "Partial bayad" },
    { id: 5, credit_transaction_id: 5, amount_paid: 20.00, paid_at: "2025-02-19", notes: "Dagdag bayad" },
  ],
  expenses: [
    { id: 1, expense_category_id: 1, amount: 1500.00, notes: "Bulk kumpra — Coke, Lucky Me, Zesto", created_at: "2025-01-15" },
    { id: 2, expense_category_id: 1, amount: 800.00, notes: "Kumpra — Chippy, Nova, Piattos, Skyflakes", created_at: "2025-01-20" },
    { id: 3, expense_category_id: 3, amount: 220.00, notes: "Bayad sa kuryente — Enero", created_at: "2025-02-01" },
    { id: 4, expense_category_id: 2, amount: 50.00, notes: "Tubig ngadtong buwan", created_at: "2025-02-01" },
    { id: 5, expense_category_id: 1, amount: 650.00, notes: "Restock — Marlboro, Knorr, Magic Sarap", created_at: "2025-02-10" },
    { id: 6, expense_category_id: 4, amount: 120.00, notes: "Tricycle — supplier pick-up", created_at: "2025-02-12" },
    { id: 7, expense_category_id: 5, amount: 350.00, notes: "Bayad sa utang sa supplier", created_at: "2025-02-15" },
    { id: 8, expense_category_id: 6, amount: 80.00, notes: "Plastik bags ug binder clips", created_at: "2025-02-17" },
    { id: 9, expense_category_id: 1, amount: 400.00, notes: "Restock — Safeguard, Surf, H&S sachets", created_at: "2025-02-18" },
  ],
  nextId: {
    products: 34,
    product_pricing: 35,
    customers: 7,
    sales: 16,
    sale_items: 28,
    sale_bundle_items: 14,
    credit_transactions: 7,
    credit_payments: 6,
    expenses: 10,
    stock_logs: 15,
    stock_batches: 11,
    bundles: 8,
    bundle_items: 17,
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