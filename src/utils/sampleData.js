import { saveEvidence } from "./evidenceStore";

const cities = [
  { city: "Karachi", ur: "کراچی", lat: 24.8607, lng: 67.0011, areas: ["Saddar", "Clifton", "Gulshan"] },
  { city: "Lahore", ur: "لاہور", lat: 31.5204, lng: 74.3587, areas: ["DHA", "Johar Town", "Model Town"] },
  { city: "Islamabad", ur: "اسلام آباد", lat: 33.6844, lng: 73.0479, areas: ["F-8", "G-10", "Blue Area"] },
  { city: "Rawalpindi", ur: "راولپنڈی", lat: 33.5651, lng: 73.0169, areas: ["Saddar", "Raja Bazaar", "Chaklala"] },
  { city: "Peshawar", ur: "پشاور", lat: 34.0151, lng: 71.5249, areas: ["University Road", "Hayatabad", "Hashtnagri"] },
  { city: "Quetta", ur: "کوئٹہ", lat: 30.1798, lng: 66.975, areas: ["Jinnah Road", "Sariab", "Brewery Road"] },
  { city: "Faisalabad", ur: "فیصل آباد", lat: 31.4504, lng: 73.135, areas: ["D Ground", "Madina Town", "Samanabad"] },
  { city: "Multan", ur: "ملتان", lat: 30.1575, lng: 71.5249, areas: ["Cantt", "Bosan Road", "Shah Rukn-e-Alam"] },
  { city: "Sialkot", ur: "سیالکوٹ", lat: 32.4945, lng: 74.5229, areas: ["Cantt", "Paris Road", "Ugoki"] },
  { city: "Gujranwala", ur: "گوجرانوالہ", lat: 32.1877, lng: 74.1945, areas: ["Satellite Town", "Peoples Colony", "Civil Lines"] },
];

const incidentPlan = [
  ...Array(15).fill("theft"),
  ...Array(12).fill("suspicious"),
  ...Array(10).fill("violent"),
  ...Array(8).fill("fraud"),
  ...Array(5).fill("weapons"),
];

const statusPool = ["Verified", "Flagged", "Processing"];
const riskByType = { theft: "Medium", suspicious: "Low", violent: "High", fraud: "Medium", weapons: "High" };

function hash(i) {
  const base = `pk${i}shahidaiforensics`;
  let out = "";
  for (let j = 0; j < 64; j += 1) out += ((base.charCodeAt(j % base.length) + j * 7) % 16).toString(16);
  return out;
}

function title(type) {
  const map = {
    theft: ["Theft Complaint Evidence", "چوری کی شکایت کا ثبوت"],
    suspicious: ["Suspicious Activity Evidence", "مشکوک سرگرمی کا ثبوت"],
    violent: ["Violent Incident Evidence", "پرتشدد واقعہ کا ثبوت"],
    fraud: ["Fraud Incident Evidence", "فراڈ واقعہ کا ثبوت"],
    weapons: ["Illegal Weapons Evidence", "غیر قانونی اسلحہ ثبوت"],
  };
  return map[type];
}

