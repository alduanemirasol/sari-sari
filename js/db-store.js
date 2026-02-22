// ============================================================
// DB STORE — localStorage persistence
// Depends on: db-seed.js (DEFAULT_DB, DB_KEY)
// ============================================================

/**
 * Deep-clone the DEFAULT_DB so the seed is never mutated.
 */
function cloneDefaultDb() {
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

/**
 * Load db from localStorage.  Falls back to DEFAULT_DB seed on first run
 * or if the stored JSON is corrupt.
 */
function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return cloneDefaultDb();
    const parsed = JSON.parse(raw);
    // Basic sanity check — must have at least the nextId map
    if (!parsed || !parsed.nextId) return cloneDefaultDb();
    return parsed;
  } catch (e) {
    console.warn("tindahan: failed to parse stored DB, using defaults.", e);
    return cloneDefaultDb();
  }
}

/**
 * Persist the current db to localStorage.
 * Called after every mutation.
 */
function saveDb() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("tindahan: could not save to localStorage.", e);
  }
}

/**
 * Wipe localStorage and reload from DEFAULT_DB seed.
 * Exposed globally so a "Reset to demo data" button can call it.
 */
function resetDb() {
  localStorage.removeItem(DB_KEY);
  db = cloneDefaultDb();
  saveDb();
}

// Initialise the live db object from storage (or seed)
let db = loadDb();
