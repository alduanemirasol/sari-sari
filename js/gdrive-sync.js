// ============================================================
// GOOGLE DRIVE SYNC — OAuth 2.0 + Drive API v3
// Depends on: db-store.js (db, saveDb), utils.js (showToast, fmt)
// Credentials: credentials.json (web client)
// ============================================================

const GDRIVE = {
  // ── OAuth / API config (from credentials.json) ───────────
  CLIENT_ID:
    "704191769647-se7rllmilgeiof013irccl8gniovq79m.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/drive.file",
  DISCOVERY: "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",

  // ── State ─────────────────────────────────────────────────
  tokenClient: null,
  accessToken: null,
  isSignedIn: false,
  autoSyncInterval: null,
  driveBackupFolderId: null, // cached Drive folder ID
  lastSyncAt: null, // ISO string
  isSyncing: false,

  // ── Constants ─────────────────────────────────────────────
  FOLDER_NAME: "TindahanBackups",
  AUTO_SYNC_MS: 60 * 60 * 1000, // 1 hour
  LS_TOKEN_KEY: "tindahan_gdrive_token",
  LS_FOLDER_KEY: "tindahan_gdrive_folder_id",
  LS_LAST_SYNC_KEY: "tindahan_gdrive_last_sync",
  LS_LAST_HASH_KEY: "tindahan_gdrive_last_hash",   // hash of last uploaded snapshot
  LS_INCREMENTAL_KEY: "tindahan_gdrive_incremental", // accumulated incremental patches

  // ── Incremental state ──────────────────────────────────────
  lastUploadedHash: null,   // fingerprint of the last full backup sent to Drive
};

// ── Init ──────────────────────────────────────────────────────
async function gdriveInit() {
  // Restore persisted token/folder from localStorage
  const storedToken = localStorage.getItem(GDRIVE.LS_TOKEN_KEY);
  const storedFolder = localStorage.getItem(GDRIVE.LS_FOLDER_KEY);
  const storedSync = localStorage.getItem(GDRIVE.LS_LAST_SYNC_KEY);
  if (storedToken) GDRIVE.accessToken = storedToken;
  if (storedFolder) GDRIVE.driveBackupFolderId = storedFolder;
  if (storedSync) GDRIVE.lastSyncAt = storedSync;
  const storedHash = localStorage.getItem(GDRIVE.LS_LAST_HASH_KEY);
  if (storedHash) GDRIVE.lastUploadedHash = storedHash;

  await new Promise((resolve) => {
    if (typeof gapi !== "undefined") {
      gapi.load("client", resolve);
    } else {
      // gapi script not yet loaded — wait for it
      window.addEventListener("gapi-ready", resolve, { once: true });
      resolve(); // fallback: don't block UI
    }
  });

  try {
    await gapi.client.init({
      discoveryDocs: [GDRIVE.DISCOVERY],
    });
  } catch (e) {
    console.warn("gapi client init failed:", e);
  }

  // Google Identity Services token client
  if (typeof google !== "undefined" && google.accounts) {
    GDRIVE.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE.CLIENT_ID,
      scope: GDRIVE.SCOPES,
      callback: (resp) => {
        if (resp.error) {
          console.error("GDrive OAuth error:", resp);
          gdriveUpdateUI(false);
          showToast("Google Sign-in failed: " + resp.error, "error");
          return;
        }
        GDRIVE.accessToken = resp.access_token;
        GDRIVE.isSignedIn = true;
        localStorage.setItem(GDRIVE.LS_TOKEN_KEY, resp.access_token);
        gapi.client.setToken({ access_token: resp.access_token });
        gdriveUpdateUI(true);
        showToast("✅ Naka-connect sa Google Drive!");
        // Kick off first sync right away
        gdriveSyncNow();
        // Start auto-sync
        gdriveStartAutoSync();
      },
    });
  }

  // If we already have a stored token, try to use it
  if (GDRIVE.accessToken) {
    try {
      gapi.client.setToken({ access_token: GDRIVE.accessToken });
      GDRIVE.isSignedIn = true;
      gdriveUpdateUI(true);
      gdriveStartAutoSync();
    } catch (e) {
      GDRIVE.isSignedIn = false;
      gdriveUpdateUI(false);
    }
  } else {
    gdriveUpdateUI(false);
  }

  gdriveUpdateLastSyncLabel();
}

