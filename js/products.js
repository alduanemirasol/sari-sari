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
      const pkgConv = getProductPackageConversion(p.id);
      const pkgBadge = pkgConv
        ? `<div style="font-size:10px;color:var(--accent);margin-top:2px;font-weight:600;">📦 1 pk = ${pkgConv.pieces_per_pack} pc</div>`
        : "";
      return `<tr>
    <td><span style="font-size:18px">${p.image_url}</span> <strong>${p.name}</strong>${pkgBadge}</td>
    <td><span class="badge badge-blue">${catName}</span></td>
    <td>${stockBadge}</td>
    <td style="color:var(--accent)">${pricing ? fmt(pricing.retail_price) : "—"}</td>
    <td style="color:var(--muted)">${pricing && pricing.wholesale_price > 0 ? fmt(pricing.wholesale_price) : "—"}</td>
    <td style="color:var(--muted)">${pricing && pricing.wholesale_price > 0 && pricing.wholesale_min_qty > 0 ? pricing.wholesale_min_qty + "+" : "—"}</td>
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
  document.getElementById("product-modal-title").textContent = "Add Product";
  document.getElementById("p-name").value = "";
  document.getElementById("p-stock").value = "50";
  document.getElementById("p-retail").value = "1.00";
  document.getElementById("p-wholesale").value = "0.65";
  document.getElementById("p-minqty").value = "24";
  document.getElementById("p-wholesale-enabled").checked = false;
  toggleWholesaleSection();
  resetPackageSection();
  renderProductUnitRows([]);
  openModal("modal-product");
}

function toggleWholesaleSection() {
  const enabled = document.getElementById("p-wholesale-enabled").checked;
  document.getElementById("p-wholesale-section").style.display = enabled
    ? "block"
    : "none";
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

  // Check wholesale enabled if product has a non-zero wholesale price
  const hasWholesale = pricing && pricing.wholesale_price > 0;
  document.getElementById("p-wholesale-enabled").checked = hasWholesale;
  toggleWholesaleSection();

  // Load package conversion if any
  const existingPkgConv = getProductPackageConversion(id);
  loadPackageSection(existingPkgConv);

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
  const wholesaleEnabled = document.getElementById(
    "p-wholesale-enabled",
  ).checked;
  const wholesalePrice = wholesaleEnabled
    ? parseFloat(document.getElementById("p-wholesale").value) || 0
    : 0;
  const wholesaleMinQty = wholesaleEnabled
    ? parseInt(document.getElementById("p-minqty").value) || 0
    : 0;

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

    // Save / update package conversion
    savePackageConversion(editingProductId);

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

    // Save package conversion for new product
    savePackageConversion(newId);

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

  saveDb();
  closeModal("modal-product");
  renderProducts();
}

function deleteProduct(id) {
  if (!confirm("Sigurado ka bang gusto mong i-delete?")) return;
  // Soft delete — preserve history
  const p = db.products.find((x) => x.id === id);
  if (p) p.is_active = false;
  saveDb();
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
// PACKAGE CONVERSION SECTION (product modal)
// ============================================================

/**
 * Reset the package conversion form to its default empty/hidden state.
 * Called when opening the Add Product modal.
 */
function resetPackageSection() {
  document.getElementById("p-pkg-enabled").checked = false;
  document.getElementById("p-pkg-pieces").value = "";
  togglePackageSection();
}

/**
 * Populate the package section fields from an existing conversion row.
 * Called when opening the Edit Product modal.
 */
function loadPackageSection(pkgConv) {
  if (pkgConv) {
    document.getElementById("p-pkg-enabled").checked = true;
    document.getElementById("p-pkg-pieces").value = pkgConv.pieces_per_pack;
  } else {
    document.getElementById("p-pkg-enabled").checked = false;
    document.getElementById("p-pkg-pieces").value = "";
  }
  togglePackageSection();
}

/** Show/hide the package details sub-section based on the checkbox. */
function togglePackageSection() {
  const enabled = document.getElementById("p-pkg-enabled").checked;
  document.getElementById("p-pkg-details").style.display = enabled
    ? "block"
    : "none";
}

/**
 * Persist the package conversion for a given product_id.
 * Reads the form state; creates, updates, or removes the row as needed.
 */
function savePackageConversion(product_id) {
  if (!db.product_package_conversions) db.product_package_conversions = [];

  const enabled = document.getElementById("p-pkg-enabled").checked;
  const piecesPerPack =
    parseInt(document.getElementById("p-pkg-pieces").value) || 0;

  // Remove any existing conversion for this product first
  db.product_package_conversions = db.product_package_conversions.filter(
    (c) => c.product_id !== product_id,
  );

  if (enabled && piecesPerPack > 0) {
    db.product_package_conversions.push({
      id: genId("product_package_conversions"),
      product_id,
      pack_unit_id: 6, // unit_id 6 = pack
      base_unit_id: 1, // unit_id 1 = piece (the base unit the product is tracked in)
      pieces_per_pack: piecesPerPack,
    });
  }
}
