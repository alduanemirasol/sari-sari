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
        .reduce((a, b) => a + b.total_price, 0) +
      db.sale_bundles
        .filter((sb) => sb.sale_id === s.id)
        .reduce((a, b) => a + b.unit_price * b.quantity_sold, 0)
    );
  }, 0);

  document.getElementById("exp-total").textContent = fmt(total);
  document.getElementById("exp-month").textContent = fmt(total);
  const net = totalSales - total;
  const netEl = document.getElementById("exp-net");
  netEl.textContent = fmt(net);
  netEl.style.color = net >= 0 ? "var(--green)" : "var(--red)";

  if (expenses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5"><div class="empty-state"><p>No expenses yet</p></div></td></tr>';
    return;
  }

  const canDelete = can("expenses.delete");
  tbody.innerHTML = expenses
    .map((e) => {
      const cat = db.expense_categories.find(
        (c) => c.id === e.expense_category_id,
      );
      const dateDisplay = e.expense_date || e.created_at || "—";
      const recorder = getUserDisplayName(e.recorded_by);
      return `<tr>
      <td><span class="badge badge-blue">${cat ? cat.name : "?"}</span></td>
      <td style="color:var(--red);font-weight:700">${fmt(e.amount)}</td>
      <td style="color:var(--muted)">${e.notes || "—"}</td>
      <td style="color:var(--muted);font-size:12px">${dateDisplay}</td>
      <td style="color:var(--muted);font-size:11px">${recorder}</td>
    </tr>`;
    })
    .join("");
}

function openAddExpense() {
  if (!requirePermission("expenses.create")) return;
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

  const today = todayISO();
  const newExpense = {
    id: genId("expenses"),
    expense_category_id: cat ? cat.id : 1,
    session_id: null,
    recorded_by: currentUser ? currentUser.id : null,
    approved_by: null,
    amount,
    notes: document.getElementById("e-notes").value,
    created_at: today,
    expense_date: today,
  };
  db.expenses.push(newExpense);
  addAuditLog("created", "expenses", newExpense.id, null, newExpense);
  saveDb();
  closeModal("modal-expense");
  renderExpenses();
  showToast("Naitala ang gastos!");
}
