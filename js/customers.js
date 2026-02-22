// ============================================================
// CUSTOMERS
// ============================================================
function renderCustomers() {
  const tbody = document.getElementById("customers-body");
  if (db.customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>No customers</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = db.customers
    .map((c) => {
      const totalDebt = getCustomerDebt(c.id);
      const pct = Math.min((totalDebt / c.credit_limit) * 100, 100);
      const debtColor =
        pct > 80 ? "var(--red)" : pct > 50 ? "var(--warning)" : "var(--green)";
      return `<tr>
    <td><strong>${c.first_name} ${c.last_name}</strong></td>
    <td style="color:var(--muted)">${c.contact_number || "—"}</td>
    <td style="color:var(--muted);font-size:12px">${c.barangay || "—"}</td>
    <td style="color:var(--muted)">${fmt(c.credit_limit)}</td>
    <td>
      <span style="color:${debtColor};font-weight:700">${fmt(totalDebt)}</span>
      <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${pct}%;background:${debtColor}"></div></div>
    </td>
    <td>
      <button class="btn btn-ghost btn-sm" onclick="editCustomerLimit(${c.id})">✏️ Limit</button>
    </td>
  </tr>`;
    })
    .join("");
}

function openAddCustomer() {
  openModal("modal-customer");
}

function saveCustomer() {
  const fname = document.getElementById("c-fname").value.trim();
  const lname = document.getElementById("c-lname").value.trim();
  if (!fname || !lname) {
    showToast("Ilagay ang pangalan!", "warning");
    return;
  }

  db.customers.push({
    id: genId("customers"),
    first_name: fname,
    middle_name: "",
    last_name: lname,
    contact_number: document.getElementById("c-contact").value,
    municipality: "",
    barangay: document.getElementById("c-brgy").value,
    street: "",
    credit_limit: parseFloat(document.getElementById("c-limit").value) || 1000,
  });
  saveDb();

  closeModal("modal-customer");
  renderCustomers();
  showToast("Nadagdag ang customer!");
}

function editCustomerLimit(id) {
  const c = db.customers.find((x) => x.id === id);
  const newLimit = prompt(
    `Credit limit ni ${c.first_name} ${c.last_name}:`,
    c.credit_limit,
  );
  if (newLimit !== null && !isNaN(parseFloat(newLimit))) {
    c.credit_limit = parseFloat(newLimit);
    saveDb();
    renderCustomers();
    showToast("Na-update ang credit limit!");
  }
}
