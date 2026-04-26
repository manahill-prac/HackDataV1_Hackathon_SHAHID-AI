import React, { useEffect, useMemo, useRef, useState } from "react";
import { saveEvidence } from "../utils/evidenceStore";

function deriveRiskLevel(type) {
  if (type === "violent" || type === "weapons") return "High";
  if (type === "fraud" || type === "theft") return "Medium";
  return "Low";
}

function getGeminiKey() {
  return process.env.REACT_APP_GEMINI_API_KEY || window.localStorage.getItem("gemini_api_key") || "";
}

async function hashBufferToHex(buffer) {
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compress a full-res dataUrl to a small thumbnail for storage.
 * Target: 320×240, JPEG quality 0.55 → ~15–25 KB base64.
 * The full-res image is kept in React state for session preview only.
 * Returns the thumbnail dataUrl, or empty string on failure.
 */
async function compressThumbnail(dataUrl, maxW = 320, maxH = 240) {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return "";
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.55));
      } catch { resolve(""); }
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

// ─── Offense keyword fallback map ────────────────────────────────────────────
// Guarantees offense_keywords are never empty even if Gemini fails.
// Keyed by incidentType values used in the select dropdown.
const OFFENSE_KEYWORD_MAP = {
  theft:      { crime_category: "theft",    offense_keywords: ["theft", "steal", "stolen", "property", "dishonest", "possession", "took", "snatching"] },
  robbery:    { crime_category: "robbery",  offense_keywords: ["robbery", "rob", "force", "violence", "threat", "hurt", "weapon", "armed", "snatched"] },
  violent:    { crime_category: "assault",  offense_keywords: ["assault", "attack", "hurt", "injury", "violent", "beat", "wound", "force", "weapon"] },
  fraud:      { crime_category: "fraud",    offense_keywords: ["fraud", "cheat", "deceive", "false", "scam", "dishonest", "money", "fake", "forgery"] },
  weapons:    { crime_category: "weapons",  offense_keywords: ["weapon", "armed", "gun", "knife", "deadly", "rioting", "arms", "illegal", "possession"] },
  suspicious: { crime_category: "suspicious", offense_keywords: ["suspicious", "attempt", "abetment", "conspiracy", "trespass", "unlawful", "intent"] },
  burglary:   { crime_category: "burglary", offense_keywords: ["burglary", "break", "enter", "dwelling", "house", "theft", "trespass", "property"] },
  harassment: { crime_category: "harassment", offense_keywords: ["harassment", "threat", "intimidate", "woman", "modesty", "stalk", "coerce", "force"] },
  cybercrime: { crime_category: "cybercrime", offense_keywords: ["cyber", "hack", "unauthorized", "online", "digital", "computer", "stalk", "defamation"] },
};

function deriveOffenseKeywordsFallback(incidentType) {
  return OFFENSE_KEYWORD_MAP[incidentType] || OFFENSE_KEYWORD_MAP.suspicious;
}

// Build a minimal valid aiAnalysis when Gemini JSON parse fails entirely.
function buildFallbackAiResult(captured, extraction) {
  const type = captured.incidentType || "suspicious";
  const loc = captured.locationLabel || "Unknown location";
  const keywords = (extraction.offense_keywords || []).join(", ") || type;
  return {
    statement_en: `Evidence captured at ${loc} indicates a ${type} incident. The digital record has been cryptographically sealed and the chain of custody is intact. Relevant offense indicators include: ${keywords}. This evidence is preserved for legal review.`,
    statement_ur: `${loc} میں ${type} نوعیت کا واقعہ ریکارڈ کیا گیا۔ ڈیجیٹل ثبوت SHA-256 ہیش کے ذریعے محفوظ کیا گیا ہے۔ قانونی جائزے کے لیے ثبوت محفوظ ہے۔`,
    ppc_sections: [],
    case_score: 55,
    risk_assessment: `${type} incident recorded at ${loc}. Evidence integrity maintained through cryptographic sealing.`,
    recommended_action: "Forward to investigating officer. Preserve chain of custody. Run Legal RAG retrieval for applicable sections.",
  };
}

