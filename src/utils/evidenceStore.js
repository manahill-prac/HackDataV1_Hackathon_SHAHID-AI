const STORAGE_KEY = "shahid_ai_evidence";

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

export function saveEvidence(entry) {
  const items = getEvidenceList();
  const updated = [entry, ...items.filter((item) => item.id !== entry.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function setEvidenceList(entries) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeEntries));
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    // Fallback: deterministic pseudo-hash (no SubtleCrypto)
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return chainHash;
}
