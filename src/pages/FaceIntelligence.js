import React, { useEffect, useMemo, useRef, useState } from "react";
import { getEvidenceList, saveEvidence } from "../utils/evidenceStore";
import {
  buildSuspectClusters,
  detectFacesFromElement,
  imageFromDataUrl,
  loadFaceModels,
  matchDescriptors,
} from "../utils/faceIntelligence";

function drawOverlay(canvas, faces) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  faces.forEach((face) => {
    const { x, y, width, height } = face.boundingBox;
    ctx.strokeStyle = "#4F8090";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "#EF9B20";
    face.landmarks.forEach((point) => ctx.fillRect(point.x - 1, point.y - 1, 2, 2));
  });
}

function FaceIntelligence() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const [modelStatus, setModelStatus] = useState("Loading local models...");
  const [cameraError, setCameraError] = useState("");
  const [faces, setFaces] = useState([]);
  const [matches, setMatches] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [scanBusy, setScanBusy] = useState(false);

  const evidence = useMemo(() => getEvidenceList(), []);

  useEffect(() => {
    loadFaceModels().then((res) => {
      if (!res.ok) {
        setModelStatus("Models unavailable. Put face-api.min.js and model files in /public/models.");
        return;
      }
      setModelStatus("Face models loaded locally (offline ready).");
    });
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError("");
    } catch (error) {
      setCameraError(`Camera unavailable | کیمرہ دستیاب نہیں: ${error.message}`);
    }
  };

  const buildEvidenceDescriptorIndex = async () => {
    const withMedia = evidence.filter((row) => row.photoDataUrl);
    for (const row of withMedia.slice(0, 40)) {
      if (row.faceDescriptors?.length) continue;
      try {
        const img = await imageFromDataUrl(row.photoDataUrl);
        const detected = await detectFacesFromElement(img);
        if (detected.length) {
          saveEvidence({
            ...row,
            faceDescriptors: detected.map((face) => face.descriptor),
            faceMeta: detected.map((face) => ({
              confidence: face.confidence,
              boundingBox: face.boundingBox,
            })),
          });
        }
      } catch (error) {
        // skip bad media silently
      }
    }
  };

  const runLiveScan = async () => {
    if (!videoRef.current || !overlayRef.current) return;
    setScanBusy(true);
    try {
      await buildEvidenceDescriptorIndex();
      const detected = await detectFacesFromElement(videoRef.current);
      setFaces(detected);
      const canvas = overlayRef.current;
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 360;
      drawOverlay(canvas, detected);
      const refreshedEvidence = getEvidenceList();
      const matched = matchDescriptors(detected, refreshedEvidence.filter((row) => row.faceDescriptors?.length));
      setMatches(matched);
      setClusters(buildSuspectClusters(matched));
    } catch (error) {
      setCameraError(`Face scan failed | چہرہ اسکین ناکام: ${error.message}`);
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="ui-card">
        <h1 className="text-2xl font-black ui-heading">Face Intelligence Engine | چہرہ انٹیلیجنس</h1>
        <p className="ui-muted mt-2">{modelStatus}</p>
        <p className="mt-2 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-200">
          Investigative Lead Only — Not Identity Recognition
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="ui-card">
          <h2 className="text-lg font-bold">Live Scan | لائیو اسکین</h2>
          <div className="relative mt-3 overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-72 w-full object-cover" />
            <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
          </div>
          {cameraError ? <p className="mt-2 text-sm text-red-300">{cameraError}</p> : null}
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={startCamera} className="ui-primary-btn">
              Start Camera
            </button>
            <button type="button" onClick={runLiveScan} className="ui-accent-btn" disabled={scanBusy}>
              {scanBusy ? "Scanning..." : "Run Face Scan"}
            </button>
          </div>
          <p className="mt-2 text-xs ui-muted">Detected faces: {faces.length}</p>
        </article>

        <article className="ui-card">
          <h2 className="text-lg font-bold">Evidence Face Intelligence | ثبوت چہرہ تجزیہ</h2>
          <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
            {matches.slice(0, 10).map((match) => (
              <div key={`${match.probeFaceId}-${match.matchedEvidenceId}-${match.timestamp}`} className="rounded-lg border border-[#4F8090]/35 p-3 text-sm">
                <p className="font-semibold text-[#F2F2F2]">Matched Evidence: {match.matchedEvidenceId}</p>
                <p className="ui-muted">Similarity: {match.similarityScore}% | Strength: {match.matchStrength}</p>
                <p className="text-[#EF9B20]">Repeat Suspect Correlation Detected</p>
              </div>
            ))}
            {!matches.length ? <p className="ui-muted text-sm">No suspect correlation yet.</p> : null}
          </div>
        </article>
      </div>

      <article className="ui-card">
        <h2 className="text-lg font-bold">Threat Intelligence Board | خطرہ انٹیلیجنس بورڈ</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {clusters.map((cluster) => (
            <div key={cluster.evidenceId} className="rounded-xl border border-[#4F8090]/40 p-3">
              <p className="font-semibold">Cluster: {cluster.evidenceId}</p>
              <p className="ui-muted text-sm">Sightings: {cluster.sightings}</p>
              <svg viewBox="0 0 260 70" className="mt-2 w-full">
                <line x1="10" y1="35" x2="240" y2="35" stroke="#4F8090" />
                {cluster.timeline.slice(0, 8).map((t, idx) => (
                  <circle key={`${t.at}-${idx}`} cx={20 + idx * 28} cy={35} r={4} fill="#EF9B20" />
                ))}
              </svg>
            </div>
          ))}
          {!clusters.length ? <p className="ui-muted text-sm">No suspect clusters yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

export default FaceIntelligence;
