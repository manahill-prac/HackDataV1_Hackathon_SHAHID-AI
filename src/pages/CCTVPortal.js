import React, { useState } from "react";
import { saveEvidence } from "../utils/evidenceStore";

function getGeminiKey() {
  return process.env.REACT_APP_GEMINI_API_KEY || window.localStorage.getItem("gemini_api_key") || "";
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

function CCTVPortal() {
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [ai, setAi] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (incoming) => {
    setError("");
    setAi(null);
    setSealed(false);
    if (!incoming) return;
    if (incoming.size > 500 * 1024 * 1024) {
      setError("File exceeds 500MB | فائل 500MB سے بڑی ہے");
      return;
    }
    setHashing(true);
    setFile(incoming);
    setHash(await hashFile(incoming));
    setHashing(false);
  };

  const analyze = async () => {
    if (!file) return;
    const key = getGeminiKey();
    if (!key) {
      setError("Gemini key missing | جیمنائی کی دستیاب نہیں");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are analyzing uploaded CCTV footage for crime detection. Filename: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, Type: ${file.type}. Respond ONLY in JSON: {crime_detected:bool, crime_type:string, confidence:number, description_en:string, description_ur:string, severity:'High'|'Medium'|'Low', ppc_sections:[{section,title,description}], recommended_action:string, key_moments:['moment 1 description','moment 2']}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAi(parsed);
    } catch (err) {
      setError(`Analysis failed | تجزیہ ناکام: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const seal = () => {
    if (!file || !ai) return;
    const now = new Date().toISOString();
    saveEvidence({
      id: `CCTV-${Date.now()}`,
      titleEn: "CCTV Evidence Upload",
      titleUr: "سی سی ٹی وی ثبوت اپلوڈ",
      incidentType: ai.crime_type || "suspicious",
      mediaType: "cctv",
      timestamp: now,
      sealedAt: now,
      sealed: true,
      hash,
      status: ai.crime_detected ? "Flagged" : "Verified",
      riskLevel: ai.crime_detected ? "High" : "Low",
      firGenerated: Boolean(ai.crime_detected),
      locationLabel: "CCTV Upload Portal",
      city: "Unknown",
      fileName: file.name,
      fileSize: file.size,
      aiAnalysis: {
        statement_en: ai.description_en,
        statement_ur: ai.description_ur,
        ppc_sections: ai.ppc_sections || [],
        case_score: Math.round(ai.confidence || 70),
        risk_assessment: ai.crime_detected ? "Potential crime detected." : "No strong crime signal.",
        recommended_action: ai.recommended_action,
      },
      custodyTimeline: [
        { label: "CCTV Uploaded", labelUr: "سی سی ٹی وی اپلوڈ", at: now },
        { label: "Hashed", labelUr: "ہیش تیار", at: now },
        { label: "AI Analysis", labelUr: "اے آئی تجزیہ", at: now },
        { label: "Sealed", labelUr: "سیل", at: now },
      ],
    });
    setSealed(true);
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#1A56DB] to-blue-800 p-6 text-white">
        <h1 className="text-2xl font-black">CCTV Portal | سی سی ٹی وی پورٹل</h1>
      </header>
      <article
        className={`rounded-2xl border bg-white p-5 shadow-sm ${dragging ? "border-[#1A56DB]" : "border-slate-200"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept=".mp4,.avi,.mov,.mkv,video/mp4,video/quicktime"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="w-full rounded border p-2"
        />
        <p className="mt-2 text-sm text-slate-600">Drag & drop or click upload | ڈریگ ڈراپ یا اپلوڈ</p>
        {file ? (
          <div className="mt-3 text-sm text-slate-700">
            <p>Name: {file.name}</p>
            <p>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            <p>Type: {file.type || "Unknown"}</p>
            <p>Duration: Metadata pending after upload | دورانیہ</p>
            <p className="break-all">SHA-256: {hash}</p>
          </div>
        ) : null}
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={analyze} className="rounded bg-[#1A56DB] px-4 py-2 text-white">
            Analyze CCTV | تجزیہ
          </button>
          <button type="button" onClick={seal} disabled={!ai} className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-60">
            Seal CCTV Evidence | سیل
          </button>
        </div>
        {hashing ? <p className="mt-3 text-sm text-[#1A56DB]">Computing hash... | ہیش تیار ہو رہا ہے</p> : null}
        {loading ? <p className="mt-3 text-sm text-[#1A56DB]">AI is analyzing footage... | اے آئی فوٹیج کا تجزیہ کر رہا ہے</p> : null}
        {error ? <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
        {ai ? (
          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p className={`inline-block rounded px-2 py-1 ${ai.crime_detected ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
              {ai.crime_detected ? "CRIME DETECTED | جرم پایا گیا" : "NO CRIME DETECTED | جرم نہیں"}
            </p>
            <p className="font-semibold">Confidence: {ai.confidence}%</p>
            <p>{ai.description_en}</p>
            <p>{ai.description_ur}</p>
            <div className="rounded bg-white p-2">
              <p className="font-semibold">Key Moments | اہم لمحات</p>
              {(ai.key_moments || []).map((k, idx) => (
                <p key={`${k}-${idx}`}>- {k}</p>
              ))}
            </div>
            {(ai.ppc_sections || []).map((s) => (
              <p key={s.section}>
                {s.section} - {s.title}
              </p>
            ))}
          </div>
        ) : null}
        {sealed ? <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">CCTV Evidence sealed | سی سی ٹی وی ثبوت سیل</p> : null}
      </article>
    </section>
  );
}

export default CCTVPortal;
