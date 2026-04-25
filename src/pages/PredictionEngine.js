import React, { useMemo } from "react";
import { getEvidenceList } from "../utils/evidenceStore";
import { generatePredictionIntelligence } from "../utils/crimeML";

function PredictionEngine() {
  const evidence = useMemo(() => getEvidenceList(), []);
  const intel = useMemo(() => generatePredictionIntelligence(evidence), [evidence]);

  return (
    <section className="space-y-6">
      <header className="ui-card">
        <h1 className="text-2xl font-black">Predictive Crime Intelligence | پیش گوئی انٹیلیجنس</h1>
        <p className="ui-muted mt-2">Model Last Trained: {new Date(intel.trainedAt).toLocaleString("en-PK", { hour12: false })}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="ui-card">
          <p className="text-xs ui-muted">Cities Forecasted</p>
          <p className="text-3xl font-black">{intel.cityForecast.length}</p>
        </article>
        <article className="ui-card">
          <p className="text-xs ui-muted">Anomaly Alerts</p>
          <p className="text-3xl font-black text-[#EF9B20]">{intel.anomalies.anomalies.length}</p>
        </article>
        <article className="ui-card">
          <p className="text-xs ui-muted">Fusion Signals</p>
          <p className="text-3xl font-black text-red-300">{intel.fusionSignals.length}</p>
        </article>
      </div>

      <article className="ui-card">
        <h2 className="text-lg font-bold">48-Hour Forecast | اگلے 48 گھنٹے</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {intel.cityForecast.slice(0, 9).map((city) => (
            <div key={city.city} className="rounded-xl border border-[#4F8090]/35 p-3">
              <p className="font-semibold">{city.city}</p>
              <p className="ui-muted text-sm">Prediction: {city.prediction}</p>
              <p className="ui-muted text-sm">Confidence: {city.confidence}%</p>
              <ul className="mt-2 text-xs text-[#B6C1D1]">
                {city.drivers.map((driver) => (
                  <li key={`${city.city}-${driver}`}>- {driver}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </article>

      <article className="ui-card">
        <h2 className="text-lg font-bold">Anomaly Warnings | غیر معمولی خطرات</h2>
        <div className="mt-3 space-y-2">
          {intel.anomalies.anomalies.map((a) => (
            <div key={a.day} className="rounded-lg border border-[#EF9B20]/35 p-3 text-sm">
              <p className="font-semibold text-[#EF9B20]">Emerging Hotspot Warning</p>
              <p>Date: {a.day}</p>
              <p>Risk Spike +{Math.round(a.z * 25)}%</p>
            </div>
          ))}
          {!intel.anomalies.anomalies.length ? <p className="ui-muted text-sm">No anomaly spike currently detected.</p> : null}
        </div>
      </article>
    </section>
  );
}

export default PredictionEngine;
