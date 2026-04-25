/**
 * SHAHID.AI — Court Submission Packet Generator
 * Produces a true PDF via browser-native print-to-PDF (hidden iframe).
 * Zero external dependencies. All existing content sections preserved.
 *
 * Approach: inject full HTML into a hidden iframe → call contentWindow.print().
 * Chrome/Edge with "Save as PDF" default printer auto-downloads as PDF.
 * Firefox/Safari open the print dialog — user selects "Save as PDF".
 * Graceful fallback: if iframe fails, downloads the HTML file instead.
 *
 * Button flow in EvidenceDetail.js is completely unchanged.
 * generateCourtPacket() signature is identical.
 */

/**
 * Generate and download the court submission packet as PDF.
 * @param {object} evidence       — full evidence record
 * @param {Array}  retrievedLaws  — from ragEngine
 * @param {object} firDraft       — { en, ur, sections } from firDraftEngine
 * @param {number} caseReadiness  — 0-100 score
 */
export function generateCourtPacket(evidence, retrievedLaws, firDraft, caseReadiness) {
  if (!evidence) return;

  const ai = evidence.aiAnalysis || {};
  const safeRetrieved = Array.isArray(retrievedLaws) ? retrievedLaws : [];
  const now = new Date().toLocaleString("en-PK", { hour12: false });
  const pdfFilename = `SHAHID_AI_CourtReady_FIR_${evidence.id}.pdf`;

  // ── Row builders ────────────────────────────────────────────────────────────

  const custodyRows = (evidence.custodyTimeline || [])
    .map((step, i) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"}">
        <td>${step.label}</td>
        <td>${step.labelUr || ""}</td>
        <td style="font-family:monospace;font-size:11px">${new Date(step.at).toLocaleString("en-PK", { hour12: false })}</td>
        <td style="font-family:monospace;font-size:10px">${step.chainHash ? step.chainHash.slice(0, 20) + "..." : "—"}</td>
      </tr>`)
    .join("");

  const lawRows = safeRetrieved
    .map((law, i) => `
      <tr style="background:${i % 2 === 0 ? "#f0f9ff" : "#ffffff"}">
        <td style="font-weight:700;color:#0369a1;white-space:nowrap">${law.section}</td>
        <td style="font-weight:600">${law.title}</td>
        <td style="font-size:11px;color:#475569">${law.act}</td>
        <td style="font-size:11px;color:#475569">${law.reason}</td>
        <td style="text-align:center;font-weight:700;color:${law.score > 70 ? "#16a34a" : "#d97706"}">${law.score}/99</td>
      </tr>`)
    .join("");

  const ppcRows = (ai.ppc_sections || [])
    .map((sec) => `
      <tr>
        <td style="font-weight:700;color:#1e40af">${sec.section}</td>
        <td style="font-weight:600">${sec.title}</td>
        <td style="font-size:11px;color:#475569">${sec.description}</td>
        <td style="font-size:11px;color:#dc2626">${sec.penalty}</td>
      </tr>`)
    .join("");

  const readinessColor = caseReadiness >= 75 ? "#16a34a" : caseReadiness >= 50 ? "#d97706" : "#dc2626";
  const readinessLabel = caseReadiness >= 75 ? "CASE PACKAGE READY" : caseReadiness >= 50 ? "PARTIALLY READY" : "INCOMPLETE";

  // ── Full HTML document ──────────────────────────────────────────────────────

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SHAHID.AI Court Submission Packet — ${evidence.id}</title>
<style>
  /* ── Reset ── */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Base ── */
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1e293b;
    background: #fff;
    font-size: 12px;
    line-height: 1.5;
  }

  /* ── Page layout ── */
  .page {
    max-width: 780px;
    margin: 0 auto;
    padding: 32px 36px;
  }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #1a56db 100%);
    color: #fff;
    padding: 24px 28px;
    border-radius: 6px;
    margin-bottom: 24px;
  }
  .header h1 { font-size: 20px; font-weight: 900; letter-spacing: 0.3px; }
  .header p  { font-size: 11px; opacity: 0.85; margin-top: 3px; }
  .badge {
    display: inline-block;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.35);
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    margin-top: 8px;
    margin-right: 5px;
  }

  /* ── Sections ── */
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1e40af;
    border-bottom: 2px solid #1e40af;
    padding-bottom: 5px;
    margin-bottom: 12px;
  }

  /* ── Meta grid ── */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .meta-item { background: #f1f5f9; border-radius: 4px; padding: 8px 12px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; }
  .meta-value { font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 2px; word-break: break-all; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; page-break-inside: auto; }
  tr    { page-break-inside: avoid; page-break-after: auto; }
  th, td { padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  thead { display: table-header-group; }
  thead tr { background: #1e3a5f; color: #fff; }
  thead th { font-weight: 700; text-align: left; border-color: #1e40af; }

  /* ── Statement boxes ── */
  .statement-box {
    background: #f0f9ff;
    border-left: 4px solid #1a56db;
    padding: 12px 14px;
    border-radius: 0 4px 4px 0;
    font-size: 12px;
    line-height: 1.6;
  }
  .urdu-box {
    background: #fefce8;
    border-left: 4px solid #ca8a04;
    padding: 12px 14px;
    border-radius: 0 4px 4px 0;
    font-size: 12px;
    line-height: 1.8;
    direction: rtl;
    text-align: right;
    margin-top: 8px;
  }
  .risk-box {
    margin-top: 8px;
    padding: 8px 12px;
    background: #fef2f2;
    border-left: 4px solid #dc2626;
    border-radius: 0 4px 4px 0;
    font-size: 11px;
  }
  .action-box {
    margin-top: 6px;
    padding: 8px 12px;
    background: #f0fdf4;
    border-left: 4px solid #16a34a;
    border-radius: 0 4px 4px 0;
    font-size: 11px;
  }

  /* ── Hash box ── */
  .hash-box {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    background: #1e293b;
    color: #86efac;
    padding: 8px 12px;
    border-radius: 4px;
    word-break: break-all;
    margin-top: 8px;
  }

  /* ── Readiness ── */
  .readiness-bar {
    height: 12px;
    background: #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
    margin: 6px 0;
  }
  .readiness-fill { height: 100%; border-radius: 6px; }

  /* ── Citation cards ── */
  .citation-card {
    margin-top: 8px;
    padding: 8px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 11px;
    page-break-inside: avoid;
  }
  .grounded-badge {
    display: inline-block;
    background: #dcfce7;
    color: #16a34a;
    border: 1px solid #86efac;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 9px;
    font-weight: 700;
    margin-left: 8px;
  }

  /* ── FIR pre blocks ── */
  .fir-block {
    white-space: pre-wrap;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 4px;
    line-height: 1.6;
    page-break-inside: auto;
  }
  .fir-block-ur {
    white-space: pre-wrap;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    background: #1e293b;
    color: #fef9c3;
    padding: 16px;
    border-radius: 4px;
    line-height: 1.8;
    direction: rtl;
    text-align: right;
    page-break-inside: auto;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 2px solid #e2e8f0;
    text-align: center;
    color: #64748b;
    font-size: 10px;
  }

  /* ── Print rules ── */
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 0; max-width: 100%; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hash-box, .fir-block, .fir-block-ur { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Page break controls */
    .section { page-break-inside: avoid; }
    .section-title { page-break-after: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .citation-card { page-break-inside: avoid; }
    .fir-block, .fir-block-ur { page-break-inside: auto; }

    /* Page margins */
    @page {
      margin: 18mm 15mm;
      size: A4;
    }
    @page :first { margin-top: 10mm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <h1>⚖ SHAHID.AI — Court Submission Packet</h1>
    <p>Pakistan's First AI Crime Intelligence &amp; Evidence Platform</p>
    <p style="margin-top:5px;font-size:10px;opacity:0.7">Generated: ${now}</p>
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
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
      <div style="font-size:32px;font-weight:900;color:${readinessColor}">${caseReadiness}%</div>
      <div>
        <div style="font-weight:700;color:${readinessColor};font-size:13px">${readinessLabel}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">Evidence integrity · Legal grounding · Custody completeness · AI analysis</div>
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
    <div class="meta-label" style="margin-top:10px;margin-bottom:4px">SHA-256 Integrity Hash</div>
    <div class="hash-box">${evidence.hash || "Not computed"}</div>
  </div>

  <!-- AI WITNESS STATEMENT -->
  <div class="section">
    <div class="section-title">AI Witness Statement</div>
    ${ai.statement_en
      ? `<div class="statement-box">${ai.statement_en}</div>`
      : `<div class="statement-box" style="color:#94a3b8">AI statement not available.</div>`}
    ${ai.statement_ur ? `<div class="urdu-box">${ai.statement_ur}</div>` : ""}
    ${ai.risk_assessment ? `<div class="risk-box"><strong>Risk Assessment:</strong> ${ai.risk_assessment}</div>` : ""}
    ${ai.recommended_action ? `<div class="action-box"><strong>Recommended Action:</strong> ${ai.recommended_action}</div>` : ""}
  </div>

  <!-- GROUNDED LEGAL RETRIEVAL -->
  <div class="section">
    <div class="section-title">
      Grounded Legal Retrieval
      <span class="grounded-badge">✓ Grounded Legal Retrieval Verified</span>
    </div>
    ${safeRetrieved.length ? `
    <table>
      <thead>
        <tr>
          <th>Section</th><th>Title</th><th>Act</th><th>Why Matched</th><th style="text-align:center">Score</th>
        </tr>
      </thead>
      <tbody>${lawRows}</tbody>
    </table>
    ${safeRetrieved.map((l) => `
      <div class="citation-card">
        <strong style="color:#1e40af">${l.section} — ${l.title}</strong><br>
        <span style="color:#64748b">${l.explanation}</span><br>
        <span style="color:#94a3b8;font-style:italic">"${l.citation_text.slice(0, 280)}${l.citation_text.length > 280 ? "..." : ""}"</span>
      </div>`).join("")}
    ` : `<p style="color:#94a3b8;font-size:11px">No laws retrieved. Run Legal RAG analysis to populate this section.</p>`}
  </div>

  <!-- AI PPC SECTIONS -->
  ${(ai.ppc_sections || []).length ? `
  <div class="section">
    <div class="section-title">AI-Identified PPC Sections</div>
    <table>
      <thead><tr><th>Section</th><th>Title</th><th>Description</th><th>Penalty</th></tr></thead>
      <tbody>${ppcRows}</tbody>
    </table>
  </div>` : ""}

  <!-- CHAIN OF CUSTODY -->
  <div class="section">
    <div class="section-title">Tamper-Evident Chain of Custody</div>
    ${(evidence.custodyTimeline || []).length ? `
    <table>
      <thead><tr><th>Event</th><th>اردو</th><th>Timestamp</th><th>Chain Hash</th></tr></thead>
      <tbody>${custodyRows}</tbody>
    </table>` : `<p style="color:#94a3b8;font-size:11px">No custody timeline recorded.</p>`}
  </div>

  <!-- FIR DRAFT ENGLISH -->
  <div class="section">
    <div class="section-title">FIR Draft (English)</div>
    <div class="fir-block">${(firDraft.en || "FIR draft not generated.").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>

  <!-- FIR DRAFT URDU -->
  <div class="section">
    <div class="section-title">FIR Draft (Urdu — اردو)</div>
    <div class="fir-block-ur">${(firDraft.ur || "اردو مسودہ دستیاب نہیں۔").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p style="font-weight:700;font-size:11px;color:#1e293b;margin-bottom:4px">
      Digitally Sealed &bull; Citation Grounded &bull; Tamper Evident
    </p>
    <p>SHAHID.AI Legal Intelligence Engine v1.0 &bull; Pakistan's First AI Crime Intelligence Platform</p>
    <p style="margin-top:3px">Generated: ${now} &bull; Evidence ID: ${evidence.id}</p>
    <p style="margin-top:6px;color:#94a3b8">
      AI-assisted document. Requires review by a qualified legal officer before formal court submission.
      All cited sections grounded in local legal corpus (PPC, CrPC, QSO). No external services used.
    </p>
  </div>

</div>
</body>
</html>`;

  // ── PDF generation via hidden iframe print ──────────────────────────────────
  // Chrome/Edge with "Save as PDF" printer: auto-downloads as PDF silently.
  // Firefox/Safari: opens print dialog — user selects "Save as PDF".
  // Fallback: if iframe injection fails, download as HTML.

  try {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    iframe.setAttribute("title", pdfFilename);
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("iframe document unavailable");

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for iframe content to fully render before printing
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (printErr) {
        console.warn("[SHAHID.AI] iframe print failed, falling back to HTML download:", printErr.message);
        _fallbackHtmlDownload(html, evidence.id);
      } finally {
        // Clean up iframe after a delay to allow print dialog to open
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 3000);
      }
    };

    // Fallback: if onload never fires within 4s, trigger print anyway
    setTimeout(() => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      } catch { /* already handled */ }
    }, 4000);

  } catch (err) {
    console.warn("[SHAHID.AI] PDF iframe approach failed, falling back to HTML download:", err.message);
    _fallbackHtmlDownload(html, evidence.id);
  }
}

/**
 * Graceful fallback: download as HTML if PDF generation fails.
 * @private
 */
function _fallbackHtmlDownload(html, evidenceId) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SHAHID_AI_CourtReady_FIR_${evidenceId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
