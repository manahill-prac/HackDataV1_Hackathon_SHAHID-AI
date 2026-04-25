import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import PanicButton from "./components/PanicButton";
import Dashboard from "./pages/Dashboard";
import CaptureEvidence from "./pages/CaptureEvidence";
import Analytics from "./pages/Analytics";
import EvidenceDetail from "./pages/EvidenceDetail";
import CCTVPortal from "./pages/CCTVPortal";
import VoiceEvidence from "./pages/VoiceEvidence";
import VerifyEvidence from "./pages/VerifyEvidence";
import FaceIntelligence from "./pages/FaceIntelligence";
import PredictionEngine from "./pages/PredictionEngine";
import { getEvidenceList, setEvidenceList } from "./utils/evidenceStore";
import { getSampleEvidenceData, seedSampleData } from "./utils/sampleData";

function App() {
  useEffect(() => {
    const seeded = window.localStorage.getItem("shahid_v2_seeded");
    if (!seeded) {
      setEvidenceList([]);
      seedSampleData();
      window.localStorage.setItem("shahid_v2_seeded", "true");
      return;
    }
    if (!getEvidenceList().length) {
      setEvidenceList(getSampleEvidenceData());
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="ui-shell min-h-screen">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-56 bg-gradient-to-b from-[#4F8090]/20 to-transparent" />
        <Navbar />
        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/capture" element={<CaptureEvidence />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/evidence/:id" element={<EvidenceDetail />} />
            <Route path="/cctv" element={<CCTVPortal />} />
            <Route path="/voice" element={<VoiceEvidence />} />
            <Route path="/verify" element={<VerifyEvidence />} />
            <Route path="/face-intelligence" element={<FaceIntelligence />} />
            <Route path="/prediction-engine" element={<PredictionEngine />} />
          </Routes>
        </main>
        <PanicButton />
      </div>
    </BrowserRouter>
  );
}

export default App;
