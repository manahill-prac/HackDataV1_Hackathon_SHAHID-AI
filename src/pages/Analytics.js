import React, { useMemo } from "react";
import { getEvidenceList } from "../utils/evidenceStore";
import { generatePredictionIntelligence } from "../utils/crimeML";
import {
  computeThreatCorrelationIndex,
  computeCorrelatedFusionSignals,
  buildThreatWatchlist,
  computeReadinessMatrix,
  generateIntelBriefing,
  computePrioritySignals,
} from "../utils/threatFusion";

function Analytics() {
  const evidence = useMemo(() => getEvidenceList(), []);
  const [filter, setFilter] = React.useState("all");
  const intelligence = useMemo(() => generatePredictionIntelligence(evidence), [evidence]);

  const filtered = useMemo(() => {
    const now = Date.now();
    if (filter === "month") return evidence.filter((e) => now - new Date(e.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000);
    if (filter === "week") return evidence.filter((e) => now - new Date(e.timestamp).getTime() <= 7 * 24 * 60 * 60 * 1000);
    return evidence;
  }, [evidence, filter]);

  const stats = useMemo(() => {
    const sealed = filtered.filter((item) => item.sealed).length;
    const fir = filtered.filter((item) => item.firGenerated).length;
    const hotspots = new Set(
      filtered
        .filter((item) => item.coords?.latitude && item.coords?.longitude)
        .map((item) => `${item.coords.latitude.toFixed(2)},${item.coords.longitude.toFixed(2)}`)
    ).size;
    const arrests = filtered.filter((item) => item.status === "Flagged").length;
    const predictionAccuracy = filtered.length ? Math.min(99, 70 + filtered.length * 2) : 0;
    return {
      totalIncidents: filtered.length,
      hotspotAreas: hotspots,
      predictionAccuracy,
      arrestsMade: arrests,
      evidenceSealed: sealed,
      firsFiled: fir,
    };
  }, [filtered]);

  const typeBreakdown = useMemo(() => {
    const counts = filtered.reduce((acc, item) => {
      const key = item.incidentType || "suspicious";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const list = Object.entries(counts).map(([key, value]) => ({ key, value }));
    return list.length ? list : [{ key: "no-data", value: 0 }];
  }, [filtered]);

  const prediction = useMemo(() => {
    const highRisk = filtered.filter((item) => item.riskLevel === "High").length;
    const mediumRisk = filtered.filter((item) => item.riskLevel === "Medium").length;
    const lowRisk = filtered.filter((item) => item.riskLevel === "Low").length;
    return {
      highRiskForecast: Math.round(highRisk * 1.3),
      mediumRiskForecast: Math.round(mediumRisk * 1.2),
      lowRiskForecast: Math.round(lowRisk * 1.1),
      patrolRecommendation: highRisk > 0 ? "Increase patrol near recent high-risk coordinates." : "Normal patrol pattern remains stable.",
    };
  }, [filtered]);

  const cityCounts = useMemo(() => {
    const byCity = filtered.reduce((acc, item) => {
      const city = item.city || item.locationLabel?.split(" - ")[0] || "Unknown";
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byCity)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const monthCounts = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const counts = months.map((m) => ({ month: m, count: 0 }));
    filtered.forEach((item) => {
      const idx = new Date(item.timestamp).getMonth();
      const map = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
      if (map[idx] !== undefined) counts[map[idx]].count += 1;
    });
    return counts;
  }, [filtered]);
  const slotCounts = useMemo(() => {
    const slots = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    filtered.forEach((item) => {
      const h = new Date(item.timestamp).getHours();
      if (h >= 6 && h < 12) slots.Morning += 1;
      else if (h >= 12 && h < 18) slots.Afternoon += 1;
      else if (h >= 18 && h < 24) slots.Evening += 1;
      else slots.Night += 1;
    });
    return slots;
  }, [filtered]);
  const peakSlot = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const statCards = [
    { label: "Total Incidents", urdu: "کل واقعات", value: stats.totalIncidents },
    { label: "Hotspot Areas", urdu: "ہاٹ اسپاٹ علاقے", value: stats.hotspotAreas },
    { label: "Model Confidence", urdu: "ماڈل اعتماد", value: `${stats.predictionAccuracy}%` },
    { label: "Arrests Made", urdu: "گرفتاریاں", value: stats.arrestsMade },
    { label: "Evidence Sealed", urdu: "سیل شدہ ثبوت", value: stats.evidenceSealed },
    { label: "FIR Drafts", urdu: "ایف آئی آر مسودے", value: stats.firsFiled },
  ];

  const maxBarValue = Math.max(...typeBreakdown.map((item) => item.value), 1);

  // ── Threat Fusion Layer (additive) ──────────────────────────────────────────
  const tciResult = useMemo(() => computeThreatCorrelationIndex(evidence, intelligence), [evidence, intelligence]);
  const fusionCorrelated = useMemo(() => computeCorrelatedFusionSignals(evidence, intelligence), [evidence, intelligence]);
  const watchlist = useMemo(() => buildThreatWatchlist(evidence, intelligence), [evidence, intelligence]);
  const readiness = useMemo(() => computeReadinessMatrix(evidence), [evidence]);
  const briefing = useMemo(() => generateIntelBriefing(evidence, intelligence, tciResult, fusionCorrelated), [evidence, intelligence, tciResult, fusionCorrelated]);
  const prioritySignals = useMemo(() => computePrioritySignals(evidence, intelligence), [evidence, intelligence]);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-[#1A56DB] to-blue-800 p-6 text-white">
        <h1 className="text-2xl font-black">Crime Analytics | جرائم کا تجزیہ</h1>
        <p className="mt-2 text-sm text-blue-100">
          Data-driven intelligence generated from sealed field evidence and incident metadata.
        </p>
        <p className="mt-2 text-xs text-blue-200">
          Model Last Trained: {new Date(intelligence.trainedAt).toLocaleString("en-PK", { hour12: false })}
        </p>
      </header>

      {/* ── THREAT INTELLIGENCE COMMAND CENTER (additive) ───────────────────── */}

      {/* Intelligence Briefing */}
      <div className="rounded-2xl border border-[#EF9B20]/40 bg-gradient-to-r from-[#1A202C] to-[#222B3C] p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#EF9B20]">Today's Intelligence Brief</p>
            <h2 className="mt-1 text-xl font-black text-[#F2F2F2]">SHAHID.AI Command Summary</h2>
            <p className="text-xs ui-muted mt-1">{new Date(briefing.generatedAt).toLocaleString("en-PK", { hour12: false })} · {briefing.totalEvidence} evidence records analysed</p>
          </div>
          <div className="text-right">
            <p className="text-xs ui-muted">Threat Correlation Index</p>
            <p className={`text-4xl font-black ${tciResult.bandColor === "critical" ? "text-red-400" : tciResult.bandColor === "elevated" ? "text-amber-400" : "text-emerald-400"}`}>
              {tciResult.tci}<span className="text-lg">/100</span>
            </p>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${tciResult.bandColor === "critical" ? "bg-red-500/20 text-red-300" : tciResult.bandColor === "elevated" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
              {tciResult.band}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {briefing.bulletPoints.map((pt, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${pt.severity === "critical" ? "bg-red-400" : pt.severity === "elevated" ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className="text-[#D6DEE8]">{pt.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TCI + Drivers */}
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Threat Correlation Index | خطرہ ارتباط اشاریہ</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className={`text-5xl font-black ${tciResult.bandColor === "critical" ? "text-red-400" : tciResult.bandColor === "elevated" ? "text-amber-400" : "text-emerald-400"}`}>
              {tciResult.tci}
            </div>
            <div>
              <div className="h-3 w-40 rounded-full bg-[#1A202C]">
                <div
                  className={`h-3 rounded-full ${tciResult.bandColor === "critical" ? "bg-red-500" : tciResult.bandColor === "elevated" ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${tciResult.tci}%` }}
                />
              </div>
              <p className={`mt-1 text-sm font-bold ${tciResult.bandColor === "critical" ? "text-red-400" : tciResult.bandColor === "elevated" ? "text-amber-400" : "text-emerald-400"}`}>
                {tciResult.band} Threat Level
              </p>
              <p className="text-xs ui-muted">0–39 Low · 40–69 Elevated · 70–100 Critical</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#4F8090]">Score Drivers</p>
            {tciResult.drivers.length === 0 ? (
              <p className="text-sm ui-muted">No active threat drivers detected.</p>
            ) : (
              tciResult.drivers.map((d, i) => (
                <div key={i} className="rounded-lg border border-[#4F8090]/20 bg-[#1A202C]/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F2F2F2]">{d.label}</span>
                    <span className={`text-xs font-bold ${d.severity === "critical" ? "text-red-400" : "text-amber-400"}`}>+{d.contribution}pts</span>
                  </div>
                  <p className="mt-0.5 text-xs ui-muted">{d.detail}</p>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Case Readiness Matrix */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Case Readiness Matrix | کیس تیاری میٹرکس</h2>
          <div className="mt-3 mb-3 flex items-center gap-3">
            <span className={`text-4xl font-black ${readiness.composite >= 75 ? "text-emerald-400" : readiness.composite >= 40 ? "text-amber-400" : "text-red-400"}`}>
              {readiness.composite}%
            </span>
            <div>
              <p className="text-sm font-bold text-[#F2F2F2]">Composite Readiness</p>
              <p className="text-xs ui-muted">Across {readiness.evidenceReady.total} evidence records</p>
            </div>
          </div>
          {[
            { label: "Evidence Ready", urdu: "ثبوت تیار", dim: readiness.evidenceReady },
            { label: "Legal Ready", urdu: "قانونی تیار", dim: readiness.legalReady },
            { label: "Investigative Ready", urdu: "تفتیشی تیار", dim: readiness.investigativeReady },
            { label: "Submission Ready", urdu: "جمع کرانے کے لیے تیار", dim: readiness.submissionReady },
          ].map(({ label, urdu, dim }) => (
            <div key={label} className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#F2F2F2] font-semibold">{label} <span className="ui-muted font-normal">| {urdu}</span></span>
                <span className={`font-bold rounded px-2 py-0.5 ${dim.color === "ready" ? "bg-emerald-500/20 text-emerald-300" : dim.color === "partial" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
                  {dim.status} · {dim.pct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#1A202C]">
                <div
                  className={`h-2 rounded-full ${dim.color === "ready" ? "bg-emerald-500" : dim.color === "partial" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${dim.pct}%` }}
                />
              </div>
            </div>
          ))}
        </article>
      </div>

      {/* Fusion Threat Signals + Watchlist */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Correlated Fusion Signals */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Correlated Threat Signals | مربوط خطرہ اشارے</h2>
          <p className="text-xs ui-muted mt-1">Raised when repeat suspect + anomaly + high-risk evidence align for same area</p>
          <div className="mt-3 space-y-3">
            {fusionCorrelated.length === 0 ? (
              <p className="text-sm ui-muted">No correlated multi-signal threats currently active.</p>
            ) : (
              fusionCorrelated.map((sig, i) => (
                <div key={`${sig.city}-${i}`} className={`rounded-xl border p-3 ${sig.correlationStrength === "Strong" ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
                  <div className="flex items-center justify-between">
                    <p className={`font-bold text-sm ${sig.correlationStrength === "Strong" ? "text-red-300" : "text-amber-300"}`}>
                      ⚠ Correlated Threat Signal Detected
                    </p>
                    <span className={`text-xs font-bold rounded px-2 py-0.5 ${sig.correlationStrength === "Strong" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {sig.correlationStrength} · {sig.signalCount}/3 signals
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#F2F2F2]">{sig.city}</p>
                  <p className="mt-1 text-xs ui-muted">{sig.explanation}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sig.firedDrivers.map((d, j) => (
                      <span key={j} className="rounded bg-[#4F8090]/20 px-2 py-0.5 text-xs text-[#B6C1D1]">{d}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {/* Active Threat Watchlist */}
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Active Threat Watchlist | فعال خطرہ واچ لسٹ</h2>
          <p className="text-xs ui-muted mt-1">Cities ranked by computed threat score — prediction + risk density + fusion membership</p>
          <div className="mt-3 space-y-2">
            {watchlist.length === 0 ? (
              <p className="text-sm ui-muted">No watchlist entries. Capture evidence to populate.</p>
            ) : (
              watchlist.slice(0, 6).map((entry, i) => (
                <div key={entry.city} className="flex items-center gap-3 rounded-lg border border-[#4F8090]/20 bg-[#1A202C]/50 p-2">
                  <span className="text-xs font-black text-[#4F8090] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#F2F2F2] truncate">{entry.city}</span>
                      {entry.inFusion && <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">FUSION</span>}
                    </div>
                    <p className="text-xs ui-muted">{entry.incidents} incidents · {entry.highRisk} high-risk · {entry.topDriver}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${entry.level === "Critical" ? "text-red-400" : entry.level === "Elevated" ? "text-amber-400" : "text-emerald-400"}`}>
                      {entry.threatScore}
                    </p>
                    <p className={`text-xs font-bold ${entry.level === "Critical" ? "text-red-400" : entry.level === "Elevated" ? "text-amber-400" : "text-emerald-400"}`}>
                      {entry.level}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {/* Priority Investigative Signals */}
      {prioritySignals.length > 0 && (
        <article className="ui-card">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Priority Investigative Signals | ترجیحی تفتیشی اشارے</h2>
          <p className="text-xs ui-muted mt-1">Derived from real evidence gaps and fusion signals — not heuristic templates</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {prioritySignals.map((sig) => (
              <div key={sig.priority} className="rounded-xl border border-[#4F8090]/30 bg-[#1A202C]/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-5 w-5 shrink-0 rounded-full text-xs font-black flex items-center justify-center ${sig.priority === 1 ? "bg-red-500 text-white" : sig.priority === 2 ? "bg-amber-500 text-white" : "bg-[#4F8090] text-white"}`}>
                    {sig.priority}
                  </span>
                  <span className="text-sm font-bold text-[#F2F2F2]">{sig.label}</span>
                  {sig.count > 0 && <span className="ml-auto text-xs font-bold text-[#EF9B20]">{sig.count} item{sig.count > 1 ? "s" : ""}</span>}
                </div>
                <p className="text-xs text-[#B6C1D1] font-semibold">{sig.action}</p>
                <p className="mt-1 text-xs ui-muted">{sig.reason}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* ── END COMMAND CENTER — existing analytics continues below ─────────── */}
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[#4F8090]/20" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#4F8090]">Detailed Analytics</span>
        <div className="h-px flex-1 bg-[#4F8090]/20" />
      </div>

      <div className="flex gap-2">
        {[
          ["all", "All Time | تمام وقت"],
          ["month", "Last Month | پچھلا مہینہ"],
          ["week", "Last Week | پچھلا ہفتہ"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter === key ? "bg-[#1A56DB] text-white" : "bg-white text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Pakistan Heatmap | پاکستان ہاٹ اسپاٹ نقشہ</h2>
        <div className="mb-2 flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />High</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Medium</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Low</span>
        </div>
        <svg viewBox="0 0 500 260" className="w-full rounded-xl bg-slate-100 p-3">
          <path d="M90 200 L120 145 L145 116 L205 90 L250 75 L305 78 L350 96 L405 140 L380 196 L330 226 L260 220 L205 236 L140 228 Z" fill="#dbeafe" stroke="#1A56DB" strokeWidth="3" />
          {[
            { city: "Karachi",     x: 150, y: 210, lx: 8,   ly: -6  },
            { city: "Lahore",      x: 310, y: 130, lx: 8,   ly: -6  },
            { city: "Islamabad",   x: 290, y: 82,  lx: -76, ly: -6  },
            { city: "Rawalpindi",  x: 308, y: 90,  lx: 8,   ly: -6  },
            { city: "Peshawar",    x: 248, y: 65,  lx: 8,   ly: -6  },
            { city: "Quetta",      x: 118, y: 148, lx: 8,   ly: -6  },
          ].map((city) => {
            const count = cityCounts.find((c) => c.city === city.city)?.count || 0;
            return (
              <g key={city.city}>
                <circle cx={city.x} cy={city.y} r={Math.max(4, count + 3)} fill={count > 8 ? "#dc2626" : count > 4 ? "#f59e0b" : "#10b981"} opacity="0.7">
                  <title>{`${city.city}: ${count}`}</title>
                </circle>
                {/* Label background for readability on dark map */}
                <rect
                  x={city.x + city.lx - 2}
                  y={city.y + city.ly - 10}
                  width={city.city.length * 6.2 + 4}
                  height={13}
                  rx="2"
                  fill="rgba(15,23,42,0.65)"
                />
                <text
                  x={city.x + city.lx}
                  y={city.y + city.ly}
                  fontSize="10"
                  fontWeight="600"
                  fill="#f1f5f9"
                >
                  {city.city}
                </text>
              </g>
            );
          })}
          {filtered
            .filter((item) => item.coords?.latitude && item.coords?.longitude)
            .map((item) => {
              const x = 120 + ((item.coords.longitude - 66) / 10) * 250;
              const y = 210 - ((item.coords.latitude - 24) / 13) * 140;
              return <circle key={item.id} cx={x} cy={y} r="5" fill="#dc2626" opacity="0.85" />;
            })}
        </svg>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="text-xs text-slate-500">{item.urdu}</p>
            <p className="mt-2 text-3xl font-black text-[#1A56DB]">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">6-Month Trend | چھ ماہ رجحان</h2>
          <svg viewBox="0 0 500 240" className="mt-4 w-full">
            <line x1="50" y1="20" x2="50" y2="200" stroke="#94a3b8" />
            <line x1="50" y1="200" x2="460" y2="200" stroke="#94a3b8" />
            <polyline
              fill="none"
              stroke="#1A56DB"
              strokeWidth="3"
              points={monthCounts
                .map((m, i) => `${60 + i * 70},${190 - m.count * 8}`)
                .join(" ")}
            />
            {monthCounts.map((m, i) => (
              <g key={m.month}>
                <circle cx={60 + i * 70} cy={190 - m.count * 8} r="4" fill="#1A56DB" />
                <text x={52 + i * 70} y="220" fontSize="11" fill="#94a3b8">
                  {m.month}
                </text>
                <text x={56 + i * 70} y={180 - m.count * 8} fontSize="10" fill="#e2e8f0">
                  {m.count}
                </text>
              </g>
            ))}
          </svg>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Crime Type Breakdown | جرائم کی اقسام</h2>
          <svg viewBox="0 0 460 220" className="mt-4 w-full">
            {typeBreakdown.map((item, index) => {
              const width = (item.value / maxBarValue) * 280;
              const y = 20 + index * 35;
              return (
                <g key={item.key}>
                  <text x="0" y={y + 16} fontSize="12" fill="#94a3b8">
                    {item.key}
                  </text>
                  <rect x="140" y={y} width={width} height="20" rx="6" fill="#1A56DB" />
                  <text x={145 + width} y={y + 14} fontSize="12" fill="#e2e8f0">
                    {item.value}
                  </text>
                </g>
              );
            })}
          </svg>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">48-Hour Prediction | 48 گھنٹے کی پیش گوئی</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">High-risk projected incidents:</span> {prediction.highRiskForecast}
            </p>
            <p>
              <span className="font-semibold">Medium-risk projected incidents:</span> {prediction.mediumRiskForecast}
            </p>
            <p>
              <span className="font-semibold">Low-risk projected incidents:</span> {prediction.lowRiskForecast}
            </p>
            <p>
              <span className="font-semibold">Recommendation:</span> {prediction.patrolRecommendation}
            </p>
            <p className="rounded-lg bg-blue-50 p-3 text-[#1A56DB]">
              پیش گوئی آپ کے محفوظ شدہ ثبوت کی بنیاد پر خودکار طور پر اپڈیٹ ہوتی ہے۔
            </p>
          </div>
        </article>
      </div>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Threat Intelligence Board</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {intelligence.fusionSignals.slice(0, 4).map((signal) => (
            <div key={`${signal.city}-${signal.label}`} className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
              <p className="font-semibold text-red-300">{signal.label}</p>
              <p className="text-[#B6C1D1]">{signal.city} | Threat Score: {signal.threatScore}</p>
            </div>
          ))}
          {!intelligence.fusionSignals.length ? <p className="text-sm ui-muted">No correlated fusion threat signals currently.</p> : null}
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">City Ranking | شہروں کی درجہ بندی</h2>
        <div className="mt-3 space-y-3">
          {cityCounts.slice(0, 5).map((city) => (
            <div key={city.city}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{city.city}</span>
                <span>{city.count}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200">
                <div
                  className="h-3 rounded-full bg-[#1A56DB]"
                  style={{ width: `${(city.count / Math.max(cityCounts[0]?.count || 1, 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Time of Day Analysis | وقت کے مطابق تجزیہ</h2>
        <div className="mt-3 grid gap-2">
          {Object.entries(slotCounts).map(([slot, count]) => (
            <div key={slot}>
              <div className="mb-1 flex justify-between text-sm"><span>{slot}</span><span>{count}</span></div>
              <div className="h-3 rounded-full bg-slate-200">
                <div className={`h-3 rounded-full ${peakSlot === slot ? "bg-red-500" : "bg-[#1A56DB]"}`} style={{ width: `${(count / Math.max(1, ...Object.values(slotCounts))) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="text-sm font-semibold text-red-600">Peak crime time: {peakSlot}</p>
        </div>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">48-Hour City Risk | اگلے 48 گھنٹے</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cityCounts.slice(0, 8).map((c) => {
            const level = c.count > 7 ? "High" : c.count > 4 ? "Medium" : "Low";
            return (
              <div key={c.city} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-semibold">{c.city}</p>
                <span className={`mt-1 inline-block rounded px-2 py-1 text-xs ${level === "High" ? "bg-red-100 text-red-700" : level === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {level}
                </span>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

export default Analytics;
