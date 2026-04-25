import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import EvidenceCard from "../components/EvidenceCard";
import { getEvidenceList } from "../utils/evidenceStore";

function Dashboard() {
  const evidenceList = useMemo(() => getEvidenceList(), []);
  const recent = evidenceList.slice(0, 6);

  const stats = useMemo(() => {
    const verified = evidenceList.filter((item) => item.status === "Verified").length;
    const firs = evidenceList.filter((item) => item.firGenerated).length;
    const flagged = evidenceList.filter((item) => item.status === "Flagged").length;
    return [
      { label: "Cases Tracked", urdu: "ٹریک شدہ کیسز", value: evidenceList.length },
      { label: "Evidence Sealed", urdu: "سیل شدہ ثبوت", value: verified },
      { label: "FIR Drafts", urdu: "ایف آئی آر مسودے", value: firs },
      { label: "Suspects Flagged", urdu: "مشکوک افراد", value: flagged },
    ];
  }, [evidenceList]);
  const latestHigh = evidenceList.find((item) => item.riskLevel === "High");
  const now = Date.now();
  const quick = {
    today: evidenceList.filter((e) => now - new Date(e.timestamp).getTime() <= 24 * 60 * 60 * 1000).length,
    week: evidenceList.filter((e) => now - new Date(e.timestamp).getTime() <= 7 * 24 * 60 * 60 * 1000).length,
    pendingFir: evidenceList.filter((e) => !e.firGenerated).length,
  };

  return (
    <section className="space-y-7">
      <div className="overflow-hidden rounded-3xl border border-[#4F8090]/30 bg-gradient-to-r from-[#1A202C] via-[#243247] to-[#2b3c52] p-8 text-white shadow-2xl shadow-black/30">
        <p className="text-sm font-medium tracking-wide text-[#B6C1D1]">
          پاکستان کا پہلا اے آئی کرائم انٹیلیجنس اینڈ ایویڈنس پلیٹ فارم
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[#F2F2F2] sm:text-4xl">SHAHID.AI Command Dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#D6DEE8] sm:text-base">
          Real-time evidence intelligence, chain-of-custody integrity, and AI-backed decision support
          for field teams and investigators.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/capture" className="ui-primary-btn text-sm">
            Capture Evidence | ثبوت محفوظ کریں
          </Link>
          <Link to="/analytics" className="ui-accent-btn text-sm">
            Open Analytics | تجزیہ کھولیں
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="ui-card">
            <p className="text-xs uppercase tracking-wide text-[#B6C1D1]">{item.label}</p>
            <p className="mt-1 text-xs text-[#9EB0C6]">{item.urdu}</p>
            <p className="mt-3 text-3xl font-black text-[#F2F2F2]">{item.value}</p>
          </article>
        ))}
      </div>
      {latestHigh ? (
        <div className="rounded-2xl border border-[#EF9B20]/40 bg-[#EF9B20]/10 p-5">
          <h2 className="text-lg font-bold text-[#EF9B20]">Latest Alert | تازہ الرٹ</h2>
          <p className="mt-1 text-sm text-[#F2F2F2]">
            {latestHigh.titleEn} - {latestHigh.locationLabel} - {new Date(latestHigh.timestamp).toLocaleString("en-PK", { hour12: false })}
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="ui-card">
          <p className="text-xs text-[#B6C1D1]">Today's Incidents | آج</p>
          <p className="text-2xl font-black text-[#F2F2F2]">{quick.today}</p>
        </article>
        <article className="ui-card">
          <p className="text-xs text-[#B6C1D1]">This Week | اس ہفتے</p>
          <p className="text-2xl font-black text-[#F2F2F2]">{quick.week}</p>
        </article>
        <article className="ui-card">
          <p className="text-xs text-[#B6C1D1]">Pending FIRs | زیر التوا ایف آئی آر</p>
          <p className="text-2xl font-black text-[#F2F2F2]">{quick.pendingFir}</p>
        </article>
      </div>

      <div className="ui-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#F2F2F2]">Recent Evidence | حالیہ ثبوت</h2>
          <Link to="/capture" className="text-sm font-semibold text-[#EF9B20]">
            + New Evidence
          </Link>
        </div>
        {recent.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {recent.map((evidence) => (
              <EvidenceCard key={evidence.id} evidence={evidence} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-[#1A202C] p-4 text-sm text-[#B6C1D1]">
            No evidence captured yet. Start by using the Capture Evidence module.
          </p>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
