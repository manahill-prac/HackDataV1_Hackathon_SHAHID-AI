/**
 * SHAHID.AI — Local Legal RAG Engine
 * Hybrid BM25 + TF-IDF retrieval over local legal corpus.
 * Zero external dependencies. Fully offline-safe.
 *
 * Cache hierarchy:
 *   1. IndexedDB  — persists across refresh (primary)
 *   2. In-memory  — module-level, survives same-session navigation
 *   3. sessionStorage — tertiary fallback
 */

import ppcCorpus from "../legal/ppc_corpus.json";
import crpcCorpus from "../legal/crpc_corpus.json";
import evidenceActCorpus from "../legal/evidence_act.json";

// ─── Corpus ──────────────────────────────────────────────────────────────────

const FULL_CORPUS = [...ppcCorpus, ...crpcCorpus, ...evidenceActCorpus];

// ─── In-memory cache (module-level) ──────────────────────────────────────────

let _indexCache = null; // { idf, docVectors, corpus }

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const IDB_NAME = "shahid_rag";
const IDB_STORE = "index_cache";
const IDB_KEY = "v1";

function openIDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("IndexedDB unavailable")); return; }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch { return undefined; }
}

async function idbSet(key, value) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* silent — fallback to memory */ }
}

// ─── sessionStorage fallback ──────────────────────────────────────────────────

function ssGet(key) {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : undefined; }
  catch { return undefined; }
}

function ssSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded — silent */ }
}

// ─── Text utilities ───────────────────────────────────────────────────────────

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function termFreq(tokens) {
  const tf = {};
  tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  const len = tokens.length || 1;
  Object.keys(tf).forEach((k) => { tf[k] /= len; });
  return tf;
}

// ─── Index builder ────────────────────────────────────────────────────────────

function buildIndex(corpus) {
  const N = corpus.length;
  const docFreq = {};
  const docTokens = corpus.map((doc) => {
    const text = [doc.title, doc.full_text, doc.explanation, (doc.keywords || []).join(" "), (doc.offense_tags || []).join(" ")].join(" ");
    const tokens = tokenize(text);
    tokens.forEach((t) => { docFreq[t] = (docFreq[t] || new Set()).add(doc.id) && docFreq[t]; });
    return { id: doc.id, tokens };
  });

  // Recompute docFreq as counts
  const dfCounts = {};
  corpus.forEach((doc) => {
    const text = [doc.title, doc.full_text, doc.explanation, (doc.keywords || []).join(" "), (doc.offense_tags || []).join(" ")].join(" ");
    const unique = new Set(tokenize(text));
    unique.forEach((t) => { dfCounts[t] = (dfCounts[t] || 0) + 1; });
  });

  // IDF
  const idf = {};
  Object.keys(dfCounts).forEach((t) => {
    idf[t] = Math.log((N + 1) / (dfCounts[t] + 1)) + 1;
  });

  // TF-IDF vectors per doc
  const docVectors = {};
  docTokens.forEach(({ id, tokens }) => {
    const tf = termFreq(tokens);
    const vec = {};
    Object.keys(tf).forEach((t) => { vec[t] = tf[t] * (idf[t] || 1); });
    docVectors[id] = vec;
  });

  return { idf, docVectors, corpus };
}

// ─── BM25 scorer ─────────────────────────────────────────────────────────────

const BM25_K1 = 1.5;
const BM25_B = 0.75;

function bm25Score(queryTokens, docTokens, idf, avgDocLen) {
  const tf = {};
  docTokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  const docLen = docTokens.length;
  let score = 0;
  queryTokens.forEach((t) => {
    if (!tf[t]) return;
    const tfVal = tf[t];
    const idfVal = idf[t] || 0;
    score += idfVal * ((tfVal * (BM25_K1 + 1)) / (tfVal + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgDocLen))));
  });
  return score;
}

// ─── Cosine similarity ────────────────────────────────────────────────────────

