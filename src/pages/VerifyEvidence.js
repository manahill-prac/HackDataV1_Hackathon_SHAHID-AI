import React, { useState } from "react";
import { findEvidenceByHash } from "../utils/evidenceStore";

async function fileHash(file) {
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

function VerifyEvidence() {
  const [hashInput, setHashInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const verifyHash = (hash) => {
    const found = findEvidenceByHash(hash);
    setResult(found);
    setStatus(found ? "VERIFIED" : "NOT FOUND");
  };

  const verifyFile = async (file) => {
    if (!file) return;
    setError("");
    try {
      const hash = await fileHash(file);
      setHashInput(hash);
      verifyHash(hash);
    } catch (e) {
      setError(`Verification failed | تصدیق ناکام: ${e.message}`);
    }
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#1A56DB] to-blue-800 p-6 text-white">
        <h1 className="text-2xl font-black">Verify Evidence | ثبوت تصدیق</h1>
      </header>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold">SHA-256 Hash | ہیش</label>
        <input
          value={hashInput}
          onChange={(e) => setHashInput(e.target.value)}
          className="mt-2 w-full rounded border p-2"
          placeholder="Paste hash..."
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => verifyHash(hashInput)} className="rounded bg-[#1A56DB] px-4 py-2 text-white">
            Verify Hash | تصدیق
          </button>
          <label className="text-sm font-semibold text-slate-700">
            Upload File | فائل اپلوڈ
            <input type="file" onChange={(e) => verifyFile(e.target.files?.[0])} className="ml-2" />
          </label>
        </div>
        {status ? (
          <p className={`mt-3 rounded p-2 text-sm font-semibold ${status === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {status}
          </p>
        ) : null}
        {result ? (
          <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
            <p>Original Time: {new Date(result.timestamp).toLocaleString("en-PK", { hour12: false })}</p>
            <p>Location: {result.locationLabel}</p>
            <div className="mt-2">
              {(result.custodyTimeline || []).map((step) => (
                <p key={`${step.label}-${step.at}`}>{step.label} - {new Date(step.at).toLocaleString("en-PK", { hour12: false })}</p>
              ))}
            </div>
            <p className="mt-2 font-semibold text-emerald-700">This evidence has not been tampered with | اس ثبوت میں ردوبدل نہیں ہوا</p>
          </div>
        ) : null}
        {status === "NOT FOUND" ? (
          <p className="mt-2 text-sm font-semibold text-red-700">WARNING: Evidence may be tampered | خبردار: ثبوت میں ردوبدل ہو سکتا ہے</p>
        ) : null}
        {error ? <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      </article>
    </section>
  );
}

export default VerifyEvidence;
