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
        .reduce((a, b) => a + b.total_price, 0)
    );
  }, 0);

  document.getElementById("exp-total").textContent = fmt(total);
  document.getElementById("exp-month").textContent = fmt(total); // simplified
  const net = totalSales - total;
  const netEl = document.getElementById("exp-net");
  netEl.textContent = fmt(net);
  netEl.style.color = net >= 0 ? "var(--green)" : "var(--red)";

  if (expenses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4"><div class="empty-state"><p>No expenses yet</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = expenses
    .map((e) => {
      const cat = db.expense_categories.find(
        (c) => c.id === e.expense_category_id,
      );
      return `<tr>
    <td><span class="badge badge-blue">${cat ? cat.name : "?"}</span></td>
    <td style="color:var(--red);font-weight:700">${fmt(e.amount)}</td>
    <td style="color:var(--muted)">${e.notes || "—"}</td>
    <td style="color:var(--muted);font-size:12px">${e.created_at}</td>
  </tr>`;
    })
    .join("");
}

function openAddExpense() {
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

  db.expenses.push({
    id: genId("expenses"),
    expense_category_id: cat ? cat.id : 1,
    amount,
    notes: document.getElementById("e-notes").value,
    created_at: todayISO(), // now uses created_at (was expense_date)
  });
  saveDb();

  closeModal("modal-expense");
  renderExpenses();
  showToast("Naitala ang gastos!");
}
