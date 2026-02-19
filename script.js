// ============================================================
// UTILITIES
// ============================================================
function fmt(n) {
  return "₱" + parseFloat(n).toFixed(2);
}
function now() {
  return new Date().toLocaleString("en-PH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
function genId(type) {
  return db.nextId[type]++;
}

function showToast(msg, type = "success") {
  const tc = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML =
    (type === "success" ? "✅" : type === "warning" ? "⚠️" : "❌") + " " + msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function showPage(name, el) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  if (el) el.classList.add("active");
  document.getElementById("page-title").textContent = {
    dashboard: "Dashboard",
    pos: "Benta (POS)",
    products: "Products",
    bundles: "Bundle Pricing",
    stocklogs: "Stock Logs",
    sales: "Sales History",
    credits: "Utang",
    expenses: "Expenses",
    customers: "Customers",
  }[name];
  refreshPage(name);
}

function refreshPage(name) {
  if (name === "dashboard") renderDashboard();
  if (name === "pos") renderPos();
  if (name === "products") renderProducts();
  if (name === "bundles") renderBundlesPage();
  if (name === "stocklogs") renderStockLogs();
  if (name === "sales") renderSales();
  if (name === "credits") renderCredits();
  if (name === "expenses") renderExpenses();
  if (name === "customers") renderCustomers();
  updateUtangBadge();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const todaySales = db.sales.filter((s) => {
    const d = new Date(s.sale_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const totalToday = todaySales.reduce((sum, s) => {
    const items = db.sale_items.filter((i) => i.sale_id === s.id);
    return sum + items.reduce((a, b) => a + b.total_price, 0);
  }, 0);

  const unpaidCredits = db.credits.filter((c) => c.status !== "paid");
  const totalUtang = unpaidCredits.reduce(
    (sum, c) => sum + (c.amount_owed - c.amount_paid),
    0,
  );
  const uniqueDebtors = [...new Set(unpaidCredits.map((c) => c.customer_id))]
    .length;
  const lowStock = db.products.filter((p) => p.stock_quantity <= 10);

  document.getElementById("stat-sales").textContent = fmt(totalToday);
  document.getElementById("stat-txn").textContent =
    todaySales.length + " transactions";
  document.getElementById("stat-products").textContent = db.products.length;
  document.getElementById("stat-utang").textContent = fmt(totalUtang);
  document.getElementById("stat-debtors").textContent =
    uniqueDebtors + " customers";
  document.getElementById("stat-lowstock").textContent = lowStock.length;

  // Recent sales
  const tbody = document.getElementById("dashboard-sales-body");
  const recent = [...db.sales].reverse().slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4"><div class="empty-state"><p>No sales yet today</p></div></td></tr>';
  } else {
    tbody.innerHTML = recent
      .map((s) => {
        const items = db.sale_items.filter((i) => i.sale_id === s.id);
        const total = items.reduce((a, b) => a + b.total_price, 0);
        const names = items
          .map((i) => {
            const p = db.products.find((x) => x.id === i.product_id);
            return p ? p.name : "?";
          })
          .join(", ");
        const pt =
          s.payment_type === "credit"
            ? `<span class="badge badge-red">Utang</span>`
            : `<span class="badge badge-green">Cash</span>`;
        return `<tr><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${names}</td><td>${pt}</td><td style="color:var(--accent);font-weight:700">${fmt(total)}</td><td style="color:var(--muted);font-size:12px">${s.sale_date}</td></tr>`;
      })
      .join("");
  }

  // Low stock
  const lsBody = document.getElementById("low-stock-body");
  if (lowStock.length === 0) {
    lsBody.innerHTML =
      '<tr><td colspan="3"><div class="empty-state"><p>✅ All products have sufficient stock</p></div></td></tr>';
  } else {
    lsBody.innerHTML = lowStock
      .map((p) => {
        const badge =
          p.stock_quantity === 0
            ? `<span class="badge badge-red">Out of Stock</span>`
            : `<span class="badge badge-yellow">Low</span>`;
        return `<tr><td>${p.image_url} ${p.name}</td><td style="font-weight:700">${p.stock_quantity}</td><td>${badge}</td></tr>`;
      })
      .join("");
  }
}

// ============================================================
// POS
// ============================================================
function setPosMode(mode) {
  posMode = mode;
  document
    .getElementById("pos-tab-products")
    .classList.toggle("active", mode === "products");
  document
    .getElementById("pos-tab-bundles")
    .classList.toggle("active", mode === "bundles");
  document.getElementById("pos-products-view").style.display =
    mode === "products" ? "block" : "none";
  document.getElementById("pos-bundles-view").style.display =
    mode === "bundles" ? "block" : "none";
  if (mode === "bundles") renderPosBundles();
}

function renderPos() {
  // Build category tabs
  const cats = ["All", ...new Set(db.products.map((p) => p.category))];
  const tabsEl = document.getElementById("pos-category-tabs");
  tabsEl.innerHTML = cats
    .map(
      (c) =>
        `<button class="filter-tab ${c === posCategory ? "active" : ""}" onclick="filterPosCategory('${c}', this)">${c}</button>`,
    )
    .join("");

  // Build product grid
  renderPosGrid();

  // Populate credit customer select
  const sel = document.getElementById("credit-customer-id");
  sel.innerHTML =
    '<option value="">-- Piliin ang customer --</option>' +
    db.customers
      .map(
        (c) =>
          `<option value="${c.id}">${c.first_name} ${c.last_name}</option>`,
      )
      .join("");

  renderCart();
  if (posMode === "bundles") renderPosBundles();
}

function filterPosCategory(cat, el) {
  posCategory = cat;
  document
    .querySelectorAll("#pos-category-tabs .filter-tab")
    .forEach((t) => t.classList.remove("active"));
  if (el) el.classList.add("active");
  renderPosGrid();
}

function filterPosProducts() {
  posSearch = document.getElementById("pos-search").value.toLowerCase();
  renderPosGrid();
}

function renderPosGrid() {
  let prods = db.products;
  if (posCategory !== "All")
    prods = prods.filter((p) => p.category === posCategory);
  if (posSearch)
    prods = prods.filter((p) => p.name.toLowerCase().includes(posSearch));

  const grid = document.getElementById("pos-product-grid");
  grid.innerHTML = prods
    .map((p) => {
      const cartItem = cart.find((c) => c.product_id === p.id);
      const qty = cartItem ? cartItem.quantity : 0;
      const selected = qty > 0 ? "selected" : "";
      const stockBadge =
        p.stock_quantity <= 10
          ? `<div style="font-size:10px;color:var(--red);margin-top:2px;">⚠️ ${p.stock_quantity} left</div>`
          : "";
      return `
      <div class="product-card ${selected}" onclick="addToCart(${p.id})">
        <div class="product-qty-badge">${qty}</div>
        <div class="product-emoji">${p.image_url}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">${fmt(p.retail_price)}</div>
        <div class="product-stock">${p.stock_quantity} pcs</div>
        ${stockBadge}
      </div>`;
    })
    .join("");
}

function getBundleRetailTotal(bundle) {
  // Calculate what the bundle items would cost at retail
  return bundle.items.reduce((sum, item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    return sum + (p ? p.retail_price * item.qty : 0);
  }, 0);
}

function renderPosBundles() {
  const grid = document.getElementById("pos-bundle-grid");
  const empty = document.getElementById("pos-bundle-empty");

  if (db.bundles.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }
  grid.style.display = "grid";
  empty.style.display = "none";

  grid.innerHTML = db.bundles
    .map((b) => {
      const retailTotal = getBundleRetailTotal(b);
      const savings = retailTotal - b.bundle_price;
      const cartB = cartBundles.find((x) => x.bundle_id === b.id);
      const qty = cartB ? cartB.quantity : 0;
      const selected = qty > 0 ? "selected" : "";
      const itemsText = b.items
        .map((item) => {
          const p = db.products.find((x) => x.id === item.product_id);
          return p ? `${item.qty}× ${p.name}` : "";
        })
        .filter(Boolean)
        .join(", ");

      const hasStock = b.items.every((item) => {
        const p = db.products.find((x) => x.id === item.product_id);
        return p && p.stock_quantity >= item.qty;
      });

      return `
      <div class="bundle-pos-card ${selected} ${!hasStock ? "opacity-50" : ""}" onclick="${hasStock ? `addBundleToCart(${b.id})` : ""}">
        <div class="bundle-pos-badge">${qty}</div>
        <div style="font-size:28px;margin-bottom:6px;">${b.type === "single" ? db.products.find((p) => p.id === b.items[0].product_id)?.image_url || "🎁" : "🎁"}</div>
        <div class="bundle-pos-name">${b.name}</div>
        <div class="bundle-pos-items">${itemsText}</div>
        <div style="display:flex;align-items:baseline;gap:8px;">
          <div class="bundle-pos-price">${fmt(b.bundle_price)}</div>
          ${savings > 0 ? `<div class="bundle-pos-savings">Save ${fmt(savings)}</div>` : ""}
        </div>
        ${!hasStock ? `<div style="font-size:10px;color:var(--red);margin-top:4px;font-weight:600;">⚠️ Kulang ang stock</div>` : ""}
      </div>`;
    })
    .join("");
}

function addToCart(product_id) {
  const product = db.products.find((p) => p.id === product_id);
  if (!product) return;
  if (product.stock_quantity <= 0) {
    showToast("Wala nang stock!", "error");
    return;
  }

  const existing = cart.find((c) => c.product_id === product_id);
  if (existing) {
    if (existing.quantity >= product.stock_quantity) {
      showToast("Hindi na dagdag, ubos na stock!", "warning");
      return;
    }
    existing.quantity++;
  } else {
    cart.push({ product_id, quantity: 1 });
  }
  renderPosGrid();
  renderCart();
}

function addBundleToCart(bundle_id) {
  const bundle = db.bundles.find((b) => b.id === bundle_id);
  if (!bundle) return;

  // Check stock for all items
  for (const item of bundle.items) {
    const p = db.products.find((x) => x.id === item.product_id);
    if (!p || p.stock_quantity < item.qty) {
      showToast("Hindi sapat ang stock para sa bundle na ito!", "error");
      return;
    }
  }

  const existing = cartBundles.find((x) => x.bundle_id === bundle_id);
  if (existing) {
    existing.quantity++;
  } else {
    cartBundles.push({ bundle_id, quantity: 1 });
  }
  renderPosBundles();
  renderCart();
}

function changeBundleCartQty(bundle_id, delta) {
  const idx = cartBundles.findIndex((x) => x.bundle_id === bundle_id);
  if (idx === -1) return;
  cartBundles[idx].quantity += delta;
  if (cartBundles[idx].quantity <= 0) cartBundles.splice(idx, 1);
  renderPosBundles();
  renderCart();
}

function changeCartQty(product_id, delta) {
  const idx = cart.findIndex((c) => c.product_id === product_id);
  if (idx === -1) return;
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  renderPosGrid();
  renderCart();
}

function renderCart() {
  const el = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");

  if (cart.length === 0 && cartBundles.length === 0) {
    el.innerHTML =
      '<div class="empty-state"><div class="icon">🛒</div><p>Walang solud pa</p></div>';
    countEl.textContent = "";
    document.getElementById("cart-subtotal").textContent = "₱0.00";
    document.getElementById("cart-total").textContent = "₱0.00";
    document.getElementById("cart-savings-row").style.display = "none";
    return;
  }

  let subtotal = 0;
  let totalBundleSavings = 0;
  let html = "";

  // Regular product items
  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    if (!p) return;
    const unitPrice =
      item.quantity >= p.wholesale_min_qty ? p.wholesale_price : p.retail_price;
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    const typeLabel =
      item.quantity >= p.wholesale_min_qty
        ? ' <span class="tag">Wholesale</span>'
        : "";
    html += `
      <div class="cart-item">
        <div class="cart-item-emoji">${p.image_url}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}${typeLabel}</div>
          <div class="cart-item-price">${fmt(unitPrice)} × ${item.quantity} = ${fmt(lineTotal)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeCartQty(${p.id},-1)">−</button>
          <span class="qty-display">${item.quantity}</span>
          <button class="qty-btn" onclick="changeCartQty(${p.id},1)">+</button>
        </div>
      </div>`;
  });

  // Bundle items
  cartBundles.forEach((cb) => {
    const bundle = db.bundles.find((x) => x.id === cb.bundle_id);
    if (!bundle) return;
    const lineTotal = bundle.bundle_price * cb.quantity;
    const retailTotal = getBundleRetailTotal(bundle) * cb.quantity;
    const savings = retailTotal - lineTotal;
    subtotal += lineTotal;
    totalBundleSavings += savings;

    const itemsText = bundle.items
      .map((item) => {
        const p = db.products.find((x) => x.id === item.product_id);
        return p ? `${p.image_url}${item.qty > 1 ? "×" + item.qty : ""}` : "";
      })
      .join(" ");

    html += `
      <div class="cart-item cart-item-bundle">
        <div class="cart-item-emoji">🎁</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${bundle.name} <span class="bundle-tag">🎁 Bundle</span></div>
          <div style="font-size:11px;color:var(--muted);margin:2px 0;">${itemsText}</div>
          <div class="cart-item-price">${fmt(bundle.bundle_price)} × ${cb.quantity} = ${fmt(lineTotal)}</div>
          ${savings > 0 ? `<div style="font-size:11px;color:var(--green);font-weight:600;">Nakatipid: ${fmt(savings)}</div>` : ""}
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeBundleCartQty(${bundle.id},-1)">−</button>
          <span class="qty-display">${cb.quantity}</span>
          <button class="qty-btn" onclick="changeBundleCartQty(${bundle.id},1)">+</button>
        </div>
      </div>`;
  });

  el.innerHTML = html;

  const totalItems =
    cart.reduce((a, b) => a + b.quantity, 0) +
    cartBundles.reduce((a, b) => a + b.quantity, 0);
  countEl.textContent = `(${totalItems} items)`;
  document.getElementById("cart-subtotal").textContent = fmt(subtotal);
  document.getElementById("cart-total").textContent = fmt(subtotal);

  const savingsRow = document.getElementById("cart-savings-row");
  if (totalBundleSavings > 0) {
    savingsRow.style.display = "flex";
    document.getElementById("cart-savings").textContent =
      `-${fmt(totalBundleSavings)}`;
  } else {
    savingsRow.style.display = "none";
  }
}

function setPayType(type) {
  payType = type;
  document
    .getElementById("pay-cash")
    .classList.toggle("active", type === "cash");
  document
    .getElementById("pay-credit")
    .classList.toggle("active", type === "credit");
  document.getElementById("credit-customer-select").style.display =
    type === "credit" ? "block" : "none";
}

function clearCart() {
  cart = [];
  cartBundles = [];
  renderPosGrid();
  renderCart();
  if (posMode === "bundles") renderPosBundles();
}

function checkout() {
  if (cart.length === 0 && cartBundles.length === 0) {
    showToast("Walang laman ang cart!", "warning");
    return;
  }

  let customerId = null;
  if (payType === "credit") {
    customerId = parseInt(document.getElementById("credit-customer-id").value);
    if (!customerId) {
      showToast("Piliin ang customer para sa utang!", "warning");
      return;
    }

    // Check credit limit
    const customer = db.customers.find((c) => c.id === customerId);
    const existingDebt = db.credits
      .filter((c) => c.customer_id === customerId && c.status !== "paid")
      .reduce((sum, c) => sum + (c.amount_owed - c.amount_paid), 0);
    let orderTotal = cart.reduce((sum, item) => {
      const p = db.products.find((x) => x.id === item.product_id);
      const up =
        item.quantity >= p.wholesale_min_qty
          ? p.wholesale_price
          : p.retail_price;
      return sum + up * item.quantity;
    }, 0);
    orderTotal += cartBundles.reduce((sum, cb) => {
      const b = db.bundles.find((x) => x.id === cb.bundle_id);
      return sum + (b ? b.bundle_price * cb.quantity : 0);
    }, 0);

    if (existingDebt + orderTotal > customer.credit_limit) {
      showToast(
        `Lampas sa credit limit ni ${customer.first_name}! (${fmt(customer.credit_limit)})`,
        "error",
      );
      return;
    }
  }

  // Create sale
  const saleId = genId("sales");
  const saleDate = now();
  db.sales.push({
    id: saleId,
    customer_id: customerId,
    payment_type: payType,
    sale_date: saleDate,
  });

  let total = 0;
  let receiptItems = [];

  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    const unitPrice =
      item.quantity >= p.wholesale_min_qty ? p.wholesale_price : p.retail_price;
    const saleType =
      item.quantity >= p.wholesale_min_qty ? "wholesale" : "retail";
    const lineTotal = unitPrice * item.quantity;
    total += lineTotal;

    db.sale_items.push({
      id: genId("sale_items"),
      sale_id: saleId,
      product_id: item.product_id,
      bundle_id: null,
      quantity_sold: item.quantity,
      total_price: lineTotal,
      sale_type: saleType,
    });

    // Deduct stock
    p.stock_quantity -= item.quantity;
    receiptItems.push({
      name: p.name,
      qty: item.quantity,
      price: unitPrice,
      total: lineTotal,
      isBundle: false,
    });
  });

  // Process bundle items
  cartBundles.forEach((cb) => {
    const bundle = db.bundles.find((x) => x.id === cb.bundle_id);
    if (!bundle) return;
    const lineTotal = bundle.bundle_price * cb.quantity;
    total += lineTotal;

    bundle.items.forEach((item) => {
      const p = db.products.find((x) => x.id === item.product_id);
      if (!p) return;
      const totalQty = item.qty * cb.quantity;

      db.sale_items.push({
        id: genId("sale_items"),
        sale_id: saleId,
        product_id: item.product_id,
        bundle_id: bundle.id,
        quantity_sold: totalQty,
        total_price: 0, // price is at bundle level
        sale_type: "bundle",
      });

      p.stock_quantity -= totalQty;
    });

    receiptItems.push({
      name: bundle.name,
      qty: cb.quantity,
      price: bundle.bundle_price,
      total: lineTotal,
      isBundle: true,
      bundleItems: bundle.items
        .map((item) => {
          const p = db.products.find((x) => x.id === item.product_id);
          return p ? `${p.name} ×${item.qty}` : "";
        })
        .filter(Boolean),
    });
  });

  // Create credit record if needed
  if (payType === "credit") {
    db.credits.push({
      id: genId("credits"),
      customer_id: customerId,
      sale_id: saleId,
      amount_owed: total,
      amount_paid: 0,
      status: "unpaid",
      due_date: "",
      created_date: now(),
    });
  }

  // Show receipt
  showReceipt(receiptItems, total, payType, customerId, saleDate);

  cart = [];
  cartBundles = [];
  setPayType("cash");
  document.getElementById("credit-customer-id").value = "";
  renderPosGrid();
  renderCart();
  if (posMode === "bundles") renderPosBundles();
  updateUtangBadge();
  showToast(
    payType === "credit" ? "Naitala ang utang!" : "Bayad na! Salamat!",
    "success",
  );
}

