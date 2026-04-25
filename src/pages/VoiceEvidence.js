import React, { useEffect, useMemo, useState } from "react";
import { saveEvidence } from "../utils/evidenceStore";

function getGeminiKey() {
  return process.env.REACT_APP_GEMINI_API_KEY || window.localStorage.getItem("gemini_api_key") || "";
}

function VoiceEvidence() {
  const [lang, setLang] = useState("ur-PK");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  const SpeechRecognition = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition,
    []
  );

  useEffect(() => {
    if (!listening) return undefined;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [listening]);

  const startListening = () => {
    if (!SpeechRecognition) {
      setError("Speech API unsupported | آواز API دستیاب نہیں");
      return;
    }
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += `${event.results[i][0].transcript} `;
      }
      setTranscript(text.trim());
    };
    recognition.onerror = (e) => setError(`Voice error | آواز خرابی: ${e.error}`);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
    setSeconds(0);
    window.currentVoiceRecognition = recognition;
  };

  const stopListening = () => {
    window.currentVoiceRecognition?.stop();
    setListening(false);
  };

  const formatWithGemini = async () => {
    const key = getGeminiKey();
    if (!key) {
      setError("Gemini key missing | جیمنائی کی دستیاب نہیں");
      return;
    }
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
                    text: `Format this voice statement as a formal legal document. Statement: '${transcript}'. Respond ONLY in JSON: {formal_statement_en:string, formal_statement_ur:string, incident_type:string, ppc_sections:[{section,title}], case_score:number, summary:string}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      setAiResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setError(`Formatting failed | فارمیٹنگ ناکام: ${e.message}`);
    }
  };

  const sealVoice = () => {
    if (!aiResult) return;
    const now = new Date().toISOString();
    const hash = `${Date.now().toString(16)}`.padEnd(64, "b").slice(0, 64);
    saveEvidence({
      id: `VOC-${Date.now()}`,
      titleEn: "Voice Evidence Statement",
      titleUr: "آوازی ثبوت بیان",
      incidentType: "suspicious",
      mediaType: "voice",
      timestamp: now,
      sealedAt: now,
      sealed: true,
      hash,
      status: "Processing",
      riskLevel: "Medium",
      firGenerated: false,
      locationLabel: "Voice Capture",
      city: "Unknown",
      transcript,
      aiAnalysis: {
        statement_en: aiResult.formal_statement_en || transcript,
        statement_ur: aiResult.formal_statement_ur || transcript,
        ppc_sections: aiResult.ppc_sections || [],
        case_score: aiResult.case_score || 72,
        risk_assessment: aiResult.summary || "Under review",
        recommended_action: "Forward to legal desk.",
      },
      custodyTimeline: [
        { label: "Voice Captured", labelUr: "آواز محفوظ", at: now },
        { label: "AI Formatted", labelUr: "اے آئی فارمیٹ", at: now },
        { label: "Sealed", labelUr: "سیل", at: now },
      ],
    });
    alert("Voice evidence sealed | آوازی ثبوت سیل");
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#1A56DB] to-blue-800 p-6 text-white">
        <h1 className="text-2xl font-black">Voice Evidence | آوازی ثبوت</h1>
      </header>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold">
          Language | زبان
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="ml-2 rounded border p-1">
            <option value="ur-PK">Urdu (ur-PK)</option>
            <option value="en-US">English (en-US)</option>
          </select>
        </label>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={listening ? stopListening : startListening}
            type="button"
            className={`h-20 w-20 rounded-full text-white ${listening ? "animate-pulse bg-red-600" : "bg-[#1A56DB]"}`}
          >
            {listening ? "Stop" : "Mic"}
          </button>
          <button onClick={formatWithGemini} type="button" className="rounded bg-emerald-600 px-4 py-2 text-white">
            Format Legal Statement | قانونی فارمیٹ
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">{listening ? "Listening... | سن رہا ہے" : "Idle | رکا ہوا"}</p>
        <p className="text-sm text-slate-600">
          Word Count: {transcript ? transcript.split(/\s+/).filter(Boolean).length : 0} | Duration: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
        <textarea value={transcript} readOnly rows={6} className="mt-3 w-full rounded border p-2" />
        {aiResult ? (
          <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
            <p>{aiResult.formal_statement_en}</p>
            <p className="mt-2">{aiResult.formal_statement_ur}</p>
          </div>
        ) : null}
        {error ? <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
        <button onClick={sealVoice} type="button" className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white">
          Seal Voice Evidence | سیل
        </button>
      </article>
    </section>
  );
}

export default VoiceEvidence;
