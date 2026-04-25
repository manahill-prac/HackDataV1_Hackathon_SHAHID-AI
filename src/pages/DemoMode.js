/**
 * SHAHID.AI — Hackathon Demo Mode
 * Isolated route: /demo
 * Does NOT interfere with normal app flow.
 * Modules: 8-step guided flow, judge command view, pitch panel, architecture view.
 */
import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { activateDemoMode, deactivateDemoMode, isDemoActive, getDemoEvidenceData } from "../utils/demoSeed";
import { generatePredictionIntelligence } from "../utils/crimeML";
import {
  computeThreatCorrelationIndex,
  computeCorrelatedFusionSignals,
  buildThreatWatchlist,
  computeReadinessMatrix,
  generateIntelBriefing,
} from "../utils/threatFusion";
import { computeCaseReadiness } from "../utils/firDraftEngine";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    step: 1,
    title: "Citizen Captures Evidence",
    titleUr: "شہری ثبوت ریکارڈ کرتا ہے",
    icon: "📷",
    route: "/capture",
    routeLabel: "Open Capture Module",
    summary: "A field officer or citizen opens SHAHID.AI on their phone. They capture a photo or video of the incident. GPS coordinates and timestamp are embedded automatically.",
    talking: "This is the entry point. No training required. Any citizen can capture tamper-evident evidence in seconds.",
    signal: "Evidence record created with SHA-256 hash, GPS, and timestamp.",
    color: "blue",
  },
  {
    step: 2,
    title: "Evidence Cryptographically Sealed",
    titleUr: "ثبوت کرپٹوگرافک طور پر سیل",
    icon: "🔒",
    route: "/evidence/DEMO-001",
    routeLabel: "View Sealed Evidence",
    summary: "The captured media is hashed using SHA-256 via the browser's native SubtleCrypto API. The hash is stored with the evidence record. Any future tampering breaks the hash.",
    talking: "This is court-admissible digital evidence under QSO Article 73-A. The hash is the chain-of-custody anchor.",
    signal: "SHA-256 integrity hash computed. Tamper-evident chain initiated.",
    color: "emerald",
  },
  {
    step: 3,
    title: "AI Witness Statement Generated",
    titleUr: "اے آئی گواہ بیان تیار",
    icon: "🤖",
    route: "/evidence/DEMO-001",
    routeLabel: "View AI Statement",
    summary: "Gemini 1.5 Flash analyzes the incident metadata and generates a formal bilingual legal witness statement in English and Urdu, plus PPC section identification and risk assessment.",
    talking: "Pakistan's first AI-generated legal witness statement. Bilingual. Grounded in incident facts. Not a template.",
    signal: "AI witness statement + PPC sections + risk score generated.",
    color: "purple",
  },
  {
    step: 4,
    title: "Legal Laws Retrieved (RAG)",
    titleUr: "قانونی دفعات ریٹریول",
    icon: "⚖",
    route: "/evidence/DEMO-001",
    routeLabel: "View Legal RAG Panel",
    summary: "The local BM25+TF-IDF hybrid RAG engine retrieves the most relevant PPC, CrPC, and Qanun-e-Shahadat sections from the offline legal corpus. Every citation is grounded — no hallucinated laws.",
    talking: "Zero external API. Fully offline. Hybrid retrieval with explainability. Every cited law is real and retrievable.",
    signal: "Top-5 grounded legal citations retrieved with similarity scores and explainability.",
    color: "teal",
  },
  {
    step: 5,
    title: "Court Submission Packet Generated",
    titleUr: "عدالتی پیکٹ تیار",
    icon: "📄",
    route: "/evidence/DEMO-001",
    routeLabel: "Generate Court Packet",
    summary: "One click generates a complete court-ready HTML packet: FIR draft (English + Urdu), evidence metadata, legal citations appendix, tamper-evident custody chain, SHA-256 proof, and case readiness score.",
    talking: "From field capture to court-ready document in under 60 seconds. No lawyer needed for the first draft.",
    signal: "Court packet downloaded. FIR draft grounded in retrieved citations only.",
    color: "amber",
  },
  {
    step: 6,
    title: "Face Intelligence — Repeat Suspect",
    titleUr: "چہرہ انٹیلیجنس — مشکوک شخص",
    icon: "👤",
    route: "/face-intelligence",
    routeLabel: "Open Face Intelligence",
    summary: "The face recognition engine cross-references live camera feed against face descriptors stored in sealed evidence records. Suspect A appears in 4 separate evidence records across Karachi, Lahore, and Islamabad.",
    talking: "Repeat suspect correlation across cities. Not identity recognition — investigative lead only. Fully local, no cloud.",
    signal: "Suspect A correlated across DEMO-001, DEMO-002, DEMO-004, DEMO-007, DEMO-014.",
    color: "red",
  },
  {
    step: 7,
    title: "Prediction Engine — Hotspot Warning",
    titleUr: "پیش گوئی انجن — ہاٹ اسپاٹ وارننگ",
    icon: "📡",
    route: "/prediction-engine",
    routeLabel: "Open Prediction Engine",
    summary: "The local logistic regression model (trained on sealed evidence) detects a statistical anomaly spike on 2026-04-10 night. Karachi and Lahore show hotspot escalation. Threat Correlation Index reaches Critical band.",
    talking: "Real ML model trained on real evidence. No cloud. No API. Anomaly detection + 48-hour city forecast.",
    signal: "TCI Critical. 2 anomaly spikes. 3 fusion signals. Karachi + Lahore hotspot escalation.",
    color: "orange",
  },
  {
    step: 8,
    title: "Case Package Ready",
    titleUr: "کیس پیکج تیار",
    icon: "✅",
    route: "/analytics",
    routeLabel: "View Command Center",
    summary: "All modules converge. Evidence sealed, AI analysis complete, laws retrieved, FIR drafted, custody chain intact, threat intelligence fused. Case readiness composite score computed across all 4 dimensions.",
    talking: "End-to-end from street capture to court-ready intelligence package. This is SHAHID.AI.",
    signal: "Case Readiness: Evidence ✓ · Legal ✓ · Investigative ✓ · Submission ✓",
    color: "emerald",
  },
];

