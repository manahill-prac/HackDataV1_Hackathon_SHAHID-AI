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
