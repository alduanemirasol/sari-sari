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
function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  const today = new Date().toDateString();
  const todaySales = db.sales.filter(
    (s) => new Date(s.sale_date).toDateString() === today,
  );
  const totalToday = todaySales.reduce((sum, s) => {
    return (
      sum +
      db.sale_items
        .filter((i) => i.sale_id === s.id)
        .reduce((a, b) => a + b.total_price, 0)
    );
  }, 0);

  // Use helper functions for credit balance
  const unpaidCTs = db.credit_transactions.filter(
    (ct) => getCreditBalance(ct) > 0,
  );
  const totalUtang = unpaidCTs.reduce(
    (sum, ct) => sum + getCreditBalance(ct),
    0,
  );
  const uniqueDebtors = [...new Set(unpaidCTs.map((ct) => ct.customer_id))]
    .length;
  const activeProducts = db.products.filter((p) => p.is_active);
  const lowStock = activeProducts.filter((p) => p.stock_quantity <= 10);

  document.getElementById("stat-sales").textContent = fmt(totalToday);
  document.getElementById("stat-txn").textContent =
    todaySales.length + " transactions";
  document.getElementById("stat-products").textContent = activeProducts.length;
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
            if (i.bundle_id) {
              const b = db.bundles.find((x) => x.id === i.bundle_id);
              return b ? `🎁 ${b.bundle_name}` : "?";
            }
            const p = db.products.find((x) => x.id === i.product_id);
            return p ? p.name : "?";
          })
          .join(", ");
        const paymentType = db.payment_types.find(
          (pt) => pt.id === s.payment_type_id,
        );
        const pt =
          paymentType?.name === "credit"
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
  const activeProducts = db.products.filter((p) => p.is_active);
  const cats = [
    "All",
    ...new Set(activeProducts.map((p) => getProductCategory(p))),
  ];
  const tabsEl = document.getElementById("pos-category-tabs");
  tabsEl.innerHTML = cats
    .map(
      (c) =>
        `<button class="filter-tab ${c === posCategory ? "active" : ""}" onclick="filterPosCategory('${c}', this)">${c}</button>`,
    )
    .join("");

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
  let prods = db.products.filter((p) => p.is_active);
  if (posCategory !== "All")
    prods = prods.filter((p) => getProductCategory(p) === posCategory);
  if (posSearch)
    prods = prods.filter((p) => p.name.toLowerCase().includes(posSearch));

  const grid = document.getElementById("pos-product-grid");
  grid.innerHTML = prods
    .map((p) => {
      const pricing = getProductPricing(p.id);
      const unitOptions = getProductUnitOptions(p.id);
      const hasMultiUnits = unitOptions.length > 0;

      // Total qty across all units in cart for this product
      const qty = cart
        .filter((c) => c.product_id === p.id)
        .reduce((sum, c) => sum + c.quantity, 0);
      const selected = qty > 0 ? "selected" : "";
      const stockBadge =
        p.stock_quantity <= 10
          ? `<div style="font-size:10px;color:var(--red);margin-top:2px;">⚠️ ${p.stock_quantity} left</div>`
          : "";
      const retailPrice = pricing ? pricing.retail_price : 0;
      const multiUnitBadge = hasMultiUnits
        ? `<div style="font-size:10px;color:var(--accent);margin-top:2px;font-weight:600;">📦 Multi-unit</div>`
        : "";
      return `
    <div class="product-card ${selected}" onclick="addToCart(${p.id})">
      <div class="product-qty-badge">${qty}</div>
      <div class="product-emoji">${p.image_url}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${fmt(retailPrice)}</div>
      <div class="product-stock">${p.stock_quantity} pcs</div>
      ${multiUnitBadge}
      ${stockBadge}
    </div>`;
    })
    .join("");
}

