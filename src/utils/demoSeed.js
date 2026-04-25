/**
 * SHAHID.AI — Hackathon Demo Seed
 * Curated 14-record dataset engineered to produce:
 *   - TCI in Critical band (70+)
 *   - 3 fusion signal cities (Karachi, Lahore, Islamabad)
 *   - 2 statistical anomaly spikes (z > 1.5)
 *   - High-risk density > 40%
 *   - High case readiness (sealed + FIR + AI analysis)
 *   - Face descriptor stubs for suspect correlation demo
 *
 * Uses EXACT same evidence schema as sampleData.js / evidenceStore.js.
 * No disconnected mockups. All signals computed by real crimeML + threatFusion.
 */

const DEMO_STORAGE_KEY = "shahid_ai_evidence";
const DEMO_FLAG_KEY = "shahid_demo_seeded";

// Anomaly spike: cluster 5 incidents on same date to push z > 1.5
const SPIKE_DATE_A = "2026-04-10T21:15:00.000Z"; // night spike — Karachi
const SPIKE_DATE_B = "2026-04-10T22:40:00.000Z";
const SPIKE_DATE_C = "2026-04-10T23:05:00.000Z";
const SPIKE_DATE_D = "2026-04-11T00:20:00.000Z";
const SPIKE_DATE_E = "2026-04-11T01:10:00.000Z";

// Spread dates for baseline (keeps mean low so spikes stand out)
const BASE_DATE_A = "2026-03-02T09:00:00.000Z";
const BASE_DATE_B = "2026-03-15T14:30:00.000Z";
const BASE_DATE_C = "2026-03-28T11:00:00.000Z";
const BASE_DATE_D = "2026-04-01T16:45:00.000Z";
const BASE_DATE_E = "2026-04-05T08:20:00.000Z";
const BASE_DATE_F = "2026-04-07T19:00:00.000Z";
const BASE_DATE_G = "2026-04-08T10:30:00.000Z";
const BASE_DATE_H = "2026-04-09T13:15:00.000Z";
const BASE_DATE_I = "2026-04-20T09:00:00.000Z";

// Stub face descriptor — 128-dim float array (face-api shape)
// Same suspect descriptor reused across 3 records → triggers repeat suspect correlation
function stubDescriptor(seed) {
  return Array.from({ length: 128 }, (_, i) => parseFloat(((Math.sin(seed + i) * 0.5) + 0.5).toFixed(4)));
}
const SUSPECT_A_DESCRIPTOR = stubDescriptor(1.23);
const SUSPECT_B_DESCRIPTOR = stubDescriptor(4.56);

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padEnd(64, "a").slice(0, 64);
}

function custody(timestamp, sealedAt) {
  return [
    { label: "Captured", labelUr: "ثبوت ریکارڈ کیا گیا", at: timestamp },
    { label: "Hashed (SHA-256)", labelUr: "ہیش تیار ہوا", at: timestamp },
    { label: "AI Analysis Completed", labelUr: "اے آئی تجزیہ مکمل", at: sealedAt },
    { label: "Sealed", labelUr: "ثبوت سیل کیا گیا", at: sealedAt },
  ];
}

