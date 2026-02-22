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
  saveDb();

  closeModal("modal-stock");
  renderStockLogs();
  showToast(
    `Stock updated! ${change_qty > 0 ? "+" + change_qty : change_qty} sa ${p.name}`,
  );
}