function renderPosBundles() {
  const grid = document.getElementById("pos-bundle-grid");
  const empty = document.getElementById("pos-bundle-empty");
  const activeBundles = db.bundles.filter((b) => b.is_active);

  if (activeBundles.length === 0) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }
  grid.style.display = "grid";
  empty.style.display = "none";

  grid.innerHTML = activeBundles
    .map((b) => {
      const bItems = getBundleItems(b.id);
      const retailTotal = getBundleRetailTotal(b.id);
      const savings = retailTotal - b.bundle_price;
      const cartB = cartBundles.find((x) => x.bundle_id === b.id);
      const qty = cartB ? cartB.quantity : 0;
      const selected = qty > 0 ? "selected" : "";
      const itemsText = bItems
        .map((bi) => {
          const p = db.products.find((x) => x.id === bi.product_id);
          return p ? `${bi.quantity}× ${p.name}` : "";
        })
        .filter(Boolean)
        .join(", ");

      const hasStock = bItems.every((bi) => {
        const p = db.products.find((x) => x.id === bi.product_id);
        return p && p.stock_quantity >= bi.quantity;
      });

      const firstProduct =
        bItems.length === 1
          ? db.products.find((p) => p.id === bItems[0].product_id)
          : null;
      const emoji = firstProduct ? firstProduct.image_url : "🎁";

      return `
    <div class="bundle-pos-card ${selected} ${!hasStock ? "opacity-50" : ""}" onclick="${hasStock ? `addBundleToCart(${b.id})` : ""}">
      <div class="bundle-pos-badge">${qty}</div>
      <div style="font-size:28px;margin-bottom:6px;">${emoji}</div>
      <div class="bundle-pos-name">${b.bundle_name}</div>
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

  // Check if product has multiple unit options
  const unitOptions = getProductUnitOptions(product_id);
  if (unitOptions.length > 0) {
    // Show unit picker modal
    openUnitPickerModal(product_id);
    return;
  }

  // Default: add with product's default unit
  addToCartWithUnit(product_id, product.unit_id);
}

function addToCartWithUnit(product_id, unit_id) {
  const product = db.products.find((p) => p.id === product_id);
  if (!product) return;
  if (product.stock_quantity <= 0) {
    showToast("Wala nang stock!", "error");
    return;
  }

  // Cart key is product_id + unit_id combination
  const existing = cart.find(
    (c) => c.product_id === product_id && c.unit_id === unit_id,
  );
  if (existing) {
    if (existing.quantity >= product.stock_quantity) {
      showToast("Hindi na dagdag, ubos na stock!", "warning");
      return;
    }
    existing.quantity++;
  } else {
    cart.push({ product_id, unit_id, quantity: 1 });
  }
  closeModal("modal-unit-picker");
  renderPosGrid();
  renderCart();
}

function openUnitPickerModal(product_id) {
  const product = db.products.find((p) => p.id === product_id);
  if (!product) return;
  const unitOptions = getProductUnitOptions(product_id);
  const defaultPricing = getProductPricing(product_id);
  const defaultUnit = db.units.find((u) => u.id === product.unit_id);

  document.getElementById("unit-picker-title").textContent =
    `📦 Piliin ang Unit — ${product.name}`;
  document.getElementById("unit-picker-product-info").innerHTML = `
    <div style="font-size:28px">${product.image_url}</div>
    <div>
      <div style="font-weight:700;font-size:14px">${product.name}</div>
      <div style="font-size:12px;color:var(--muted)">Stock: ${product.stock_quantity} ${defaultUnit ? defaultUnit.abbreviation : "pc"}</div>
    </div>`;

  // Build option buttons: default unit (from product_pricing) + additional units (from product_units)
  let optionsHtml = "";

  // Default unit option (from product_pricing)
  if (defaultPricing) {
    const cartItem = cart.find(
      (c) => c.product_id === product_id && c.unit_id === product.unit_id,
    );
    const inCart = cartItem ? cartItem.quantity : 0;
    optionsHtml += `
    <button class="unit-picker-opt ${inCart > 0 ? "selected" : ""}" onclick="addToCartWithUnit(${product_id}, ${product.unit_id})">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700">${defaultUnit ? defaultUnit.name : "piece"} <span style="font-size:11px;color:var(--muted)">(${defaultUnit ? defaultUnit.abbreviation : "pc"})</span></div>
          <div style="font-size:12px;color:var(--muted)">Retail: ${fmt(defaultPricing.retail_price)} · Wholesale: ${fmt(defaultPricing.wholesale_price)} (${defaultPricing.wholesale_min_qty}+)</div>
        </div>
        <div style="font-size:18px;font-weight:800;color:var(--accent)">${fmt(defaultPricing.retail_price)}</div>
      </div>
      ${inCart > 0 ? `<div style="font-size:11px;color:var(--green);margin-top:4px;">✓ ${inCart} in cart</div>` : ""}
    </button>`;
  }

  // Additional unit options
  unitOptions.forEach((pu) => {
    if (pu.unit_id === product.unit_id) return; // skip if same as default (already shown)
    const unit = db.units.find((u) => u.id === pu.unit_id);
    const cartItem = cart.find(
      (c) => c.product_id === product_id && c.unit_id === pu.unit_id,
    );
    const inCart = cartItem ? cartItem.quantity : 0;
    const label = pu.label || (unit ? unit.name : "unit");
    optionsHtml += `
    <button class="unit-picker-opt ${inCart > 0 ? "selected" : ""}" onclick="addToCartWithUnit(${product_id}, ${pu.unit_id})">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700">${label}</div>
          <div style="font-size:12px;color:var(--muted)">Retail: ${fmt(pu.retail_price)} · Wholesale: ${fmt(pu.wholesale_price)} (${pu.wholesale_min_qty}+)</div>
        </div>
        <div style="font-size:18px;font-weight:800;color:var(--accent)">${fmt(pu.retail_price)}</div>
      </div>
      ${inCart > 0 ? `<div style="font-size:11px;color:var(--green);margin-top:4px;">✓ ${inCart} in cart</div>` : ""}
    </button>`;
  });

  document.getElementById("unit-picker-options").innerHTML = optionsHtml;
  openModal("modal-unit-picker");
}

function addBundleToCart(bundle_id) {
  const bundle = db.bundles.find((b) => b.id === bundle_id);
  if (!bundle) return;
  const bItems = getBundleItems(bundle_id);
  for (const bi of bItems) {
    const p = db.products.find((x) => x.id === bi.product_id);
    if (!p || p.stock_quantity < bi.quantity) {
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

function changeCartQty(product_id, unit_id, delta) {
  const idx = cart.findIndex(
    (c) => c.product_id === product_id && c.unit_id === unit_id,
  );
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

  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    if (!p) return;

    // Determine pricing: check product_units first, fall back to product_pricing
    let unitPrice, saleTypeLabel;
    const puPricing = getProductUnitPricing(p.id, item.unit_id);
    const unit = db.units.find((u) => u.id === item.unit_id);
    const unitLabel = unit ? `(${unit.abbreviation})` : "";

    if (puPricing) {
      unitPrice =
        item.quantity >= puPricing.wholesale_min_qty
          ? puPricing.wholesale_price
          : puPricing.retail_price;
      saleTypeLabel =
        item.quantity >= puPricing.wholesale_min_qty
          ? ' <span class="tag">Wholesale</span>'
          : "";
    } else {
      const pricing = getProductPricing(p.id);
      if (!pricing) return;
      unitPrice =
        item.quantity >= pricing.wholesale_min_qty
          ? pricing.wholesale_price
          : pricing.retail_price;
      saleTypeLabel =
        item.quantity >= pricing.wholesale_min_qty
          ? ' <span class="tag">Wholesale</span>'
          : "";
    }

    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    html += `
    <div class="cart-item">
      <div class="cart-item-emoji">${p.image_url}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name} <span style="font-size:11px;color:var(--muted)">${unitLabel}</span>${saleTypeLabel}</div>
        <div class="cart-item-price">${fmt(unitPrice)} × ${item.quantity} = ${fmt(lineTotal)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeCartQty(${p.id},${item.unit_id},-1)">−</button>
        <span class="qty-display">${item.quantity}</span>
        <button class="qty-btn" onclick="changeCartQty(${p.id},${item.unit_id},1)">+</button>
      </div>
    </div>`;
  });

  cartBundles.forEach((cb) => {
    const bundle = db.bundles.find((x) => x.id === cb.bundle_id);
    if (!bundle) return;
    const bItems = getBundleItems(bundle.id);
    const lineTotal = bundle.bundle_price * cb.quantity;
    const retailTotal = getBundleRetailTotal(bundle.id) * cb.quantity;
    const savings = retailTotal - lineTotal;
    subtotal += lineTotal;
    totalBundleSavings += savings;

    const itemsText = bItems
      .map((bi) => {
        const p = db.products.find((x) => x.id === bi.product_id);
        return p
          ? `${p.image_url}${bi.quantity > 1 ? "×" + bi.quantity : ""}`
          : "";
      })
      .join(" ");

    html += `
    <div class="cart-item cart-item-bundle">
      <div class="cart-item-emoji">🎁</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${bundle.bundle_name} <span class="bundle-tag">🎁 Bundle</span></div>
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

    // Check credit limit using helper
    const customer = db.customers.find((c) => c.id === customerId);
    const existingDebt = getCustomerDebt(customerId);

    let orderTotal = cart.reduce((sum, item) => {
      const p = db.products.find((x) => x.id === item.product_id);
      const pricing = getProductPricing(p.id);
      const up =
        item.quantity >= pricing.wholesale_min_qty
          ? pricing.wholesale_price
          : pricing.retail_price;
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

  // Create sale — payment_type_id from payment_types table
  const paymentTypeObj = db.payment_types.find((pt) => pt.name === payType);
  const saleId = genId("sales");
  const saleDate = now();
  db.sales.push({
    id: saleId,
    customer_id: customerId,
    payment_type_id: paymentTypeObj.id,
    sale_date: saleDate,
  });

  let total = 0;
  let receiptItems = [];
  const dateStr = todayISO();

  // Regular product items
  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);

    // Resolve pricing: product_units first, then product_pricing
    const puPricing = getProductUnitPricing(p.id, item.unit_id);
    let unitPrice, saleType;
    if (puPricing) {
      unitPrice =
        item.quantity >= puPricing.wholesale_min_qty
          ? puPricing.wholesale_price
          : puPricing.retail_price;
      saleType =
        item.quantity >= puPricing.wholesale_min_qty ? "wholesale" : "retail";
    } else {
      const pricing = getProductPricingAt(p.id, dateStr);
      unitPrice =
        item.quantity >= pricing.wholesale_min_qty
          ? pricing.wholesale_price
          : pricing.retail_price;
      saleType =
        item.quantity >= pricing.wholesale_min_qty ? "wholesale" : "retail";
    }

    const lineTotal = unitPrice * item.quantity;
    total += lineTotal;

    db.sale_items.push({
      id: genId("sale_items"),
      sale_id: saleId,
      product_id: item.product_id,
      bundle_id: null,
      unit_id: item.unit_id,
      quantity_sold: item.quantity,
      unit_price: unitPrice,
      total_price: lineTotal,
      sale_type: saleType,
    });

    // Deduct stock + log it
    p.stock_quantity -= item.quantity;
    db.stock_logs.push({
      id: genId("stock_logs"),
      product_id: p.id,
      unit_id: item.unit_id,
      stock_batch_id: null,
      change_qty: -item.quantity,
      reason: "sold",
      notes: `Sale #${saleId}`,
      created_at: dateStr,
    });

    const unit = db.units.find((u) => u.id === item.unit_id);
    receiptItems.push({
      name: p.name + (unit ? ` (${unit.abbreviation})` : ""),
      qty: item.quantity,
      price: unitPrice,
      total: lineTotal,
      isBundle: false,
    });
  });

  // Bundle items
  cartBundles.forEach((cb) => {
    const bundle = db.bundles.find((x) => x.id === cb.bundle_id);
    if (!bundle) return;
    const bItems = getBundleItems(bundle.id);
    const lineTotal = bundle.bundle_price * cb.quantity;
    total += lineTotal;

    // One sale_item row represents the bundle sale
    const saleItemId = genId("sale_items");
    db.sale_items.push({
      id: saleItemId,
      sale_id: saleId,
      product_id: null,
      bundle_id: bundle.id,
      unit_id: null,
      quantity_sold: cb.quantity,
      unit_price: bundle.bundle_price, // snapshotted bundle price
      total_price: lineTotal,
      sale_type: "bundle",
    });

    // sale_bundle_items: individual product deductions for this bundle line
    bItems.forEach((bi) => {
      const p = db.products.find((x) => x.id === bi.product_id);
      if (!p) return;
      const totalQty = bi.quantity * cb.quantity;

      db.sale_bundle_items.push({
        id: genId("sale_bundle_items"),
        sale_item_id: saleItemId,
        bundle_item_id: bi.id,
        product_id: bi.product_id,
        unit_id: bi.unit_id,
        quantity_deducted: totalQty,
      });

      // Deduct stock + log
      p.stock_quantity -= totalQty;
      db.stock_logs.push({
        id: genId("stock_logs"),
        product_id: p.id,
        unit_id: p.unit_id,
        stock_batch_id: null,
        change_qty: -totalQty,
        reason: "sold",
        notes: `Bundle sale #${saleId} — ${bundle.bundle_name}`,
        created_at: dateStr,
      });
    });

    receiptItems.push({
      name: bundle.bundle_name,
      qty: cb.quantity,
      price: bundle.bundle_price,
      total: lineTotal,
      isBundle: true,
      bundleItems: bItems
        .map((bi) => {
          const p = db.products.find((x) => x.id === bi.product_id);
          return p ? `${p.name} ×${bi.quantity}` : "";
        })
        .filter(Boolean),
    });
  });

  // Create credit_transaction if credit sale
  if (payType === "credit") {
    db.credit_transactions.push({
      id: genId("credit_transactions"),
      customer_id: customerId,
      sale_id: saleId,
      amount_owed: total,
      due_date: "",
      created_at: dateStr,
    });
  }

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
  let prods = db.products.filter((p) => p.is_active);
  if (search)
    prods = prods.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        getProductCategory(p).toLowerCase().includes(search),
    );

  const tbody = document.getElementById("products-body");
  if (prods.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7"><div class="empty-state"><p>Walang produkto</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = prods
    .map((p) => {
      const pricing = getProductPricing(p.id);
      const stockBadge =
        p.stock_quantity === 0
          ? `<span class="badge badge-red">Out</span>`
          : p.stock_quantity <= 10
            ? `<span class="badge badge-yellow">${p.stock_quantity}</span>`
            : `<span class="badge badge-green">${p.stock_quantity}</span>`;
      const catName = getProductCategory(p);
      return `<tr>
    <td><span style="font-size:18px">${p.image_url}</span> <strong>${p.name}</strong></td>
    <td><span class="badge badge-blue">${catName}</span></td>
    <td>${stockBadge}</td>
    <td style="color:var(--accent)">${pricing ? fmt(pricing.retail_price) : "—"}</td>
    <td style="color:var(--muted)">${pricing ? fmt(pricing.wholesale_price) : "—"}</td>
    <td style="color:var(--muted)">${pricing ? pricing.wholesale_min_qty + "+" : "—"}</td>
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
  renderProductUnitRows([]);
  openModal("modal-product");
}

function editProduct(id) {
  const p = db.products.find((x) => x.id === id);
  if (!p) return;
  const pricing = getProductPricing(id);
  editingProductId = id;
  document.getElementById("product-modal-title").textContent =
    "I-edit ang Produkto";
  document.getElementById("p-name").value = p.name;
  document.getElementById("p-category").value = p.product_category_id;
  document.getElementById("p-stock").value = p.stock_quantity;
  document.getElementById("p-retail").value = pricing
    ? pricing.retail_price
    : "";
  document.getElementById("p-wholesale").value = pricing
    ? pricing.wholesale_price
    : "";
  document.getElementById("p-minqty").value = pricing
    ? pricing.wholesale_min_qty
    : "";
  // Load existing unit rows
  const existingUnits = getProductUnitOptions(id);
  renderProductUnitRows(existingUnits);
  openModal("modal-product");
}

function saveProduct() {
  const name = document.getElementById("p-name").value.trim();
  if (!name) {
    showToast("Ilagay ang pangalan ng produkto!", "warning");
    return;
  }

  const catId = parseInt(document.getElementById("p-category").value);
  const retailPrice = parseFloat(document.getElementById("p-retail").value);
  const wholesalePrice = parseFloat(
    document.getElementById("p-wholesale").value,
  );
  const wholesaleMinQty = parseInt(document.getElementById("p-minqty").value);

  if (editingProductId) {
    const p = db.products.find((x) => x.id === editingProductId);
    p.name = name;
    p.product_category_id = catId;
    p.stock_quantity = parseInt(document.getElementById("p-stock").value);
    p.image_url = getCategoryEmoji(catId);

    // Add new pricing row with today's date (price history preserved)
    const existingPricing = getProductPricing(editingProductId);
    const priceChanged =
      !existingPricing ||
      existingPricing.retail_price !== retailPrice ||
      existingPricing.wholesale_price !== wholesalePrice ||
      existingPricing.wholesale_min_qty !== wholesaleMinQty;

    if (priceChanged) {
      db.product_pricing.push({
        id: genId("product_pricing"),
        product_id: editingProductId,
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        wholesale_min_qty: wholesaleMinQty,
        effective_date: todayISO(),
      });
    }

    // Replace product_units for this product with pendingProductUnits
    db.product_units = db.product_units.filter(
      (pu) => pu.product_id !== editingProductId,
    );
    pendingProductUnits.forEach((pu) => {
      if (pu.retail_price > 0) {
        db.product_units.push({
          id: genId("product_units"),
          product_id: editingProductId,
          unit_id: pu.unit_id,
          retail_price: pu.retail_price,
          wholesale_price: pu.wholesale_price || 0,
          wholesale_min_qty: pu.wholesale_min_qty || 10,
          label: pu.label || "",
        });
      }
    });

    showToast("Na-update ang produkto!");
  } else {
    const newId = genId("products");
    db.products.push({
      id: newId,
      name,
      product_category_id: catId,
      unit_id: 1, // default: piece
      stock_quantity: parseInt(document.getElementById("p-stock").value),
      image_url: getCategoryEmoji(catId),
      is_active: true,
    });
    // Create initial pricing row
    db.product_pricing.push({
      id: genId("product_pricing"),
      product_id: newId,
      retail_price: retailPrice,
      wholesale_price: wholesalePrice,
      wholesale_min_qty: wholesaleMinQty,
      effective_date: todayISO(),
    });

    // Save product_units
    pendingProductUnits.forEach((pu) => {
      if (pu.retail_price > 0) {
        db.product_units.push({
          id: genId("product_units"),
          product_id: newId,
          unit_id: pu.unit_id,
          retail_price: pu.retail_price,
          wholesale_price: pu.wholesale_price || 0,
          wholesale_min_qty: pu.wholesale_min_qty || 10,
          label: pu.label || "",
        });
      }
    });

    showToast("Nadagdag ang produkto!");
  }

  closeModal("modal-product");
  renderProducts();
}

function deleteProduct(id) {
  if (!confirm("Sigurado ka bang gusto mong i-delete?")) return;
  // Soft delete — preserve history
  const p = db.products.find((x) => x.id === id);
  if (p) p.is_active = false;
  renderProducts();
  showToast("Na-delete ang produkto!", "warning");
}

function getCategoryEmoji(catId) {
  const map = { 1: "🍬", 2: "🥤", 3: "🍟", 4: "🍶", 5: "🧴", 6: "🚬", 7: "📦" };
  return map[catId] || "📦";
}

// ============================================================
// PRODUCT UNIT MANAGEMENT (for product modal)
// ============================================================
let pendingProductUnits = []; // temp state while modal is open

function renderProductUnitRows(existingUnits) {
  // Clone existing units into pendingProductUnits
  pendingProductUnits = existingUnits.map((pu) => ({ ...pu }));
  redrawProductUnitRows();
}

function redrawProductUnitRows() {
  const container = document.getElementById("p-unit-rows");
  if (pendingProductUnits.length === 0) {
    container.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:8px 0;font-style:italic;">No additional units. Click "+ Add Unit" to add one.</div>`;
    return;
  }
  const unitOptions = db.units
    .map(
      (u) => `<option value="${u.id}">${u.name} (${u.abbreviation})</option>`,
    )
    .join("");
  container.innerHTML = pendingProductUnits
    .map(
      (pu, i) => `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:12px;font-weight:700;color:var(--muted)">Unit Option ${i + 1}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeProductUnitRow(${i})">✕ Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-size:11px">Unit</label>
          <select class="form-select" id="pu-unit-${i}" style="font-size:13px" onchange="updatePendingUnit(${i},'unit_id',parseInt(this.value))">
            ${db.units.map((u) => `<option value="${u.id}" ${u.id === pu.unit_id ? "selected" : ""}>${u.name} (${u.abbreviation})</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px">Label (optional)</label>
          <input type="text" class="form-input" style="font-size:13px" id="pu-label-${i}" value="${pu.label || ""}" placeholder="e.g., Per Liter" onchange="updatePendingUnit(${i},'label',this.value)">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" style="font-size:11px">Retail Price (₱)</label>
          <input type="number" class="form-input" style="font-size:13px" id="pu-retail-${i}" step="0.01" value="${pu.retail_price || ""}" placeholder="0.00" onchange="updatePendingUnit(${i},'retail_price',parseFloat(this.value))">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px">Wholesale Price (₱)</label>
          <input type="number" class="form-input" style="font-size:13px" id="pu-wholesale-${i}" step="0.01" value="${pu.wholesale_price || ""}" placeholder="0.00" onchange="updatePendingUnit(${i},'wholesale_price',parseFloat(this.value))">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:11px">Wholesale Min Qty</label>
          <input type="number" class="form-input" style="font-size:13px" id="pu-minqty-${i}" value="${pu.wholesale_min_qty || 10}" onchange="updatePendingUnit(${i},'wholesale_min_qty',parseInt(this.value))">
        </div>
      </div>
    </div>`,
    )
    .join("");
}

function addProductUnitRow() {
  pendingProductUnits.push({
    unit_id: 1,
    label: "",
    retail_price: 0,
    wholesale_price: 0,
    wholesale_min_qty: 10,
  });
  redrawProductUnitRows();
}

function removeProductUnitRow(index) {
  pendingProductUnits.splice(index, 1);
  redrawProductUnitRows();
}

function updatePendingUnit(index, field, value) {
  if (pendingProductUnits[index]) {
    pendingProductUnits[index][field] = value;
  }
}

// ============================================================
// BUNDLE PRICING
// ============================================================
function renderBundlesPage() {
  const container = document.getElementById("bundles-list");
  const activeBundles = db.bundles.filter((b) => b.is_active);
  if (activeBundles.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🎁</div><p>Wala pang bundle deals. Gumawa na!</p></div>`;
    return;
  }
  container.innerHTML = activeBundles
    .map((b) => {
      const bItems = getBundleItems(b.id);
      const retailTotal = getBundleRetailTotal(b.id);
      const savings = retailTotal - b.bundle_price;
      const savingsPct =
        retailTotal > 0 ? Math.round((savings / retailTotal) * 100) : 0;
      const itemsText = bItems
        .map((bi) => {
          const p = db.products.find((x) => x.id === bi.product_id);
          return p ? `${bi.quantity}× ${p.name}` : "";
        })
        .filter(Boolean)
        .join(" + ");

      const isMulti = bItems.length > 1;
      const emoji = !isMulti
        ? db.products.find((p) => p.id === bItems[0]?.product_id)?.image_url ||
          "🎁"
        : "🎁";
      const typeBadge = !isMulti
        ? `<span class="badge badge-blue">Multi-pack</span>`
        : `<span class="badge badge-green">Combo</span>`;

      return `<div class="bundle-card">
    <div class="bundle-icon">${emoji}</div>
    <div class="bundle-info">
      <div class="bundle-name">${b.bundle_name} ${typeBadge}</div>
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
  const bItems = getBundleItems(id);
  bItems.forEach((bi) => {
    bundleSelectedItems[bi.product_id] = bi.quantity;
  });

  document.getElementById("bundle-modal-title").textContent =
    "✏️ I-edit ang Bundle";
  document.getElementById("b-name").value = b.bundle_name;
  document.getElementById("b-price").value = b.bundle_price.toFixed(2);

  const isMulti = bItems.length > 1;
  if (!isMulti) {
    document.getElementById("btype-single").checked = true;
    document.getElementById("b-single-qty").value = bItems[0]?.quantity || 1;
  } else {
    document.getElementById("btype-multi").checked = true;
  }

  populateBundleSingleSelect();
  populateBundleMultiPicker();
  onBundleTypeChange();

  if (!isMulti && bItems[0]) {
    document.getElementById("b-single-product").value = bItems[0].product_id;
  }

  updateBundleSavingsPreview();
  openModal("modal-bundle");
}

function deleteBundle(id) {
  if (!confirm("I-delete ang bundle na ito?")) return;
  // Soft delete
  const b = db.bundles.find((x) => x.id === id);
  if (b) b.is_active = false;
  renderBundlesPage();
  showToast("Na-delete ang bundle!", "warning");
}

function populateBundleSingleSelect() {
  const sel = document.getElementById("b-single-product");
  sel.innerHTML =
    '<option value="">-- Pumili ng produkto --</option>' +
    db.products
      .filter((p) => p.is_active)
      .map((p) => {
        const pricing = getProductPricing(p.id);
        return `<option value="${p.id}">${p.image_url} ${p.name} (${pricing ? fmt(pricing.retail_price) : "—"})</option>`;
      })
      .join("");
  if (editingBundleId) {
    const bItems = getBundleItems(editingBundleId);
    if (bItems.length === 1) sel.value = bItems[0].product_id;
  }
}

function populateBundleMultiPicker() {
  const picker = document.getElementById("b-product-picker");
  picker.innerHTML = db.products
    .filter((p) => p.is_active)
    .map((p) => {
      const qty = bundleSelectedItems[p.id] || 0;
      const sel = qty > 0 ? "selected" : "";
      const pricing = getProductPricing(p.id);
      return `<div class="bundle-product-pick ${sel}" id="bpick-${p.id}" onclick="toggleBundleProduct(${p.id})">
        <div class="bundle-product-pick-emoji">${p.image_url}</div>
        <div class="bundle-product-pick-name">${p.name}</div>
        <div class="bundle-product-pick-price">${pricing ? fmt(pricing.retail_price) : "—"}</div>
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
    const pricing = pid ? getProductPricing(pid) : null;
    if (pricing) retailTotal = pricing.retail_price * qty;
  } else {
    Object.entries(bundleSelectedItems).forEach(([pid, qty]) => {
      const pricing = getProductPricing(parseInt(pid));
      if (pricing) retailTotal += pricing.retail_price * qty;
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
  let newItems = [];

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
    newItems = [{ product_id: pid, quantity: qty, unit_id: 1 }];
  } else {
    const ids = Object.keys(bundleSelectedItems);
    if (ids.length < 2) {
      showToast("Pumili ng 2 o higit pang produkto para sa combo!", "warning");
      return;
    }
    newItems = ids.map((pid) => ({
      product_id: parseInt(pid),
      quantity: bundleSelectedItems[pid],
      unit_id: 1,
    }));
  }

  if (editingBundleId) {
    const b = db.bundles.find((x) => x.id === editingBundleId);
    b.bundle_name = name;
    b.bundle_price = price;

    // Replace bundle_items rows for this bundle
    db.bundle_items = db.bundle_items.filter(
      (bi) => bi.bundle_id !== editingBundleId,
    );
    newItems.forEach((item) => {
      db.bundle_items.push({
        id: genId("bundle_items"),
        bundle_id: editingBundleId,
        ...item,
      });
    });
    showToast("Na-update ang bundle!");
  } else {
    const newBundleId = genId("bundles");
    db.bundles.push({
      id: newBundleId,
      bundle_name: name,
      bundle_price: price,
      is_active: true,
    });
    newItems.forEach((item) => {
      db.bundle_items.push({
        id: genId("bundle_items"),
        bundle_id: newBundleId,
        ...item,
      });
    });
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

      // Show batch expiry if linked to a stock_batch
      let expiryStr = "—";
      if (l.stock_batch_id) {
        const batch = db.stock_batches.find((b) => b.id === l.stock_batch_id);
        if (batch && batch.expiration_date) expiryStr = batch.expiration_date;
      }

      const reasonBadge =
        {
          restocked: '<span class="badge badge-green">Restock</span>',
          sold: '<span class="badge badge-blue">Sold</span>',
          damaged: '<span class="badge badge-red">Damaged</span>',
          expired: '<span class="badge badge-yellow">Expired</span>',
          adjustment: '<span class="badge badge-blue">Adjustment</span>',
        }[l.reason] || l.reason;

      return `<tr>
    <td>${pname}</td>
    <td style="color:${qtyColor};font-weight:700">${qtyStr}</td>
    <td>${reasonBadge}</td>
    <td style="color:var(--muted);font-size:12px">${expiryStr}</td>
    <td style="color:var(--muted);font-size:12px">${l.notes || "—"}</td>
    <td style="color:var(--muted);font-size:12px">${l.created_at}</td>
  </tr>`;
    })
    .join("");
}

function openStockLog() {
  const sel = document.getElementById("sl-product");
  sel.innerHTML = db.products
    .filter((p) => p.is_active)
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
  const expiryDate = document.getElementById("sl-expiry").value;

  if (!change_qty) {
    showToast("Ilagay ang quantity!", "warning");
    return;
  }

  const p = db.products.find((x) => x.id === product_id);
  p.stock_quantity += change_qty;
  if (p.stock_quantity < 0) p.stock_quantity = 0;

  // If restock, create a stock_batch record
  let batchId = null;
  if (reason === "restocked" && change_qty > 0) {
    batchId = genId("stock_batches");
    db.stock_batches.push({
      id: batchId,
      product_id,
      unit_id: p.unit_id,
      quantity_received: change_qty,
      expiration_date: expiryDate || null,
      created_at: todayISO(),
      notes,
    });
  }

  db.stock_logs.push({
    id: genId("stock_logs"),
    product_id,
    unit_id: p.unit_id,
    stock_batch_id: batchId,
    change_qty,
    reason,
    notes,
    created_at: todayISO(),
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
      '<tr><td colspan="7"><div class="empty-state"><p>No sales yet</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = sales
    .map((s) => {
      const items = db.sale_items.filter((i) => i.sale_id === s.id);
      const total = items.reduce((a, b) => a + b.total_price, 0);
      const names = items
        .map((i) => {
          if (i.bundle_id) {
            const b = db.bundles.find((x) => x.id === i.bundle_id);
            return b ? `🎁 ${b.bundle_name}` : "?";
          }
          const p = db.products.find((x) => x.id === i.product_id);
          return p ? p.name : "?";
        })
        .join(", ");
      const paymentType = db.payment_types.find(
        (pt) => pt.id === s.payment_type_id,
      );
      const pt =
        paymentType?.name === "credit"
          ? `<span class="badge badge-red">Utang</span>`
          : `<span class="badge badge-green">Cash</span>`;
      const customer = s.customer_id
        ? db.customers.find((c) => c.id === s.customer_id)
        : null;
      const cname = customer
        ? `${customer.first_name} ${customer.last_name}`
        : "—";
      return `<tr class="sale-row" onclick="openSaleDetail(${s.id})" title="View details">
    <td><span class="sale-id-link">#${s.id}</span></td>
    <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${names}</td>
    <td>${pt}</td>
    <td>${cname}</td>
    <td style="color:var(--accent);font-weight:700">${fmt(total)}</td>
    <td style="color:var(--muted);font-size:12px">${s.sale_date}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openSaleDetail(${s.id})">🔍 View</button></td>
  </tr>`;
    })
    .join("");
}

function openSaleDetail(saleId) {
  const s = db.sales.find((x) => x.id === saleId);
  if (!s) return;

  const items = db.sale_items.filter((i) => i.sale_id === saleId);
  const total = items.reduce((a, b) => a + b.total_price, 0);
  const paymentType = db.payment_types.find(
    (pt) => pt.id === s.payment_type_id,
  );
  const isCredit = paymentType?.name === "credit";
  const customer = s.customer_id
    ? db.customers.find((c) => c.id === s.customer_id)
    : null;

  // Credit transaction for this sale (if any)
  const ct = db.credit_transactions.find((c) => c.sale_id === saleId);
  const creditBalance = ct ? getCreditBalance(ct) : null;
  const creditStatus = ct ? getCreditStatus(ct) : null;

  // ── Modal title ────────────────────────────────────────────
  document.getElementById("sale-detail-title").innerHTML =
    `🧾 Sale <span style="color:var(--accent)">#${s.id}</span>`;

  // ── Meta grid (top info bar) ───────────────────────────────
  const metaItems = [
    { label: "Date", value: s.sale_date },
    {
      label: "Payment",
      value: isCredit
        ? `<span class="badge badge-red">Utang</span>`
        : `<span class="badge badge-green">Cash</span>`,
    },
    {
      label: "Customer",
      value: customer
        ? `<strong>${customer.first_name} ${customer.last_name}</strong>`
        : `<span style="color:var(--muted)">Walk-in</span>`,
    },
    {
      label: "Items",
      value: `${items.length} line item${items.length !== 1 ? "s" : ""}`,
    },
  ];

  document.getElementById("sale-detail-meta").innerHTML = metaItems
    .map(
      (m) => `
    <div style="padding:12px 20px;background:var(--bg);">
      <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">${m.label}</div>
      <div style="font-size:13px;font-weight:500;">${m.value}</div>
    </div>`,
    )
    .join("");

  // ── Line items ─────────────────────────────────────────────
  let itemsHtml = "";
  items.forEach((item) => {
    if (item.bundle_id) {
      const bundle = db.bundles.find((b) => b.id === item.bundle_id);
      const bundleName = bundle ? bundle.bundle_name : "Unknown Bundle";

      const sbi = db.sale_bundle_items.filter(
        (x) => x.sale_item_id === item.id,
      );
      const bundleProductLines = sbi
        .map((x) => {
          const p = db.products.find((pr) => pr.id === x.product_id);
          const u = db.units.find((u) => u.id === x.unit_id);
          return p
            ? `<div style="display:flex;align-items:center;gap:6px;padding:3px 0 3px 28px;font-size:12px;color:var(--muted);">
               <span>${p.image_url}</span>
               <span>${p.name}</span>
               <span style="margin-left:auto;">×${x.quantity_deducted}${u ? " " + u.abbreviation : ""}</span>
             </div>`
            : "";
        })
        .join("");

      itemsHtml += `
        <div class="sale-detail-row">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🎁</span>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;">${bundleName} <span class="bundle-tag">Bundle</span></div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">×${item.quantity_sold} bundle${item.quantity_sold > 1 ? "s" : ""}</div>
              ${bundleProductLines}
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px;">
              <div style="font-weight:700;color:var(--accent);">${fmt(item.total_price)}</div>
              <div style="font-size:11px;color:var(--muted);">${fmt(item.unit_price)} each</div>
            </div>
          </div>
        </div>`;
    } else {
      const p = db.products.find((x) => x.id === item.product_id);
      const u = db.units.find((x) => x.id === item.unit_id);
      const productName = p ? p.name : "Unknown Product";
      const emoji = p ? p.image_url : "📦";
      const unitLabel = u ? u.abbreviation : "";
      const saleTypeBadge =
        item.sale_type === "wholesale"
          ? `<span class="tag" style="font-size:10px;">Wholesale</span>`
          : "";

      itemsHtml += `
        <div class="sale-detail-row">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">${emoji}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;">${productName} ${saleTypeBadge}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                ${fmt(item.unit_price)} × ${item.quantity_sold}${unitLabel ? " " + unitLabel : ""}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px;">
              <div style="font-weight:700;color:var(--accent);">${fmt(item.total_price)}</div>
            </div>
          </div>
        </div>`;
    }
  });

  document.getElementById("sale-detail-items").innerHTML =
    itemsHtml ||
    `<div style="padding:20px;text-align:center;color:var(--muted);">No items found.</div>`;

  // ── Footer: total + credit status ─────────────────────────
  let footerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:13px;font-weight:600;color:var(--muted);">TOTAL</span>
      <span style="font-size:20px;font-weight:800;color:var(--accent);">${fmt(total)}</span>
    </div>`;

  if (ct) {
    const statusColor = {
      paid: "var(--green)",
      partial: "var(--warning)",
      unpaid: "var(--red)",
    }[creditStatus];
    const statusLabel = {
      paid: "Bayad na ✓",
      partial: "Partial — may natitira",
      unpaid: "Hindi pa bayad",
    }[creditStatus];
    const paidAmount = ct.amount_owed - creditBalance;
    footerHtml += `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Utang Status</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span style="color:var(--muted);">Original amount</span>
          <span style="font-weight:600;">${fmt(ct.amount_owed)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span style="color:var(--muted);">Amount paid</span>
          <span style="font-weight:600;color:var(--green);">${fmt(paidAmount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;">
          <span style="color:var(--muted);">Remaining balance</span>
          <span style="font-weight:700;color:${statusColor};">${fmt(creditBalance)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:12px;font-weight:700;color:${statusColor};">${statusLabel}</span>
          ${creditStatus !== "paid" ? `<button class="btn btn-success btn-sm" onclick="closeModal('modal-sale-detail');openPayUtang(${ct.id})">💰 Bayad</button>` : ""}
        </div>
      </div>`;
  }

  document.getElementById("sale-detail-footer").innerHTML = footerHtml;
  openModal("modal-sale-detail");
}

// ============================================================
// CREDITS — append-only credit_payments
// ============================================================
function renderCredits() {
  const list = document.getElementById("credits-list");

  // Compute total from credit_transactions minus credit_payments
  const totalUtang = db.credit_transactions.reduce(
    (sum, ct) => sum + getCreditBalance(ct),
    0,
  );
  document.getElementById("total-utang-display").textContent =
    `Total: ${fmt(totalUtang)}`;

  if (db.credit_transactions.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><div class="icon">📒</div><p>Walang utang records</p></div>';
    return;
  }

  list.innerHTML = db.credit_transactions
    .map((ct) => {
      const customer = db.customers.find((c) => c.id === ct.customer_id);
      if (!customer) return "";
      const name = `${customer.first_name} ${customer.last_name}`;
      const initials = customer.first_name[0] + customer.last_name[0];
      const remaining = getCreditBalance(ct);
      const totalPaid = ct.amount_owed - remaining;
      const pct = Math.min((totalPaid / ct.amount_owed) * 100, 100);
      const status = getCreditStatus(ct);

      const statusBadge = {
        paid: '<span class="badge badge-green">Bayad na</span>',
        partial: '<span class="badge badge-yellow">Partial</span>',
        unpaid: '<span class="badge badge-red">Hindi pa bayad</span>',
      }[status];

      // Payment history entries for this transaction
      const payments = db.credit_payments.filter(
        (p) => p.credit_transaction_id === ct.id,
      );
      const payHistoryHtml =
        payments.length > 0
          ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;">
           💳 Payments: ${payments.map((p) => `${fmt(p.amount_paid)} (${p.paid_at})`).join(", ")}
         </div>`
          : "";

      return `<div class="credit-card">
    <div class="credit-avatar">${initials}</div>
    <div class="credit-info">
      <div class="credit-name">${name} ${statusBadge}</div>
      <div class="credit-detail">Bayad: ${fmt(totalPaid)} / ${fmt(ct.amount_owed)} · ${ct.created_at}</div>
      ${payHistoryHtml}
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct === 100 ? "var(--green)" : "var(--warning)"}"></div></div>
    </div>
    <div class="credit-amount">
      <div class="credit-owed">${fmt(remaining)}</div>
      ${status !== "paid" ? `<button class="btn btn-success btn-sm" style="margin-top:6px" onclick="openPayUtang(${ct.id})">💰 Bayad</button>` : ""}
    </div>
  </div>`;
    })
    .join("");
}

function openPayUtang(creditTransactionId) {
  payingCreditTransactionId = creditTransactionId;
  const ct = db.credit_transactions.find((c) => c.id === creditTransactionId);
  const customer = db.customers.find((c) => c.id === ct.customer_id);
  const remaining = getCreditBalance(ct);
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

  const ct = db.credit_transactions.find(
    (c) => c.id === payingCreditTransactionId,
  );
  const remaining = getCreditBalance(ct);
  const actualPaid = Math.min(amount, remaining);

  // Append-only: create a new credit_payment row
  db.credit_payments.push({
    id: genId("credit_payments"),
    credit_transaction_id: ct.id,
    amount_paid: actualPaid,
    paid_at: todayISO(),
    notes: "",
  });

  closeModal("modal-pay-utang");
  renderCredits();
  updateUtangBadge();
  showToast(`Na-record ang bayad na ${fmt(actualPaid)}!`);
}

function updateUtangBadge() {
  const unpaid = db.credit_transactions.filter(
    (ct) => getCreditBalance(ct) > 0,
  ).length;
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
    <td style="color:var(--muted);font-size:12px">${e.created_at}</td>
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
    created_at: todayISO(), // now uses created_at (was expense_date)
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
      const totalDebt = getCustomerDebt(c.id);
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
  const n = new Date();
  el.textContent =
    n.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    n.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================================
// INIT
// ============================================================
renderDashboard();
updateUtangBadge();