function showReceipt(items, total, payType, customerId, date) {
  const customer = customerId
    ? db.customers.find((c) => c.id === customerId)
    : null;
  let html = `<div class="receipt">
    <div class="receipt-title">🏪 Tindahan ni Duane</div>
    <div class="receipt-sub">${date}</div>
    <hr class="receipt-divider">`;

  items.forEach((i) => {
    html += `<div class="receipt-row"><span>${i.isBundle ? "🎁 " : ""}${i.name} x${i.qty}</span><span>${fmt(i.total)}</span></div>`;
    if (i.isBundle && i.bundleItems) {
      i.bundleItems.forEach((bi) => {
        html += `<div class="receipt-row" style="padding-left:12px;font-size:11px;color:#777"><span>↳ ${bi}</span></div>`;
      });
    }
  });

  html += `<hr class="receipt-divider">
    <div class="receipt-row receipt-total"><span>TOTAL</span><span>${fmt(total)}</span></div>
    <hr class="receipt-divider">
    <div class="receipt-row"><span>Payment</span><span>${payType === "credit" ? "UTANG" : "CASH"}</span></div>`;

  if (customer)
    html += `<div class="receipt-row"><span>Customer</span><span>${customer.first_name} ${customer.last_name}</span></div>`;

  html += `<hr class="receipt-divider"><div style="text-align:center;font-size:11px;color:#888">Salamat sa inyong pagbili! 🙏</div></div>`;

  document.getElementById("receipt-content").innerHTML = html;
  openModal("modal-receipt");
}

