/**
 * SHAHID.AI — Threat Intelligence Fusion Engine
 * Computes Threat Correlation Index and all command board signals
 * from real existing module outputs. Zero fake data.
 *
 * Inputs: evidence[], predictionIntelligence (from crimeML)
 * Outputs: TCI, watchlist, fusion alerts, readiness matrix, briefing
 */

// ─── Threat Correlation Index ─────────────────────────────────────────────────
/**
 * TCI Formula (0–100):
 *
 * Component 1 — Repeat Suspect Activity (30 pts)
 *   Source: fusionSignals[] from crimeML (cities with repeat suspect driver + prediction > 5)
 *   Score: min(30, fusionSignals.length * 10)
 *
 * Component 2 — Hotspot Escalation (25 pts)
 *   Source: cityForecast[] cities where drivers include "hotspot escalation"
 *   Score: min(25, escalatingCities * 8)
 *
 * Component 3 — Anomaly Magnitude (20 pts)
 *   Source: anomalies[] z-scores from detectAnomalies
 *   Score: min(20, sum of z-scores capped per anomaly * 4)
 *
 * Component 4 — High Risk Evidence Density (15 pts)
 *   Source: evidence[] riskLevel === "High" ratio
 *   Score: round(highRiskRatio * 15)
 *
 * Component 5 — Unresolved Case Gap (10 pts)
 *   Source: evidence[] not sealed or status === "Processing"
 *   Score: round(unresolvedRatio * 10)
 */
export function computeThreatCorrelationIndex(evidence, intelligence) {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  const safeFusion = intelligence?.fusionSignals || [];
  const safeForecast = intelligence?.cityForecast || [];
  const safeAnomalies = intelligence?.anomalies?.anomalies || [];

  const drivers = [];

  // Component 1: Repeat suspect activity
  const repeatCount = safeFusion.length;
  const c1 = Math.min(30, repeatCount * 10);
  if (repeatCount > 0) {
    drivers.push({
      label: "Repeat Suspect Activity",
      detail: `${repeatCount} city${repeatCount > 1 ? "ies" : ""} with correlated suspect patterns: ${safeFusion.slice(0, 3).map((f) => f.city).join(", ")}`,
      contribution: c1,
      severity: repeatCount >= 3 ? "critical" : "elevated",
    });
  }

  // Component 2: Hotspot escalation
  const escalatingCities = safeForecast.filter((c) => c.drivers?.includes("hotspot escalation"));
  const c2 = Math.min(25, escalatingCities.length * 8);
  if (escalatingCities.length > 0) {
    drivers.push({
      label: "Hotspot Escalation",
      detail: `${escalatingCities.length} area${escalatingCities.length > 1 ? "s" : ""} showing incident density escalation: ${escalatingCities.slice(0, 3).map((c) => c.city).join(", ")}`,
      contribution: c2,
      severity: escalatingCities.length >= 3 ? "critical" : "elevated",
    });
  }

  // Component 3: Anomaly magnitude
  const anomalyScore = safeAnomalies.reduce((sum, a) => sum + Math.min(5, a.z), 0);
  const c3 = Math.min(20, Math.round(anomalyScore * 4));
  if (safeAnomalies.length > 0) {
    const topAnomaly = safeAnomalies[0];
    drivers.push({
      label: "Statistical Anomaly Detected",
      detail: `${safeAnomalies.length} anomalous spike${safeAnomalies.length > 1 ? "s" : ""} detected. Peak: ${topAnomaly.count} incidents on ${topAnomaly.day} (z=${topAnomaly.z.toFixed(2)})`,
      contribution: c3,
      severity: topAnomaly.z > 2.5 ? "critical" : "elevated",
    });
  }

  // Component 4: High risk evidence density
  const highRiskCount = safeEvidence.filter((e) => e.riskLevel === "High").length;
  const highRiskRatio = safeEvidence.length ? highRiskCount / safeEvidence.length : 0;
  const c4 = Math.round(highRiskRatio * 15);
  if (highRiskCount > 0) {
    drivers.push({
      label: "High-Risk Evidence Density",
      detail: `${highRiskCount} of ${safeEvidence.length} evidence records classified High risk (${Math.round(highRiskRatio * 100)}%)`,
      contribution: c4,
      severity: highRiskRatio > 0.4 ? "critical" : "elevated",
    });
  }

  // Component 5: Unresolved case gap
  const unresolved = safeEvidence.filter((e) => !e.sealed || e.status === "Processing").length;
  const unresolvedRatio = safeEvidence.length ? unresolved / safeEvidence.length : 0;
  const c5 = Math.round(unresolvedRatio * 10);
  if (unresolved > 0) {
    drivers.push({
      label: "Unresolved Case Backlog",
      detail: `${unresolved} case${unresolved > 1 ? "s" : ""} pending seal or investigation (${Math.round(unresolvedRatio * 100)}% of total)`,
      contribution: c5,
      severity: unresolvedRatio > 0.3 ? "elevated" : "low",
    });
  }

  const tci = Math.min(100, c1 + c2 + c3 + c4 + c5);
  const band = tci >= 70 ? "Critical" : tci >= 40 ? "Elevated" : "Low";
  const bandColor = tci >= 70 ? "critical" : tci >= 40 ? "elevated" : "low";

  return { tci, band, bandColor, drivers, components: { c1, c2, c3, c4, c5 } };
}

