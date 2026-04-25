import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import PanicButton from "./components/PanicButton";
import ErrorBoundary from "./components/ErrorBoundary";

// Eagerly loaded — lightweight, always needed
import Dashboard from "./pages/Dashboard";
import CaptureEvidence from "./pages/CaptureEvidence";
import Analytics from "./pages/Analytics";
import EvidenceDetail from "./pages/EvidenceDetail";
import CCTVPortal from "./pages/CCTVPortal";
import VoiceEvidence from "./pages/VoiceEvidence";
import VerifyEvidence from "./pages/VerifyEvidence";

import { getEvidenceList, setEvidenceList } from "./utils/evidenceStore";
import { getSampleEvidenceData, seedSampleData } from "./utils/sampleData";

// Lazy loaded — heavy modules, only load when route opens
const FaceIntelligence = lazy(() => import("./pages/FaceIntelligence"));
const PredictionEngine = lazy(() => import("./pages/PredictionEngine"));
const DemoMode = lazy(() => import("./pages/DemoMode"));
// Legal RAG placeholder — safe to add here when ready
// const LegalRAG = lazy(() => import("./pages/LegalRAG"));



function ModuleLoader({ name }) {
  return (
    <div className="ui-card m-6 flex items-center gap-3">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#4F8090] border-t-transparent" />
      <span className="text-sm ui-muted">Loading {name}... | لوڈ ہو رہا ہے</span>
    </div>
  );
}

function App() {
  useEffect(() => {
    try {
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
    } catch (e) {
      // localStorage unavailable — app still works, just no seed data
      console.warn("[SHAHID.AI] Could not seed sample data:", e.message);
    }
  }, []);

  return (
    <BrowserRouter>
      <div className="ui-shell min-h-screen">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-56 bg-gradient-to-b from-[#4F8090]/20 to-transparent" />
        <ErrorBoundary moduleName="Navigation">
          <Navbar />
        </ErrorBoundary>
        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ErrorBoundary moduleName="Dashboard">
                  <Dashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="/capture"
              element={
                <ErrorBoundary moduleName="Capture Evidence">
                  <CaptureEvidence />
                </ErrorBoundary>
              }
            />
            <Route
              path="/analytics"
              element={
                <ErrorBoundary moduleName="Analytics">
                  <Analytics />
                </ErrorBoundary>
              }
            />
            <Route
              path="/evidence/:id"
              element={
                <ErrorBoundary moduleName="Evidence Detail">
                  <EvidenceDetail />
                </ErrorBoundary>
              }
            />
            <Route
              path="/cctv"
              element={
                <ErrorBoundary moduleName="CCTV Portal">
                  <CCTVPortal />
                </ErrorBoundary>
              }
            />
            <Route
              path="/voice"
              element={
                <ErrorBoundary moduleName="Voice Evidence">
                  <VoiceEvidence />
                </ErrorBoundary>
              }
            />
            <Route
              path="/verify"
              element={
                <ErrorBoundary moduleName="Verify Evidence">
                  <VerifyEvidence />
                </ErrorBoundary>
              }
            />
            <Route
              path="/face-intelligence"
              element={
                <ErrorBoundary moduleName="Face Intelligence">
                  <Suspense fallback={<ModuleLoader name="Face Intelligence" />}>
                    <FaceIntelligence />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/prediction-engine"
              element={
                <ErrorBoundary moduleName="Prediction Engine">
                  <Suspense fallback={<ModuleLoader name="Prediction Engine" />}>
                    <PredictionEngine />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="/demo"
              element={
                <ErrorBoundary moduleName="Demo Mode">
                  <Suspense fallback={<ModuleLoader name="Demo Mode" />}>
                    <DemoMode />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            {/* Legal RAG route — ready for when module is implemented */}
            {/* <Route
              path="/legal-rag"
              element={
                <ErrorBoundary moduleName="Legal RAG">
                  <Suspense fallback={<ModuleLoader name="Legal RAG" />}>
                    <LegalRAG />
                  </Suspense>
                </ErrorBoundary>
              }
            /> */}
          </Routes>
        </main>
        <ErrorBoundary moduleName="Panic Button">
          <PanicButton />
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

export default App;
