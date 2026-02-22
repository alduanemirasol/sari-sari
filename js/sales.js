// ============================================================
// SALES (new schema: sale_bundles table, sale_types lookup)
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
  const saleBundles = db.sale_bundles.filter((sb) => sb.sale_id === saleId);
  const itemTotal = items.reduce((a, b) => a + b.total_price, 0);
  const bundleTotal = saleBundles.reduce(
    (a, b) => a + b.unit_price * b.quantity_sold,
    0,
  );
  const total = itemTotal + bundleTotal;

  const paymentType = db.payment_types.find(
    (pt) => pt.id === s.payment_type_id,
  );
  const isCredit = paymentType?.name === "credit";
  const customer = s.customer_id
    ? db.customers.find((c) => c.id === s.customer_id)
    : null;

  // Credit row for this sale
  const ct = db.credit.find((c) => c.sale_id === saleId);
  const creditBalance = ct ? getCreditBalance(ct) : null;
  const creditStatus = ct ? getCreditStatus(ct) : null;

  document.getElementById("sale-detail-title").innerHTML =
    `🧾 Sale <span style="color:var(--accent)">#${s.id}</span>`;

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
      value: `${items.length + saleBundles.length} line item${items.length + saleBundles.length !== 1 ? "s" : ""}`,
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

  let itemsHtml = "";

  // Bundle rows from sale_bundles
  saleBundles.forEach((sb) => {
    const bundle = db.bundles.find((b) => b.id === sb.bundle_id);
    const bundleName = bundle ? bundle.bundle_name : "Unknown Bundle";
    const lineTotal = sb.unit_price * sb.quantity_sold;

    const sbi = db.sale_bundle_items.filter((x) => x.sale_bundle_id === sb.id);
    const bundleProductLines = sbi
      .map((x) => {
        const p = db.products.find((pr) => pr.id === x.product_id);
        const u = db.units.find((u) => u.id === x.unit_id);
        return p
          ? `<div style="display:flex;align-items:center;gap:6px;padding:3px 0 3px 28px;font-size:12px;color:var(--muted);">
               <span>${p.image_url}</span><span>${p.name}</span>
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
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">×${sb.quantity_sold} bundle${sb.quantity_sold > 1 ? "s" : ""}</div>
            ${bundleProductLines}
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:12px;">
            <div style="font-weight:700;color:var(--accent);">${fmt(lineTotal)}</div>
            <div style="font-size:11px;color:var(--muted);">${fmt(sb.unit_price)} each</div>
          </div>
        </div>
      </div>`;
  });

  // Product rows from sale_items
  items.forEach((item) => {
    const p = db.products.find((x) => x.id === item.product_id);
    const u = db.units.find((x) => x.id === item.unit_id);
    const productName = p ? p.name : "Unknown Product";
    const emoji = p ? p.image_url : "📦";
    const unitLabel = u ? u.abbreviation : "";
    // sale_type: support both string and id
    const saleTypeStr =
      typeof item.sale_type === "number"
        ? getSaleTypeName(item.sale_type)
        : item.sale_type || "retail";
    const saleTypeBadge =
      saleTypeStr === "wholesale"
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
  });

  document.getElementById("sale-detail-items").innerHTML =
    itemsHtml ||
    `<div style="padding:20px;text-align:center;color:var(--muted);">No items found.</div>`;

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
          <span style="color:var(--muted);">Original amount</span><span style="font-weight:600;">${fmt(ct.amount_owed)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span style="color:var(--muted);">Amount paid</span><span style="font-weight:600;color:var(--green);">${fmt(paidAmount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:10px;">
          <span style="color:var(--muted);">Remaining balance</span><span style="font-weight:700;color:${statusColor};">${fmt(creditBalance)}</span>
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