// ─── Correlated Fusion Threat Signals ────────────────────────────────────────
/**
 * Raises a correlated threat signal when 3 signals align for the same city:
 *   1. City in fusionSignals (repeat suspect + prediction > 5)
 *   2. City has anomaly overlap (incident dates with z > 1.5)
 *   3. City has High-risk evidence above threshold
 *
 * Returns array of correlated signals with explanation of which drivers fired.
 */
export function computeCorrelatedFusionSignals(evidence, intelligence) {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  const safeFusion = intelligence?.fusionSignals || [];
  const safeForecast = intelligence?.cityForecast || [];
  const safeAnomalies = intelligence?.anomalies?.anomalies || [];

  // Build per-city evidence index
  const cityEvidence = safeEvidence.reduce((acc, e) => {
    const city = e.city || "Unknown";
    acc[city] = acc[city] || [];
    acc[city].push(e);
    return acc;
  }, {});

  // Anomaly dates set
  const anomalyDates = new Set(safeAnomalies.map((a) => a.day));

  const signals = [];

  safeFusion.forEach((fusionCity) => {
    const cityName = fusionCity.city;
    const cityEv = cityEvidence[cityName] || [];
    const forecast = safeForecast.find((f) => f.city === cityName);

    // Signal 1: already true (city is in fusionSignals)
    const s1 = true;

    // Signal 2: any evidence from this city falls on an anomaly date
    const s2 = cityEv.some((e) => {
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      return anomalyDates.has(day);
    });

    // Signal 3: city has >= 2 High-risk evidence records
    const highRiskInCity = cityEv.filter((e) => e.riskLevel === "High").length;
    const s3 = highRiskInCity >= 2;

    const signalCount = [s1, s2, s3].filter(Boolean).length;
    if (signalCount < 2) return; // need at least 2 of 3 to raise

    const firedDrivers = [];
    if (s1) firedDrivers.push(`repeat suspect activity (prediction score: ${fusionCity.threatScore})`);
    if (s2) firedDrivers.push(`incident dates overlap statistical anomaly window`);
    if (s3) firedDrivers.push(`${highRiskInCity} high-risk evidence records concentrated in area`);

    const correlationStrength = signalCount === 3 ? "Strong" : "Moderate";
    const forecastPrediction = forecast?.prediction || 0;

    signals.push({
      city: cityName,
      correlationStrength,
      signalCount,
      threatScore: fusionCity.threatScore,
      forecastPrediction,
      firedDrivers,
      explanation: `${correlationStrength} correlation: ${firedDrivers.join(" · ")}`,
      escalating: forecast?.drivers?.includes("hotspot escalation") || false,
    });
  });

  return signals.sort((a, b) => b.signalCount - a.signalCount || b.threatScore - a.threatScore);
}

// ─── Active Threat Watchlist ──────────────────────────────────────────────────
/**
 * Builds watchlist from cities with highest combined threat signals.
 * Each entry: city, threat level, incident count, top driver, forecast.
 */
