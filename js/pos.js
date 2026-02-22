// ============================================================
// POS — Point of Sale
// ============================================================
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
      '<div class="empty-state"><div class="icon">🛒</div><p>Walay solud</p></div>';
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

  saveDb();
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
