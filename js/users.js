// ============================================================
// USERS — User management page (owner/manager only)
// ============================================================

let editingUserId = null;

function renderUsers() {
  if (!can("users.view")) {
    document.getElementById("users-body").innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>🚫 Walang access</p></div></td></tr>';
    return;
  }

  const tbody = document.getElementById("users-body");
  const users = db.users;

  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6"><div class="empty-state"><p>No users</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map((u) => {
      const role = db.roles.find((r) => r.id === u.role_id);
      const statusBadge = u.is_active
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-red">Inactive</span>';
      const roleBadge = getUserRoleBadge(u);
      const isSelf = currentUser && currentUser.id === u.id;
      const canEdit = can("users.edit");
      const canDelete = can("users.delete") && !isSelf;

      return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="user-avatar-sm">${u.first_name[0]}${u.last_name[0]}</div>
          <div>
            <div style="font-weight:600;">${u.first_name} ${u.last_name} ${isSelf ? '<span style="font-size:10px;color:var(--muted)">(ikaw)</span>' : ""}</div>
            <div style="font-size:11px;color:var(--muted);">@${u.username}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--muted);font-size:12px">${u.email || "—"}</td>
      <td>${roleBadge}</td>
      <td>${statusBadge}</td>
      <td style="color:var(--muted);font-size:12px">${u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-PH") : "Never"}</td>
      <td>
        ${canEdit ? `<button class="btn btn-ghost btn-sm" onclick="editUser(${u.id})">✏️ Edit</button>` : ""}
        ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="toggleUserActive(${u.id})">${u.is_active ? "🚫 Deactivate" : "✅ Activate"}</button>` : ""}
      </td>
    </tr>`;
    })
    .join("");
}

function openAddUser() {
  if (!requirePermission("users.create")) return;
  editingUserId = null;
  document.getElementById("user-modal-title").textContent = "Add User";
  document.getElementById("u-fname").value = "";
  document.getElementById("u-lname").value = "";
  document.getElementById("u-username").value = "";
  document.getElementById("u-email").value = "";
  document.getElementById("u-password").value = "";
  document.getElementById("u-role").value = "3"; // default cashier
  document.getElementById("u-password-group").style.display = "block";
  openModal("modal-user");
}

function editUser(id) {
  if (!requirePermission("users.edit")) return;
  const u = db.users.find((x) => x.id === id);
  if (!u) return;
  editingUserId = id;
  document.getElementById("user-modal-title").textContent = "Edit User";
  document.getElementById("u-fname").value = u.first_name;
  document.getElementById("u-lname").value = u.last_name;
  document.getElementById("u-username").value = u.username;
  document.getElementById("u-email").value = u.email || "";
  document.getElementById("u-password").value = "";
  document.getElementById("u-role").value = u.role_id;
  // Show password field only to allow optional reset
  document.getElementById("u-password-group").style.display = "block";
  document.getElementById("u-password").placeholder =
    "Leave blank to keep current";
  openModal("modal-user");
}

function saveUser() {
  const fname = document.getElementById("u-fname").value.trim();
  const lname = document.getElementById("u-lname").value.trim();
  const username = document
    .getElementById("u-username")
    .value.trim()
    .toLowerCase();
  const email = document.getElementById("u-email").value.trim();
  const password = document.getElementById("u-password").value;
  const role_id = parseInt(document.getElementById("u-role").value);

  if (!fname || !lname) {
    showToast("Ilagay ang pangalan!", "warning");
    return;
  }
  if (!username) {
    showToast("Ilagay ang username!", "warning");
    return;
  }

  // Check username uniqueness
  const duplicate = db.users.find(
    (u) => u.username === username && u.id !== editingUserId,
  );
  if (duplicate) {
    showToast("Ginamit na ang username na iyan!", "warning");
    return;
  }

  if (editingUserId) {
    const u = db.users.find((x) => x.id === editingUserId);
    const old = { ...u };
    u.first_name = fname;
    u.last_name = lname;
    u.username = username;
    u.email = email;
    u.role_id = role_id;
    u.updated_at = todayISO();
    if (password) {
      if (password.length < 4) {
        showToast("Password dapat 4 characters man lang!", "warning");
        return;
      }
      u.password_hash = password;
      u.must_change_password = true;
    }
    addAuditLog("updated", "users", u.id, old, { ...u, password_hash: "***" });
    saveDb();
    showToast("Na-update ang user!");
  } else {
    if (!password || password.length < 4) {
      showToast("Ilagay ang password (min 4 characters)!", "warning");
      return;
    }
    const newUser = {
      id: genId("users"),
      role_id,
      first_name: fname,
      last_name: lname,
      username,
      email,
      password_hash: password,
      pin_hash: null,
      is_active: true,
      must_change_password: true,
      last_login_at: null,
      created_by: currentUser ? currentUser.id : null,
      created_at: todayISO(),
      updated_at: todayISO(),
    };
    db.users.push(newUser);
    addAuditLog("created", "users", newUser.id, null, {
      ...newUser,
      password_hash: "***",
    });
    saveDb();
    showToast("Nadagdag ang user!");
  }

  closeModal("modal-user");
  renderUsers();
}

function toggleUserActive(id) {
  if (!requirePermission("users.delete")) return;
  const u = db.users.find((x) => x.id === id);
  if (!u) return;
  if (currentUser && currentUser.id === id) {
    showToast("Hindi mo maa-deactivate ang sarili mo!", "warning");
    return;
  }
  const action = u.is_active ? "deactivate" : "activate";
  if (
    !confirm(
      `${u.is_active ? "I-deactivate" : "I-activate"} si ${u.first_name} ${u.last_name}?`,
    )
  )
    return;
  const old = { is_active: u.is_active };
  u.is_active = !u.is_active;
  u.updated_at = todayISO();
  addAuditLog(action, "users", u.id, old, { is_active: u.is_active });
  saveDb();
  renderUsers();
  showToast(
    `${u.is_active ? "Na-activate" : "Na-deactivate"} si ${u.first_name}!`,
  );
}

function renderAuditLogs() {
  if (!can("reports.audit")) {
    document.getElementById("audit-body").innerHTML =
      '<tr><td colspan="5"><div class="empty-state"><p>🚫 Walang access</p></div></td></tr>';
    return;
  }
  const tbody = document.getElementById("audit-body");
  const logs = [...db.audit_logs].reverse().slice(0, 100);
  if (logs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5"><div class="empty-state"><p>No audit logs</p></div></td></tr>';
    return;
  }
  const actionColors = {
    login: "badge-green",
    logout: "badge-blue",
    failed_login: "badge-red",
    created: "badge-green",
    updated: "badge-yellow",
    deleted: "badge-red",
    voided: "badge-red",
    deactivate: "badge-red",
    activate: "badge-green",
  };
  tbody.innerHTML = logs
    .map((l) => {
      const cls = actionColors[l.action] || "badge-blue";
      return `<tr>
      <td style="color:var(--muted);font-size:11px">${l.created_at ? new Date(l.created_at).toLocaleString("en-PH") : "—"}</td>
      <td>${getUserDisplayName(l.user_id)}</td>
      <td><span class="badge badge-blue">${l.module}</span></td>
      <td><span class="badge ${cls}">${l.action}</span></td>
      <td style="font-size:11px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.notes || (l.record_id ? `ID: ${l.record_id}` : "—")}</td>
    </tr>`;
    })
    .join("");
}