export function buildThreatWatchlist(evidence, intelligence) {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  const safeForecast = intelligence?.cityForecast || [];
  const safeFusion = intelligence?.fusionSignals || [];

  const fusionCities = new Set(safeFusion.map((f) => f.city));

  return safeForecast
    .slice(0, 8)
    .map((city) => {
      const cityEv = safeEvidence.filter((e) => (e.city || "Unknown") === city.city);
      const highRisk = cityEv.filter((e) => e.riskLevel === "High").length;
      const flagged = cityEv.filter((e) => e.status === "Flagged").length;
      const inFusion = fusionCities.has(city.city);

      // Threat level: derived from prediction + risk density + fusion membership
      const threatScore = Math.min(99, Math.round(
        city.prediction * 3 +
        (highRisk / Math.max(cityEv.length, 1)) * 40 +
        (inFusion ? 20 : 0) +
        (city.violent > 0 ? 10 : 0)
      ));

      const level = threatScore >= 70 ? "Critical" : threatScore >= 45 ? "Elevated" : "Monitored";
      const topDriver = city.drivers?.[0] || "incident concentration";

      return {
        city: city.city,
        threatScore,
        level,
        incidents: city.incidents,
        highRisk,
        flagged,
        inFusion,
        topDriver,
        forecastPrediction: city.prediction,
        confidence: city.confidence,
      };
    })
    .sort((a, b) => b.threatScore - a.threatScore);
}

// ─── Case Readiness Matrix ────────────────────────────────────────────────────
/**
 * Computes readiness matrix across all evidence.
 * Returns per-dimension status: Ready / Partial / Needs Attention
 */
export function computeReadinessMatrix(evidence) {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  if (!safeEvidence.length) {
    return {
      evidenceReady: { status: "Needs Attention", count: 0, total: 0, pct: 0 },
      legalReady: { status: "Needs Attention", count: 0, total: 0, pct: 0 },
      investigativeReady: { status: "Needs Attention", count: 0, total: 0, pct: 0 },
      submissionReady: { status: "Needs Attention", count: 0, total: 0, pct: 0 },
      composite: 0,
    };
  }

  const total = safeEvidence.length;

  // Evidence Ready: has hash + sealed + coords
  const evidenceReadyCount = safeEvidence.filter((e) => e.hash && e.sealed && e.coords).length;
  const evidencePct = Math.round((evidenceReadyCount / total) * 100);

  // Legal Ready: has aiAnalysis with ppc_sections >= 2
  const legalReadyCount = safeEvidence.filter((e) => (e.aiAnalysis?.ppc_sections || []).length >= 2).length;
  const legalPct = Math.round((legalReadyCount / total) * 100);

  // Investigative Ready: has custodyTimeline >= 2 steps + location
  const investigativeReadyCount = safeEvidence.filter(
    (e) => (e.custodyTimeline || []).length >= 2 && e.locationLabel
  ).length;
  const investigativePct = Math.round((investigativeReadyCount / total) * 100);

  // Submission Ready: sealed + firGenerated + aiAnalysis present
  const submissionReadyCount = safeEvidence.filter(
    (e) => e.sealed && e.firGenerated && e.aiAnalysis?.statement_en
  ).length;
  const submissionPct = Math.round((submissionReadyCount / total) * 100);

  const statusLabel = (pct) => pct >= 75 ? "Ready" : pct >= 40 ? "Partial" : "Needs Attention";
  const statusColor = (pct) => pct >= 75 ? "ready" : pct >= 40 ? "partial" : "attention";

  const composite = Math.round((evidencePct + legalPct + investigativePct + submissionPct) / 4);

  return {
    evidenceReady: { status: statusLabel(evidencePct), color: statusColor(evidencePct), count: evidenceReadyCount, total, pct: evidencePct },
    legalReady: { status: statusLabel(legalPct), color: statusColor(legalPct), count: legalReadyCount, total, pct: legalPct },
    investigativeReady: { status: statusLabel(investigativePct), color: statusColor(investigativePct), count: investigativeReadyCount, total, pct: investigativePct },
    submissionReady: { status: statusLabel(submissionPct), color: statusColor(submissionPct), count: submissionReadyCount, total, pct: submissionPct },
    composite,
  };
}

// ─── Today's Intelligence Briefing ───────────────────────────────────────────
/**
 * Generates a structured intelligence briefing from real signals.
 * No template strings — every line is derived from computed data.
 */
