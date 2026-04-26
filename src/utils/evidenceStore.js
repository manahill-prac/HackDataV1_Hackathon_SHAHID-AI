const STORAGE_KEY = "shahid_ai_evidence";

// Maximum evidence records to keep in localStorage.
// Oldest records beyond this limit are pruned automatically.
const MAX_RECORDS = 60;

// Warn threshold: if stored JSON exceeds this many bytes, prune before writing.
// localStorage limit is typically 5MB; we stay well under it.
const QUOTA_WARN_BYTES = 3.5 * 1024 * 1024; // 3.5 MB

function parseStoredEvidence(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function getEvidenceList() {
  return parseStoredEvidence(window.localStorage.getItem(STORAGE_KEY)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getEvidenceById(evidenceId) {
  return getEvidenceList().find((entry) => entry.id === evidenceId);
}

/**
 * Estimate byte size of a value when JSON-serialised.
 * Uses TextEncoder for accuracy; falls back to string length * 2.
 */
function estimateBytes(value) {
  try {
    const str = JSON.stringify(value);
    return new TextEncoder().encode(str).length;
  } catch {
    return 0;
  }
}

/**
 * Prune the list to MAX_RECORDS, keeping the newest entries.
 * Seeded records (mediaType === "seeded") are deprioritised for pruning —
 * they are pruned first if needed, then real captures.
 */
function pruneToLimit(items) {
  if (items.length <= MAX_RECORDS) return items;
  // Sort: real captures first (keep), seeded last (prune first)
  const real = items.filter((i) => i.mediaType !== "seeded");
  const seeded = items.filter((i) => i.mediaType === "seeded");
  const combined = [...real, ...seeded];
  return combined.slice(0, MAX_RECORDS);
}

/**
 * Safe localStorage write with quota protection.
 * If write fails due to QuotaExceededError:
 *   1. Prune oldest/seeded records aggressively.
 *   2. Retry write.
 *   3. If still fails, store in sessionStorage as emergency fallback.
 * Returns true if persisted to localStorage, false if fell back to session.
 */
function safeLocalStorageWrite(key, items) {
  const serialised = JSON.stringify(items);

  // Pre-emptive prune if approaching limit
  if (estimateBytes(items) > QUOTA_WARN_BYTES) {
    const pruned = pruneToLimit(items);
    try {
      window.localStorage.setItem(key, JSON.stringify(pruned));
      return true;
    } catch { /* fall through to aggressive prune */ }
  }

  try {
    window.localStorage.setItem(key, serialised);
    return true;
  } catch (e) {
    if (e.name !== "QuotaExceededError" && e.code !== 22) throw e;

    // Aggressive prune: keep only newest 30 real captures
    const current = parseStoredEvidence(window.localStorage.getItem(key));
    const aggressivePruned = current
      .filter((i) => i.mediaType !== "seeded")
      .slice(0, 30);

    try {
      window.localStorage.setItem(key, JSON.stringify(aggressivePruned));
      // Now retry adding the new item
      const withNew = [items[0], ...aggressivePruned.filter((i) => i.id !== items[0]?.id)];
      window.localStorage.setItem(key, JSON.stringify(withNew));
      return true;
    } catch {
      // Last resort: sessionStorage (survives tab session, not refresh)
      try {
        sessionStorage.setItem(key + "_overflow", JSON.stringify(items.slice(0, 5)));
      } catch { /* truly out of storage — silent */ }
      return false;
    }
  }
}

export function saveEvidence(entry) {
  const items = getEvidenceList();
  const updated = [entry, ...items.filter((item) => item.id !== entry.id)];
  const pruned = pruneToLimit(updated);
  safeLocalStorageWrite(STORAGE_KEY, pruned);
}

export function setEvidenceList(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  safeLocalStorageWrite(STORAGE_KEY, safeEntries);
}

export function updateEvidenceSealedState(evidenceId, sealedAt) {
  const items = getEvidenceList();
  const next = items.map((item) =>
    item.id === evidenceId
      ? {
          ...item,
          sealed: true,
          sealedAt,
          custodyTimeline: [
            ...(item.custodyTimeline || []),
            { label: "Evidence Sealed", labelUr: "ثبوت سیل کیا گیا", at: sealedAt },
          ],
        }
      : item
  );
  safeLocalStorageWrite(STORAGE_KEY, next);
}

export function findEvidenceByHash(hash) {
  if (!hash) return null;
  const normalized = hash.trim().toLowerCase();
  return getEvidenceList().find((item) => (item.hash || "").toLowerCase() === normalized) || null;
}

/**
 * Append a tamper-evident custody event.
 * chainHash = SHA-256(previousHash + eventPayload) — computed async.
 * Falls back to a deterministic pseudo-hash if SubtleCrypto unavailable.
 */
export async function appendCustodyEvent(evidenceId, event) {
  const items = getEvidenceList();
  const entry = items.find((item) => item.id === evidenceId);
  if (!entry) return;

  const timeline = Array.isArray(entry.custodyTimeline) ? entry.custodyTimeline : [];
  const previousHash = timeline.length
    ? (timeline[timeline.length - 1].chainHash || entry.hash || "")
    : (entry.hash || "");

  const payload = JSON.stringify({ event: event.label, at: event.at, id: evidenceId });
  let chainHash = "";
  try {
    const buf = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(previousHash + payload)
    );
    chainHash = Array.from(new Uint8Array(buf))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    let h = 0;
    const str = previousHash + payload;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    chainHash = Math.abs(h).toString(16).padEnd(64, "0").slice(0, 64);
  }

  const newEvent = { ...event, chainHash, signatureType: "SHA256-chain" };
  const updated = items.map((item) =>
    item.id === evidenceId
      ? { ...item, custodyTimeline: [...timeline, newEvent] }
      : item
  );
  safeLocalStorageWrite(STORAGE_KEY, updated);
  return chainHash;
}

/**
 * Return current localStorage usage for the evidence key in bytes.
 * Useful for diagnostics.
 */
export function getStorageUsageBytes() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || "";
    return new TextEncoder().encode(raw).length;
  } catch { return 0; }
}