// ── Sign in / out ─────────────────────────────────────────────
function gdriveSignIn() {
  if (!GDRIVE.tokenClient) {
    showToast("Google API hindi pa naka-load. Refresh ang page.", "error");
    return;
  }
  GDRIVE.tokenClient.requestAccessToken({ prompt: "" });
}

function gdriveSignOut() {
  if (!confirm("I-disconnect ang Google Drive sync?")) return;
  if (GDRIVE.accessToken && typeof google !== "undefined") {
    google.accounts.oauth2.revoke(GDRIVE.accessToken, () => {});
  }
  GDRIVE.accessToken = null;
  GDRIVE.isSignedIn = false;
  GDRIVE.driveBackupFolderId = null;
  GDRIVE.lastSyncAt = null;
  localStorage.removeItem(GDRIVE.LS_TOKEN_KEY);
  localStorage.removeItem(GDRIVE.LS_FOLDER_KEY);
  localStorage.removeItem(GDRIVE.LS_LAST_SYNC_KEY);
  localStorage.removeItem(GDRIVE.LS_LAST_HASH_KEY);
  localStorage.removeItem(GDRIVE.LS_INCREMENTAL_KEY);
  GDRIVE.lastUploadedHash = null;
  gdriveStopAutoSync();
  gdriveUpdateUI(false);
  showToast("Na-disconnect sa Google Drive.", "warning");
}

// ── Auto-sync ─────────────────────────────────────────────────
function gdriveStartAutoSync() {
  gdriveStopAutoSync(); // clear old interval first
  GDRIVE.autoSyncInterval = setInterval(() => {
    if (GDRIVE.isSignedIn) gdriveSyncNow();
  }, GDRIVE.AUTO_SYNC_MS);
}

function gdriveStopAutoSync() {
  if (GDRIVE.autoSyncInterval) {
    clearInterval(GDRIVE.autoSyncInterval);
    GDRIVE.autoSyncInterval = null;
  }
}

// ── Hash a string (FNV-1a 32-bit, fast + compact) ────────────
function gdriveHashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── Compute incremental diff between two plain objects ───────
// Returns { added, updated, deleted } — only top-level keys.
function gdriveDiffDb(oldObj, newObj) {
  const added = {}, updated = {}, deleted = [];
  for (const key of Object.keys(newObj)) {
    if (!(key in oldObj)) {
      added[key] = newObj[key];
    } else if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      updated[key] = newObj[key];
    }
  }
  for (const key of Object.keys(oldObj)) {
    if (!(key in newObj)) deleted.push(key);
  }
  return { added, updated, deleted };
}

// ── Compress a string to gzip Blob ──────────────────────────
async function gdriveCompress(str) {
  const stream = new Blob([str])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const compressed = await new Response(stream).arrayBuffer();
  return new Blob([compressed], { type: "application/gzip" });
}