// ============================================================
// PRODUCTS
// ============================================================
function renderProducts() {
  const search = (
    document.getElementById("product-search")?.value || ""
  ).toLowerCase();
  let prods = db.products;
  if (search)
    prods = prods.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search),
    );

  const tbody = document.getElementById("products-body");
  if (prods.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7"><div class="empty-state"><p>Walang produkto</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = prods
    .map((p) => {
      const stockBadge =
        p.stock_quantity === 0
          ? `<span class="badge badge-red">Out</span>`
          : p.stock_quantity <= 10
            ? `<span class="badge badge-yellow">${p.stock_quantity}</span>`
            : `<span class="badge badge-green">${p.stock_quantity}</span>`;
      return `<tr>
      <td><span style="font-size:18px">${p.image_url}</span> <strong>${p.name}</strong></td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td>${stockBadge}</td>
      <td style="color:var(--accent)">${fmt(p.retail_price)}</td>
      <td style="color:var(--muted)">${fmt(p.wholesale_price)}</td>
      <td style="color:var(--muted)">${p.wholesale_min_qty}+</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editProduct(${p.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑</button>
      </td>
    </tr>`;
    })
    .join("");
}

function openAddProduct() {
  editingProductId = null;
  document.getElementById("product-modal-title").textContent =
    "Dagdag Produkto";
  document.getElementById("p-name").value = "";
  document.getElementById("p-stock").value = "50";
  document.getElementById("p-retail").value = "1.00";
  document.getElementById("p-wholesale").value = "0.65";
  document.getElementById("p-minqty").value = "24";
  openModal("modal-product");
}

