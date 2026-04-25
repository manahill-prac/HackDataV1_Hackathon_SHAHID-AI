import React from "react";
import { Link } from "react-router-dom";

const statusClass = {
  Verified: "bg-emerald-500/20 text-emerald-300",
  Processing: "bg-amber-500/20 text-amber-300",
  Flagged: "bg-red-500/20 text-red-300",
};

const riskClass = {
  Low: "text-emerald-600",
  Medium: "text-amber-600",
  High: "text-red-600",
};

function EvidenceCard({ evidence }) {
  const createdAt = new Date(evidence.timestamp);
  const status = evidence.status || "Processing";
  const risk = evidence.riskLevel || "Medium";

  return (
    <article className="rounded-xl border border-[#4F8090]/25 bg-[#222B3C] p-4 shadow-lg shadow-black/20 transition hover:border-[#4F8090]/60">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#F2F2F2]">{evidence.titleEn}</h3>
          <p className="text-xs text-[#B6C1D1]">{evidence.titleUr}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-sm text-[#B6C1D1]">Location | مقام: {evidence.locationLabel}</p>
      <p className="text-sm text-[#B6C1D1]">
        Captured | محفوظ: {createdAt.toLocaleString("en-PK", { hour12: false })}
      </p>
      <p className={`mt-2 text-sm font-semibold ${riskClass[risk]}`}>Risk Level | خطرہ: {risk}</p>
      <Link to={`/evidence/${evidence.id}`} className="mt-3 inline-block text-sm font-semibold text-[#EF9B20] hover:text-[#B89B47]">
        View Details | تفصیل دیکھیں
      </Link>
    </article>
  );
}

export default EvidenceCard;
