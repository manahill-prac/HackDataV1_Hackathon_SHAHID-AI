const MODEL_PATH = "/models";
let modelState = { loaded: false, loading: false };

function ensureFaceApiScript() {
  return new Promise((resolve, reject) => {
    if (window.faceapi) {
      resolve(window.faceapi);
      return;
    }
    const existing = document.querySelector('script[data-faceapi="local"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.faceapi));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "/models/face-api.min.js";
    script.async = true;
    script.defer = true;
    script.dataset.faceapi = "local";
    script.onload = () => resolve(window.faceapi);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export async function loadFaceModels() {
  if (modelState.loaded) return { ok: true, cached: true };
  if (modelState.loading) return { ok: false, loading: true };
  modelState.loading = true;
  try {
    const faceapi = await ensureFaceApiScript();
    if (!faceapi) throw new Error("face-api library not found in /public/models");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
    ]);
    modelState = { loaded: true, loading: false };
    return { ok: true, cached: false };
  } catch (error) {
    modelState.loading = false;
    return { ok: false, error: error.message };
  }
}

function vectorDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function strengthFromDistance(distance) {
  if (distance < 0.55) return "strong";
  if (distance < 0.65) return "possible";
  return "weak";
}

export function descriptorSimilarityScore(distance) {
  return Math.max(0, Math.min(100, Math.round((1 - distance / 1.2) * 100)));
}

export async function detectFacesFromElement(element) {
  const faceapi = window.faceapi;
  if (!faceapi || !modelState.loaded) throw new Error("Face models not loaded");
  const detections = await faceapi
    .detectAllFaces(element, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((detection, idx) => {
    const box = detection.detection.box;
    return {
      faceId: `face-${Date.now()}-${idx}`,
      confidence: detection.detection.score,
      descriptor: Array.from(detection.descriptor),
      boundingBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      landmarks: detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
    };
  });
}

export async function imageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function matchDescriptors(probeFaces, evidenceRecords) {
  const matches = [];
  probeFaces.forEach((face) => {
    evidenceRecords.forEach((record) => {
      const known = record.faceDescriptors || [];
      known.forEach((descriptor) => {
        const distance = vectorDistance(face.descriptor, descriptor);
        const strength = strengthFromDistance(distance);
        if (strength !== "weak") {
          matches.push({
            probeFaceId: face.faceId,
            matchedEvidenceId: record.id,
            distance,
            similarityScore: descriptorSimilarityScore(distance),
            matchStrength: strength,
            timestamp: new Date().toISOString(),
            city: record.city || "Unknown",
          });
        }
      });
    });
  });
  return matches.sort((a, b) => a.distance - b.distance);
}

export function buildSuspectClusters(matches) {
  const byEvidence = matches.reduce((acc, match) => {
    acc[match.matchedEvidenceId] = acc[match.matchedEvidenceId] || [];
    acc[match.matchedEvidenceId].push(match);
    return acc;
  }, {});
  return Object.entries(byEvidence).map(([evidenceId, rows]) => ({
    evidenceId,
    sightings: rows.length,
    strongest: rows.reduce((best, row) => (row.similarityScore > best.similarityScore ? row : best), rows[0]),
    timeline: rows.map((r) => ({ at: r.timestamp, score: r.similarityScore })),
  }));
}
