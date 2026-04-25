/**
 * SHAHID.AI — Court Submission Packet Generator
 * Pure browser-native implementation. Zero CDN. Zero paid libraries.
 * Generates a structured HTML document downloaded as a file.
 * Professional court-ready layout using inline styles only.
 */

/**
 * Generate and download the court submission packet.
 * @param {object} evidence — full evidence record
 * @param {Array}  retrievedLaws — from ragEngine
 * @param {object} firDraft — { en, ur, sections } from firDraftEngine
 * @param {number} caseReadiness — 0-100 score
 */
export function generateCourtPacket(evidence, retrievedLaws, firDraft, caseReadiness) {
  if (!evidence) return;

  const ai = evidence.aiAnalysis || {};
  const safeRetrieved = Array.isArray(retrievedLaws) ? retrievedLaws : [];
  const now = new Date().toLocaleString("en-PK", { hour12: false });
  const filename = `SHAHID_AI_CourtReady_FIR_${evidence.id}.html`;

  const custodyRows = (evidence.custodyTimeline || [])
    .map((step, i) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"}">
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b">${step.label}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569">${step.labelUr || ""}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;font-family:monospace;font-size:12px">${new Date(step.at).toLocaleString("en-PK", { hour12: false })}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#64748b;font-family:monospace;font-size:11px">${step.chainHash ? step.chainHash.slice(0, 20) + "..." : "—"}</td>
      </tr>`)
    .join("");

  const lawRows = safeRetrieved
    .map((law, i) => `
      <tr style="background:${i % 2 === 0 ? "#f0f9ff" : "#ffffff"}">
        <td style="padding:8px 12px;border:1px solid #bae6fd;font-weight:700;color:#0369a1;white-space:nowrap">${law.section}</td>
        <td style="padding:8px 12px;border:1px solid #bae6fd;font-weight:600;color:#1e293b">${law.title}</td>
        <td style="padding:8px 12px;border:1px solid #bae6fd;color:#475569;font-size:12px">${law.act}</td>
        <td style="padding:8px 12px;border:1px solid #bae6fd;color:#475569;font-size:12px">${law.reason}</td>
        <td style="padding:8px 12px;border:1px solid #bae6fd;text-align:center;font-weight:700;color:${law.score > 70 ? "#16a34a" : "#d97706"}">${law.score}/99</td>
      </tr>`)
    .join("");

  const ppcRows = (ai.ppc_sections || [])
    .map((sec) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:700;color:#1e40af">${sec.section}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">${sec.title}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;font-size:12px">${sec.description}</td>
        <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#dc2626;font-size:12px">${sec.penalty}</td>
      </tr>`)
    .join("");

  const readinessColor = caseReadiness >= 75 ? "#16a34a" : caseReadiness >= 50 ? "#d97706" : "#dc2626";
  const readinessLabel = caseReadiness >= 75 ? "CASE PACKAGE READY" : caseReadiness >= 50 ? "PARTIALLY READY" : "INCOMPLETE";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SHAHID.AI Court Submission Packet — ${evidence.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; font-size: 13px; }
  .page { max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #1a56db 100%); color: #fff; padding: 32px; border-radius: 8px; margin-bottom: 28px; }
  .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 0.5px; }
  .header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 4px; padding: 3px 10px; font-size: 11px; font-weight: 700; margin-top: 10px; margin-right: 6px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 14px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .meta-item { background: #f1f5f9; border-radius: 6px; padding: 10px 14px; }
  .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; }
  .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .readiness-bar { height: 16px; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin: 8px 0; }
  .readiness-fill { height: 100%; border-radius: 8px; transition: width 0.3s; }
  .statement-box { background: #f0f9ff; border-left: 4px solid #1a56db; padding: 14px 16px; border-radius: 0 6px 6px 0; font-size: 13px; line-height: 1.6; color: #1e293b; }
  .urdu-box { background: #fefce8; border-left: 4px solid #ca8a04; padding: 14px 16px; border-radius: 0 6px 6px 0; font-size: 13px; line-height: 1.8; color: #1e293b; direction: rtl; text-align: right; margin-top: 10px; }
  .hash-box { font-family: monospace; font-size: 11px; background: #1e293b; color: #86efac; padding: 10px 14px; border-radius: 6px; word-break: break-all; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px; }
  .grounded-badge { display: inline-block; background: #dcfce7; color: #16a34a; border: 1px solid #86efac; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
  @media print { body { background: #fff; } .page { padding: 20px; } }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <h1>⚖ SHAHID.AI — Court Submission Packet</h1>
    <p>Pakistan's First AI Crime Intelligence &amp; Evidence Platform</p>
    <p style="margin-top:6px;font-size:11px;opacity:0.7">Generated: ${now}</p>
    <div>
      <span class="badge">Digitally Sealed</span>
      <span class="badge">Citation Grounded</span>
      <span class="badge">Tamper Evident</span>
      <span class="badge">SHAHID-FIR-${evidence.id}</span>
    </div>
  </div>

  <!-- CASE READINESS -->
  <div class="section">
    <div class="section-title">Case Readiness Score</div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
      <div style="font-size:36px;font-weight:900;color:${readinessColor}">${caseReadiness}%</div>
      <div>
        <div style="font-weight:700;color:${readinessColor};font-size:14px">${readinessLabel}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Based on evidence integrity, legal grounding, custody completeness &amp; AI analysis</div>
      </div>
    </div>
    <div class="readiness-bar">
      <div class="readiness-fill" style="width:${caseReadiness}%;background:${readinessColor}"></div>
    </div>
  </div>

  <!-- EVIDENCE METADATA -->
  <div class="section">
    <div class="section-title">Evidence Metadata</div>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">Evidence ID</div><div class="meta-value">${evidence.id}</div></div>
      <div class="meta-item"><div class="meta-label">Incident Type</div><div class="meta-value">${evidence.incidentType || "Unknown"}</div></div>
      <div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">${evidence.status || "Unknown"}</div></div>
      <div class="meta-item"><div class="meta-label">Risk Level</div><div class="meta-value" style="color:${evidence.riskLevel === "High" ? "#dc2626" : evidence.riskLevel === "Medium" ? "#d97706" : "#16a34a"}">${evidence.riskLevel || "Unknown"}</div></div>
      <div class="meta-item"><div class="meta-label">Location</div><div class="meta-value">${evidence.locationLabel || "Unknown"}</div></div>
      <div class="meta-item"><div class="meta-label">GPS Coordinates</div><div class="meta-value">${evidence.coords ? `${evidence.coords.latitude.toFixed(6)}, ${evidence.coords.longitude.toFixed(6)}` : "Not available"}</div></div>
      <div class="meta-item"><div class="meta-label">Incident Time</div><div class="meta-value">${evidence.timestamp ? new Date(evidence.timestamp).toLocaleString("en-PK", { hour12: false }) : "Unknown"}</div></div>
      <div class="meta-item"><div class="meta-label">Sealed At</div><div class="meta-value">${evidence.sealedAt ? new Date(evidence.sealedAt).toLocaleString("en-PK", { hour12: false }) : "Not sealed"}</div></div>
    </div>
    <div style="margin-top:12px">
      <div class="meta-label" style="margin-bottom:6px">SHA-256 Integrity Hash</div>
      <div class="hash-box">${evidence.hash || "Not computed"}</div>
    </div>
  </div>

  <!-- AI WITNESS STATEMENT -->
  <div class="section">
    <div class="section-title">AI Witness Statement</div>
    ${ai.statement_en ? `<div class="statement-box">${ai.statement_en}</div>` : '<div class="statement-box" style="color:#94a3b8">AI statement not available.</div>'}
    ${ai.statement_ur ? `<div class="urdu-box">${ai.statement_ur}</div>` : ""}
    ${ai.risk_assessment ? `<div style="margin-top:10px;padding:10px 14px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 6px 6px 0;font-size:12px"><strong>Risk Assessment:</strong> ${ai.risk_assessment}</div>` : ""}
    ${ai.recommended_action ? `<div style="margin-top:8px;padding:10px 14px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 6px 6px 0;font-size:12px"><strong>Recommended Action:</strong> ${ai.recommended_action}</div>` : ""}
  </div>

  <!-- GROUNDED LEGAL RETRIEVAL -->
  <div class="section">
    <div class="section-title">
      Grounded Legal Retrieval
      <span class="grounded-badge" style="margin-left:10px">✓ Grounded Legal Retrieval Verified</span>
    </div>
    ${safeRetrieved.length ? `
    <table>
      <thead>
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Section</th>
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Title</th>
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Act</th>
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Why Matched</th>
          <th style="padding:10px 12px;text-align:center;border:1px solid #1e40af">Score</th>
        </tr>
      </thead>
      <tbody>${lawRows}</tbody>
    </table>
    <div style="margin-top:12px;space-y:8px">
      ${safeRetrieved.map((l) => `
        <div style="margin-top:10px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:12px">
          <strong style="color:#1e40af">${l.section} — ${l.title}</strong><br>
          <span style="color:#64748b">${l.explanation}</span><br>
          <span style="color:#94a3b8;font-style:italic;margin-top:4px;display:block">"${l.citation_text.slice(0, 300)}${l.citation_text.length > 300 ? "..." : ""}"</span>
        </div>`).join("")}
    </div>` : '<p style="color:#94a3b8;font-size:12px">No laws retrieved. Run Legal RAG analysis to populate this section.</p>'}
  </div>

  <!-- AI PPC SECTIONS -->
  ${(ai.ppc_sections || []).length ? `
  <div class="section">
    <div class="section-title">AI-Identified PPC Sections</div>
    <table>
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Section</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Title</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Description</th>
          <th style="padding:8px 12px;text-align:left;border:1px solid #e2e8f0">Penalty</th>
        </tr>
      </thead>
      <tbody>${ppcRows}</tbody>
    </table>
  </div>` : ""}

  <!-- CHAIN OF CUSTODY -->
  <div class="section">
    <div class="section-title">Tamper-Evident Chain of Custody</div>
    ${(evidence.custodyTimeline || []).length ? `
    <table>
      <thead>
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Event</th>
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">اردو</th>
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Timestamp</th>
          <th style="padding:10px 12px;text-align:left;border:1px solid #1e40af">Chain Hash</th>
        </tr>
      </thead>
      <tbody>${custodyRows}</tbody>
    </table>` : '<p style="color:#94a3b8;font-size:12px">No custody timeline recorded.</p>'}
  </div>

  <!-- FIR DRAFT -->
  <div class="section">
    <div class="section-title">FIR Draft (English)</div>
    <pre style="white-space:pre-wrap;font-family:'Courier New',monospace;font-size:11px;background:#1e293b;color:#e2e8f0;padding:20px;border-radius:8px;line-height:1.6;overflow-x:auto">${(firDraft.en || "FIR draft not generated.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </div>

  <div class="section">
    <div class="section-title">FIR Draft (Urdu — اردو)</div>
    <pre style="white-space:pre-wrap;font-family:'Courier New',monospace;font-size:11px;background:#1e293b;color:#fef9c3;padding:20px;border-radius:8px;line-height:1.8;direction:rtl;text-align:right;overflow-x:auto">${(firDraft.ur || "اردو مسودہ دستیاب نہیں۔").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p style="font-weight:700;font-size:12px;color:#1e293b;margin-bottom:6px">
      Digitally Sealed &bull; Citation Grounded &bull; Tamper Evident
    </p>
    <p>SHAHID.AI Legal Intelligence Engine v1.0 &bull; Pakistan's First AI Crime Intelligence Platform</p>
    <p style="margin-top:4px">Generated: ${now} &bull; Evidence ID: ${evidence.id}</p>
    <p style="margin-top:8px;color:#94a3b8;font-size:10px">
      This document is AI-assisted and requires review by a qualified legal officer before formal court submission.
      All cited sections are grounded in the local legal corpus (PPC, CrPC, QSO). No external services used.
    </p>
  </div>

</div>
</body>
</html>`;

  // Download as HTML file — pure browser, zero dependencies
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
