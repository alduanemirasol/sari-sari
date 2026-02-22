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
  saveDb();

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
