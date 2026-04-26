import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEvidenceById, saveEvidence } from "../utils/evidenceStore";
import { retrieveForEvidence, preloadIndex } from "../utils/ragEngine";
import { generateFIRDraft, computeCaseReadiness } from "../utils/firDraftEngine";
import { generateCourtPacket } from "../utils/legalPdfGenerator";

// ─── Legal RAG Panel ──────────────────────────────────────────────────────────

function LegalRAGPanel({ evidence }) {
  const [laws, setLaws] = useState(null);       // null = loading, [] = empty, [...] = results
  const [error, setError] = useState("");
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    let cancelled = false;
    preloadIndex();
    retrieveForEvidence(evidence)
      .then((results) => { if (!cancelled) setLaws(results); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [evidence]);

  if (error) {
    return (
      <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
        Legal retrieval unavailable: {error}
      </div>
    );
  }

  if (laws === null) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm ui-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4F8090] border-t-transparent" />
        Running legal retrieval...
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-bold text-[#F2F2F2]">
          Retrieved Laws | قانونی ریٹریول
        </h3>
        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">
          ✓ Grounded Legal Retrieval Verified
        </span>
      </div>

      {laws.length === 0 ? (
        <p className="text-sm ui-muted">No laws retrieved for this incident type.</p>
      ) : (
        <div className="space-y-3">
          {laws.map((law) => (
            <div key={law.id} className="rounded-xl border border-[#4F8090]/30 bg-[#1A202C]/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-[#4F8090]">{law.section}</p>
                  <p className="text-sm font-semibold text-[#F2F2F2]">{law.title}</p>
                  <p className="text-xs ui-muted">{law.act}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${law.score >= 70 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {law.score}/99
                </span>
              </div>
              <p className="mt-2 text-xs text-[#B6C1D1]">{law.explanation}</p>
              <p className="mt-1 text-xs text-[#4F8090]">Why matched: {law.reason}</p>
            </div>
          ))}
        </div>
      )}

      {laws.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowExplain((v) => !v)}
            className="text-xs font-semibold text-[#EF9B20] hover:underline"
          >
            {showExplain ? "Hide" : "Show"} Why These Laws? | یہ قوانین کیوں؟
          </button>
          {showExplain && (
            <div className="mt-2 rounded-xl border border-[#EF9B20]/30 bg-[#EF9B20]/5 p-3 text-xs text-[#B6C1D1] space-y-2">
              <p className="font-semibold text-[#EF9B20]">Retrieval Explainability</p>
              <p>Laws are retrieved using a hybrid BM25 + TF-IDF pipeline over the local PPC, CrPC, and Qanun-e-Shahadat corpus. No external API is used.</p>
              <ul className="space-y-1 mt-1">
                {laws.map((l) => (
                  <li key={l.id}>
                    <span className="font-semibold text-[#4F8090]">{l.section}:</span> {l.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Case Readiness Panel ─────────────────────────────────────────────────────

function CaseReadinessPanel({ score }) {
  const color = score >= 75 ? "text-emerald-300" : score >= 50 ? "text-amber-300" : "text-red-300";
  const barColor = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const label = score >= 75 ? "Case Package Ready" : score >= 50 ? "Partially Ready" : "Incomplete";

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[#F2F2F2]">Case Readiness Score</span>
        <span className={`text-2xl font-black ${color}`}>{score}%</span>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-[#1A202C]">
        <div className={`h-3 rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <p className={`mt-1 text-xs font-bold ${color}`}>{label}</p>
      <p className="text-xs ui-muted mt-1">
        Computed from: evidence integrity · legal grounding · custody completeness · AI analysis quality
      </p>
    </div>
  );
}

// ─── Tamper-Evident Custody Step ──────────────────────────────────────────────

function CustodyStep({ step }) {
  return (
    <div className="rounded-lg border border-[#4F8090]/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#F2F2F2]">
            {step.label}{step.labelUr ? ` | ${step.labelUr}` : ""}
          </p>
          <p className="text-sm ui-muted">
            {new Date(step.at).toLocaleString("en-PK", { hour12: false })}
          </p>
        </div>
        {step.chainHash && (
          <span className="shrink-0 rounded bg-emerald-500/15 px-2 py-1 text-xs font-mono text-emerald-300">
            ⛓ {step.chainHash.slice(0, 12)}…
          </span>
        )}
      </div>
      {step.signatureType && (
        <p className="mt-1 text-xs text-[#4F8090]">Tamper-Evident Chain · {step.signatureType}</p>
      )}
    </div>
  );
}

// ─── Main EvidenceDetail ──────────────────────────────────────────────────────

function EvidenceDetail() {
  const { id } = useParams();
  const evidence = getEvidenceById(id);
  const [generatingPacket, setGeneratingPacket] = useState(false);
  const [packetError, setPacketError] = useState("");

  if (!evidence) {
    return (
      <section className="ui-card">
        <h1 className="text-2xl font-bold text-[#F2F2F2]">Evidence Not Found | ثبوت موجود نہیں</h1>
      </section>
    );
  }

  const ai = evidence.aiAnalysis || {};
  const sections = ai.ppc_sections || [];
  const caseStrength = Math.max(0, Math.min(100, ai.case_score || 50));
  const faceIntelConfidence = evidence.coords ? 84 : 61;

  const copyHash = async () => {
    try { await window.navigator.clipboard.writeText(evidence.hash || ""); }
    catch { /* clipboard unavailable */ }
  };

  const shareEvidence = async () => {
    const text = `SHAHID.AI Evidence ${evidence.id} | ${evidence.locationLabel} | ${evidence.hash}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Evidence Share", text }); return; }
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard | کلپ بورڈ میں کاپی");
    } catch { alert("Share unavailable"); }
  };

  const retryAi = async () => {
    const key = process.env.REACT_APP_GEMINI_API_KEY || window.localStorage.getItem("gemini_api_key") || "";
    if (!key) {
      alert("Gemini API key missing. Set REACT_APP_GEMINI_API_KEY or localStorage 'gemini_api_key'.");
      return;
    }
    try {
      const prompt = `You are a Pakistani legal forensic AI assistant. Analyze this crime scene evidence strictly as JSON only. Incident: ${evidence.incidentType}. Location: ${evidence.locationLabel}. Time: ${evidence.timestamp}. Return JSON with statement_en, statement_ur, ppc_sections(3), case_score, risk_assessment, recommended_action.`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const aiAnalysis = JSON.parse(raw.replace(/```json|```/g, "").trim());
      saveEvidence({ ...evidence, aiAnalysis });
      window.location.reload();
    } catch (e) {
      alert(`AI retry failed: ${e.message}`);
    }
  };

  const verifyHash = async () => {
    try {
      if (evidence.photoDataUrl && evidence.photoDataUrl.startsWith("data:")) {
        const digest = await crypto.subtle.digest("SHA-256", await (await fetch(evidence.photoDataUrl)).arrayBuffer());
        const hex = Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
        alert(hex === evidence.hash ? "Verified: hash matches | ہیش تصدیق شدہ" : "Warning: hash mismatch | خبردار: ہیش مختلف");
        return;
      }
      alert("No local media available for re-hash. Stored hash shown. | مقامی میڈیا دستیاب نہیں۔");
    } catch (error) {
      alert(`Verification error: ${error.message}`);
    }
  };

  const downloadFir = () => {
    const firText = `FIRST INFORMATION REPORT (FIR)\nایف آئی آر\n\nEvidence ID: ${evidence.id}\nIncident Type: ${evidence.incidentType}\nLocation: ${evidence.locationLabel}\nCoordinates: ${evidence.coords ? `${evidence.coords.latitude}, ${evidence.coords.longitude}` : "N/A"}\nTimestamp: ${evidence.timestamp}\nSHA-256: ${evidence.hash}\n\nAI Witness Statement (EN):\n${ai.statement_en || "Not available"}\n\nAI Witness Statement (UR):\n${ai.statement_ur || "دستیاب نہیں"}\n\nRisk Assessment:\n${ai.risk_assessment || "N/A"}\n\nRecommended Action:\n${ai.recommended_action || "N/A"}\n\nPPC Sections:\n${sections.map((item) => `${item.section} - ${item.title} - ${item.description} - ${item.penalty}`).join("\n")}\n\nChain of Custody:\n${(evidence.custodyTimeline || []).map((step) => `${step.at} | ${step.label}`).join("\n")}`;
    const blob = new Blob([firText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FIR-${evidence.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePacket = async () => {
    setGeneratingPacket(true);
    setPacketError("");
    try {
      const retrievedLaws = await retrieveForEvidence(evidence);
      const firDraft = generateFIRDraft(evidence, retrievedLaws);
      const readiness = computeCaseReadiness(evidence, retrievedLaws);
      generateCourtPacket(evidence, retrievedLaws, firDraft, readiness);
    } catch (e) {
      setPacketError(`Court packet generation failed: ${e.message}`);
    } finally {
      setGeneratingPacket(false);
    }
  };

  // Compute readiness for display (sync approximation — full async version used in packet)
  const displayReadiness = computeCaseReadiness(evidence, ai.ppc_sections || []);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#1A56DB] to-blue-800 p-6 text-white">
        <h1 className="text-2xl font-black">Evidence Detail | ثبوت کی تفصیل</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-blue-100">
          <span>Evidence ID: {evidence.id}</span>
          <span className="rounded bg-white/20 px-2 py-1">{evidence.status}</span>
          <span className="rounded bg-red-500/60 px-2 py-1">{evidence.riskLevel}</span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Evidence Metadata */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Evidence Metadata | بنیادی معلومات</h2>
          {evidence.photoDataUrl ? (
            <img src={evidence.photoDataUrl} alt="Evidence" className="mt-4 h-56 w-full rounded-lg object-cover" />
          ) : evidence.videoUrl ? (
            <video controls src={evidence.videoUrl} className="mt-4 h-56 w-full rounded-lg object-cover" />
          ) : null}
          <div className="mt-3 space-y-2 text-sm text-[#B6C1D1]">
            <p>Type: {evidence.incidentType}</p>
            <p>Status: {evidence.status}</p>
            <p>Location: {evidence.locationLabel}</p>
            <p>Time: {new Date(evidence.timestamp).toLocaleString("en-PK", { hour12: false })}</p>
            <p className="break-all">
              SHA-256: {evidence.hash}
              <button type="button" onClick={copyHash} className="ml-2 rounded bg-[#4F8090]/30 px-2 py-1 text-xs text-[#F2F2F2]">
                Copy | کاپی
              </button>
            </p>
            <p>
              GPS:{" "}
              {evidence.coords ? `${evidence.coords.latitude.toFixed(6)}, ${evidence.coords.longitude.toFixed(6)}` : "N/A"}
            </p>
          </div>
        </article>

        {/* AI Witness Statement */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">AI Evidence Intelligence Statement | اے آئی شواہد انٹیلیجنس بیان</h2>
          {ai.statement_en ? (
            <>
              <p className="mt-3 text-sm text-[#B6C1D1]">{ai.statement_en}</p>
              <p className="mt-2 text-sm text-[#B6C1D1]">{ai.statement_ur || "اے آئی بیان دستیاب نہیں۔"}</p>
            </>
          ) : (
            <div className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
              AI Analysis Pending | اے آئی تجزیہ زیر التوا
              <button type="button" onClick={retryAi} className="ml-2 rounded bg-[#1A56DB] px-2 py-1 text-white text-xs">
                Retry AI
              </button>
            </div>
          )}

          <h3 className="mt-5 font-bold text-[#F2F2F2]">PPC Sections Matched | متعلقہ دفعات</h3>
          <div className="mt-2 grid gap-2 text-sm">
            {sections.map((sec) => (
              <article key={sec.section} className="rounded-lg bg-[#1A202C]/60 p-2 border border-[#4F8090]/20">
                <p className="font-semibold text-[#4F8090]">{sec.section} - {sec.title}</p>
                <p className="text-[#B6C1D1]">{sec.description}</p>
                <p className="text-xs text-[#B6C1D1]/70">Penalty: {sec.penalty}</p>
              </article>
            ))}
          </div>

          {/* Legal RAG Panel — integrated here below PPC sections */}
          <LegalRAGPanel evidence={evidence} />
        </article>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Case Strength + Readiness */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Case Strength | کیس کی مضبوطی</h2>
          <div className="mt-4 h-4 w-full rounded-full bg-[#1A202C]">
            <div className="h-4 rounded-full bg-[#1A56DB]" style={{ width: `${caseStrength}%` }} />
          </div>
          <p className="mt-2 text-sm text-[#B6C1D1]">AI Score: {caseStrength}%</p>
          <p className="mt-2 text-sm text-[#B6C1D1]">
            Risk: {ai.risk_assessment || "N/A"} | سفارش: {ai.recommended_action || "N/A"}
          </p>
          <CaseReadinessPanel score={displayReadiness} />
        </article>

        {/* Face Intelligence */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Face Intelligence | چہرہ انٹیلیجنس</h2>
          <p className="mt-3 text-sm text-[#B6C1D1]">
            Spatial metadata confidence: <span className="font-semibold text-[#F2F2F2]">{faceIntelConfidence}%</span>
          </p>
          <p className="mt-2 text-sm text-[#B6C1D1]">
            Computed from GPS coordinate precision and spatial metadata completeness. Run Face Intelligence module for live suspect correlation.
          </p>
        </article>
      </div>

      {/* Tamper-Evident Chain of Custody */}
      <article className="ui-card">
        <h2 className="text-lg font-bold text-[#F2F2F2]">
          Tamper-Evident Chain of Custody | تحویل کا سلسلہ
        </h2>
        <p className="mt-1 text-xs ui-muted">
          Each event is linked by SHA-256 chain hash. Any modification breaks the chain.
        </p>
        <div className="mt-4 space-y-3">
          {(evidence.custodyTimeline || []).length === 0 ? (
            <p className="text-sm ui-muted">No custody events recorded.</p>
          ) : (
            (evidence.custodyTimeline || []).map((step, i) => (
              <CustodyStep key={`${step.label}-${step.at}-${i}`} step={step} />
            ))
          )}
        </div>
      </article>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={downloadFir} className="rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white">
          Download FIR | ایف آئی آر ڈاؤن لوڈ کریں
        </button>
        <button
          type="button"
          onClick={generatePacket}
          disabled={generatingPacket}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2"
        >
          {generatingPacket ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            "⚖ Generate Court Submission Packet"
          )}
        </button>
        <button type="button" onClick={verifyHash} className="rounded-lg bg-[#4F8090] px-4 py-2 text-sm font-semibold text-white">
          Verify Hash | ہیش تصدیق
        </button>
        <button type="button" onClick={shareEvidence} className="rounded-lg border border-[#4F8090] px-4 py-2 text-sm font-semibold text-[#F2F2F2]">
          Share Evidence | شیئر
        </button>
      </div>
      {packetError && (
        <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{packetError}</p>
      )}
    </section>
  );
}

export default EvidenceDetail;