function editProduct(id) {
  const p = db.products.find((x) => x.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById("product-modal-title").textContent =
    "I-edit ang Produkto";
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-category").value = p.category;
  document.getElementById("p-stock").value = p.stock_quantity;
  document.getElementById("p-retail").value = p.retail_price;
  document.getElementById("p-wholesale").value = p.wholesale_price;
  document.getElementById("p-minqty").value = p.wholesale_min_qty;
  openModal("modal-product");
}

function saveProduct() {
  const name = document.getElementById("p-name").value.trim();
  if (!name) {
    showToast("Ilagay ang pangalan ng produkto!", "warning");
    return;
  }

  const data = {
    name,
    category: document.getElementById("p-category").value,
    stock_quantity: parseInt(document.getElementById("p-stock").value),
    retail_price: parseFloat(document.getElementById("p-retail").value),
    wholesale_price: parseFloat(document.getElementById("p-wholesale").value),
    wholesale_min_qty: parseInt(document.getElementById("p-minqty").value),
    image_url: getCategoryEmoji(document.getElementById("p-category").value),
  };

  if (editingProductId) {
    const p = db.products.find((x) => x.id === editingProductId);
    Object.assign(p, data);
    showToast("Na-update ang produkto!");
  } else {
    db.products.push({ id: genId("products"), ...data });
    showToast("Nadagdag ang produkto!");
  }

  closeModal("modal-product");
  renderProducts();
}

function deleteProduct(id) {
  if (!confirm("Sigurado ka bang gusto mong i-delete?")) return;
  db.products = db.products.filter((p) => p.id !== id);
  renderProducts();
  showToast("Na-delete ang produkto!", "warning");
}

function getCategoryEmoji(cat) {
  const map = {
    Candy: "🍬",
    Drinks: "🥤",
    Snacks: "🍟",
    Condiments: "🍶",
    "Personal Care": "🧴",
    Cigarettes: "🚬",
    Others: "📦",
  };
  return map[cat] || "📦";
}

// ============================================================
// BUNDLE PRICING
// ============================================================
function renderBundlesPage() {
  const container = document.getElementById("bundles-list");
  if (db.bundles.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🎁</div><p>Wala pang bundle deals. Gumawa na!</p></div>`;
    return;
  }
  container.innerHTML = db.bundles
    .map((b) => {
      const retailTotal = getBundleRetailTotal(b);
      const savings = retailTotal - b.bundle_price;
      const savingsPct =
        retailTotal > 0 ? Math.round((savings / retailTotal) * 100) : 0;
      const itemsText = b.items
        .map((item) => {
          const p = db.products.find((x) => x.id === item.product_id);
          return p ? `${item.qty}× ${p.name}` : "";
        })
        .filter(Boolean)
        .join(" + ");
      const emoji =
        b.type === "single"
          ? db.products.find((p) => p.id === b.items[0].product_id)
              ?.image_url || "🎁"
          : "🎁";
      const typeBadge =
        b.type === "single"
          ? `<span class="badge badge-blue">Multi-pack</span>`
          : `<span class="badge badge-green">Combo</span>`;

      return `<div class="bundle-card">
      <div class="bundle-icon">${emoji}</div>
      <div class="bundle-info">
        <div class="bundle-name">${b.name} ${typeBadge}</div>
        <div class="bundle-items-list">${itemsText}</div>
        ${savings > 0 ? `<div class="bundle-savings">💚 Saves ${fmt(savings)} (${savingsPct}% off retail)</div>` : ""}
      </div>
      <div class="bundle-price-tag">
        <div class="bundle-price-amount">${fmt(b.bundle_price)}</div>
        ${retailTotal > 0 ? `<div class="bundle-price-label" style="text-decoration:line-through;color:var(--muted)">Retail: ${fmt(retailTotal)}</div>` : ""}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="editBundle(${b.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteBundle(${b.id})">🗑</button>
      </div>
    </div>`;
    })
    .join("");
}

function openAddBundle() {
  editingBundleId = null;
  bundleSelectedItems = {};
  document.getElementById("bundle-modal-title").textContent =
    "🎁 Gumawa ng Bundle";
  document.getElementById("b-name").value = "";
  document.getElementById("b-price").value = "";
  document.getElementById("b-savings-preview").textContent = "";
  document.getElementById("btype-single").checked = true;
  document.getElementById("b-single-qty").value = "5";
  populateBundleSingleSelect();
  populateBundleMultiPicker();
  onBundleTypeChange();
  openModal("modal-bundle");
}

function editBundle(id) {
  const b = db.bundles.find((x) => x.id === id);
  if (!b) return;
  editingBundleId = id;
  bundleSelectedItems = {};
  b.items.forEach((item) => {
    bundleSelectedItems[item.product_id] = item.qty;
  });

  document.getElementById("bundle-modal-title").textContent =
    "✏️ I-edit ang Bundle";
  document.getElementById("b-name").value = b.name;
  document.getElementById("b-price").value = b.bundle_price.toFixed(2);

  if (b.type === "single") {
    document.getElementById("btype-single").checked = true;
    document.getElementById("b-single-qty").value = b.items[0].qty;
  } else {
    document.getElementById("btype-multi").checked = true;
  }

  populateBundleSingleSelect();
  populateBundleMultiPicker();
  onBundleTypeChange();

  if (b.type === "single") {
    document.getElementById("b-single-product").value = b.items[0].product_id;
  }

  updateBundleSavingsPreview();
  openModal("modal-bundle");
}

function deleteBundle(id) {
  if (!confirm("I-delete ang bundle na ito?")) return;
  db.bundles = db.bundles.filter((b) => b.id !== id);
  renderBundlesPage();
  showToast("Na-delete ang bundle!", "warning");
}

function populateBundleSingleSelect() {
  const sel = document.getElementById("b-single-product");
  sel.innerHTML =
    '<option value="">-- Pumili ng produkto --</option>' +
    db.products
      .map(
        (p) =>
          `<option value="${p.id}">${p.image_url} ${p.name} (${fmt(p.retail_price)})</option>`,
      )
      .join("");
  // Re-select if editing
  if (editingBundleId) {
    const b = db.bundles.find((x) => x.id === editingBundleId);
    if (b && b.type === "single") sel.value = b.items[0].product_id;
  }
}

function populateBundleMultiPicker() {
  const picker = document.getElementById("b-product-picker");
  picker.innerHTML = db.products
    .map((p) => {
      const qty = bundleSelectedItems[p.id] || 0;
      const sel = qty > 0 ? "selected" : "";
      return `<div class="bundle-product-pick ${sel}" id="bpick-${p.id}" onclick="toggleBundleProduct(${p.id})">
          <div class="bundle-product-pick-emoji">${p.image_url}</div>
          <div class="bundle-product-pick-name">${p.name}</div>
          <div class="bundle-product-pick-price">${fmt(p.retail_price)}</div>
          ${
            qty > 0
              ? `<div class="bundle-qty-row" onclick="event.stopPropagation()">
            <label>Qty:</label>
            <input class="bundle-qty-input" type="number" min="1" value="${qty}" id="bqty-${p.id}" onchange="updateBundleQty(${p.id}, this.value)" onclick="event.stopPropagation()">
          </div>`
              : ""
          }
        </div>`;
    })
    .join("");
  renderBundleChips();
}

function toggleBundleProduct(product_id) {
  if (bundleSelectedItems[product_id]) {
    delete bundleSelectedItems[product_id];
  } else {
    bundleSelectedItems[product_id] = 1;
  }
  populateBundleMultiPicker();
  updateBundleSavingsPreview();
}

function updateBundleQty(product_id, val) {
  const qty = parseInt(val);
  if (qty > 0) bundleSelectedItems[product_id] = qty;
  renderBundleChips();
  updateBundleSavingsPreview();
}

function renderBundleChips() {
  const wrap = document.getElementById("b-selected-chips-wrap");
  const chips = document.getElementById("b-selected-chips");
  const ids = Object.keys(bundleSelectedItems);
  if (ids.length === 0) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";
  chips.innerHTML = ids
    .map((pid) => {
      const p = db.products.find((x) => x.id === parseInt(pid));
      if (!p) return "";
      return `<div class="bundle-item-chip">${p.image_url} ${p.name} ×${bundleSelectedItems[pid]}<button onclick="toggleBundleProduct(${pid})">×</button></div>`;
    })
    .join("");
}

function onBundleTypeChange() {
  const isSingle = document.getElementById("btype-single").checked;
  document.getElementById("b-single-section").style.display = isSingle
    ? "block"
    : "none";
  document.getElementById("b-multi-section").style.display = isSingle
    ? "none"
    : "block";

  // Update visual radio styling
  document.getElementById("btype-single-opt").style.borderColor = isSingle
    ? "var(--accent)"
    : "var(--border)";
  document.getElementById("btype-single-opt").style.background = isSingle
    ? "var(--accent-light)"
    : "white";
  document
    .getElementById("btype-single-opt")
    .querySelector("div:nth-child(2)").style.color = isSingle
    ? "var(--accent)"
    : "var(--muted)";
  document.getElementById("btype-multi-opt").style.borderColor = !isSingle
    ? "var(--accent)"
    : "var(--border)";
  document.getElementById("btype-multi-opt").style.background = !isSingle
    ? "var(--accent-light)"
    : "white";
  document
    .getElementById("btype-multi-opt")
    .querySelector("div:nth-child(2)").style.color = !isSingle
    ? "var(--accent)"
    : "var(--muted)";

  updateBundleSavingsPreview();
}

function updateBundleSavingsPreview() {
  const el = document.getElementById("b-savings-preview");
  const price = parseFloat(document.getElementById("b-price").value);
  if (!price) {
    el.textContent = "";
    return;
  }

  let retailTotal = 0;
  const isSingle = document.getElementById("btype-single").checked;
  if (isSingle) {
    const pid = parseInt(document.getElementById("b-single-product").value);
    const qty = parseInt(document.getElementById("b-single-qty").value) || 1;
    const p = db.products.find((x) => x.id === pid);
    if (p) retailTotal = p.retail_price * qty;
  } else {
    Object.entries(bundleSelectedItems).forEach(([pid, qty]) => {
      const p = db.products.find((x) => x.id === parseInt(pid));
      if (p) retailTotal += p.retail_price * qty;
    });
  }

  if (retailTotal > 0) {
    const savings = retailTotal - price;
    const pct = Math.round((savings / retailTotal) * 100);
    if (savings > 0) {
      el.innerHTML = `💚 Customer saves <strong>${fmt(savings)}</strong> (${pct}% off) vs. buying individually at ${fmt(retailTotal)}`;
    } else if (savings < 0) {
      el.innerHTML = `<span style="color:var(--warning);">⚠️ Bundle price is higher than retail total (${fmt(retailTotal)}). Are you sure?</span>`;
    } else {
      el.textContent = "Same as retail total — no savings for customer.";
    }
  }
}

function saveBundle() {
  const name = document.getElementById("b-name").value.trim();
  if (!name) {
    showToast("Ilagay ang pangalan ng bundle!", "warning");
    return;
  }
  const price = parseFloat(document.getElementById("b-price").value);
  if (!price || price <= 0) {
    showToast("Ilagay ang tamang bundle price!", "warning");
    return;
  }

  const isSingle = document.getElementById("btype-single").checked;
  let items = [];

  if (isSingle) {
    const pid = parseInt(document.getElementById("b-single-product").value);
    const qty = parseInt(document.getElementById("b-single-qty").value);
    if (!pid) {
      showToast("Piliin ang produkto!", "warning");
      return;
    }
    if (!qty || qty < 2) {
      showToast("Bundle quantity dapat 2 o higit pa!", "warning");
      return;
    }
    items = [{ product_id: pid, qty }];
  } else {
    const ids = Object.keys(bundleSelectedItems);
    if (ids.length < 2) {
      showToast("Pumili ng 2 o higit pang produkto para sa combo!", "warning");
      return;
    }
    items = ids.map((pid) => ({
      product_id: parseInt(pid),
      qty: bundleSelectedItems[pid],
    }));
  }

  const bundleData = {
    name,
    type: isSingle ? "single" : "multi",
    items,
    bundle_price: price,
  };

  if (editingBundleId) {
    const b = db.bundles.find((x) => x.id === editingBundleId);
    Object.assign(b, bundleData);
    showToast("Na-update ang bundle!");
  } else {
    db.bundles.push({ id: genId("bundles"), ...bundleData });
    showToast("Nadagdag ang bundle!");
  }

  closeModal("modal-bundle");
  renderBundlesPage();
}

// ============================================================
// STOCK LOGS
// ============================================================
function renderStockLogs() {
  const tbody = document.getElementById("stocklogs-body");
  const logs = [...db.stock_logs].reverse();
  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>No stock logs yet</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = logs
    .map((l) => {
      const p = db.products.find((x) => x.id === l.product_id);
      const pname = p ? `${p.image_url} ${p.name}` : "?";
      const qtyColor = l.change_qty > 0 ? "var(--green)" : "var(--red)";
      const qtyStr = l.change_qty > 0 ? `+${l.change_qty}` : `${l.change_qty}`;
      const reasonBadge =
        {
          restock: '<span class="badge badge-green">Restock</span>',
          damaged: '<span class="badge badge-red">Damaged</span>',
          expired: '<span class="badge badge-yellow">Expired</span>',
          adjustment: '<span class="badge badge-blue">Adjustment</span>',
        }[l.reason] || l.reason;
      return `<tr>
      <td>${pname}</td>
      <td style="color:${qtyColor};font-weight:700">${qtyStr}</td>
      <td>${reasonBadge}</td>
      <td style="color:var(--muted);font-size:12px">${l.expiration_date || "—"}</td>
      <td style="color:var(--muted);font-size:12px">${l.notes || "—"}</td>
      <td style="color:var(--muted);font-size:12px">${l.log_date}</td>
    </tr>`;
    })
    .join("");
}

function openStockLog() {
  const sel = document.getElementById("sl-product");
  sel.innerHTML = db.products
    .map((p) => `<option value="${p.id}">${p.image_url} ${p.name}</option>`)
    .join("");
  document.getElementById("sl-qty").value = "";
  document.getElementById("sl-notes").value = "";
  document.getElementById("sl-expiry").value = "";
  openModal("modal-stock");
}

function saveStockLog() {
  const product_id = parseInt(document.getElementById("sl-product").value);
  const change_qty = parseInt(document.getElementById("sl-qty").value);
  const reason = document.getElementById("sl-reason").value;
  const notes = document.getElementById("sl-notes").value;
  const expiration_date = document.getElementById("sl-expiry").value;

  if (!change_qty) {
    showToast("Ilagay ang quantity!", "warning");
    return;
  }

  const p = db.products.find((x) => x.id === product_id);
  p.stock_quantity += change_qty;
  if (p.stock_quantity < 0) p.stock_quantity = 0;

  db.stock_logs.push({
    id: genId("stock_logs"),
    product_id,
    change_qty,
    reason,
    notes,
    expiration_date: expiration_date || null,
    log_date: new Date().toLocaleDateString("en-PH"),
  });

  closeModal("modal-stock");
  renderStockLogs();
  showToast(
    `Stock updated! ${change_qty > 0 ? "+" + change_qty : change_qty} sa ${p.name}`,
  );
}

// ============================================================
// SALES
// ============================================================
function renderSales() {
  const tbody = document.getElementById("sales-body");
  const sales = [...db.sales].reverse();
  if (sales.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>No sales yet</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = sales
    .map((s) => {
      const items = db.sale_items.filter((i) => i.sale_id === s.id);
      const total = items.reduce((a, b) => a + b.total_price, 0);
      const names = items
        .map((i) => {
          const p = db.products.find((x) => x.id === i.product_id);
          return p ? p.name : "?";
        })
        .join(", ");
      const pt =
        s.payment_type === "credit"
          ? `<span class="badge badge-red">Utang</span>`
          : `<span class="badge badge-green">Cash</span>`;
      const customer = s.customer_id
        ? db.customers.find((c) => c.id === s.customer_id)
        : null;
      const cname = customer
        ? `${customer.first_name} ${customer.last_name}`
        : "—";
      return `<tr>
      <td style="color:var(--muted)">#${s.id}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${names}</td>
      <td>${pt}</td>
      <td>${cname}</td>
      <td style="color:var(--accent);font-weight:700">${fmt(total)}</td>
      <td style="color:var(--muted);font-size:12px">${s.sale_date}</td>
    </tr>`;
    })
    .join("");
}

// ============================================================
// CREDITS
// ============================================================
function renderCredits() {
  const list = document.getElementById("credits-list");
  const unpaid = db.credits.filter((c) => c.status !== "paid");
  const totalUtang = unpaid.reduce(
    (sum, c) => sum + (c.amount_owed - c.amount_paid),
    0,
  );
  document.getElementById("total-utang-display").textContent =
    `Total: ${fmt(totalUtang)}`;

  if (db.credits.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><div class="icon">📒</div><p>Walang utang records</p></div>';
    return;
  }

  list.innerHTML = db.credits
    .map((cr) => {
      const customer = db.customers.find((c) => c.id === cr.customer_id);
      if (!customer) return "";
      const name = `${customer.first_name} ${customer.last_name}`;
      const initials = customer.first_name[0] + customer.last_name[0];
      const remaining = cr.amount_owed - cr.amount_paid;
      const pct = Math.min((cr.amount_paid / cr.amount_owed) * 100, 100);
      const statusBadge = {
        paid: '<span class="badge badge-green">Bayad na</span>',
        partial: '<span class="badge badge-yellow">Partial</span>',
        unpaid: '<span class="badge badge-red">Hindi pa bayad</span>',
      }[cr.status];

      return `<div class="credit-card">
      <div class="credit-avatar">${initials}</div>
      <div class="credit-info">
        <div class="credit-name">${name} ${statusBadge}</div>
        <div class="credit-detail">Bayad: ${fmt(cr.amount_paid)} / ${fmt(cr.amount_owed)} · ${cr.created_date}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct === 100 ? "var(--green)" : "var(--warning)"}"></div></div>
      </div>
      <div class="credit-amount">
        <div class="credit-owed">${fmt(remaining)}</div>
        ${cr.status !== "paid" ? `<button class="btn btn-success btn-sm" style="margin-top:6px" onclick="openPayUtang(${cr.id})">💰 Bayad</button>` : ""}
      </div>
    </div>`;
    })
    .join("");
}

function openPayUtang(creditId) {
  payingCreditId = creditId;
  const cr = db.credits.find((c) => c.id === creditId);
  const customer = db.customers.find((c) => c.id === cr.customer_id);
  const remaining = cr.amount_owed - cr.amount_paid;
  document.getElementById("pay-utang-info").innerHTML = `
    <div class="credit-card" style="margin:0">
      <div class="credit-info">
        <div class="credit-name">${customer.first_name} ${customer.last_name}</div>
        <div class="credit-detail">Natitira: <strong style="color:var(--red)">${fmt(remaining)}</strong></div>
      </div>
    </div>`;
  document.getElementById("pay-utang-amount").value = remaining.toFixed(2);
  openModal("modal-pay-utang");
}

function processUtangPayment() {
  const amount = parseFloat(document.getElementById("pay-utang-amount").value);
  if (!amount || amount <= 0) {
    showToast("Invalid na amount!", "error");
    return;
  }

  const cr = db.credits.find((c) => c.id === payingCreditId);
  cr.amount_paid = Math.min(cr.amount_paid + amount, cr.amount_owed);
  cr.status = cr.amount_paid >= cr.amount_owed ? "paid" : "partial";

  closeModal("modal-pay-utang");
  renderCredits();
  updateUtangBadge();
  showToast(`Na-record ang bayad na ${fmt(amount)}!`);
}

function updateUtangBadge() {
  const unpaid = db.credits.filter((c) => c.status !== "paid").length;
  const badge = document.getElementById("utang-badge");
  if (unpaid > 0) {
    badge.style.display = "inline";
    badge.textContent = unpaid;
  } else {
    badge.style.display = "none";
  }
}

// ============================================================
// EXPENSES
// ============================================================
function renderExpenses() {
  const tbody = document.getElementById("expenses-body");
  const expenses = [...db.expenses].reverse();

  const total = db.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = db.sales.reduce((sum, s) => {
    return (
      sum +
      db.sale_items
        .filter((i) => i.sale_id === s.id)
        .reduce((a, b) => a + b.total_price, 0)
    );
  }, 0);

  document.getElementById("exp-total").textContent = fmt(total);
  document.getElementById("exp-month").textContent = fmt(total); // simplified
  const net = totalSales - total;
  const netEl = document.getElementById("exp-net");
  netEl.textContent = fmt(net);
  netEl.style.color = net >= 0 ? "var(--green)" : "var(--red)";

  if (expenses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4"><div class="empty-state"><p>No expenses yet</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = expenses
    .map((e) => {
      const cat = db.expense_categories.find(
        (c) => c.id === e.expense_category_id,
      );
      return `<tr>
      <td><span class="badge badge-blue">${cat ? cat.name : "?"}</span></td>
      <td style="color:var(--red);font-weight:700">${fmt(e.amount)}</td>
      <td style="color:var(--muted)">${e.notes || "—"}</td>
      <td style="color:var(--muted);font-size:12px">${e.expense_date}</td>
    </tr>`;
    })
    .join("");
}

function openAddExpense() {
  openModal("modal-expense");
}

function saveExpense() {
  const catName = document.getElementById("e-category").value;
  const cat = db.expense_categories.find((c) => c.name === catName);
  const amount = parseFloat(document.getElementById("e-amount").value);
  if (!amount || amount <= 0) {
    showToast("Ilagay ang tamang amount!", "warning");
    return;
  }

  db.expenses.push({
    id: genId("expenses"),
    expense_category_id: cat ? cat.id : 1,
    amount,
    notes: document.getElementById("e-notes").value,
    expense_date: new Date().toLocaleDateString("en-PH"),
  });

  closeModal("modal-expense");
  renderExpenses();
  showToast("Naitala ang gastos!");
}

// ============================================================
// CUSTOMERS
// ============================================================
function renderCustomers() {
  const tbody = document.getElementById("customers-body");
  if (db.customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>No customers</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = db.customers
    .map((c) => {
      const totalDebt = db.credits
        .filter((x) => x.customer_id === c.id && x.status !== "paid")
        .reduce((sum, x) => sum + (x.amount_owed - x.amount_paid), 0);
      const pct = Math.min((totalDebt / c.credit_limit) * 100, 100);
      const debtColor =
        pct > 80 ? "var(--red)" : pct > 50 ? "var(--warning)" : "var(--green)";
      return `<tr>
      <td><strong>${c.first_name} ${c.last_name}</strong></td>
      <td style="color:var(--muted)">${c.contact_number || "—"}</td>
      <td style="color:var(--muted);font-size:12px">${c.barangay || "—"}</td>
      <td style="color:var(--muted)">${fmt(c.credit_limit)}</td>
      <td>
        <span style="color:${debtColor};font-weight:700">${fmt(totalDebt)}</span>
        <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${pct}%;background:${debtColor}"></div></div>
      </td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editCustomerLimit(${c.id})">✏️ Limit</button>
      </td>
    </tr>`;
    })
    .join("");
}

function openAddCustomer() {
  openModal("modal-customer");
}

function saveCustomer() {
  const fname = document.getElementById("c-fname").value.trim();
  const lname = document.getElementById("c-lname").value.trim();
  if (!fname || !lname) {
    showToast("Ilagay ang pangalan!", "warning");
    return;
  }

  db.customers.push({
    id: genId("customers"),
    first_name: fname,
    middle_name: "",
    last_name: lname,
    contact_number: document.getElementById("c-contact").value,
    municipality: "",
    barangay: document.getElementById("c-brgy").value,
    street: "",
    credit_limit: parseFloat(document.getElementById("c-limit").value) || 1000,
  });

  closeModal("modal-customer");
  renderCustomers();
  showToast("Nadagdag ang customer!");
}

function editCustomerLimit(id) {
  const c = db.customers.find((x) => x.id === id);
  const newLimit = prompt(
    `Credit limit ni ${c.first_name} ${c.last_name}:`,
    c.credit_limit,
  );
  if (newLimit !== null && !isNaN(parseFloat(newLimit))) {
    c.credit_limit = parseFloat(newLimit);
    renderCustomers();
    showToast("Na-update ang credit limit!");
  }
}

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const el = document.getElementById("clock");
  const now = new Date();
  el.textContent =
    now.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// INIT
// ============================================================
renderDashboard();
updateUtangBadge();