function aiAnalysis(type, city, area, score) {
  const ppcMap = {
    violent: [
      { section: "PPC 302", title: "Qatl-i-Amd", description: "Intentional homicide.", penalty: "Death or life imprisonment." },
      { section: "PPC 324", title: "Attempted Murder", description: "Attempt to commit intentional homicide.", penalty: "Up to 10 years." },
      { section: "PPC 34", title: "Common Intention", description: "Joint criminal liability.", penalty: "As per principal offence." },
    ],
    robbery: [
      { section: "PPC 390", title: "Robbery", description: "Theft combined with force or threat.", penalty: "Up to 10 years rigorous imprisonment." },
      { section: "PPC 392", title: "Punishment for Robbery", description: "Highway robbery at night.", penalty: "Up to 14 years." },
      { section: "PPC 34", title: "Common Intention", description: "Joint criminal liability.", penalty: "As per principal offence." },
    ],
    theft: [
      { section: "PPC 379", title: "Theft", description: "Dishonest removal of movable property.", penalty: "Up to 3 years imprisonment." },
      { section: "PPC 380", title: "Theft in Dwelling", description: "Theft inside a residence.", penalty: "Up to 7 years." },
      { section: "PPC 411", title: "Receiving Stolen Property", description: "Receiving stolen goods.", penalty: "Up to 3 years with fine." },
    ],
    weapons: [
      { section: "PPC 148", title: "Armed Rioting", description: "Rioting while armed with deadly weapon.", penalty: "Up to 3 years and fine." },
      { section: "PPC 337-A", title: "Itlaf-i-Udw", description: "Causing hurt resulting in loss of limb.", penalty: "Arsh/Daman and imprisonment." },
      { section: "PPC 34", title: "Common Intention", description: "Joint criminal liability.", penalty: "As per principal offence." },
    ],
    fraud: [
      { section: "PPC 420", title: "Cheating", description: "Fraudulent inducement for wrongful gain.", penalty: "Up to 7 years and fine." },
      { section: "PPC 468", title: "Forgery for Cheating", description: "Forgery intended to cheat.", penalty: "Up to 7 years and fine." },
      { section: "PPC 471", title: "Using Forged Document", description: "Using forged record as genuine.", penalty: "As for forgery offence." },
    ],
  };
  const sections = ppcMap[type] || ppcMap.theft;
  return {
    statement_en: `Field evidence from ${area}, ${city} documents a ${type} incident. Digital integrity markers are intact. SHA-256 hash verified. Coordinates and timestamp confirm field capture. Evidence is court-admissible under QSO Article 73-A.`,
    statement_ur: `${city} کے علاقے ${area} سے حاصل شدہ ثبوت ${type} نوعیت کے واقعہ کی تصدیق کرتا ہے۔ ڈیجیٹل سالمیت محفوظ ہے۔ SHA-256 ہیش تصدیق شدہ۔`,
    ppc_sections: sections,
    case_score: score,
    risk_assessment: `High-priority incident in ${city}. Pattern analysis indicates repeat activity in this zone. Immediate investigative response recommended.`,
    recommended_action: "Register FIR under cited sections. Preserve digital evidence chain. Dispatch investigation unit to coordinates.",
  };
}

