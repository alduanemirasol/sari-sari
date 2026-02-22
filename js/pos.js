// ============================================================
// POS — Point of Sale
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
  const sel = document.getElementById("credit-customer-id");
  sel.innerHTML =
    '<option value="">-- Piliin ang customer --</option>' +
    db.customers
      .filter((c) => c.is_active !== false)
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
      const qty = cart
        .filter((c) => c.product_id === p.id)
        .reduce((sum, c) => sum + c.quantity, 0);
      const selected = qty > 0 ? "selected" : "";
      const stockBadge =
        p.stock_quantity <= 10
          ? `<div style="font-size:10px;color:var(--red);margin-top:2px;">⚠️ ${p.stock_quantity} left</div>`
          : "";
      const retailPrice = pricing ? pricing.retail_price : 0;
      const baseUnit = db.units.find((u) => u.id === p.unit_id);
      const stockLabel = baseUnit ? baseUnit.abbreviation : "pc";
      const pkgConvCard = getProductPackageConversion(p.id);
      const multiUnitBadge = hasMultiUnits
        ? `<div style="font-size:10px;color:var(--accent);margin-top:2px;font-weight:600;">📦 Multi-unit</div>`
        : "";
      const scaleBadge =
        !hasMultiUnits && isContinuousUnit(p.unit_id)
          ? `<div style="font-size:10px;color:var(--accent);margin-top:2px;font-weight:600;">⚖️ By weight/vol</div>`
          : "";
      const packBadge =
        pkgConvCard && !hasMultiUnits && !isContinuousUnit(p.unit_id)
          ? `<div style="font-size:10px;color:var(--accent);margin-top:2px;font-weight:600;">📦 Pwede per pack</div>`
          : "";
      return `
    <div class="product-card ${selected}" onclick="addToCart(${p.id})">
      <div class="product-qty-badge">${qty > 0 ? fmtQty(qty, p.unit_id) : 0}</div>
      <div class="product-emoji">${p.image_url}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${fmt(retailPrice)}${isContinuousUnit(p.unit_id) ? `<span style="font-size:10px;color:var(--muted)">/${stockLabel}</span>` : ""}</div>
      <div class="product-stock">${p.stock_quantity} ${stockLabel}</div>
      ${multiUnitBadge}${scaleBadge}${packBadge}${stockBadge}
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
      const firstProd =
        bItems.length === 1
          ? db.products.find((p) => p.id === bItems[0].product_id)
          : null;
      const emoji = firstProd ? firstProd.image_url : "🎁";
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
  if (!requirePermission("sales.create")) return;
  const product = db.products.find((p) => p.id === product_id);
  if (!product) return;
  if (product.stock_quantity <= 0) {
    showToast("Wala nang stock!", "error");
    return;
  }
  const unitOptions = getProductUnitOptions(product_id);
  const pkgConv = getProductPackageConversion(product_id);
  if (unitOptions.length > 0 || isContinuousUnit(product.unit_id) || pkgConv) {
    openUnitPickerModal(product_id);
    return;
  }
  addToCartWithUnit(product_id, product.unit_id, 1);
}

function addToCartWithUnit(product_id, unit_id, quantity) {
  const product = db.products.find((p) => p.id === product_id);
  if (!product) return;
  if (quantity === undefined || quantity === null) quantity = 1;
  quantity = parseFloat(quantity);
  if (isNaN(quantity) || quantity <= 0) {
    showToast("Ilagay ang tamang quantity!", "warning");
    return;
  }

  const baseQty = convertToBaseUnits(
    quantity,
    unit_id,
    product.unit_id,
    product.id,
  );
  if (product.stock_quantity <= 0) {
    showToast("Wala nang stock!", "error");
    return;
  }

  const baseAlreadyInCart = cart
    .filter((c) => c.product_id === product_id)
    .reduce(
      (sum, c) =>
        sum +
        convertToBaseUnits(c.quantity, c.unit_id, product.unit_id, product.id),
      0,
    );

  if (baseAlreadyInCart + baseQty > product.stock_quantity) {
    showToast("Hindi sapat ang stock!", "warning");
    return;
  }
  const existing = cart.find(
    (c) => c.product_id === product_id && c.unit_id === unit_id,
  );
  if (existing) {
    existing.quantity = parseFloat((existing.quantity + quantity).toFixed(4));
  } else {
    cart.push({ product_id, unit_id, quantity });
  }
  closeModal("modal-unit-picker");
  renderPosGrid();
  renderCart();
  maybeExpandMobileCart();
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

  let optionsHtml = "";

  function buildUnitOption(
    unit_id,
    label,
    abbrv,
    pricing,
    pricingObj,
    cartQty,
  ) {
    const isCont = isContinuousUnit(unit_id);
    const wsEnabled =
      pricingObj &&
      pricingObj.wholesale_price > 0 &&
      pricingObj.wholesale_min_qty > 0;
    const wsInfo = wsEnabled
      ? ` · Wholesale: ${fmt(pricingObj.wholesale_price)} (${pricingObj.wholesale_min_qty}+)`
      : "";
    const inCartLine =
      cartQty > 0
        ? `<div style="font-size:11px;color:var(--green);margin-top:4px;">✓ ${fmtQty(cartQty, unit_id)} in cart</div>`
        : "";
    if (isCont) {
      const step = unitStep(unit_id);
      const inputId = `upi-qty-${unit_id}`;
      return `
      <div class="unit-picker-opt ${cartQty > 0 ? "selected" : ""}" style="cursor:default;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <div style="font-weight:700">${label} <span style="font-size:11px;color:var(--muted)">(${abbrv})</span></div>
            <div style="font-size:12px;color:var(--muted)">Retail: ${fmt(pricing)}${wsInfo}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:var(--accent)">${fmt(pricing)}<span style="font-size:11px;color:var(--muted)">/${abbrv}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="qty-btn" onclick="var el=document.getElementById('${inputId}');var v=parseFloat(el.value)||0;el.value=Math.max(${step},parseFloat((v-${step}).toFixed(4)));">−</button>
          <input type="number" id="${inputId}" min="${step}" step="${step}" value="${step}"
            style="width:80px;text-align:center;font-size:16px;font-weight:700;border:2px solid var(--border);border-radius:8px;padding:6px 4px;outline:none;"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
          <span style="font-size:13px;color:var(--muted);font-weight:600;">${abbrv}</span>
          <button type="button" class="qty-btn" onclick="var el=document.getElementById('${inputId}');var v=parseFloat(el.value)||0;el.value=parseFloat((v+${step}).toFixed(4));">+</button>
          <button type="button" class="btn btn-primary btn-sm" style="margin-left:auto;white-space:nowrap;"
            onclick="addToCartWithUnit(${product_id}, ${unit_id}, parseFloat(document.getElementById('${inputId}').value))">
            + I-add
          </button>
        </div>
        ${inCartLine}
      </div>`;
    } else {
      return `
      <button class="unit-picker-opt ${cartQty > 0 ? "selected" : ""}" onclick="addToCartWithUnit(${product_id}, ${unit_id}, 1)">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700">${label} <span style="font-size:11px;color:var(--muted)">(${abbrv})</span></div>
            <div style="font-size:12px;color:var(--muted)">Retail: ${fmt(pricing)}${wsInfo}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:var(--accent)">${fmt(pricing)}</div>
        </div>
        ${inCartLine}
      </button>`;
    }
  }

  if (defaultPricing) {
    const cartItem = cart.find(
      (c) => c.product_id === product_id && c.unit_id === product.unit_id,
    );
    optionsHtml += buildUnitOption(
      product.unit_id,
      defaultUnit ? defaultUnit.name : "piece",
      defaultUnit ? defaultUnit.abbreviation : "pc",
      defaultPricing.retail_price,
      defaultPricing,
      cartItem ? cartItem.quantity : 0,
    );
  }
  unitOptions.forEach((pu) => {
    if (pu.unit_id === product.unit_id) return;
    const unit = db.units.find((u) => u.id === pu.unit_id);
    const cartItem = cart.find(
      (c) => c.product_id === product_id && c.unit_id === pu.unit_id,
    );
    optionsHtml += buildUnitOption(
      pu.unit_id,
      pu.label || (unit ? unit.name : "unit"),
      unit ? unit.abbreviation : "?",
      pu.retail_price,
      pu,
      cartItem ? cartItem.quantity : 0,
    );
  });

  const pkgConv = getProductPackageConversion(product_id);
  if (pkgConv) {
    const packUnit = db.units.find((u) => u.id === pkgConv.pack_unit_id);
    const packAbbr = packUnit ? packUnit.abbreviation : "pk";
    const packName = packUnit ? packUnit.name : "Pack";
    const basePricing = getProductPricing(product_id);
    const packRetailPrice = basePricing
      ? basePricing.retail_price * pkgConv.pieces_per_pack
      : 0;
    const packWholesalePrice =
      basePricing && basePricing.wholesale_price > 0
        ? basePricing.wholesale_price * pkgConv.pieces_per_pack
        : 0;
    const wsMinPacks =
      basePricing && basePricing.wholesale_min_qty > 0
        ? Math.ceil(basePricing.wholesale_min_qty / pkgConv.pieces_per_pack)
        : 0;
    const wsInfo =
      packWholesalePrice > 0 && wsMinPacks > 0
        ? ` · Wholesale: ${fmt(packWholesalePrice)} (${wsMinPacks}+ packs)`
        : "";
    const cartItem = cart.find(
      (c) => c.product_id === product_id && c.unit_id === pkgConv.pack_unit_id,
    );
    const packInCart = cartItem ? cartItem.quantity : 0;
    const inCartLine =
      packInCart > 0
        ? `<div style="font-size:11px;color:var(--green);margin-top:4px;">✓ ${packInCart} pk in cart</div>`
        : "";
    const maxPacks = Math.floor(
      product.stock_quantity / pkgConv.pieces_per_pack,
    );
    const noStock = maxPacks === 0;
    const inputId = `upi-qty-${pkgConv.pack_unit_id}`;
    const packCardStyle = noStock
      ? "opacity:0.45;background:#f5f5f5;border-color:#ccc;pointer-events:none;cursor:not-allowed;"
      : "cursor:default;border-color:var(--accent);background:var(--accent-light);";
    const packBadgeBg = noStock ? "#bbb" : "var(--accent)";
    const packPriceColor = noStock ? "#bbb" : "var(--accent)";
    const packStockNote = noStock
      ? `<div style="font-size:11px;color:#e53e3e;font-weight:600;margin-top:3px;">⚠️ Hindi sapat — kailangan ${pkgConv.pieces_per_pack} pc, ${product.stock_quantity} na lang ang natitira</div>`
      : `<div style="font-size:11px;color:var(--muted);">Available: ${maxPacks} pack${maxPacks !== 1 ? "s" : ""} (${product.stock_quantity} pc total)</div>`;
    const packControls = noStock
      ? `<div style="font-size:12px;color:#aaa;font-style:italic;padding:4px 0;">🚫 Kulang ang stock para sa isang buong pack</div>`
      : `<div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="qty-btn" onclick="var el=document.getElementById('${inputId}');var v=parseInt(el.value)||1;if(v>1)el.value=v-1;">&#8722;</button>
          <input type="number" id="${inputId}" min="1" max="${maxPacks}" step="1" value="1"
            style="width:80px;text-align:center;font-size:16px;font-weight:700;border:2px solid var(--accent);border-radius:8px;padding:6px 4px;outline:none;">
          <span style="font-size:13px;color:var(--muted);font-weight:600;">${packAbbr}</span>
          <button type="button" class="qty-btn" onclick="var el=document.getElementById('${inputId}');var v=parseInt(el.value)||1;if(v<${maxPacks})el.value=v+1;else showToast('Max ${maxPacks} packs available!','warning');">&#43;</button>
          <button type="button" class="btn btn-primary btn-sm" style="margin-left:auto;white-space:nowrap;"
            onclick="addToCartWithUnit(${product_id}, ${pkgConv.pack_unit_id}, parseInt(document.getElementById('${inputId}').value))">
            + I-add
          </button>
        </div>`;
    optionsHtml += `
    <div class="unit-picker-opt ${packInCart > 0 ? "selected" : ""}" style="${packCardStyle}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <div style="font-weight:700;">&#128230; ${packName} <span style="font-size:11px;color:var(--muted);">(${packAbbr})</span>
            <span style="font-size:10px;background:${packBadgeBg};color:white;border-radius:4px;padding:1px 5px;margin-left:4px;">${pkgConv.pieces_per_pack} pc each</span>
          </div>
          <div style="font-size:12px;color:var(--muted);">Retail: ${fmt(packRetailPrice)} / pack${wsInfo}</div>
          ${packStockNote}
        </div>
        <div style="font-size:18px;font-weight:800;color:${packPriceColor};">${fmt(packRetailPrice)}<span style="font-size:11px;color:var(--muted);">/pk</span></div>
      </div>
      ${packControls}
      ${inCartLine}
    </div>`;
  }

  document.getElementById("unit-picker-options").innerHTML = optionsHtml;
  openModal("modal-unit-picker");
}

function addBundleToCart(bundle_id) {
  if (!requirePermission("sales.create")) return;
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
  if (existing) existing.quantity++;
  else cartBundles.push({ bundle_id, quantity: 1 });
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
  const step = isContinuousUnit(unit_id)
    ? unitStep(unit_id) * Math.sign(delta)
    : delta;
  const newQty = parseFloat((cart[idx].quantity + step).toFixed(4));
  if (newQty <= 0) {
    cart.splice(idx, 1);
  } else {
    const product = db.products.find((p) => p.id === product_id);
    if (product) {
      const baseAlreadyInCart = cart
        .filter((c) => c.product_id === product_id && c.unit_id !== unit_id)
        .reduce(
          (sum, c) =>
            sum +
            convertToBaseUnits(
              c.quantity,
              c.unit_id,
              product.unit_id,
              product.id,
            ),
          0,
        );
      const newBaseQty = convertToBaseUnits(
        newQty,
        unit_id,
        product.unit_id,
        product.id,
      );
      if (newBaseQty + baseAlreadyInCart > product.stock_quantity) {
        showToast("Hindi na dagdag, ubos na stock!", "warning");
        return;
      }
    }
    cart[idx].quantity = newQty;
  }
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
  let subtotal = 0,
    totalBundleSavings = 0,
    html = "";
  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    if (!p) return;
    const { unitPrice, saleType } = resolveUnitPrice(
      p.id,
      item.unit_id,
      item.quantity,
    );
    const unit = db.units.find((u) => u.id === item.unit_id);
    const unitLabel = unit ? `(${unit.abbreviation})` : "";
    const saleTypeLabel =
      saleType === "wholesale" ? ' <span class="tag">Wholesale</span>' : "";
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    const qtyDisplay = fmtQty(item.quantity, item.unit_id);
    const priceLabel = isContinuousUnit(item.unit_id)
      ? `${fmt(unitPrice)}/${unit ? unit.abbreviation : ""} × ${qtyDisplay} = ${fmt(lineTotal)}`
      : `${fmt(unitPrice)} × ${qtyDisplay} = ${fmt(lineTotal)}`;
    html += `
    <div class="cart-item">
      <div class="cart-item-emoji">${p.image_url}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name} <span style="font-size:11px;color:var(--muted)">${unitLabel}</span>${saleTypeLabel}</div>
        <div class="cart-item-price">${priceLabel}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeCartQty(${p.id},${item.unit_id},-1)">−</button>
        <span class="qty-display">${qtyDisplay}</span>
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
  } else savingsRow.style.display = "none";
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
  if (!requirePermission("sales.create")) return;
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
    const customer = db.customers.find((c) => c.id === customerId);
    const existingDebt = getCustomerDebt(customerId);
    let orderTotal = cart.reduce((sum, item) => {
      const p = db.products.find((x) => x.id === item.product_id);
      if (!p) return sum;
      const { unitPrice } = resolveUnitPrice(p.id, item.unit_id, item.quantity);
      return sum + unitPrice * item.quantity;
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

  const paymentTypeObj = db.payment_types.find((pt) => pt.name === payType);
  const saleId = genId("sales");
  const saleDate = now();
  const dateStr = todayISO();
  let subtotal = 0;

  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    if (!p) return;
    const { unitPrice } = resolveUnitPrice(
      p.id,
      item.unit_id,
      item.quantity,
      dateStr,
    );
    subtotal += unitPrice * item.quantity;
  });
  cartBundles.forEach((cb) => {
    const b = db.bundles.find((x) => x.id === cb.bundle_id);
    if (b) subtotal += b.bundle_price * cb.quantity;
  });

  // Find active pos_session for this user if any
  const activePosSession = db.pos_sessions.find(
    (s) => s.user_id === (currentUser ? currentUser.id : null) && !s.closed_at,
  );

  db.sales.push({
    id: saleId,
    cashier_id: currentUser ? currentUser.id : null,
    session_id: activePosSession ? activePosSession.id : null,
    customer_id: customerId,
    payment_type_id: paymentTypeObj.id,
    sale_status_id: 1, // completed
    voided_by: null,
    voided_at: null,
    void_reason: null,
    discount_approved_by: null,
    sale_date: saleDate,
    subtotal: subtotal,
    discount: 0,
    total_amount: subtotal,
    notes: null,
    created_at: dateStr,
  });

  let total = 0;
  let receiptItems = [];

  cart.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    const { unitPrice, saleType } = resolveUnitPrice(
      p.id,
      item.unit_id,
      item.quantity,
      dateStr,
    );
    const lineTotal = unitPrice * item.quantity;
    total += lineTotal;
    db.sale_items.push({
      id: genId("sale_items"),
      sale_id: saleId,
      product_id: item.product_id,
      unit_id: item.unit_id,
      quantity_sold: item.quantity,
      unit_price: unitPrice,
      total_price: lineTotal,
      sale_type: saleType,
    });
    const baseQty = convertToBaseUnits(
      item.quantity,
      item.unit_id,
      p.unit_id,
      p.id,
    );
    p.stock_quantity = parseFloat((p.stock_quantity - baseQty).toFixed(4));
    db.stock_logs.push({
      id: genId("stock_logs"),
      product_id: p.id,
      unit_id: item.unit_id,
      stock_batch_id: null,
      stock_log_reason_id: getStockLogReasonId("sold"),
      performed_by: currentUser ? currentUser.id : null,
      change_qty: -item.quantity,
      notes: `Sale #${saleId}`,
      created_at: dateStr,
    });
    const unit = db.units.find((u) => u.id === item.unit_id);
    receiptItems.push({
      name: p.name + (unit && unit.id !== 1 ? ` (${unit.abbreviation})` : ""),
      qty: item.quantity,
      qtyDisplay: fmtQty(item.quantity, item.unit_id),
      price: unitPrice,
      total: lineTotal,
      isBundle: false,
    });
  });

  cartBundles.forEach((cb) => {
    const bundle = db.bundles.find((x) => x.id === cb.bundle_id);
    if (!bundle) return;
    const bItems = getBundleItems(bundle.id);
    const lineTotal = bundle.bundle_price * cb.quantity;
    total += lineTotal;
    const saleBundleId = genId("sale_bundles");
    db.sale_bundles.push({
      id: saleBundleId,
      sale_id: saleId,
      bundle_id: bundle.id,
      quantity_sold: cb.quantity,
      unit_price: bundle.bundle_price,
    });
    bItems.forEach((bi) => {
      const p = db.products.find((x) => x.id === bi.product_id);
      if (!p) return;
      const totalQty = bi.quantity * cb.quantity;
      db.sale_bundle_items.push({
        id: genId("sale_bundle_items"),
        sale_bundle_id: saleBundleId,
        bundle_item_id: bi.id,
        product_id: bi.product_id,
        unit_id: bi.unit_id || p.unit_id,
        quantity_deducted: totalQty,
      });
      p.stock_quantity -= totalQty;
      db.stock_logs.push({
        id: genId("stock_logs"),
        product_id: p.id,
        unit_id: p.unit_id,
        stock_batch_id: null,
        stock_log_reason_id: getStockLogReasonId("sold"),
        performed_by: currentUser ? currentUser.id : null,
        change_qty: -totalQty,
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

  if (payType === "credit") {
    const newCredit = {
      id: genId("credit"),
      customer_id: customerId,
      sale_id: saleId,
      amount_owed: total,
      due_date: "",
      created_by: currentUser ? currentUser.id : null,
      created_at: dateStr,
    };
    db.credit.push(newCredit);
    addAuditLog("created", "credit", newCredit.id, null, newCredit);
  }

  addAuditLog("created", "sales", saleId, null, {
    total,
    payment: payType,
    cashier_id: currentUser ? currentUser.id : null,
  });
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
  const cashierName = currentUser
    ? `${currentUser.first_name} ${currentUser.last_name}`
    : "—";
  let html = `<div class="receipt">
    <div class="receipt-title">🏪 Tindahan ni Duane</div>
    <div class="receipt-sub">${date}</div>
    <div class="receipt-sub" style="font-size:10px;color:#aaa;">Cashier: ${cashierName}</div>
    <hr class="receipt-divider">`;
  items.forEach((i) => {
    const qtyStr = i.qtyDisplay !== undefined ? i.qtyDisplay : `x${i.qty}`;
    html += `<div class="receipt-row"><span>${i.isBundle ? "🎁 " : ""}${i.name} ${i.isBundle ? "x" + i.qty : qtyStr}</span><span>${fmt(i.total)}</span></div>`;
    if (i.isBundle && i.bundleItems)
      i.bundleItems.forEach((bi) => {
        html += `<div class="receipt-row" style="padding-left:12px;font-size:11px;color:#777"><span>↳ ${bi}</span></div>`;
      });
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

function toggleMobileCart() {
  const cart = document.querySelector(".pos-right");
  if (!cart) return;
  cart.classList.toggle("cart-expanded");
}

document.addEventListener("DOMContentLoaded", function () {
  const cartHeader = document.querySelector(".cart-header");
  if (cartHeader)
    cartHeader.addEventListener("click", function () {
      if (window.innerWidth <= 1024) toggleMobileCart();
    });
});

function maybeExpandMobileCart() {
  if (window.innerWidth <= 1024) {
    const cartEl = document.querySelector(".pos-right");
    if (cartEl && (cart.length > 0 || cartBundles.length > 0))
      cartEl.classList.add("cart-expanded");
  }
}
