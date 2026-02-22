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
async function gdriveSyncNow() {
  if (!GDRIVE.isSignedIn || GDRIVE.isSyncing) return;
  GDRIVE.isSyncing = true;
  gdriveSyncStatusBusy(true);

  try {
    // 1. Ensure backup folder exists in Drive
    const folderId = await gdriveGetOrCreateFolder(GDRIVE.FOLDER_NAME);

    // 2. Serialize full DB
    const jsonStr = JSON.stringify(db);

    // 3. Compress with gzip
    const blob = await gdriveCompress(jsonStr);
    const rawKB = (new TextEncoder().encode(jsonStr).length / 1024).toFixed(1);
    const gzipKB = (blob.size / 1024).toFixed(1);
    const savings = Math.round(
      (1 - blob.size / new TextEncoder().encode(jsonStr).length) * 100,
    );
    console.log(
      "GDrive backup: " +
        rawKB +
        " KB raw -> " +
        gzipKB +
        " KB gzip (" +
        savings +
        "% saved)",
    );

    // 4. Upload compressed backup (overwrites same-day file)
    const fileName =
      "tindahan_backup_" + new Date().toISOString().slice(0, 10) + ".json.gz";
    await gdriveUploadFile(blob, fileName, "application/gzip", folderId);

    // 5. Record sync time
    GDRIVE.lastSyncAt = new Date().toISOString();
    localStorage.setItem(GDRIVE.LS_LAST_SYNC_KEY, GDRIVE.lastSyncAt);
    gdriveUpdateLastSyncLabel();
    showToast("Backed up to Drive! (" + gzipKB + " KB)");
  } catch (err) {
    console.error("GDrive sync error:", err);
    if (err.status === 401) {
      GDRIVE.isSignedIn = false;
      gdriveUpdateUI(false);
      showToast(
        "Google Drive session expired. Please sign in again.",
        "warning",
      );
    } else {
      showToast(
        "Google Drive sync failed: " + (err.message || err.status),
        "error",
      );
    }
  } finally {
    GDRIVE.isSyncing = false;
    gdriveSyncStatusBusy(false);
  }
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
      `'${folderId}' in parents and (mimeType='application/json' or mimeType='application/gzip') and trashed=false`,
    )}&orderBy=createdTime+desc&pageSize=20&fields=files(id,name,size,createdTime)`,
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
      // Decompress gzip backup
      const buffer = await resp.arrayBuffer();
      const jsonStr = await gdriveDecompress(buffer);
      json = JSON.parse(jsonStr);
    } else {
      // Plain JSON backup (legacy)
      json = await resp.json();
    }

    // Strip backup metadata before restoring
    // Write to localStorage and reload
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
        return `<div class="gdrive-backup-row">
          <div>
            <div style="font-weight:600;font-size:13px;">📄 ${f.name}</div>
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
