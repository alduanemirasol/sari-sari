// ============================================================
// UTILITIES — formatting, UI helpers, navigation
// ============================================================

function fmt(n) {
  return "₱" + parseFloat(n).toFixed(2);
}

function now() {
  return new Date().toLocaleString("en-PH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function genId(type) {
  if (!db.nextId[type]) db.nextId[type] = 1;
  return db.nextId[type]++;
}

function showToast(msg, type = "success") {
  const tc = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML =
    (type === "success" ? "✅" : type === "warning" ? "⚠️" : "❌") + " " + msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function showPage(name, el) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  const pageEl = document.getElementById("page-" + name);
  if (!pageEl) return;
  pageEl.classList.add("active");
  if (el) el.classList.add("active");
  document.getElementById("page-title").textContent =
    {
      dashboard: "Dashboard",
      pos: "Benta (POS)",
      products: "Products",
      bundles: "Bundle Pricing",
      stocklogs: "Stock Logs",
      sales: "Sales History",
      credits: "Utang",
      expenses: "Expenses",
      customers: "Customers",
      users: "User Management",
      auditlogs: "Audit Logs",
    }[name] || name;
  refreshPage(name);
  if (typeof closeSidebar === "function") closeSidebar();
  const posCart = document.querySelector(".pos-right");
  if (posCart && name !== "pos") posCart.classList.remove("cart-expanded");
}

function refreshPage(name) {
  if (name === "dashboard") renderDashboard();
  if (name === "pos") renderPos();
  if (name === "products") renderProducts();
  if (name === "bundles") renderBundlesPage();
  if (name === "stocklogs") renderStockLogs();
  if (name === "sales") renderSales();
  if (name === "credits") renderCredits();
  if (name === "expenses") renderExpenses();
  if (name === "customers") renderCustomers();
  if (name === "users") renderUsers();
  if (name === "auditlogs") renderAuditLogs();
  updateUtangBadge();
}

// ── Clock ──────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById("clock");
  const n = new Date();
  el.textContent =
    n.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    n.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

// ── Sidebar ────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const isOpen = sidebar.classList.contains("open");
  if (isOpen) closeSidebar();
  else {
    sidebar.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("open");
  document.body.style.overflow = "";
}