export function getDemoEvidenceData() {
  const sealOffset = 8 * 60 * 1000;

  return [
    // ── SPIKE CLUSTER: 5 violent/robbery incidents on 2026-04-10 night ──────
    // This pushes z-score > 1.5 for that date → anomaly detected
    {
      id: "DEMO-001",
      titleEn: "Armed Robbery — Saddar Karachi",
      titleUr: "مسلح ڈکیتی — صدر کراچی",
      incidentType: "robbery",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Karachi (کراچی) - Saddar",
      city: "Karachi",
      timestamp: SPIKE_DATE_A,
      sealedAt: new Date(new Date(SPIKE_DATE_A).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-001"),
      coords: { latitude: 24.8607, longitude: 67.0011, accuracy: 18 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      faceDescriptors: [SUSPECT_A_DESCRIPTOR],
      faceMeta: [{ confidence: 0.91, boundingBox: { x: 120, y: 80, width: 90, height: 110 } }],
      custodyTimeline: custody(SPIKE_DATE_A, new Date(new Date(SPIKE_DATE_A).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("robbery", "Karachi", "Saddar", 88),
    },
    {
      id: "DEMO-002",
      titleEn: "Violent Assault — Clifton Karachi",
      titleUr: "پرتشدد حملہ — کلفٹن کراچی",
      incidentType: "violent",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Karachi (کراچی) - Clifton",
      city: "Karachi",
      timestamp: SPIKE_DATE_B,
      sealedAt: new Date(new Date(SPIKE_DATE_B).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-002"),
      coords: { latitude: 24.8120, longitude: 67.0300, accuracy: 22 },
      sealed: true,
      firGenerated: true,
      mediaType: "video",
      faceDescriptors: [SUSPECT_A_DESCRIPTOR],
      faceMeta: [{ confidence: 0.87, boundingBox: { x: 200, y: 60, width: 85, height: 100 } }],
      custodyTimeline: custody(SPIKE_DATE_B, new Date(new Date(SPIKE_DATE_B).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("violent", "Karachi", "Clifton", 91),
    },
    {
      id: "DEMO-003",
      titleEn: "Weapons Seizure — Gulshan Karachi",
      titleUr: "اسلحہ ضبطی — گلشن کراچی",
      incidentType: "weapons",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Karachi (کراچی) - Gulshan",
      city: "Karachi",
      timestamp: SPIKE_DATE_C,
      sealedAt: new Date(new Date(SPIKE_DATE_C).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-003"),
      coords: { latitude: 24.9200, longitude: 67.0900, accuracy: 30 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      faceDescriptors: [SUSPECT_B_DESCRIPTOR],
      faceMeta: [{ confidence: 0.83, boundingBox: { x: 150, y: 90, width: 80, height: 95 } }],
      custodyTimeline: custody(SPIKE_DATE_C, new Date(new Date(SPIKE_DATE_C).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("weapons", "Karachi", "Gulshan", 85),
    },
    {
      id: "DEMO-004",
      titleEn: "Armed Robbery — DHA Lahore",
      titleUr: "مسلح ڈکیتی — ڈی ایچ اے لاہور",
      incidentType: "robbery",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Lahore (لاہور) - DHA",
      city: "Lahore",
      timestamp: SPIKE_DATE_D,
      sealedAt: new Date(new Date(SPIKE_DATE_D).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-004"),
      coords: { latitude: 31.4697, longitude: 74.4097, accuracy: 25 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      faceDescriptors: [SUSPECT_A_DESCRIPTOR],
      faceMeta: [{ confidence: 0.89, boundingBox: { x: 100, y: 70, width: 88, height: 105 } }],
      custodyTimeline: custody(SPIKE_DATE_D, new Date(new Date(SPIKE_DATE_D).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("robbery", "Lahore", "DHA", 90),
    },
    {
      id: "DEMO-005",
      titleEn: "Violent Incident — Johar Town Lahore",
      titleUr: "پرتشدد واقعہ — جوہر ٹاؤن لاہور",
      incidentType: "violent",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Lahore (لاہور) - Johar Town",
      city: "Lahore",
      timestamp: SPIKE_DATE_E,
      sealedAt: new Date(new Date(SPIKE_DATE_E).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-005"),
      coords: { latitude: 31.4700, longitude: 74.2800, accuracy: 20 },
      sealed: true,
      firGenerated: true,
      mediaType: "video",
      faceDescriptors: [SUSPECT_B_DESCRIPTOR],
      faceMeta: [{ confidence: 0.85, boundingBox: { x: 180, y: 55, width: 92, height: 108 } }],
      custodyTimeline: custody(SPIKE_DATE_E, new Date(new Date(SPIKE_DATE_E).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("violent", "Lahore", "Johar Town", 87),
    },

    // ── BASELINE RECORDS: spread across weeks (keeps mean low) ───────────────
    {
      id: "DEMO-006",
      titleEn: "Theft Complaint — Model Town Lahore",
      titleUr: "چوری کی شکایت — ماڈل ٹاؤن لاہور",
      incidentType: "theft",
      status: "Verified",
      riskLevel: "Medium",
      locationLabel: "Lahore (لاہور) - Model Town",
      city: "Lahore",
      timestamp: BASE_DATE_A,
      sealedAt: new Date(new Date(BASE_DATE_A).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-006"),
      coords: { latitude: 31.4800, longitude: 74.3200, accuracy: 35 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      custodyTimeline: custody(BASE_DATE_A, new Date(new Date(BASE_DATE_A).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("theft", "Lahore", "Model Town", 72),
    },
    {
      id: "DEMO-007",
      titleEn: "Fraud Case — Blue Area Islamabad",
      titleUr: "فراڈ کیس — بلیو ایریا اسلام آباد",
      incidentType: "fraud",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Islamabad (اسلام آباد) - Blue Area",
      city: "Islamabad",
      timestamp: BASE_DATE_B,
      sealedAt: new Date(new Date(BASE_DATE_B).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-007"),
      coords: { latitude: 33.7215, longitude: 73.0433, accuracy: 28 },
      sealed: true,
      firGenerated: true,
      mediaType: "cctv",
      faceDescriptors: [SUSPECT_A_DESCRIPTOR],
      faceMeta: [{ confidence: 0.78, boundingBox: { x: 90, y: 65, width: 82, height: 98 } }],
      custodyTimeline: custody(BASE_DATE_B, new Date(new Date(BASE_DATE_B).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("fraud", "Islamabad", "Blue Area", 83),
    },
    {
      id: "DEMO-008",
      titleEn: "Robbery — F-8 Islamabad",
      titleUr: "ڈکیتی — ایف ایٹ اسلام آباد",
      incidentType: "robbery",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Islamabad (اسلام آباد) - F-8",
      city: "Islamabad",
      timestamp: BASE_DATE_C,
      sealedAt: new Date(new Date(BASE_DATE_C).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-008"),
      coords: { latitude: 33.7100, longitude: 73.0600, accuracy: 22 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      faceDescriptors: [SUSPECT_B_DESCRIPTOR],
      faceMeta: [{ confidence: 0.82, boundingBox: { x: 130, y: 75, width: 86, height: 102 } }],
      custodyTimeline: custody(BASE_DATE_C, new Date(new Date(BASE_DATE_C).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("robbery", "Islamabad", "F-8", 86),
    },
    {
      id: "DEMO-009",
      titleEn: "Theft — G-10 Islamabad",
      titleUr: "چوری — جی ٹین اسلام آباد",
      incidentType: "theft",
      status: "Verified",
      riskLevel: "Medium",
      locationLabel: "Islamabad (اسلام آباد) - G-10",
      city: "Islamabad",
      timestamp: BASE_DATE_D,
      sealedAt: new Date(new Date(BASE_DATE_D).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-009"),
      coords: { latitude: 33.6900, longitude: 73.0200, accuracy: 40 },
      sealed: true,
      firGenerated: false,
      mediaType: "photo",
      custodyTimeline: custody(BASE_DATE_D, new Date(new Date(BASE_DATE_D).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("theft", "Islamabad", "G-10", 68),
    },
    {
      id: "DEMO-010",
      titleEn: "Suspicious Activity — Saddar Rawalpindi",
      titleUr: "مشکوک سرگرمی — صدر راولپنڈی",
      incidentType: "suspicious",
      status: "Processing",
      riskLevel: "Low",
      locationLabel: "Rawalpindi (راولپنڈی) - Saddar",
      city: "Rawalpindi",
      timestamp: BASE_DATE_E,
      sealedAt: new Date(new Date(BASE_DATE_E).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-010"),
      coords: { latitude: 33.5651, longitude: 73.0169, accuracy: 45 },
      sealed: false,
      firGenerated: false,
      mediaType: "photo",
      custodyTimeline: [
        { label: "Captured", labelUr: "ثبوت ریکارڈ کیا گیا", at: BASE_DATE_E },
      ],
      aiAnalysis: {
        statement_en: "Suspicious activity observed in Saddar, Rawalpindi. Pending full analysis.",
        statement_ur: "راولپنڈی کے صدر میں مشکوک سرگرمی مشاہدہ کی گئی۔ تجزیہ زیر التوا۔",
        ppc_sections: [
          { section: "PPC 109", title: "Abetment", description: "Support or facilitation of an offence.", penalty: "As linked offence applies." },
        ],
        case_score: 45,
        risk_assessment: "Low risk. Monitoring recommended.",
        recommended_action: "Continue surveillance. Escalate if pattern repeats.",
      },
    },
    {
      id: "DEMO-011",
      titleEn: "Violent Assault — Hayatabad Peshawar",
      titleUr: "پرتشدد حملہ — حیات آباد پشاور",
      incidentType: "violent",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Peshawar (پشاور) - Hayatabad",
      city: "Peshawar",
      timestamp: BASE_DATE_F,
      sealedAt: new Date(new Date(BASE_DATE_F).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-011"),
      coords: { latitude: 34.0151, longitude: 71.4600, accuracy: 30 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      custodyTimeline: custody(BASE_DATE_F, new Date(new Date(BASE_DATE_F).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("violent", "Peshawar", "Hayatabad", 80),
    },
    {
      id: "DEMO-012",
      titleEn: "Robbery — Jinnah Road Quetta",
      titleUr: "ڈکیتی — جناح روڈ کوئٹہ",
      incidentType: "robbery",
      status: "Verified",
      riskLevel: "Medium",
      locationLabel: "Quetta (کوئٹہ) - Jinnah Road",
      city: "Quetta",
      timestamp: BASE_DATE_G,
      sealedAt: new Date(new Date(BASE_DATE_G).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-012"),
      coords: { latitude: 30.1798, longitude: 66.9750, accuracy: 38 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      custodyTimeline: custody(BASE_DATE_G, new Date(new Date(BASE_DATE_G).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("robbery", "Quetta", "Jinnah Road", 74),
    },
    {
      id: "DEMO-013",
      titleEn: "Fraud — Cantt Multan",
      titleUr: "فراڈ — کینٹ ملتان",
      incidentType: "fraud",
      status: "Verified",
      riskLevel: "Medium",
      locationLabel: "Multan (ملتان) - Cantt",
      city: "Multan",
      timestamp: BASE_DATE_H,
      sealedAt: new Date(new Date(BASE_DATE_H).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-013"),
      coords: { latitude: 30.1575, longitude: 71.5249, accuracy: 42 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      custodyTimeline: custody(BASE_DATE_H, new Date(new Date(BASE_DATE_H).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("fraud", "Multan", "Cantt", 70),
    },
    {
      id: "DEMO-014",
      titleEn: "Weapons Cache — Satellite Town Gujranwala",
      titleUr: "اسلحہ ذخیرہ — سیٹلائٹ ٹاؤن گوجرانوالہ",
      incidentType: "weapons",
      status: "Flagged",
      riskLevel: "High",
      locationLabel: "Gujranwala (گوجرانوالہ) - Satellite Town",
      city: "Gujranwala",
      timestamp: BASE_DATE_I,
      sealedAt: new Date(new Date(BASE_DATE_I).getTime() + sealOffset).toISOString(),
      hash: hash("DEMO-014"),
      coords: { latitude: 32.1877, longitude: 74.1945, accuracy: 28 },
      sealed: true,
      firGenerated: true,
      mediaType: "photo",
      faceDescriptors: [SUSPECT_A_DESCRIPTOR],
      faceMeta: [{ confidence: 0.76, boundingBox: { x: 110, y: 80, width: 84, height: 100 } }],
      custodyTimeline: custody(BASE_DATE_I, new Date(new Date(BASE_DATE_I).getTime() + sealOffset).toISOString()),
      aiAnalysis: aiAnalysis("weapons", "Gujranwala", "Satellite Town", 82),
    },
  ];
}

/**
 * Load demo dataset into localStorage.
 * Replaces current evidence list with demo records.
 * Saves original evidence so it can be restored.
 */
export function activateDemoMode() {
  try {
    const current = localStorage.getItem("shahid_ai_evidence");
    if (current) localStorage.setItem("shahid_ai_evidence_backup", current);
    localStorage.setItem("shahid_ai_evidence", JSON.stringify(getDemoEvidenceData()));
    localStorage.setItem(DEMO_FLAG_KEY, "true");
    return true;
  } catch (e) {
    console.error("[SHAHID.AI Demo] Failed to activate demo mode:", e.message);
    return false;
  }
}

/**
 * Restore original evidence data and exit demo mode.
 */
export function deactivateDemoMode() {
  try {
    const backup = localStorage.getItem("shahid_ai_evidence_backup");
    if (backup) {
      localStorage.setItem("shahid_ai_evidence", backup);
      localStorage.removeItem("shahid_ai_evidence_backup");
    }
    localStorage.removeItem(DEMO_FLAG_KEY);
    return true;
  } catch (e) {
    console.error("[SHAHID.AI Demo] Failed to deactivate demo mode:", e.message);
    return false;
  }
}

export function isDemoActive() {
  try { return localStorage.getItem(DEMO_FLAG_KEY) === "true"; }
  catch { return false; }
}