function CaptureEvidence() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [incidentType, setIncidentType] = useState("suspicious");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera not supported | کیمرہ سپورٹ دستیاب نہیں");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setCameraLive(true);
      } catch (error) {
        setCameraError(`Camera access failed | کیمرہ اجازت ناکام: ${error.message}`);
      }
    };
    startCamera();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const collectLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ coords: null, locationLabel: "GPS unavailable | جی پی ایس دستیاب نہیں" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            coords: { latitude, longitude, accuracy },
            locationLabel: `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`,
          });
        },
        () => resolve({ coords: null, locationLabel: "Location permission denied | مقام اجازت مسترد" }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setAiError("");
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const buffer = await (await fetch(dataUrl)).arrayBuffer();
    const hash = await hashBufferToHex(buffer);
    const meta = await collectLocation();
    setCaptured({
      id: crypto.randomUUID(),
      mediaType: "photo",
      photoDataUrl: dataUrl,
      videoUrl: "",
      hash,
      timestamp: new Date().toISOString(),
      ...meta,
      incidentType,
      titleEn: "Field Photo Evidence",
      titleUr: "فیلڈ تصویری ثبوت",
    });
    setSealed(false);
  };

  const toggleRecord = async () => {
    setAiError("");
    if (!streamRef.current) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const hash = await hashBufferToHex(await blob.arrayBuffer());
        const videoUrl = URL.createObjectURL(blob);
        const meta = await collectLocation();
        setCaptured({
          id: crypto.randomUUID(),
          mediaType: "video",
          photoDataUrl: "",
          videoBlob: blob,
          videoUrl,
          hash,
          timestamp: new Date().toISOString(),
          ...meta,
          incidentType,
          titleEn: "Field Video Evidence",
          titleUr: "فیلڈ ویڈیو ثبوت",
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      setAiError(`Recording failed | ریکارڈنگ ناکام: ${error.message}`);
    }
  };

  const sealEvidence = async () => {
    if (!captured) return;
    const key = getGeminiKey();
    if (!key) {
      setAiError("Gemini API key missing. Set REACT_APP_GEMINI_API_KEY or localStorage 'gemini_api_key'.");
      return;
    }
    setSealing(true);
    setAiLoading(true);
    setAiError("");
    const sealedAt = new Date().toISOString();
    const riskLevel = deriveRiskLevel(captured.incidentType);
    const status = riskLevel === "High" ? "Flagged" : "Verified";

    try {
      // ── Pass 1 — Pure Visual Scene Extraction ────────────────────────────
      // Image is placed FIRST in parts array so Gemini grounds in vision before
      // reading any text instruction. No incident type hint — model observes freely.
      const pass1Parts = [];

      if (captured.photoDataUrl && captured.photoDataUrl.startsWith("data:image/")) {
        const mimeMatch = captured.photoDataUrl.match(/^data:(image\/[a-z]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64Data = captured.photoDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
        // Image FIRST — forces vision-grounded processing
        pass1Parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      pass1Parts.push({ text: `Describe only what you can directly observe in this image. Do not mention legal terms, custody, GPS, or hashes. Do not assume — only describe visible content.

Return ONLY this JSON, no markdown:
{"subjects_observed":"describe any people or figures visible, or 'none visible'","actions_observed":"describe any visible actions or movements, or 'none observed'","objects_visible":"list all visible objects, items, weapons, vehicles","weapon_indicators":"describe any visible weapons or weapon-like objects, or 'none visible'","injury_indicators":"describe any visible injuries, blood, distress, or damage, or 'none visible'","scene_context":"describe the environment, setting, lighting, location type","crime_cues":"describe any visual cues suggesting criminal activity","confidence":"high|medium|low","offense_keywords":["keyword1","keyword2","keyword3","keyword4","keyword5"]}

If no image is provided, use incident type context: ${captured.incidentType} at ${captured.locationLabel}.` });

      const pass1Response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: pass1Parts }] }),
        }
      );
      const pass1Data = await pass1Response.json();
      const pass1Raw = pass1Data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      let sceneObs = {};
      try {
        sceneObs = JSON.parse(pass1Raw.replace(/```json[\s\S]*?```|```/g, "").trim());
      } catch {
        sceneObs = deriveOffenseKeywordsFallback(captured.incidentType);
      }
      if (!Array.isArray(sceneObs.offense_keywords) || !sceneObs.offense_keywords.length) {
        sceneObs.offense_keywords = deriveOffenseKeywordsFallback(captured.incidentType).offense_keywords;
      }

      // Build extraction shape expected by RAG + FIR engine (backward compat)
      const extraction = {
        incident_type: captured.incidentType,
        crime_category: captured.incidentType,
        weapon_present: sceneObs.weapon_indicators && sceneObs.weapon_indicators !== "none visible",
        victim_harm: sceneObs.injury_indicators && sceneObs.injury_indicators !== "none visible" ? "minor" : "none",
        evidence_summary: sceneObs.scene_context || `${captured.incidentType} incident`,
        offense_keywords: sceneObs.offense_keywords,
        confidence: sceneObs.confidence || "medium",
        scene_summary: sceneObs.scene_context,
        visible_actions: sceneObs.actions_observed,
        objects_observed: sceneObs.objects_visible,
        injury_damage_indicators: sceneObs.injury_indicators,
        location_clues: sceneObs.scene_context,
        offense_indicators: sceneObs.crime_cues,
      };

      // ── Pass 2 — Witness Narrative Generation ────────────────────────────
      // Image included again so model writes from direct visual memory, not just
      // the text summary. Strict scene-only instruction. No legal framing.
      const sceneBlock = [
        sceneObs.subjects_observed && sceneObs.subjects_observed !== "none visible" ? `Subjects: ${sceneObs.subjects_observed}` : "",
        sceneObs.actions_observed && sceneObs.actions_observed !== "none observed" ? `Actions: ${sceneObs.actions_observed}` : "",
        sceneObs.objects_visible && sceneObs.objects_visible !== "none identified" ? `Objects: ${sceneObs.objects_visible}` : "",
        sceneObs.weapon_indicators && sceneObs.weapon_indicators !== "none visible" ? `Weapons: ${sceneObs.weapon_indicators}` : "",
        sceneObs.injury_indicators && sceneObs.injury_indicators !== "none visible" ? `Injuries: ${sceneObs.injury_indicators}` : "",
        sceneObs.crime_cues ? `Crime cues: ${sceneObs.crime_cues}` : "",
      ].filter(Boolean).join("\n");

      const pass2Parts = [];
      // Image first again — model writes from what it sees
      if (captured.photoDataUrl && captured.photoDataUrl.startsWith("data:image/")) {
        const mimeMatch = captured.photoDataUrl.match(/^data:(image\/[a-z]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64Data = captured.photoDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
        pass2Parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      pass2Parts.push({ text: `Write a 2-3 sentence witness intelligence statement describing what is visually observable in this evidence.

Scene analysis extracted:
${sceneBlock || `Incident type: ${captured.incidentType}`}

STRICT RULES:
- Start with what is VISIBLE or OBSERVED — never with location, coordinates, or metadata
- Never write: "Evidence captured at", "cryptographically", "chain of custody", "SHA", "GPS", "digital record", "preserved for legal"
- Use language like: "Visual indicators show...", "An individual is observed...", "Scene evidence suggests...", "Observable indicators consistent with..."
- Be conservative — say "appears to be" or "indicators consistent with" for uncertain observations
- Do not invent names, identities, or unobservable facts

Return ONLY this JSON, no markdown, no extra text:
{"statement_en":"[2-3 sentence scene-intelligence witness narrative starting with what is visually observed]","statement_ur":"[same in Urdu, describing the scene]","ppc_sections":[{"section":"PPC XXX","title":"title","description":"description","penalty":"penalty"},{"section":"PPC XXX","title":"title","description":"description","penalty":"penalty"},{"section":"PPC XXX","title":"title","description":"description","penalty":"penalty"}],"case_score":72,"risk_assessment":"[observable risk indicators]. [investigative recommendation].","recommended_action":"[specific next steps]"}` });

      const pass2Response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: pass2Parts }] }),
        }
      );
      const pass2Data = await pass2Response.json();
      const pass2Raw = pass2Data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // ── Parse + boilerplate validator ─────────────────────────────────────
      const BOILERPLATE_PHRASES = [
        "evidence captured at",
        "cryptographically sealed",
        "chain of custody",
        "preserved for legal review",
        "digital record has been",
      ];

      function isBoilerplate(text) {
        if (!text) return true;
        const lower = text.toLowerCase();
        return BOILERPLATE_PHRASES.some((p) => lower.includes(p));
      }

      function parseGeminiJson(raw) {
        if (!raw) return null;
        try {
          const cleaned = raw
            .replace(/^```[a-z]*\n?/i, "")
            .replace(/\n?```$/i, "")
            .trim();
          return JSON.parse(cleaned);
        } catch { return null; }
      }

      let aiResult = parseGeminiJson(pass2Raw);

      // Auto-regenerate once if output is boilerplate or parse failed
      if (!aiResult || isBoilerplate(aiResult.statement_en)) {
        const retryParts = [];
        if (captured.photoDataUrl && captured.photoDataUrl.startsWith("data:image/")) {
          const mimeMatch = captured.photoDataUrl.match(/^data:(image\/[a-z]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const base64Data = captured.photoDataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
          retryParts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
        }
        retryParts.push({ text: `Look at this image. Write 2-3 sentences describing ONLY what you can see. Start with "Visual evidence shows" or "The scene indicates". Do not mention GPS, hashes, custody, or coordinates. Return JSON: {"statement_en":"...","statement_ur":"...","ppc_sections":[],"case_score":65,"risk_assessment":"...","recommended_action":"..."}` });

        const retryResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: retryParts }] }),
          }
        );
        const retryData = await retryResponse.json();
        const retryRaw = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        aiResult = parseGeminiJson(retryRaw);
      }

      // Final fallback — only if both passes and retry all failed
      if (!aiResult || !aiResult.statement_en || isBoilerplate(aiResult.statement_en)) {
        const fb = buildFallbackAiResult(captured, extraction);
        aiResult = aiResult ? { ...fb, ...aiResult, statement_en: aiResult.statement_en || fb.statement_en } : fb;
      }

      // Generate compressed thumbnail for storage (full-res stays in React state for session preview)
      const thumbnailDataUrl = captured.photoDataUrl
        ? await compressThumbnail(captured.photoDataUrl)
        : "";

      saveEvidence({
        ...captured,
        // Store thumbnail only — full-res image is NOT persisted to localStorage
        photoDataUrl: thumbnailDataUrl,
        // videoBlob is never serialisable — strip it; videoUrl is a blob: URL (session-only)
        videoBlob: undefined,
        videoUrl: captured.mediaType === "video" ? "" : captured.videoUrl,
        status,
        riskLevel,
        sealed: true,
        sealedAt,
        firGenerated: status === "Flagged",
        offenseKeywords: extraction.offense_keywords || [],
        crimeCategory: extraction.crime_category || captured.incidentType,
        aiAnalysis: aiResult,
        custodyTimeline: [
          { label: "Captured", labelUr: "ثبوت ریکارڈ کیا گیا", at: captured.timestamp },
          { label: "Hashed (SHA-256)", labelUr: "ہیش تیار ہوا", at: captured.timestamp },
          { label: "AI Analysis Completed", labelUr: "اے آئی تجزیہ مکمل", at: new Date().toISOString() },
          { label: "Sealed", labelUr: "ثبوت سیل کیا گیا", at: sealedAt },
        ],
      });
      setSealed(true);
      window.alert("Evidence sealed & AI analysis complete");
    } catch (error) {
      setAiError(`Gemini processing failed | اے آئی تجزیہ ناکام: ${error.message}`);
    } finally {
      setAiLoading(false);
      setSealing(false);
    }
  };

  const [uploadError, setUploadError] = useState("");
  const [uploadHashing, setUploadHashing] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploadError("");
    setAiError("");

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setUploadError("Unsupported file type. Upload an image or video. | غیر معاون فائل۔ تصویر یا ویڈیو اپلوڈ کریں۔");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setUploadError("File exceeds 200MB limit. | فائل 200MB سے بڑی ہے۔");
      return;
    }

    setUploadHashing(true);
    try {
      const buffer = await file.arrayBuffer();
      const hash = await hashBufferToHex(buffer);
      const meta = await collectLocation();
      const timestamp = new Date().toISOString();

      if (isImage) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error("Failed to read image file"));
          reader.readAsDataURL(file);
        });
        // Keep full dataUrl in React state for session preview
        // Thumbnail is generated at seal time before storage
        setCaptured({
          id: crypto.randomUUID(),
          mediaType: "photo",
          photoDataUrl: dataUrl,   // full-res — session only, stripped before saveEvidence
          videoUrl: "",
          hash,
          timestamp,
          ...meta,
          incidentType,
          titleEn: "Uploaded Image Evidence",
          titleUr: "اپلوڈ شدہ تصویری ثبوت",
          uploadedFileName: file.name,
        });
      } else {
        const videoUrl = URL.createObjectURL(file);
        setCaptured({
          id: crypto.randomUUID(),
          mediaType: "video",
          photoDataUrl: "",
          videoUrl,               // blob: URL — session only, not stored
          hash,
          timestamp,
          ...meta,
          incidentType,
          titleEn: "Uploaded Video Evidence",
          titleUr: "اپلوڈ شدہ ویڈیو ثبوت",
          uploadedFileName: file.name,
        });
      }
      setSealed(false);
    } catch (err) {
      setUploadError(`Upload failed | اپلوڈ ناکام: ${err.message}`);
    } finally {
      setUploadHashing(false);
    }
  };

  const capturedAt = useMemo(
    () => (captured ? new Date(captured.timestamp).toLocaleString("en-PK", { hour12: false }) : ""),
    [captured]
  );

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#1A56DB] to-blue-800 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-black">Capture Evidence | ثبوت ریکارڈ کریں</h1>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Incident Type | واقعہ کی قسم
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
            >
              <option value="suspicious">Suspicious | مشکوک</option>
              <option value="theft">Theft | چوری</option>
              <option value="fraud">Fraud | فراڈ</option>
              <option value="violent">Violent | پرتشدد</option>
              <option value="weapons">Weapons | اسلحہ</option>
            </select>
          </label>
          <div className="overflow-hidden rounded-xl bg-slate-900">
            <video ref={videoRef} autoPlay playsInline muted className="h-[320px] w-full object-cover" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <span className={`h-2.5 w-2.5 rounded-full ${cameraLive ? "bg-emerald-500" : "bg-slate-400"}`} />
            {cameraLive ? "Live | لائیو" : "Offline | آف لائن"}
          </div>
          {cameraError ? <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{cameraError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Capture Photo | تصویر
            </button>
            {!recording ? (
              <button type="button" onClick={toggleRecord} disabled={!cameraReady} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white">
                Start Recording | ریکارڈنگ شروع
              </button>
            ) : (
              <button type="button" onClick={toggleRecord} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Stop Recording | ریکارڈنگ بند
              </button>
            )}
          </div>

          {/* ── Upload Existing Evidence ───────────────────────────────── */}
          <div className="mt-4 border-t border-[#4F8090]/20 pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#4F8090]">
              Upload Existing Evidence | موجودہ ثبوت اپلوڈ کریں
            </p>
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-lg border border-[#4F8090]/40 px-4 py-2 text-sm font-semibold text-[#F2F2F2] hover:border-[#4F8090] transition">
                📁 Upload Image | تصویر اپلوڈ
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </label>
              <label className="cursor-pointer rounded-lg border border-[#4F8090]/40 px-4 py-2 text-sm font-semibold text-[#F2F2F2] hover:border-[#4F8090] transition">
                🎬 Upload Video | ویڈیو اپلوڈ
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </label>
            </div>
            {uploadHashing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#4F8090]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#4F8090] border-t-transparent" />
                Computing SHA-256 hash... | ہیش تیار ہو رہا ہے
              </div>
            )}
            {uploadError && (
              <p className="mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{uploadError}</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Captured Evidence | محفوظ شدہ ثبوت</h2>
          {!captured ? (
            <p className="mt-3 text-sm text-slate-600">Capture image/video first | پہلے ثبوت محفوظ کریں</p>
          ) : (
            <>
              {captured.mediaType === "photo" ? (
                <img src={captured.photoDataUrl} alt="Captured evidence" className="mt-3 h-52 w-full rounded-lg object-cover" />
              ) : (
                <video controls src={captured.videoUrl} className="mt-3 h-52 w-full rounded-lg object-cover" />
              )}
              <div className="mt-3 space-y-2 text-sm">
                <p className="break-all text-slate-700">
                  <span className="font-semibold">SHA-256:</span> {captured.hash}
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">GPS:</span> {captured.locationLabel}
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Timestamp:</span> {capturedAt}
                </p>
                {captured.uploadedFileName && (
                  <p className="text-slate-700">
                    <span className="font-semibold">File:</span> {captured.uploadedFileName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={sealEvidence}
                disabled={sealing}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sealing ? "Sealing..." : "Seal Evidence | ثبوت سیل کریں"}
              </button>
              {aiLoading ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-[#1A56DB]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
                  SHAHID.AI is analyzing evidence... | شاہد اے آئی ثبوت کا تجزیہ کر رہا ہے
                </div>
              ) : null}
              {aiError ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{aiError}</p> : null}
            </>
          )}
        </article>
      </div>
      {sealed && captured ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-lg font-bold text-emerald-800">Evidence Sealed | ثبوت سیل</h3>
          <p className="text-sm text-slate-700">Evidence ID: {captured.id}</p>
        </section>
      ) : null}
    </section>
  );
}

export default CaptureEvidence;