// ── Decompress a gzip ArrayBuffer to string ───────────────────
async function gdriveDecompress(buffer) {
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

// ── Core Sync ─────────────────────────────────────────────────
// Strategy:
//   • Always serialise the DB to JSON (human-readable, browsable in Drive).
//   • Skip the upload entirely when nothing has changed (hash check).
//   • On first sync of the day (or when hash changes significantly) write a
//     full snapshot: tindahan_backup_YYYY-MM-DD.json
//   • On subsequent same-day syncs where data changed, append an incremental
//     patch file: tindahan_patch_YYYY-MM-DD_HHmmss.json
//     The patch contains only the added/updated/deleted top-level keys plus
//     metadata so a restore tool can replay it on top of the day's snapshot.
async function gdriveSyncNow() {
  if (!GDRIVE.isSignedIn || GDRIVE.isSyncing) return;
  GDRIVE.isSyncing = true;
  gdriveSyncStatusBusy(true);

  try {
    // 1. Ensure backup folder exists in Drive
    const folderId = await gdriveGetOrCreateFolder(GDRIVE.FOLDER_NAME);

    // 2. Serialize full DB to JSON
    const jsonStr = JSON.stringify(db, null, 2);
    const currentHash = gdriveHashString(jsonStr);

    // 3. Skip upload if data has not changed since last sync
    if (currentHash === GDRIVE.lastUploadedHash) {
      console.log("GDrive: no changes detected, skipping upload.");
      GDRIVE.lastSyncAt = new Date().toISOString();
      localStorage.setItem(GDRIVE.LS_LAST_SYNC_KEY, GDRIVE.lastSyncAt);
      gdriveUpdateLastSyncLabel();
      return; // silent — no toast needed
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ""); // HHmmss

    // 4. Decide: full snapshot or incremental patch?
    const snapshotName = `tindahan_backup_${dateStr}.json`;
    const snapshotExists = !!(await gdriveFindFile(snapshotName, folderId));

    const rawKB = (new TextEncoder().encode(jsonStr).length / 1024).toFixed(1);

    if (!snapshotExists) {
      // ── Full snapshot (JSON) ────────────────────────────────
      const blob = new Blob([jsonStr], { type: "application/json" });
      await gdriveUploadFile(blob, snapshotName, "application/json", folderId);
      console.log(`GDrive full snapshot: ${rawKB} KB → ${snapshotName}`);
      showToast(`☁️ Full backup saved! (${rawKB} KB)`);
    } else {
      // ── Incremental patch (JSON) ────────────────────────────
      // Build diff against the last uploaded state stored locally.
      const lastRaw = localStorage.getItem(GDRIVE.LS_INCREMENTAL_KEY);
      const lastDb = lastRaw ? JSON.parse(lastRaw) : {};
      const diff = gdriveDiffDb(lastDb, db);
      const hasChanges =
        Object.keys(diff.added).length > 0 ||
        Object.keys(diff.updated).length > 0 ||
        diff.deleted.length > 0;

      if (!hasChanges) {
        // Structural diff found no top-level changes — update hash and exit.
        GDRIVE.lastUploadedHash = currentHash;
        localStorage.setItem(GDRIVE.LS_LAST_HASH_KEY, currentHash);
        GDRIVE.lastSyncAt = now.toISOString();
        localStorage.setItem(GDRIVE.LS_LAST_SYNC_KEY, GDRIVE.lastSyncAt);
        gdriveUpdateLastSyncLabel();
        return;
      }

      const patch = {
        _meta: {
          type: "incremental_patch",
          baseSnapshot: snapshotName,
          patchedAt: now.toISOString(),
          hash: currentHash,
        },
        added: diff.added,
        updated: diff.updated,
        deleted: diff.deleted,
      };
      const patchStr = JSON.stringify(patch, null, 2);
      const patchName = `tindahan_patch_${dateStr}_${timeStr}.json`;
      const patchBlob = new Blob([patchStr], { type: "application/json" });
      const patchKB = (new TextEncoder().encode(patchStr).length / 1024).toFixed(1);

      await gdriveUploadFile(patchBlob, patchName, "application/json", folderId);
      console.log(`GDrive incremental patch: ${patchKB} KB → ${patchName}`);
      showToast(`☁️ Incremental backup saved! (${patchKB} KB patch)`);
    }

    // 5. Persist new hash + snapshot state locally
    GDRIVE.lastUploadedHash = currentHash;
    localStorage.setItem(GDRIVE.LS_LAST_HASH_KEY, currentHash);
    localStorage.setItem(GDRIVE.LS_INCREMENTAL_KEY, jsonStr); // keep full state for next diff

    // 6. Record sync time
    GDRIVE.lastSyncAt = now.toISOString();
    localStorage.setItem(GDRIVE.LS_LAST_SYNC_KEY, GDRIVE.lastSyncAt);
    gdriveUpdateLastSyncLabel();

  } catch (err) {
    console.error("GDrive sync error:", err);
    if (err.status === 401) {
      GDRIVE.isSignedIn = false;
      gdriveUpdateUI(false);
      showToast("Google Drive session expired. Please sign in again.", "warning");
    } else {
      showToast("Google Drive sync failed: " + (err.message || err.status), "error");
    }
  } finally {
    GDRIVE.isSyncing = false;
    gdriveSyncStatusBusy(false);
  }
}

// ── Restore incremental patches on top of a base snapshot ────
// Called automatically by gdriveRestoreBackup when user picks a patch file.
async function gdriveApplyPatches(baseDb, patches) {
  let result = { ...baseDb };
  for (const patch of patches) {
    if (patch._meta?.type !== "incremental_patch") continue;
    Object.assign(result, patch.added || {});
    Object.assign(result, patch.updated || {});
    for (const key of (patch.deleted || [])) delete result[key];
  }
  return result;
}

// ── Upload a single file (multipart) ─────────────────────────
async function gdriveUploadFile(blob, fileName, mimeType, folderId) {
  // Check if file already exists (so we can update instead of duplicate)
  const existingId = await gdriveFindFile(fileName, folderId);

  // The Drive API does NOT allow "parents" in PATCH (update) metadata —
  // only POST (create) accepts it. Sending it on PATCH causes a 403 error.
  const metadata = existingId
    ? { name: fileName, mimeType }
    : {
        name: fileName,
        mimeType,
        ...(folderId ? { parents: [folderId] } : {}),
      };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", blob);

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const method = existingId ? "PATCH" : "POST";

  const resp = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${GDRIVE.accessToken}` },
    body: form,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: resp.statusText }));
    throw {
      status: resp.status,
      message: err.error?.message || resp.statusText,
    };
  }
  return await resp.json();
}

// ── Image upload helper ───────────────────────────────────────
/**
 * Upload an image File/Blob to the Drive backup folder.
 * Can be called externally: gdriveUploadImage(file, 'photo.png')
 */
async function gdriveUploadImage(fileOrBlob, fileName) {
  if (!GDRIVE.isSignedIn) {
    showToast("Hindi pa naka-connect sa Google Drive!", "warning");
    return null;
  }

  const mimeType = fileOrBlob.type || "image/png";
  const folderId = await gdriveGetOrCreateFolder(GDRIVE.FOLDER_NAME);
  const imgFolderId = await gdriveGetOrCreateFolder("TindahanImages", folderId);

  gdriveSyncStatusBusy(true);
  try {
    const result = await gdriveUploadFile(
      fileOrBlob,
      fileName,
      mimeType,
      imgFolderId,
    );
    showToast(`🖼️ Na-upload ang larawan: ${fileName}`);
    return result;
  } catch (err) {
    showToast("Image upload failed: " + (err.message || ""), "error");
    return null;
  } finally {
    gdriveSyncStatusBusy(false);
  }
}

// ── List backups in Drive ─────────────────────────────────────
async function gdriveListBackups() {
  if (!GDRIVE.isSignedIn) return [];
  const folderId = await gdriveGetOrCreateFolder(GDRIVE.FOLDER_NAME);
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
    )}&orderBy=createdTime+desc&pageSize=50&fields=files(id,name,size,createdTime)`,
    { headers: { Authorization: `Bearer ${GDRIVE.accessToken}` } },
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.files || [];
}

// ── Restore from Drive ────────────────────────────────────────
async function gdriveRestoreBackup(fileId, fileName) {
  if (
    !confirm(
      `I-restore ang backup na "${fileName}"?\n\n⚠️ LAHAT ng kasalukuyang data ay papalitan. Hindi na mababawi!`,
    )
  )
    return;

  gdriveSyncStatusBusy(true);
  try {
    const resp = await fetch(
      "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media",
      { headers: { Authorization: "Bearer " + GDRIVE.accessToken } },
    );
    if (!resp.ok) throw new Error("Download failed: " + resp.statusText);

    let json;
    if (fileName.endsWith(".gz")) {
      // Legacy gzip backup
      const buffer = await resp.arrayBuffer();
      const jsonStr = await gdriveDecompress(buffer);
      json = JSON.parse(jsonStr);
    } else {
      json = await resp.json();
    }

    // If this is an incremental patch file, reconstruct from its base snapshot
    if (json._meta?.type === "incremental_patch") {
      const baseSnapshotName = json._meta.baseSnapshot;
      showToast(`⏳ Loading base snapshot: ${baseSnapshotName}…`);

      const folderId = await gdriveGetOrCreateFolder(GDRIVE.FOLDER_NAME);
      const baseId = await gdriveFindFile(baseSnapshotName, folderId);
      if (!baseId) throw new Error(`Base snapshot "${baseSnapshotName}" not found in Drive.`);

      const baseResp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${baseId}?alt=media`,
        { headers: { Authorization: "Bearer " + GDRIVE.accessToken } },
      );
      if (!baseResp.ok) throw new Error("Failed to download base snapshot.");
      const baseDb = await baseResp.json();

      // Gather all patches between the snapshot and the selected patch (inclusive),
      // sorted by name (which encodes timestamp).
      const allFiles = await gdriveListBackups();
      const relevantPatches = allFiles
        .filter(
          (f) =>
            f.name.startsWith("tindahan_patch_" + baseSnapshotName.slice(16, 26)) &&
            f.name <= fileName,
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      const patchObjects = await Promise.all(
        relevantPatches.map(async (f) => {
          const r = await fetch(
            `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
            { headers: { Authorization: "Bearer " + GDRIVE.accessToken } },
          );
          return r.ok ? r.json() : null;
        }),
      );

      json = await gdriveApplyPatches(baseDb, patchObjects.filter(Boolean));
      showToast(`✅ Replayed ${patchObjects.length} patch(es) onto snapshot.`);
    }

    // Strip any backup metadata before restoring
    delete json._meta;

    localStorage.setItem("tindahan_db", JSON.stringify(json));
    showToast("Restored! Reloading page...");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showToast("Restore failed: " + (err.message || ""), "error");
  } finally {
    gdriveSyncStatusBusy(false);
  }
}

