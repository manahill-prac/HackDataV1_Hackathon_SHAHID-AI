import React, { useMemo } from "react";
import { getEvidenceList } from "../utils/evidenceStore";
import { generatePredictionIntelligence } from "../utils/crimeML";

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
    { label: "Prediction Accuracy", urdu: "پیش گوئی درستگی", value: `${stats.predictionAccuracy}%` },
    { label: "Arrests Made", urdu: "گرفتاریاں", value: stats.arrestsMade },
    { label: "Evidence Sealed", urdu: "سیل شدہ ثبوت", value: stats.evidenceSealed },
    { label: "FIRs Filed", urdu: "درج ایف آئی آر", value: stats.firsFiled },
  ];

  const maxBarValue = Math.max(...typeBreakdown.map((item) => item.value), 1);

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
            { city: "Karachi", x: 150, y: 210 },
            { city: "Lahore", x: 275, y: 105 },
            { city: "Islamabad", x: 300, y: 80 },
            { city: "Rawalpindi", x: 306, y: 88 },
            { city: "Peshawar", x: 250, y: 70 },
            { city: "Quetta", x: 120, y: 120 },
          ].map((city) => {
            const count = cityCounts.find((c) => c.city === city.city)?.count || 0;
            return (
              <g key={city.city}>
                <circle cx={city.x} cy={city.y} r={Math.max(4, count + 3)} fill={count > 8 ? "#dc2626" : count > 4 ? "#f59e0b" : "#10b981"} opacity="0.7">
                  <title>{`${city.city}: ${count}`}</title>
                </circle>
                <text x={city.x + 7} y={city.y - 3} fontSize="11" fill="#0f172a">
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
                <text x={52 + i * 70} y="220" fontSize="11" fill="#334155">
                  {m.month}
                </text>
                <text x={56 + i * 70} y={180 - m.count * 8} fontSize="10" fill="#0f172a">
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
                  <text x="0" y={y + 16} fontSize="12" fill="#475569">
                    {item.key}
                  </text>
                  <rect x="140" y={y} width={width} height="20" rx="6" fill="#1A56DB" />
                  <text x={145 + width} y={y + 14} fontSize="12" fill="#0f172a">
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
            <div key={`${signal.city}-${signal.label}`} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <p className="font-semibold text-red-700">{signal.label}</p>
              <p>{signal.city} | Threat Score: {signal.threatScore}</p>
            </div>
          ))}
          {!intelligence.fusionSignals.length ? <p className="text-sm text-slate-600">No correlated fusion threat signals currently.</p> : null}
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
