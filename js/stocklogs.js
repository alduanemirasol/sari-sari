// ============================================================
// STOCK LOGS (new schema: stock_log_reason_id FK)
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
      const logUnit = db.units.find((u) => u.id === l.unit_id);
      const abbrv = logUnit ? logUnit.abbreviation : "";
      const absQty = Math.abs(l.change_qty);
      const sign = l.change_qty > 0 ? "+" : "-";
      const qtyStr = `${sign}${absQty}${abbrv ? " " + abbrv : ""}`;

      const packNote = l.pack_qty
        ? `<div style="font-size:11px;color:var(--accent);margin-top:2px;">${l.pack_qty} pk × ${l.pieces_per_pack} = ${Math.abs(l.change_qty)} ${abbrv}</div>`
        : "";

      let expiryStr = "—";
      if (l.stock_batch_id) {
        const batch = db.stock_batches.find((b) => b.id === l.stock_batch_id);
        if (batch && batch.expiration_date) expiryStr = batch.expiration_date;
      }

      // Support both old string reason and new stock_log_reason_id
      const reasonName = l.stock_log_reason_id
        ? getStockLogReasonName(l.stock_log_reason_id)
        : l.reason || "adjustment";

      const reasonBadge =
        {
          restocked: '<span class="badge badge-green">Restock</span>',
          sold: '<span class="badge badge-blue">Sold</span>',
          damaged: '<span class="badge badge-red">Damaged</span>',
          expired: '<span class="badge badge-yellow">Expired</span>',
          adjustment: '<span class="badge badge-blue">Adjustment</span>',
        }[reasonName] || `<span class="badge badge-blue">${reasonName}</span>`;

      return `<tr>
    <td>${pname}</td>
    <td style="color:${qtyColor};font-weight:700">${qtyStr}${packNote}</td>
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
  document.getElementById("sl-reason").value = "restocked";
  onStockProductChange();
  openModal("modal-stock");
}

function onStockProductChange() {
  const product_id = parseInt(document.getElementById("sl-product").value);
  const pkgConv = getProductPackageConversion(product_id);
  const packSection = document.getElementById("sl-pack-section");
  const qtyLabel = document.getElementById("sl-qty-label");
  const product = db.products.find((p) => p.id === product_id);
  const baseUnit = product
    ? db.units.find((u) => u.id === product.unit_id)
    : null;
  const baseAbbr = baseUnit ? baseUnit.abbreviation : "pc";

  if (pkgConv) {
    const packUnit = db.units.find((u) => u.id === pkgConv.pack_unit_id);
    const packAbbr = packUnit ? packUnit.abbreviation : "pk";
    document.getElementById("sl-pack-label").textContent =
      `Qty in Packs (${packAbbr})`;
    document.getElementById("sl-pack-conversion-info").textContent =
      `1 ${packAbbr} = ${pkgConv.pieces_per_pack} ${baseAbbr}`;
    document.getElementById("sl-pack-qty").value = "";
    document.getElementById("sl-pack-preview").textContent = "";
    packSection.style.display = "block";
    qtyLabel.textContent = `Or enter directly in ${baseAbbr} (skip if packs filled above)`;
    document.getElementById("sl-qty").value = "";
  } else {
    packSection.style.display = "none";
    qtyLabel.textContent = `Change Qty (${baseAbbr})`;
    document.getElementById("sl-qty").value = "";
  }
}

function updatePackPreview() {
  const product_id = parseInt(document.getElementById("sl-product").value);
  const pkgConv = getProductPackageConversion(product_id);
  if (!pkgConv) return;
  const packQty = parseFloat(document.getElementById("sl-pack-qty").value) || 0;
  const baseQty = packQty * pkgConv.pieces_per_pack;
  const product = db.products.find((p) => p.id === product_id);
  const baseUnit = product
    ? db.units.find((u) => u.id === product.unit_id)
    : null;
  const baseAbbr = baseUnit ? baseUnit.abbreviation : "pc";
  const preview = document.getElementById("sl-pack-preview");
  if (packQty > 0) {
    preview.innerHTML = `<span style="color:var(--green);font-weight:700;">= ${baseQty} ${baseAbbr}</span> will be added`;
    document.getElementById("sl-qty").value = baseQty;
  } else {
    preview.textContent = "";
    document.getElementById("sl-qty").value = "";
  }
}

function saveStockLog() {
  const product_id = parseInt(document.getElementById("sl-product").value);
  const reasonName = document.getElementById("sl-reason").value;
  const notes = document.getElementById("sl-notes").value;
  const expiryDate = document.getElementById("sl-expiry").value;
  const reasonId = getStockLogReasonId(reasonName);

  const pkgConv = getProductPackageConversion(product_id);
  const packQtyRaw = pkgConv
    ? parseFloat(document.getElementById("sl-pack-qty").value) || 0
    : 0;

  let change_qty,
    packQtyUsed = 0,
    piecesPerPackUsed = 0;
  if (pkgConv && packQtyRaw > 0) {
    change_qty = packQtyRaw * pkgConv.pieces_per_pack;
    packQtyUsed = packQtyRaw;
    piecesPerPackUsed = pkgConv.pieces_per_pack;
  } else {
    change_qty = parseInt(document.getElementById("sl-qty").value);
  }

  if (!change_qty || isNaN(change_qty)) {
    showToast("Ilagay ang quantity!", "warning");
    return;
  }

  const p = db.products.find((x) => x.id === product_id);
  p.stock_quantity += change_qty;
  if (p.stock_quantity < 0) p.stock_quantity = 0;

  let batchId = null;
  if (reasonName === "restocked" && change_qty > 0) {
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

  const logEntry = {
    id: genId("stock_logs"),
    product_id,
    unit_id: p.unit_id,
    stock_batch_id: batchId,
    stock_log_reason_id: reasonId,
    change_qty,
    notes,
    created_at: todayISO(),
  };
  if (packQtyUsed > 0) {
    logEntry.pack_qty = packQtyUsed;
    logEntry.pieces_per_pack = piecesPerPackUsed;
  }

  db.stock_logs.push(logEntry);
  saveDb();
  closeModal("modal-stock");
  renderStockLogs();

  const baseUnit = db.units.find((u) => u.id === p.unit_id);
  const baseAbbr = baseUnit ? baseUnit.abbreviation : "pc";
  const toastMsg =
    packQtyUsed > 0
      ? `Restocked ${packQtyUsed} packs → +${change_qty} ${baseAbbr} sa ${p.name}`
      : `Stock updated! ${change_qty > 0 ? "+" + change_qty : change_qty} ${baseAbbr} sa ${p.name}`;
  showToast(toastMsg);
}
