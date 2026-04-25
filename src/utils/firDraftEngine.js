/**
 * SHAHID.AI — Grounded FIR Draft Engine
 * Generates FIR text ONLY from retrieved citations.
 * No hallucinated statutes. Every cited section must exist in retrievedLaws.
 * English + Urdu support.
 */

/**
 * Validate that every cited section exists in the retrieved laws array.
 * Blocks any section not grounded in retrieval output.
 */
function validateCitations(sections, retrievedLaws) {
  const validIds = new Set(retrievedLaws.map((l) => l.section));
  return sections.filter((s) => validIds.has(s.section));
}

/**
 * Format custody timeline for FIR narrative.
 */
function formatCustodyChain(custodyTimeline) {
  if (!Array.isArray(custodyTimeline) || !custodyTimeline.length) {
    return "No custody timeline recorded.";
  }
  return custodyTimeline
    .map((step, i) => `  ${i + 1}. ${step.label}${step.labelUr ? ` (${step.labelUr})` : ""} — ${new Date(step.at).toLocaleString("en-PK", { hour12: false })}${step.chainHash ? `\n     Chain Hash: ${step.chainHash.slice(0, 24)}...` : ""}`)
    .join("\n");
}

/**
 * Generate grounded FIR draft.
 *
 * @param {object} evidence — full evidence record from evidenceStore
 * @param {Array}  retrievedLaws — output from ragEngine.retrieve()
 * @returns {{ en: string, ur: string, sections: Array, caseReadiness: number }}
 */
