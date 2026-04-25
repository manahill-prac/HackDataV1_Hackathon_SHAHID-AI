function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function normalize(v, max) {
  // Guard: max=0, null, Infinity, or NaN all return 0 safely
  if (!max || !isFinite(max) || max <= 0) return 0;
  return v / max;
}

function typeVector(type) {
  const keys = ["theft", "suspicious", "violent", "fraud", "weapons", "voice", "cctv", "emergency"];
  return keys.map((k) => (k === type ? 1 : 0));
}

export function buildCrimeDataset(evidence) {
  if (!Array.isArray(evidence) || !evidence.length) return [];

  const latValues = evidence.map((e) => Math.abs(e.coords?.latitude || 0));
  const lngValues = evidence.map((e) => Math.abs(e.coords?.longitude || 0));
  // Safe max — avoids Math.max(...[]) = -Infinity on empty arrays
  const maxLat = latValues.length ? Math.max(...latValues) : 1;
  const maxLng = lngValues.length ? Math.max(...lngValues) : 1;

  return evidence.map((entry) => {
    const d = new Date(entry.timestamp);
    const hour = isNaN(d.getTime()) ? 0 : d.getHours();
    const weekday = isNaN(d.getTime()) ? 0 : d.getDay();
    const month = isNaN(d.getTime()) ? 1 : d.getMonth() + 1;
    const repeatSignal = (entry.faceMatches?.length || 0) > 0 ? 1 : 0;
    const x = [
      1,
      normalize(hour, 23),
      normalize(weekday, 6),
      normalize(month, 12),
      normalize(Math.abs(entry.coords?.latitude || 0), maxLat),
      normalize(Math.abs(entry.coords?.longitude || 0), maxLng),
      ...typeVector(entry.incidentType || "suspicious"),
      entry.riskLevel === "High" ? 1 : entry.riskLevel === "Medium" ? 0.5 : 0.2,
      repeatSignal,
    ];
    const y = entry.riskLevel === "High" || entry.status === "Flagged" ? 1 : 0;
    return { id: entry.id, x, y, city: entry.city || "Unknown", timestamp: entry.timestamp, incidentType: entry.incidentType };
  });
}

export function trainLocalLogisticModel(dataset, epochs = 260, lr = 0.18) {
  if (!dataset.length) return { weights: [], bias: 0, trainedAt: new Date().toISOString() };
  const n = dataset[0].x.length;
  const weights = new Array(n).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    dataset.forEach((row) => {
      const z = row.x.reduce((sum, value, i) => sum + value * weights[i], bias);
      const pred = sigmoid(z);
      const error = pred - row.y;
      for (let i = 0; i < n; i += 1) {
        weights[i] -= lr * error * row.x[i];
      }
      bias -= lr * error;
    });
  }

  return { weights, bias, trainedAt: new Date().toISOString() };
}

export function inferRisk(row, model) {
  if (!model.weights.length) return 0;
  const z = row.x.reduce((sum, value, i) => sum + value * model.weights[i], model.bias);
  return sigmoid(z);
}

export function detectAnomalies(evidence) {
  if (!Array.isArray(evidence) || !evidence.length) {
    return { anomalies: [], mean: 0, std: 1 };
  }
  const dayMap = evidence.reduce((acc, row) => {
    const key = new Date(row.timestamp).toISOString().slice(0, 10);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const vals = Object.values(dayMap);
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
  const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(vals.length, 1);
  const std = Math.sqrt(variance || 1);
  const anomalies = Object.entries(dayMap)
    .map(([day, count]) => ({ day, count, z: (count - mean) / std }))
    .filter((r) => r.z > 1.5)
    .sort((a, b) => b.z - a.z);
  return { anomalies, mean, std };
}

export function buildCityForecast(dataset, model) {
  if (!dataset.length) return [];
  const byCity = {};
  dataset.forEach((row) => {
    const risk = inferRisk(row, model);
    if (!byCity[row.city]) byCity[row.city] = { city: row.city, incidents: 0, riskSum: 0, violent: 0 };
    byCity[row.city].incidents += 1;
    byCity[row.city].riskSum += risk;
    if (row.incidentType === "violent") byCity[row.city].violent += 1;
  });
  return Object.values(byCity)
    .map((cityRow) => {
      const avgRisk = cityRow.riskSum / Math.max(cityRow.incidents, 1);
      const prediction = Math.round((cityRow.incidents * 0.35 + avgRisk * 10 + cityRow.violent * 0.8) * 10) / 10;
      const confidence = Math.max(50, Math.min(94, Math.round(58 + avgRisk * 30 + cityRow.incidents)));
      const drivers = [
        cityRow.violent > 0 ? "violent incident recurrence" : "property crime recurrence",
        cityRow.incidents > 5 ? "hotspot escalation" : "moderate density",
        avgRisk > 0.6 ? "repeat suspect activity" : "temporal concentration",
      ];
      return { ...cityRow, prediction, confidence, drivers };
    })
    .sort((a, b) => b.prediction - a.prediction);
}

export function generatePredictionIntelligence(evidence) {
  // Defensive: always return a valid shape even with no data
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  try {
    const dataset = buildCrimeDataset(safeEvidence);
    const model = trainLocalLogisticModel(dataset);
    const anomalies = detectAnomalies(safeEvidence);
    const cityForecast = buildCityForecast(dataset, model);
    const fusionSignals = cityForecast
      .filter((city) => city.drivers.includes("repeat suspect activity") && city.prediction > 5)
      .map((city) => ({
        city: city.city,
        label: "Correlated Threat Signal Detected",
        threatScore: Math.min(99, Math.round(city.prediction * 8 + city.confidence / 2)),
      }));

    return {
      model,
      anomalies,
      cityForecast,
      fusionSignals,
      trainedAt: model.trainedAt,
    };
  } catch (e) {
    console.error("[SHAHID.AI crimeML] generatePredictionIntelligence failed:", e.message);
    return {
      model: { weights: [], bias: 0, trainedAt: new Date().toISOString() },
      anomalies: { anomalies: [], mean: 0, std: 1 },
      cityForecast: [],
      fusionSignals: [],
      trainedAt: new Date().toISOString(),
    };
  }
}
