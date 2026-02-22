// ============================================================
// AUTH — Login, logout, session, permission checks
// ============================================================

// ── Current session state ──────────────────────────────────
let currentUser = null; // { id, role_id, first_name, last_name, username }
let currentUserPermissions = new Set(); // Set of "module.action" strings

// ── Bootstrap ─────────────────────────────────────────────
function authInit() {
  const stored = sessionStorage.getItem("tindahan_auth");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const user = db.users.find((u) => u.id === parsed.user_id && u.is_active);
      if (user) {
        currentUser = user;
        loadUserPermissions(user);
        return true; // already logged in
      }
    } catch (e) {
      /* ignore */
    }
  }
  return false;
}

function loadUserPermissions(user) {
  currentUserPermissions = new Set();
  const rolePerms = db.role_permissions.filter(
    (rp) => rp.role_id === user.role_id,
  );
  rolePerms.forEach((rp) => {
    const perm = db.permissions.find((p) => p.id === rp.permission_id);
    if (perm) currentUserPermissions.add(`${perm.module}.${perm.action}`);
  });
}

// ── Permission check ───────────────────────────────────────
/** Returns true if the current user has the given permission e.g. "sales.void" */
function can(permissionStr) {
  return currentUserPermissions.has(permissionStr);
}

/** Throws a toast and returns false if user lacks a permission */
function requirePermission(permissionStr) {
  if (!can(permissionStr)) {
    const perm = db.permissions.find(
      (p) => permissionStr === `${p.module}.${p.action}`,
    );
    showToast(`Wala kang access: ${perm ? perm.name : permissionStr}`, "error");
    return false;
  }
  return true;
}

// ── Login / Logout ─────────────────────────────────────────
function login(username, password) {
  const user = db.users.find((u) => u.username === username && u.is_active);
  if (!user || user.password_hash !== password) {
    addAuditLog(
      "failed_login",
      "users",
      null,
      null,
      null,
      `username: ${username}`,
    );
    return { success: false, error: "Mali ang username o password." };
  }
  currentUser = user;
  loadUserPermissions(user);
  user.last_login_at = new Date().toISOString();
  saveDb();
  sessionStorage.setItem("tindahan_auth", JSON.stringify({ user_id: user.id }));
  addAuditLog("login", "users", user.id);
  return { success: true };
}

function logout() {
  if (currentUser) addAuditLog("logout", "users", currentUser.id);
  currentUser = null;
  currentUserPermissions = new Set();
  sessionStorage.removeItem("tindahan_auth");
}

// ── Audit log helper ───────────────────────────────────────
function addAuditLog(action, module, record_id, old_value, new_value, notes) {
  db.audit_logs.push({
    id: genId("audit_logs"),
    user_id: currentUser ? currentUser.id : null,
    action,
    module,
    record_id: record_id || null,
    old_value: old_value ? JSON.stringify(old_value) : null,
    new_value: new_value ? JSON.stringify(new_value) : null,
    notes: notes || null,
    created_at: new Date().toISOString(),
  });
  // Don't saveDb() every audit log — caller should save after their main operation
}

// ── User helpers ──────────────────────────────────────────
function getUserDisplayName(user_id) {
  if (!user_id) return "—";
  const u = db.users.find((x) => x.id === user_id);
  return u ? `${u.first_name} ${u.last_name}` : `User #${user_id}`;
}

function getRoleName(role_id) {
  const r = db.roles.find((x) => x.id === role_id);
  return r ? r.name : "unknown";
}

function getUserRoleBadge(user) {
  const role = db.roles.find((r) => r.id === user.role_id);
  if (!role) return "";
  const colors = {
    owner: "badge-red",
    manager: "badge-blue",
    cashier: "badge-green",
    inventory_clerk: "badge-yellow",
    viewer: "badge-blue",
  };
  const cls = colors[role.name] || "badge-blue";
  return `<span class="badge ${cls}">${role.name}</span>`;
}

// ── Login Screen ──────────────────────────────────────────
function showLoginScreen() {
  const main = document.querySelector(".main");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (sidebar) sidebar.style.display = "none";
  if (overlay) overlay.style.display = "none";
  if (main) main.style.display = "none";

  let loginDiv = document.getElementById("login-screen");
  if (!loginDiv) {
    loginDiv = document.createElement("div");
    loginDiv.id = "login-screen";
    document.body.appendChild(loginDiv);
  }
  loginDiv.style.display = "flex";
  loginDiv.innerHTML = `
    <div class="login-card">
      <div class="login-logo">🏪</div>
      <h2 class="login-title">Tindahan ni Duane</h2>
      <p class="login-sub">Mag-sign in para magpatuloy</p>
      <div id="login-error" class="login-error" style="display:none"></div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input class="form-input" type="text" id="login-username" placeholder="admin"
          onkeydown="if(event.key==='Enter')doLogin()">
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input class="form-input" type="password" id="login-password" placeholder="••••••••"
          onkeydown="if(event.key==='Enter')doLogin()">
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;margin-top:4px;"
        onclick="doLogin()">🔐 Sign In</button>
      <p style="font-size:11px;color:var(--muted);margin-top:16px;text-align:center;">
        Demo: username <strong>admin</strong> / password <strong>admin123</strong>
      </p>
    </div>`;
  setTimeout(() => document.getElementById("login-username").focus(), 50);
}

function doLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  if (!username || !password) {
    errEl.style.display = "block";
    errEl.textContent = "Ilagay ang username at password.";
    return;
  }
  const result = login(username, password);
  if (!result.success) {
    errEl.style.display = "block";
    errEl.textContent = result.error;
    document.getElementById("login-password").value = "";
    return;
  }
  // Hide login screen, show app
  document.getElementById("login-screen").style.display = "none";
  const main = document.querySelector(".main");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (main) main.style.display = "";
  if (sidebar) sidebar.style.display = "";
  if (overlay) overlay.style.display = "";
  onAfterLogin();
}

function doLogout() {
  if (!confirm(`Mag-logout si ${currentUser.first_name}?`)) return;
  logout();
  location.reload();
}

function onAfterLogin() {
  updateTopbarUser();
  applyPermissionVisibility();
  renderDashboard();
  updateUtangBadge();
}

// ── Topbar user widget ────────────────────────────────────
function updateTopbarUser() {
  const el = document.getElementById("topbar-user");
  if (!el || !currentUser) return;
  const role = db.roles.find((r) => r.id === currentUser.role_id);
  el.innerHTML = `
    <div class="topbar-user-info" onclick="openUserMenu()" title="User menu">
      <div class="topbar-avatar">${currentUser.first_name[0]}${currentUser.last_name[0]}</div>
      <div class="topbar-user-details">
        <div class="topbar-user-name">${currentUser.first_name} ${currentUser.last_name}</div>
        <div class="topbar-user-role">${role ? role.name : ""}</div>
      </div>
      <span style="font-size:10px;color:var(--muted);margin-left:4px;">▾</span>
    </div>`;
}

function openUserMenu() {
  let menu = document.getElementById("user-dropdown");
  if (menu) {
    menu.remove();
    return;
  }
  menu = document.createElement("div");
  menu.id = "user-dropdown";
  menu.className = "user-dropdown";
  menu.innerHTML = `
    ${can("users.view") ? `<div class="user-dropdown-item" onclick="closeUserMenu();showPage('users',null)">👥 Manage Users</div>` : ""}
    <div class="user-dropdown-item" onclick="closeUserMenu();openChangePassword()">🔑 Change Password</div>
    <div class="user-dropdown-divider"></div>
    <div class="user-dropdown-item danger" onclick="closeUserMenu();doLogout()">🚪 Logout</div>`;

  const btn = document.getElementById("topbar-user");
  document.body.appendChild(menu);
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  setTimeout(
    () => document.addEventListener("click", closeUserMenu, { once: true }),
    0,
  );
}

function closeUserMenu() {
  const m = document.getElementById("user-dropdown");
  if (m) m.remove();
}

// ── Change password (own account) ─────────────────────────
function openChangePassword() {
  openModal("modal-change-password");
}

function saveChangePassword() {
  const current = document.getElementById("cp-current").value;
  const newPw = document.getElementById("cp-new").value;
  const confirm = document.getElementById("cp-confirm").value;

  if (currentUser.password_hash !== current) {
    showToast("Mali ang kasalukuyang password!", "error");
    return;
  }
  if (!newPw || newPw.length < 4) {
    showToast("Password dapat 4 characters man lang!", "warning");
    return;
  }
  if (newPw !== confirm) {
    showToast("Hindi magkapareho ang bagong password!", "warning");
    return;
  }
  const old = { password_hash: currentUser.password_hash };
  currentUser.password_hash = newPw;
  currentUser.must_change_password = false;
  currentUser.updated_at = todayISO();
  addAuditLog(
    "updated",
    "users",
    currentUser.id,
    old,
    { password_hash: "***" },
    "Password changed",
  );
  saveDb();
  closeModal("modal-change-password");
  showToast("Na-update ang password!");
  document.getElementById("cp-current").value = "";
  document.getElementById("cp-new").value = "";
  document.getElementById("cp-confirm").value = "";
}

// ── Hide nav items based on permissions ───────────────────
function applyPermissionVisibility() {
  // Map nav page → required permission
  const navGuards = {
    pos: "sales.create",
    sales: "sales.view",
    products: "inventory.view",
    bundles: "inventory.view",
    stocklogs: "inventory.view",
    credits: "customers.credit",
    expenses: "expenses.view",
    customers: "customers.view",
    users: "users.view",
  };
  document.querySelectorAll(".nav-item[data-page]").forEach((el) => {
    const page = el.getAttribute("data-page");
    if (navGuards[page] && !can(navGuards[page])) {
      el.style.display = "none";
    } else {
      el.style.display = "";
    }
  });

  // Show/hide Users nav section
  const usersSection = document.getElementById("nav-users-section");
  if (usersSection)
    usersSection.style.display = can("users.view") ? "" : "none";
}
