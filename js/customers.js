// ============================================================
// CUSTOMERS
// ============================================================
function renderCustomers() {
  const tbody = document.getElementById("customers-body");
  const customers = db.customers.filter((c) => c.is_active !== false);
  if (customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>No customers</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = customers
    .map((c) => {
      const totalDebt = getCustomerDebt(c.id);
      const pct = Math.min((totalDebt / c.credit_limit) * 100, 100);
      const debtColor =
        pct > 80 ? "var(--red)" : pct > 50 ? "var(--warning)" : "var(--green)";
      const canEdit = can("customers.edit");
      const canDelete = can("customers.delete");
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
        ${canEdit ? `<button class="btn btn-ghost btn-sm" onclick="editCustomerLimit(${c.id})">✏️ Limit</button>` : ""}
        ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deactivateCustomer(${c.id})">🗑</button>` : ""}
      </td>
    </tr>`;
    })
    .join("");
}

function openAddCustomer() {
  if (!requirePermission("customers.create")) return;
  openModal("modal-customer");
}

function saveCustomer() {
  const fname = document.getElementById("c-fname").value.trim();
  const lname = document.getElementById("c-lname").value.trim();
  if (!fname || !lname) {
    showToast("Ilagay ang pangalan!", "warning");
    return;
  }

  const today = todayISO();
  const newCustomer = {
    id: genId("customers"),
    first_name: fname,
    middle_name: "",
    last_name: lname,
    contact_number: document.getElementById("c-contact").value,
    municipality: "",
    barangay: document.getElementById("c-brgy").value,
    street: "",
    credit_limit: parseFloat(document.getElementById("c-limit").value) || 1000,
    is_active: true,
    created_by: currentUser ? currentUser.id : null,
    updated_by: currentUser ? currentUser.id : null,
    created_at: today,
    updated_at: today,
  };
  db.customers.push(newCustomer);
  addAuditLog("created", "customers", newCustomer.id, null, newCustomer);
  saveDb();
  closeModal("modal-customer");
  renderCustomers();
  showToast("Nadagdag ang customer!");
}

function editCustomerLimit(id) {
  if (!requirePermission("customers.edit")) return;
  const c = db.customers.find((x) => x.id === id);
  const newLimit = prompt(
    `Credit limit ni ${c.first_name} ${c.last_name}:`,
    c.credit_limit,
  );
  if (newLimit !== null && !isNaN(parseFloat(newLimit))) {
    const old = { credit_limit: c.credit_limit };
    c.credit_limit = parseFloat(newLimit);
    c.updated_by = currentUser ? currentUser.id : null;
    c.updated_at = todayISO();
    addAuditLog("updated", "customers", c.id, old, {
      credit_limit: c.credit_limit,
    });
    saveDb();
    renderCustomers();
    showToast("Na-update ang credit limit!");
  }
}

function deactivateCustomer(id) {
  if (!requirePermission("customers.delete")) return;
  const c = db.customers.find((x) => x.id === id);
  if (!c || !confirm(`I-deactivate si ${c.first_name} ${c.last_name}?`)) return;
  const old = { is_active: true };
  c.is_active = false;
  c.updated_by = currentUser ? currentUser.id : null;
  c.updated_at = todayISO();
  addAuditLog("deleted", "customers", c.id, old, { is_active: false });
  saveDb();
  renderCustomers();
  showToast("Na-deactivate ang customer!", "warning");
}