export function generateIntelBriefing(evidence, intelligence, tciResult, fusionSignals) {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  const now = Date.now();
  const last24h = safeEvidence.filter((e) => now - new Date(e.timestamp).getTime() <= 24 * 60 * 60 * 1000);
  const last48h = safeEvidence.filter((e) => now - new Date(e.timestamp).getTime() <= 48 * 60 * 60 * 1000);

  const highRisk = safeEvidence.filter((e) => e.riskLevel === "High");
  const flagged = safeEvidence.filter((e) => e.status === "Flagged");
  const anomalies = intelligence?.anomalies?.anomalies || [];
  const topForecast = intelligence?.cityForecast?.[0];

  const bulletPoints = [];

  if (fusionSignals.length > 0) {
    bulletPoints.push({
      severity: "critical",
      text: `${fusionSignals.length} correlated threat signal${fusionSignals.length > 1 ? "s" : ""} active — ${fusionSignals.map((s) => s.city).join(", ")}`,
    });
  }

  if (anomalies.length > 0) {
    bulletPoints.push({
      severity: "elevated",
      text: `${anomalies.length} statistical anomaly spike${anomalies.length > 1 ? "s" : ""} detected in incident timeline`,
    });
  }

  if (highRisk.length > 0) {
    bulletPoints.push({
      severity: "elevated",
      text: `${highRisk.length} high-risk evidence record${highRisk.length > 1 ? "s" : ""} on active watchlist`,
    });
  }

  if (topForecast) {
    bulletPoints.push({
      severity: topForecast.prediction > 8 ? "elevated" : "low",
      text: `Highest predicted surge: ${topForecast.city} — ${topForecast.prediction} projected incidents (${topForecast.confidence}% confidence)`,
    });
  }

  if (flagged.length > 0) {
    bulletPoints.push({
      severity: "elevated",
      text: `${flagged.length} case${flagged.length > 1 ? "s" : ""} flagged for immediate investigative action`,
    });
  }

  if (last24h.length > 0) {
    bulletPoints.push({
      severity: "low",
      text: `${last24h.length} new incident${last24h.length > 1 ? "s" : ""} recorded in last 24 hours`,
    });
  }

  if (bulletPoints.length === 0) {
    bulletPoints.push({ severity: "low", text: "No active threat signals. System monitoring nominal." });
  }

  return {
    generatedAt: new Date().toISOString(),
    tci: tciResult.tci,
    band: tciResult.band,
    totalEvidence: safeEvidence.length,
    last24hCount: last24h.length,
    last48hCount: last48h.length,
    bulletPoints,
  };
}

// ─── Priority Investigative Signals ──────────────────────────────────────────
/**
 * Returns top priority investigative actions derived from evidence signals.
 * Each signal has: priority (1=highest), action, reason, evidenceIds[]
 */
export function computePrioritySignals(evidence, intelligence) {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  const signals = [];

  // P1: Flagged high-risk unsealed evidence
  const unsealed = safeEvidence.filter((e) => e.riskLevel === "High" && !e.sealed);
  if (unsealed.length) {
    signals.push({
      priority: 1,
      label: "Unsecured High-Risk Evidence",
      action: `Seal and hash ${unsealed.length} high-risk evidence record${unsealed.length > 1 ? "s" : ""} immediately`,
      reason: "High-risk evidence without cryptographic seal is inadmissible and chain-of-custody is broken",
      count: unsealed.length,
      evidenceIds: unsealed.slice(0, 3).map((e) => e.id),
    });
  }

  // P2: Flagged cases without FIR
  const flaggedNoFir = safeEvidence.filter((e) => e.status === "Flagged" && !e.firGenerated);
  if (flaggedNoFir.length) {
    signals.push({
      priority: 2,
      label: "Flagged Cases Pending FIR",
      action: `Register FIR for ${flaggedNoFir.length} flagged case${flaggedNoFir.length > 1 ? "s" : ""}`,
      reason: "Flagged incidents require formal FIR registration under CrPC Section 154",
      count: flaggedNoFir.length,
      evidenceIds: flaggedNoFir.slice(0, 3).map((e) => e.id),
    });
  }

  // P3: Cities in fusion signals — patrol recommendation
  const fusionCities = intelligence?.fusionSignals || [];
  if (fusionCities.length) {
    signals.push({
      priority: 3,
      label: "Correlated Hotspot Patrol",
      action: `Deploy patrol units to ${fusionCities.slice(0, 3).map((f) => f.city).join(", ")}`,
      reason: "Repeat suspect activity correlated with predicted surge — proactive patrol reduces escalation probability",
      count: fusionCities.length,
      evidenceIds: [],
    });
  }

  // P4: Anomaly dates — evidence review
  const anomalies = intelligence?.anomalies?.anomalies || [];
  if (anomalies.length) {
    signals.push({
      priority: 4,
      label: "Anomaly Window Evidence Review",
      action: `Review evidence from ${anomalies.length} anomalous date${anomalies.length > 1 ? "s" : ""}: ${anomalies.slice(0, 2).map((a) => a.day).join(", ")}`,
      reason: `Incident spikes (z > 1.5) on these dates suggest coordinated activity requiring cross-reference`,
      count: anomalies.length,
      evidenceIds: [],
    });
  }

  return signals.sort((a, b) => a.priority - b.priority);
}
