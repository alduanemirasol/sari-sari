// ============================================================
// DASHBOARD (new schema: db.credit instead of db.credit_transactions)
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
        .reduce((a, b) => a + b.total_price, 0) +
      db.sale_bundles
        .filter((sb) => sb.sale_id === s.id)
        .reduce((a, b) => a + b.unit_price * b.quantity_sold, 0)
    );
  }, 0);

  const unpaidCTs = db.credit.filter((ct) => getCreditBalance(ct) > 0);
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

  const tbody = document.getElementById("dashboard-sales-body");
  const recent = [...db.sales].reverse().slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4"><div class="empty-state"><p>No sales yet today</p></div></td></tr>';
  } else {
    tbody.innerHTML = recent
      .map((s) => {
        const items = db.sale_items.filter((i) => i.sale_id === s.id);
        const bundles = db.sale_bundles.filter((sb) => sb.sale_id === s.id);
        const total =
          items.reduce((a, b) => a + b.total_price, 0) +
          bundles.reduce((a, b) => a + b.unit_price * b.quantity_sold, 0);
        const names = [
          ...items.map((i) => {
            const p = db.products.find((x) => x.id === i.product_id);
            return p ? p.name : "?";
          }),
          ...bundles.map((sb) => {
            const b = db.bundles.find((x) => x.id === sb.bundle_id);
            return b ? `🎁 ${b.bundle_name}` : "?";
          }),
        ].join(", ");
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