// ── Get/create folder in Drive ────────────────────────────────
async function gdriveGetOrCreateFolder(name, parentId = null) {
  // Use cache for root backup folder
  if (name === GDRIVE.FOLDER_NAME && GDRIVE.driveBackupFolderId) {
    return GDRIVE.driveBackupFolderId;
  }

  // Search for existing folder
  const parentQ = parentId
    ? `and '${parentId}' in parents`
    : `and 'root' in parents`;
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' ${parentQ} and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${GDRIVE.accessToken}` } },
  );
  const data = await resp.json();
  if (data.files && data.files.length > 0) {
    const id = data.files[0].id;
    if (name === GDRIVE.FOLDER_NAME) {
      GDRIVE.driveBackupFolderId = id;
      localStorage.setItem(GDRIVE.LS_FOLDER_KEY, id);
    }
    return id;
  }

  // Create folder
  const body = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : ["root"],
  };
  const createResp = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GDRIVE.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const created = await createResp.json();
  if (name === GDRIVE.FOLDER_NAME) {
    GDRIVE.driveBackupFolderId = created.id;
    localStorage.setItem(GDRIVE.LS_FOLDER_KEY, created.id);
  }
  return created.id;
}

// ── Find existing file in folder ──────────────────────────────
async function gdriveFindFile(name, folderId) {
  const q = `name='${name}' and '${folderId}' in parents and trashed=false`;
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${GDRIVE.accessToken}` } },
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

// ── UI Helpers ────────────────────────────────────────────────
function gdriveUpdateUI(isSignedIn) {
  GDRIVE.isSignedIn = isSignedIn;
  const statusEl = document.getElementById("gdrive-status");
  const btnConnect = document.getElementById("gdrive-btn-connect");
  const btnDisconnect = document.getElementById("gdrive-btn-disconnect");
  const btnSyncNow = document.getElementById("gdrive-btn-sync-now");
  const btnBackups = document.getElementById("gdrive-btn-backups");

  if (!statusEl) return; // panel not rendered yet

  if (isSignedIn) {
    statusEl.innerHTML = `<span class="gdrive-dot gdrive-dot-green"></span> Connected to Google Drive`;
    if (btnConnect) btnConnect.style.display = "none";
    if (btnDisconnect) btnDisconnect.style.display = "";
    if (btnSyncNow) btnSyncNow.style.display = "";
    if (btnBackups) btnBackups.style.display = "";
  } else {
    statusEl.innerHTML = `<span class="gdrive-dot gdrive-dot-grey"></span> Not connected`;
    if (btnConnect) btnConnect.style.display = "";
    if (btnDisconnect) btnDisconnect.style.display = "none";
    if (btnSyncNow) btnSyncNow.style.display = "none";
    if (btnBackups) btnBackups.style.display = "none";
  }
}

function gdriveSyncStatusBusy(busy) {
  const indicator = document.getElementById("gdrive-sync-indicator");
  const btnSyncNow = document.getElementById("gdrive-btn-sync-now");
  if (indicator) {
    indicator.style.display = busy ? "inline-flex" : "none";
  }
  if (btnSyncNow) {
    btnSyncNow.disabled = busy;
    btnSyncNow.textContent = busy ? "⏳ Syncing..." : "☁️ Sync Now";
  }
}

function gdriveUpdateLastSyncLabel() {
  const el = document.getElementById("gdrive-last-sync");
  if (!el) return;
  if (GDRIVE.lastSyncAt) {
    const d = new Date(GDRIVE.lastSyncAt);
    el.textContent = "Last sync: " + d.toLocaleString("en-PH");
  } else {
    el.textContent = "Last sync: Never";
  }
}

// ── Backup List Modal ─────────────────────────────────────────
async function gdriveOpenBackupsModal() {
  openModal("modal-gdrive-backups");
  const list = document.getElementById("gdrive-backup-list");
  list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);">⏳ Loading backups...</div>`;

  try {
    const files = await gdriveListBackups();
    if (files.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="icon">☁️</div><p>Wala pang backups sa Drive.</p></div>`;
      return;
    }
    list.innerHTML = files
      .map((f) => {
        const d = new Date(f.createdTime);
        const size = f.size
          ? (parseInt(f.size) / 1024).toFixed(1) + " KB"
          : "—";
        const isSnapshot = f.name.startsWith("tindahan_backup_");
        const isPatch = f.name.startsWith("tindahan_patch_");
        const icon = isSnapshot ? "🗂️" : isPatch ? "🔧" : "📄";
        const badge = isSnapshot
          ? `<span style="font-size:10px;background:var(--green,#2da44e);color:#fff;border-radius:4px;padding:1px 5px;margin-left:6px;">FULL</span>`
          : isPatch
          ? `<span style="font-size:10px;background:var(--blue,#0969da);color:#fff;border-radius:4px;padding:1px 5px;margin-left:6px;">PATCH</span>`
          : "";
        return `<div class="gdrive-backup-row">
          <div>
            <div style="font-weight:600;font-size:13px;">${icon} ${f.name}${badge}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">${d.toLocaleString("en-PH")} · ${size}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="gdriveRestoreBackup('${f.id}','${f.name}')">🔄 Restore</button>
        </div>`;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--red);">Error loading backups: ${err.message || ""}</div>`;
  }
}

// ── Image Upload from file input ──────────────────────────────
async function gdriveHandleImageUpload(inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];
  if (!file.type.startsWith("image/")) {
    showToast("Piliin ang isang image file (PNG, JPG, etc.)!", "warning");
    return;
  }
  if (!GDRIVE.isSignedIn) {
    showToast("I-connect muna ang Google Drive!", "warning");
    return;
  }
  const result = await gdriveUploadImage(file, file.name);
  if (result) {
    showToast(`🖼️ Na-upload: ${file.name}`, "success");
    // Reset input so same file can be re-uploaded
    inputEl.value = "";
  }
}

// ── Auto-init when DOM is ready ───────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Delay slightly to let gapi / google identity services load
  setTimeout(gdriveInit, 1200);
});