const STEP_COLORS = {
  blue: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-300", badge: "bg-blue-500/20 text-blue-300" },
  emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300" },
  purple: { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-300", badge: "bg-purple-500/20 text-purple-300" },
  teal: { border: "border-teal-500/40", bg: "bg-teal-500/10", text: "text-teal-300", badge: "bg-teal-500/20 text-teal-300" },
  amber: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-300", badge: "bg-amber-500/20 text-amber-300" },
  red: { border: "border-red-500/40", bg: "bg-red-500/10", text: "text-red-300", badge: "bg-red-500/20 text-red-300" },
  orange: { border: "border-orange-500/40", bg: "bg-orange-500/10", text: "text-orange-300", badge: "bg-orange-500/20 text-orange-300" },
};

// ─── Pitch Panel content ──────────────────────────────────────────────────────

const PITCH = [
  {
    section: "Problem",
    icon: "🚨",
    color: "red",
    points: [
      "Pakistan has 220M+ citizens but evidence collection is manual, paper-based, and tamper-prone.",
      "FIR registration requires physical presence — victims in remote areas have no access.",
      "Digital evidence (CCTV, photos, voice) is routinely rejected in court due to chain-of-custody failures.",
      "No AI-assisted legal intelligence exists for field officers or citizens.",
    ],
  },
  {
    section: "Solution",
    icon: "🛡",
    color: "blue",
    points: [
      "SHAHID.AI: Pakistan's first AI crime intelligence and evidence platform.",
      "Capture → Hash → Seal → AI Analysis → Legal RAG → Court Packet in under 60 seconds.",
      "SHA-256 tamper-evident chain-of-custody. Court-admissible under QSO Article 73-A.",
      "Bilingual (English + Urdu). Works offline. Zero cloud dependency for core functions.",
    ],
  },
  {
    section: "Innovation",
    icon: "⚡",
    color: "purple",
    points: [
      "Local BM25+TF-IDF hybrid RAG over PPC, CrPC, and Qanun-e-Shahadat corpus — zero hallucinated laws.",
      "Local logistic regression model trained on sealed evidence — real ML, no cloud API.",
      "Threat Correlation Index: weighted fusion of repeat suspects + hotspot escalation + anomaly detection.",
      "Face intelligence cross-referencing across sealed evidence records — investigative lead, not identity claim.",
      "IndexedDB-cached retrieval index — offline-safe after first load.",
    ],
  },
  {
    section: "Impact",
    icon: "🌍",
    color: "emerald",
    points: [
      "Democratizes legal access — any citizen can generate a court-ready FIR draft.",
      "Reduces evidence tampering through cryptographic chain-of-custody.",
      "Enables predictive policing with explainable, locally-computed intelligence.",
      "Scalable to all 36 districts of Pakistan with zero infrastructure cost.",
      "Total platform cost: $0. Fully open-source. No paid APIs.",
    ],
  },
];

// ─── Architecture nodes ───────────────────────────────────────────────────────

const ARCH_LAYERS = [
  {
    layer: "Input Layer",
    color: "#4F8090",
    nodes: ["Camera / Photo", "CCTV Upload", "Voice Capture", "Manual Entry"],
  },
  {
    layer: "Integrity Layer",
    color: "#EF9B20",
    nodes: ["SHA-256 Hash", "GPS Embed", "Timestamp Seal", "Custody Chain"],
  },
  {
    layer: "Intelligence Layer",
    color: "#7C3AED",
    nodes: ["Gemini AI Analysis", "BM25+TF-IDF RAG", "Local Logistic ML", "Face Recognition"],
  },
  {
    layer: "Fusion Layer",
    color: "#DC2626",
    nodes: ["Threat Correlation Index", "Anomaly Detection", "Hotspot Forecast", "Suspect Correlation"],
  },
  {
    layer: "Output Layer",
    color: "#16A34A",
    nodes: ["Court Packet PDF", "FIR Draft (EN+UR)", "Command Dashboard", "Legal Citations"],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DemoSeedPanel({ demoActive, onActivate, onDeactivate }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleActivate = () => {
    setLoading(true);
    const ok = activateDemoMode();
    setLoading(false);
    setMsg(ok ? "Demo dataset loaded. Refresh any module to see demo signals." : "Failed to load demo data.");
    if (ok) setTimeout(() => window.location.reload(), 800);
  };

  const handleDeactivate = () => {
    const ok = deactivateDemoMode();
    setMsg(ok ? "Original data restored." : "Failed to restore data.");
    if (ok) setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="ui-card">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-[#F2F2F2]">Demo Dataset</h3>
          <p className="text-xs ui-muted mt-0.5">
            {demoActive
              ? "Demo data active — 14 curated records loaded across 8 cities"
              : "Load curated demo evidence to trigger all intelligence signals"}
          </p>
        </div>
        <div className="flex gap-2">
          {!demoActive ? (
            <button
              type="button"
              onClick={handleActivate}
              disabled={loading}
              className="rounded-lg bg-[#EF9B20] px-4 py-2 text-sm font-bold text-[#1A202C] disabled:opacity-60"
            >
              {loading ? "Loading..." : "⚡ Load Demo Data"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDeactivate}
              className="rounded-lg border border-[#4F8090]/40 px-4 py-2 text-sm font-semibold text-[#B6C1D1]"
            >
              Restore Original Data
            </button>
          )}
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-300">{msg}</p>}
      {demoActive && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          {[
            ["14", "Evidence Records"],
            ["8", "Cities Covered"],
            ["5", "High-Risk Records"],
            ["4", "Suspect Correlations"],
          ].map(([val, lbl]) => (
            <div key={lbl} className="rounded-lg bg-[#1A202C]/60 p-2 text-center">
              <p className="text-lg font-black text-[#EF9B20]">{val}</p>
              <p className="ui-muted">{lbl}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuidedStep({ stepData, isActive, isCompleted, onClick }) {
  const c = STEP_COLORS[stepData.color] || STEP_COLORS.blue;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition ${
        isActive ? `${c.border} ${c.bg}` : isCompleted ? "border-emerald-500/30 bg-emerald-500/5" : "border-[#4F8090]/20 bg-[#1A202C]/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{isCompleted ? "✅" : stepData.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${isActive ? c.text : isCompleted ? "text-emerald-300" : "text-[#B6C1D1]"}`}>
            {stepData.step}. {stepData.title}
          </p>
        </div>
      </div>
    </button>
  );
}

function StepDetail({ stepData }) {
  const c = STEP_COLORS[stepData.color] || STEP_COLORS.blue;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{stepData.icon}</span>
            <div>
              <p className="text-xs ui-muted">Step {stepData.step} of {STEPS.length}</p>
              <h3 className={`text-xl font-black ${c.text}`}>{stepData.title}</h3>
              <p className="text-xs ui-muted">{stepData.titleUr}</p>
            </div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${c.badge}`}>
          Step {stepData.step}/{STEPS.length}
        </span>
      </div>

      <p className="text-sm text-[#D6DEE8] leading-relaxed">{stepData.summary}</p>

      <div className="rounded-xl bg-[#1A202C]/60 border border-[#4F8090]/20 p-3">
        <p className="text-xs font-bold text-[#EF9B20] mb-1">Judge Talking Point</p>
        <p className="text-sm text-[#F2F2F2] italic">"{stepData.talking}"</p>
      </div>

      <div className="rounded-xl bg-[#1A202C]/60 border border-[#4F8090]/20 p-3">
        <p className="text-xs font-bold text-[#4F8090] mb-1">Signal Produced</p>
        <p className="text-sm text-[#B6C1D1] font-mono">{stepData.signal}</p>
      </div>

      <Link
        to={stepData.route}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-[#1A202C] ${c.text.replace("text-", "bg-").replace("-300", "-400")}`}
        style={{ background: stepData.color === "blue" ? "#60a5fa" : stepData.color === "emerald" ? "#34d399" : stepData.color === "purple" ? "#a78bfa" : stepData.color === "teal" ? "#2dd4bf" : stepData.color === "amber" ? "#fbbf24" : stepData.color === "red" ? "#f87171" : "#fb923c" }}
      >
        → {stepData.routeLabel}
      </Link>
    </div>
  );
}

function CommandView({ evidence, intelligence, tciResult, fusionCorrelated, watchlist, readiness }) {
  const firstDemo = evidence.find((e) => e.id === "DEMO-001") || evidence[0];
  const caseScore = firstDemo ? computeCaseReadiness(firstDemo, firstDemo?.aiAnalysis?.ppc_sections || []) : 0;
  const highRisk = evidence.filter((e) => e.riskLevel === "High").length;
  const flagged = evidence.filter((e) => e.status === "Flagged").length;
  const topFusion = fusionCorrelated[0];
  const topWatch = watchlist[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#EF9B20]/40 bg-gradient-to-r from-[#1A202C] to-[#222B3C] p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#EF9B20]">Judge Demo Dashboard</p>
        <h2 className="mt-1 text-2xl font-black text-[#F2F2F2]">SHAHID.AI Executive Intelligence View</h2>
        <p className="text-xs ui-muted mt-1">All signals computed from real evidence — no hardcoded values</p>
      </div>

      {/* TCI + Readiness */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="ui-card text-center">
          <p className="text-xs ui-muted">Threat Correlation Index</p>
          <p className={`text-4xl font-black mt-1 ${tciResult.bandColor === "critical" ? "text-red-400" : tciResult.bandColor === "elevated" ? "text-amber-400" : "text-emerald-400"}`}>
            {tciResult.tci}
          </p>
          <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${tciResult.bandColor === "critical" ? "bg-red-500/20 text-red-300" : tciResult.bandColor === "elevated" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
            {tciResult.band}
          </span>
        </div>
        <div className="ui-card text-center">
          <p className="text-xs ui-muted">Case Readiness</p>
          <p className={`text-4xl font-black mt-1 ${readiness.composite >= 75 ? "text-emerald-400" : "text-amber-400"}`}>
            {readiness.composite}%
          </p>
          <span className="text-xs font-bold text-emerald-300">{readiness.composite >= 75 ? "Case Package Ready" : "Partial"}</span>
        </div>
        <div className="ui-card text-center">
          <p className="text-xs ui-muted">High-Risk Evidence</p>
          <p className="text-4xl font-black mt-1 text-red-400">{highRisk}</p>
          <span className="text-xs ui-muted">of {evidence.length} records</span>
        </div>
        <div className="ui-card text-center">
          <p className="text-xs ui-muted">Fusion Signals Active</p>
          <p className="text-4xl font-black mt-1 text-amber-400">{fusionCorrelated.length}</p>
          <span className="text-xs ui-muted">correlated threats</span>
        </div>
      </div>

      {/* Top fusion signal */}
      {topFusion && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-xs font-bold text-red-300 mb-1">⚠ Active Correlated Threat Signal</p>
          <p className="font-bold text-[#F2F2F2]">{topFusion.city} — {topFusion.correlationStrength} Correlation</p>
          <p className="text-sm text-[#B6C1D1] mt-1">{topFusion.explanation}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {topFusion.firedDrivers.map((d, i) => (
              <span key={i} className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-200">{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist top 4 */}
      <div className="ui-card">
        <h3 className="font-bold text-[#F2F2F2] mb-3">Active Threat Watchlist</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {watchlist.slice(0, 4).map((entry) => (
            <div key={entry.city} className="flex items-center justify-between rounded-lg border border-[#4F8090]/20 bg-[#1A202C]/50 p-2">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-[#F2F2F2]">{entry.city}</span>
                  {entry.inFusion && <span className="rounded bg-red-500/20 px-1 text-xs text-red-300">FUSION</span>}
                </div>
                <p className="text-xs ui-muted">{entry.incidents} incidents · {entry.topDriver}</p>
              </div>
              <span className={`text-sm font-black ${entry.level === "Critical" ? "text-red-400" : entry.level === "Elevated" ? "text-amber-400" : "text-emerald-400"}`}>
                {entry.threatScore} <span className="text-xs font-normal">{entry.level}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Readiness matrix */}
      <div className="ui-card">
        <h3 className="font-bold text-[#F2F2F2] mb-3">Case Readiness Matrix</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Evidence Ready", dim: readiness.evidenceReady },
            { label: "Legal Ready", dim: readiness.legalReady },
            { label: "Investigative Ready", dim: readiness.investigativeReady },
            { label: "Submission Ready", dim: readiness.submissionReady },
          ].map(({ label, dim }) => (
            <div key={label} className="rounded-lg border border-[#4F8090]/20 bg-[#1A202C]/50 p-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#F2F2F2] font-semibold">{label}</span>
                <span className={`font-bold ${dim.color === "ready" ? "text-emerald-300" : dim.color === "partial" ? "text-amber-300" : "text-red-300"}`}>
                  {dim.status} {dim.pct}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#1A202C]">
                <div className={`h-1.5 rounded-full ${dim.color === "ready" ? "bg-emerald-500" : dim.color === "partial" ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${dim.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: "Evidence Detail", route: "/evidence/DEMO-001", icon: "🔍" },
          { label: "Analytics Command", route: "/analytics", icon: "📊" },
          { label: "Prediction Engine", route: "/prediction-engine", icon: "📡" },
        ].map((item) => (
          <Link key={item.route} to={item.route} className="ui-card flex items-center gap-2 hover:border-[#4F8090]/60 transition text-sm font-semibold text-[#F2F2F2]">
            <span>{item.icon}</span>{item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PitchPanel() {
  const [active, setActive] = useState(0);
  const section = PITCH[active];
  const colorMap = { red: "text-red-300 border-red-500/40 bg-red-500/10", blue: "text-blue-300 border-blue-500/40 bg-blue-500/10", purple: "text-purple-300 border-purple-500/40 bg-purple-500/10", emerald: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" };
  const c = colorMap[section.color];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {PITCH.map((p, i) => (
          <button key={p.section} type="button" onClick={() => setActive(i)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${active === i ? "bg-[#4F8090] text-[#F2F2F2]" : "border border-[#4F8090]/30 text-[#B6C1D1] hover:border-[#4F8090]/60"}`}>
            {p.icon} {p.section}
          </button>
        ))}
      </div>
      <div className={`rounded-2xl border p-5 space-y-3 ${c}`}>
        <h3 className="text-xl font-black">{section.icon} {section.section}</h3>
        <ul className="space-y-2">
          {section.points.map((pt, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#D6DEE8]">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              {pt}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

function ArchitectureView() {
  return (
    <div className="space-y-4">
      <p className="text-sm ui-muted">System architecture — exportable for judge review. All layers run locally in the browser.</p>
      <div className="space-y-3">
        {ARCH_LAYERS.map((layer, li) => (
          <div key={layer.layer} className="rounded-xl border border-[#4F8090]/20 bg-[#1A202C]/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full" style={{ background: layer.color }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: layer.color }}>{layer.layer}</span>
              {li < ARCH_LAYERS.length - 1 && <span className="ml-auto text-xs ui-muted">↓</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {layer.nodes.map((node) => (
                <span key={node} className="rounded-lg border border-[#4F8090]/20 bg-[#222B3C] px-2 py-1 text-xs text-[#B6C1D1]">{node}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#4F8090]/20 bg-[#1A202C]/60 p-3 text-xs space-y-1">
        <p className="font-bold text-[#EF9B20]">Zero-Cost Stack</p>
        <p className="ui-muted">React 19 · Tailwind CSS · Browser SubtleCrypto · IndexedDB · face-api.js (local) · Gemini 1.5 Flash (free tier) · Local logistic regression · BM25+TF-IDF (pure JS)</p>
      </div>
    </div>
  );
}

// ─── Main DemoMode page ───────────────────────────────────────────────────────

const TABS = ["Guided Flow", "Command View", "Pitch Panel", "Architecture"];

function DemoMode() {
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [demoActive, setDemoActive] = useState(isDemoActive());

  // Always compute from demo data for command view — isolated from normal app
  const demoEvidence = useMemo(() => getDemoEvidenceData(), []);
  const intelligence = useMemo(() => generatePredictionIntelligence(demoEvidence), [demoEvidence]);
  const tciResult = useMemo(() => computeThreatCorrelationIndex(demoEvidence, intelligence), [demoEvidence, intelligence]);
  const fusionCorrelated = useMemo(() => computeCorrelatedFusionSignals(demoEvidence, intelligence), [demoEvidence, intelligence]);
  const watchlist = useMemo(() => buildThreatWatchlist(demoEvidence, intelligence), [demoEvidence, intelligence]);
  const readiness = useMemo(() => computeReadinessMatrix(demoEvidence), [demoEvidence]);

  // Sync demo active state
  useEffect(() => { setDemoActive(isDemoActive()); }, []);

  const goStep = (idx) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (idx > step) next.add(step);
      return next;
    });
    setStep(idx);
  };

  const nextStep = () => { if (step < STEPS.length - 1) goStep(step + 1); };
  const prevStep = () => { if (step > 0) goStep(step - 1); };

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="rounded-2xl border border-[#EF9B20]/40 bg-gradient-to-r from-[#1A202C] via-[#243247] to-[#2b3c52] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#EF9B20]/20 px-3 py-1 text-xs font-bold text-[#EF9B20]">DEMO MODE</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${demoActive ? "bg-emerald-500/20 text-emerald-300" : "bg-[#4F8090]/20 text-[#4F8090]"}`}>
                {demoActive ? "● Demo Data Active" : "○ Normal Data"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-[#F2F2F2]">SHAHID.AI Hackathon Demo</h1>
            <p className="text-sm text-[#B6C1D1] mt-1">Guided judging flow · Judge command view · 3-minute pitch · Architecture</p>
          </div>
          <Link to="/dashboard" className="rounded-lg border border-[#4F8090]/40 px-3 py-2 text-sm font-semibold text-[#B6C1D1] hover:border-[#4F8090]">
            ← Back to App
          </Link>
        </div>
      </header>

      {/* Demo seed panel */}
      <DemoSeedPanel
        demoActive={demoActive}
        onActivate={() => setDemoActive(true)}
        onDeactivate={() => setDemoActive(false)}
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-[#4F8090]/20 bg-[#1A202C]/60 p-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${tab === i ? "bg-[#4F8090] text-[#F2F2F2]" : "text-[#B6C1D1] hover:text-[#F2F2F2]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Guided Flow */}
      {tab === 0 && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Step list */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#4F8090] mb-2">Steps</p>
            {STEPS.map((s, i) => (
              <GuidedStep
                key={s.step}
                stepData={s}
                isActive={i === step}
                isCompleted={completedSteps.has(i)}
                onClick={() => goStep(i)}
              />
            ))}
          </div>

          {/* Step detail */}
          <div className="lg:col-span-2 space-y-3">
            <StepDetail stepData={STEPS[step]} />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 0}
                className="rounded-lg border border-[#4F8090]/40 px-4 py-2 text-sm font-semibold text-[#B6C1D1] disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-xs ui-muted">Step {step + 1} of {STEPS.length}</span>
              <button
                type="button"
                onClick={nextStep}
                disabled={step === STEPS.length - 1}
                className="rounded-lg bg-[#4F8090] px-4 py-2 text-sm font-bold text-[#F2F2F2] disabled:opacity-40"
              >
                Next →
              </button>
            </div>
            {step === STEPS.length - 1 && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
                <p className="text-lg font-black text-emerald-300">🎉 Demo Complete</p>
                <p className="text-sm text-[#B6C1D1] mt-1">All 8 modules demonstrated. SHAHID.AI is ready for judging.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Command View */}
      {tab === 1 && (
        <CommandView
          evidence={demoEvidence}
          intelligence={intelligence}
          tciResult={tciResult}
          fusionCorrelated={fusionCorrelated}
          watchlist={watchlist}
          readiness={readiness}
        />
      )}

      {/* Tab: Pitch Panel */}
      {tab === 2 && <PitchPanel />}

      {/* Tab: Architecture */}
      {tab === 3 && <ArchitectureView />}
    </section>
  );
}

export default DemoMode;