function ppc(type) {
  const d = {
    theft: [
      { section: "PPC 379", title: "Theft", description: "Dishonest removal of movable property.", penalty: "Up to 3 years imprisonment." },
      { section: "PPC 411", title: "Receiving Stolen Property", description: "Receiving property knowing it is stolen.", penalty: "Up to 3 years with fine." },
      { section: "PPC 34", title: "Common Intention", description: "Joint liability for common criminal intention.", penalty: "As per principal offence." },
    ],
    suspicious: [
      { section: "PPC 109", title: "Abetment", description: "Support or facilitation of an offence.", penalty: "As linked offence applies." },
      { section: "PPC 511", title: "Attempt", description: "Attempting a punishable offence.", penalty: "Up to half principal punishment." },
      { section: "PPC 34", title: "Common Intention", description: "Shared criminal intention.", penalty: "As per principal offence." },
    ],
    violent: [
      { section: "PPC 302", title: "Qatl-e-Amd", description: "Intentional homicide.", penalty: "Death or life imprisonment." },
      { section: "PPC 324", title: "Attempted Murder", description: "Attempt to commit intentional homicide.", penalty: "Up to 10 years imprisonment." },
      { section: "PPC 506", title: "Criminal Intimidation", description: "Threat creating fear of injury.", penalty: "Up to 7 years depending severity." },
    ],
    fraud: [
      { section: "PPC 420", title: "Cheating", description: "Fraudulent inducement for wrongful gain.", penalty: "Up to 7 years and fine." },
      { section: "PPC 468", title: "Forgery for Cheating", description: "Forgery intended to cheat.", penalty: "Up to 7 years and fine." },
      { section: "PPC 471", title: "Using Forged Document", description: "Using forged record as genuine.", penalty: "As for forgery offence." },
    ],
    weapons: [
      { section: "PPC 148", title: "Armed Rioting", description: "Rioting while armed with deadly weapon.", penalty: "Up to 3 years and fine." },
      { section: "PPC 337-H", title: "Hurt by Dangerous Means", description: "Causing hurt using dangerous means.", penalty: "Arsh/Daman and imprisonment." },
      { section: "PPC 13-D", title: "Arms Violation", description: "Illegal possession/use of arms.", penalty: "As per applicable arms law." },
    ],
  };
  return d[type];
}

export function getSampleEvidenceData() {
  const start = new Date("2026-01-03T08:10:00+05:00").getTime();
  return incidentPlan.map((type, i) => {
    const c = cities[i % cities.length];
    const area = c.areas[i % c.areas.length];
    const [titleEn, titleUr] = title(type);
    const timestamp = new Date(start + i * 2.2 * 24 * 60 * 60 * 1000).toISOString();
    const sealedAt = new Date(new Date(timestamp).getTime() + 8 * 60 * 1000).toISOString();
    const score = 60 + (i % 36);
    const riskLevel = riskByType[type];
    const status = statusPool[(i + (riskLevel === "High" ? 1 : 0)) % statusPool.length];
    return {
      id: `EVD-${(2000 + i).toString()}`,
      titleEn,
      titleUr,
      incidentType: type,
      status,
      riskLevel,
      locationLabel: `${c.city} (${c.ur}) - ${area}`,
      timestamp,
      hash: hash(i),
      coords: { latitude: c.lat + ((i % 3) - 1) * 0.008, longitude: c.lng + ((i % 4) - 2) * 0.008, accuracy: 20 + (i % 45) },
      sealed: true,
      sealedAt,
      firGenerated: status !== "Processing",
      mediaType: "seeded",
      city: c.city,
      custodyTimeline: [
        { label: "Captured", labelUr: "ثبوت ریکارڈ کیا گیا", at: timestamp },
        { label: "Hashed (SHA-256)", labelUr: "ہیش تیار ہوا", at: timestamp },
        { label: "Sealed", labelUr: "ثبوت سیل کیا گیا", at: sealedAt },
      ],
      aiAnalysis: {
        statement_en: `Evidence from ${area}, ${c.city} indicates a ${type} related event. Metadata and coordinates support legal documentation for further inquiry. Digital integrity markers are intact for court admissibility.`,
        statement_ur: `${c.city} کے علاقے ${area} سے حاصل شدہ ثبوت ${type} نوعیت کے واقعہ کی نشاندہی کرتا ہے۔ مقام اور میٹا ڈیٹا قانونی دستاویزات کے لیے موزوں ہیں۔ ڈیجیٹل سالمیت محفوظ ہے۔`,
        ppc_sections: ppc(type),
        case_score: score,
        risk_assessment: `${riskLevel} risk profile based on event class, locality pattern, and custody integrity.`,
        recommended_action: "Register FIR, preserve chain of custody, and dispatch investigation unit.",
      },
    };
  });
}

export function seedSampleData() {
  getSampleEvidenceData().forEach((entry) => saveEvidence(entry));
}