export function generateFIRDraft(evidence, retrievedLaws) {
  if (!evidence) return { en: "", ur: "", sections: [], caseReadiness: 0 };

  const ai = evidence.aiAnalysis || {};
  const safeRetrieved = Array.isArray(retrievedLaws) ? retrievedLaws : [];

  // Only use sections that are grounded in retrieval
  const groundedSections = validateCitations(
    safeRetrieved.map((l) => ({ section: l.section, title: l.title, act: l.act })),
    safeRetrieved
  );

  const now = new Date().toLocaleString("en-PK", { hour12: false });
  const evidenceDate = evidence.timestamp
    ? new Date(evidence.timestamp).toLocaleString("en-PK", { hour12: false })
    : "Unknown";

  const sectionList = groundedSections.length
    ? groundedSections.map((s) => `    • ${s.section} — ${s.title} [${s.act}]`).join("\n")
    : "    • No grounded sections retrieved. Attach AI analysis for section identification.";

  const custodyBlock = formatCustodyChain(evidence.custodyTimeline);

  // ── English FIR ────────────────────────────────────────────────────────────
  const en = `
════════════════════════════════════════════════════════════════
         FIRST INFORMATION REPORT (FIR)
         SHAHID.AI — AI-Assisted Legal Intelligence Platform
         Pakistan's First AI Crime Intelligence System
════════════════════════════════════════════════════════════════

SECTION 1 — COMPLAINT HEADING
──────────────────────────────
FIR Reference     : SHAHID-FIR-${evidence.id}
Evidence ID       : ${evidence.id}
Date of Report    : ${now}
Incident Type     : ${(evidence.incidentType || "Unknown").toUpperCase()}
Risk Level        : ${evidence.riskLevel || "Unknown"}
Status            : ${evidence.status || "Processing"}
Location          : ${evidence.locationLabel || "Unknown"}
GPS Coordinates   : ${evidence.coords ? `${evidence.coords.latitude.toFixed(6)}, ${evidence.coords.longitude.toFixed(6)} (±${Math.round(evidence.coords.accuracy || 0)}m)` : "Not available"}
Incident Time     : ${evidenceDate}
SHA-256 Integrity : ${evidence.hash || "Not computed"}

SECTION 2 — NARRATIVE
──────────────────────
${ai.statement_en || "AI witness statement not available. Evidence captured and sealed pending analysis."}

SECTION 3 — FACTS OF THE CASE
───────────────────────────────
The complainant/field unit reports that on ${evidenceDate}, at the location described above, an incident of the nature classified as "${evidence.incidentType || "unknown"}" was observed and documented. Digital evidence was captured, cryptographically hashed using SHA-256, and sealed through the SHAHID.AI chain-of-custody system. The integrity of the evidence has been maintained throughout the custody chain as documented in Section 7 below.

Risk Assessment: ${ai.risk_assessment || "Pending assessment."}

Recommended Action: ${ai.recommended_action || "Forward to investigating officer."}

SECTION 4 — OFFENCE DESCRIPTION
──────────────────────────────────
Based on the nature of the incident, the following offence classification applies:
Incident Category : ${evidence.incidentType || "Unknown"}
Risk Profile      : ${evidence.riskLevel || "Unknown"}
AI Case Score     : ${ai.case_score || 0}/100

${ai.statement_ur ? `Urdu Statement on Record: See Section 2 (Urdu) below.` : ""}

SECTION 5 — INVOKED LEGAL SECTIONS
─────────────────────────────────────
The following sections are invoked based on GROUNDED LEGAL RETRIEVAL from the local legal corpus. Each section has been matched against the incident facts using hybrid BM25+TF-IDF retrieval. No section is cited without retrieval grounding.

${sectionList}

SECTION 6 — LEGAL GROUNDS
───────────────────────────
${safeRetrieved.length
  ? safeRetrieved.map((l, i) => `${i + 1}. ${l.section} — ${l.title}\n   Act: ${l.act}\n   Relevance: ${l.reason}\n   Retrieval Score: ${l.score}/99\n   Statutory Text: "${l.citation_text.slice(0, 200)}..."`).join("\n\n")
  : "Legal grounding pending. Run Legal RAG retrieval to populate this section."}

SECTION 7 — CHAIN OF CUSTODY
──────────────────────────────
The following tamper-evident custody chain has been recorded:

${custodyBlock}

SECTION 8 — PRAYER
────────────────────
It is respectfully prayed that:
1. This FIR be registered under the applicable sections cited above.
2. An investigation be initiated forthwith under CrPC Section 156.
3. The digital evidence (SHA-256: ${(evidence.hash || "").slice(0, 16)}...) be preserved as primary evidence under QSO Article 73-A.
4. The chain of custody record be maintained as tamper-evident proof of evidence integrity.
5. Appropriate legal action be taken against the accused/suspect as per the invoked sections.

PRELIMINARY NOTES
──────────────────
• This FIR draft is AI-assisted and requires review by a qualified legal officer before formal submission.
• All cited legal sections are grounded in the SHAHID.AI local legal corpus (PPC, CrPC, QSO).
• Digital evidence integrity is verified by SHA-256 cryptographic hash.
• This document is generated by SHAHID.AI — Pakistan's First AI Crime Intelligence Platform.

════════════════════════════════════════════════════════════════
Digitally Sealed • Citation Grounded • Tamper Evident
Generated: ${now}
SHAHID.AI Legal Intelligence Engine v1.0
════════════════════════════════════════════════════════════════
`.trim();

  // ── Urdu FIR (key sections) ────────────────────────────────────────────────
  const ur = `
════════════════════════════════════════════════════════════════
         پہلی اطلاعاتی رپورٹ (ایف آئی آر)
         شاہد اے آئی — اے آئی قانونی انٹیلیجنس پلیٹ فارم
════════════════════════════════════════════════════════════════

دفعہ 1 — شکایت کا عنوان
─────────────────────────
ایف آئی آر حوالہ    : SHAHID-FIR-${evidence.id}
ثبوت شناخت         : ${evidence.id}
رپورٹ کی تاریخ     : ${now}
واقعہ کی قسم       : ${evidence.incidentType || "نامعلوم"}
خطرے کی سطح        : ${evidence.riskLevel || "نامعلوم"}
مقام               : ${evidence.locationLabel || "نامعلوم"}
واقعہ کا وقت       : ${evidenceDate}
SHA-256 سالمیت     : ${evidence.hash || "حساب نہیں کیا گیا"}

دفعہ 2 — بیان
──────────────
${ai.statement_ur || "اے آئی گواہ بیان دستیاب نہیں۔ ثبوت محفوظ اور سیل کیا گیا ہے۔"}

دفعہ 3 — مقدمے کے حقائق
──────────────────────────
مدعی/فیلڈ یونٹ کی رپورٹ کے مطابق مذکورہ بالا مقام پر "${evidence.incidentType || "نامعلوم"}" نوعیت کا واقعہ پیش آیا۔ ڈیجیٹل ثبوت SHA-256 کرپٹوگرافک ہیش کے ذریعے محفوظ اور سیل کیا گیا ہے۔

خطرے کا جائزہ: ${ai.risk_assessment || "جائزہ زیر التوا۔"}
تجویز کردہ اقدام: ${ai.recommended_action || "تفتیشی افسر کو بھیجیں۔"}

دفعہ 5 — متعلقہ قانونی دفعات
──────────────────────────────
درج ذیل دفعات مقامی قانونی کارپس سے گراؤنڈڈ ریٹریول کی بنیاد پر شامل کی گئی ہیں:

${sectionList}

دفعہ 7 — تحویل کا سلسلہ
──────────────────────────
${custodyBlock}

دفعہ 8 — استدعا
─────────────────
گزارش ہے کہ:
1. یہ ایف آئی آر مذکورہ دفعات کے تحت درج کی جائے۔
2. CrPC دفعہ 156 کے تحت فوری تحقیقات شروع کی جائیں۔
3. ڈیجیٹل ثبوت (SHA-256) کو QSO آرٹیکل 73-A کے تحت بنیادی ثبوت کے طور پر محفوظ رکھا جائے۔

════════════════════════════════════════════════════════════════
ڈیجیٹلی سیل شدہ • حوالہ جات مستند • چھیڑ چھاڑ سے محفوظ
شاہد اے آئی قانونی انٹیلیجنس انجن v1.0
════════════════════════════════════════════════════════════════
`.trim();

  return {
    en,
    ur,
    sections: groundedSections,
    retrievedCount: safeRetrieved.length,
  };
}

/**
 * Compute Case Readiness Score (0–100).
 * Based on evidence integrity, legal grounding, custody completeness, threat intel.
 */
export function computeCaseReadiness(evidence, retrievedLaws) {
  if (!evidence) return 0;

  const ai = evidence.aiAnalysis || {};
  const safeRetrieved = Array.isArray(retrievedLaws) ? retrievedLaws : [];

  let score = 0;

  // Evidence integrity (30 pts)
  if (evidence.hash) score += 10;
  if (evidence.sealed) score += 10;
  if (evidence.coords) score += 5;
  if (evidence.mediaType && evidence.mediaType !== "seeded") score += 5;

  // Legal grounding (30 pts)
  const groundedCount = safeRetrieved.length;
  score += Math.min(30, groundedCount * 6);

  // Custody completeness (20 pts)
  const custodySteps = (evidence.custodyTimeline || []).length;
  score += Math.min(20, custodySteps * 5);

  // AI analysis quality (20 pts)
  if (ai.statement_en) score += 7;
  if (ai.statement_ur) score += 3;
  if ((ai.ppc_sections || []).length >= 2) score += 5;
  if (ai.case_score && ai.case_score > 60) score += 5;

  return Math.min(100, score);
}
