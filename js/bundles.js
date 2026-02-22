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
    "🎁 Create Bundle";
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
  saveDb();
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

  saveDb();
  closeModal("modal-bundle");
  renderBundlesPage();
}