function cosineSim(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  keys.forEach((k) => {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  });
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Keyword overlap bonus ────────────────────────────────────────────────────

function keywordOverlap(queryTokens, doc) {
  const keywords = new Set([...(doc.keywords || []).map((k) => k.toLowerCase()), ...(doc.offense_tags || []).map((t) => t.toLowerCase())]);
  let hits = 0;
  queryTokens.forEach((t) => { if (keywords.has(t)) hits += 1; });
  return hits / Math.max(queryTokens.length, 1);
}

// ─── Explainability ───────────────────────────────────────────────────────────

function buildReason(queryTokens, doc, scores) {
  const matchedKeywords = (doc.keywords || []).filter((k) => queryTokens.includes(k.toLowerCase()));
  const matchedTags = (doc.offense_tags || []).filter((t) => queryTokens.some((q) => t.toLowerCase().includes(q)));
  const parts = [];
  if (matchedKeywords.length) parts.push(`Keyword match: ${matchedKeywords.slice(0, 3).join(", ")}`);
  if (matchedTags.length) parts.push(`Offense category: ${matchedTags.slice(0, 2).join(", ")}`);
  if (scores.bm25 > 1) parts.push(`High lexical relevance (BM25: ${scores.bm25.toFixed(2)})`);
  if (scores.cosine > 0.15) parts.push(`Semantic similarity: ${(scores.cosine * 100).toFixed(0)}%`);
  return parts.length ? parts.join(" · ") : "Contextual relevance to incident type";
}

// ─── Main retrieval function ──────────────────────────────────────────────────

/**
 * retrieve(query, options)
 * @param {string} query — free text (incident type, description, keywords)
 * @param {object} options — { topK: number, incidentType: string }
 * @returns {Array<{ section, act, title, score, reason, citation_text, explanation, id }>}
 */
export async function retrieve(query, options = {}) {
  const { topK = 5, incidentType = "" } = options;

  // Ensure index is loaded
  const index = await getOrBuildIndex();

  const queryText = [query, incidentType].join(" ");
  const queryTokens = tokenize(queryText);
  if (!queryTokens.length) return [];

  // Build query TF-IDF vector
  const queryTf = termFreq(queryTokens);
  const queryVec = {};
  Object.keys(queryTf).forEach((t) => { queryVec[t] = queryTf[t] * (index.idf[t] || 1); });

  // Compute doc lengths for BM25 avg
  const docLengths = index.corpus.map((doc) => {
    const text = [doc.title, doc.full_text, doc.explanation, (doc.keywords || []).join(" ")].join(" ");
    return tokenize(text).length;
  });
  const avgDocLen = docLengths.reduce((a, b) => a + b, 0) / Math.max(docLengths.length, 1);

  const results = index.corpus.map((doc, i) => {
    const text = [doc.title, doc.full_text, doc.explanation, (doc.keywords || []).join(" "), (doc.offense_tags || []).join(" ")].join(" ");
    const docTokensList = tokenize(text);

    const bm25 = bm25Score(queryTokens, docTokensList, index.idf, avgDocLen);
    const cosine = cosineSim(queryVec, index.docVectors[doc.id] || {});
    const overlap = keywordOverlap(queryTokens, doc);

    // Hybrid score: weighted combination
    const hybrid = bm25 * 0.5 + cosine * 30 + overlap * 20;

    return {
      doc,
      scores: { bm25, cosine, overlap, hybrid },
    };
  });

  // Sort by hybrid score, take top-k
  results.sort((a, b) => b.scores.hybrid - a.scores.hybrid);
  const topResults = results.slice(0, topK).filter((r) => r.scores.hybrid > 0.5);

  return topResults.map((r) => ({
    id: r.doc.id,
    section: r.doc.section,
    act: r.doc.act,
    title: r.doc.title,
    score: Math.min(99, Math.round(r.scores.hybrid * 4 + 40)),
    reason: buildReason(queryTokens, r.doc, r.scores),
    citation_text: r.doc.full_text,
    explanation: r.doc.explanation,
    offense_tags: r.doc.offense_tags,
  }));
}

// ─── Index loader with cache hierarchy ───────────────────────────────────────

async function getOrBuildIndex() {
  // 1. In-memory
  if (_indexCache) return _indexCache;

  // 2. IndexedDB
  const cached = await idbGet(IDB_KEY);
  if (cached && cached.corpus && cached.idf) {
    _indexCache = cached;
    return _indexCache;
  }

  // 3. sessionStorage
  const ssCached = ssGet("shahid_rag_v1");
  if (ssCached && ssCached.corpus && ssCached.idf) {
    _indexCache = ssCached;
    return _indexCache;
  }

  // Build fresh
  const index = buildIndex(FULL_CORPUS);
  _indexCache = index;

  // Persist to IndexedDB (async, non-blocking)
  idbSet(IDB_KEY, index).catch(() => {});
  // Tertiary: sessionStorage (may fail on large payload — silent)
  ssSet("shahid_rag_v1", index);

  return _indexCache;
}

/**
 * Preload index in background — call once on app start or route open.
 * Safe to call multiple times.
 */
export function preloadIndex() {
  getOrBuildIndex().catch(() => {});
}

/**
 * Retrieve laws for a specific evidence record.
 * Builds query from incident type + AI statement + location.
 */
export async function retrieveForEvidence(evidence) {
  if (!evidence) return [];
  const ai = evidence.aiAnalysis || {};
  const query = [
    evidence.incidentType || "",
    ai.statement_en || "",
    ai.risk_assessment || "",
    evidence.locationLabel || "",
  ].join(" ").slice(0, 500); // cap query length

  return retrieve(query, { topK: 5, incidentType: evidence.incidentType || "" });
}
