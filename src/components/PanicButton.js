import React, { useEffect, useMemo, useState } from "react";
import { saveEvidence } from "../utils/evidenceStore";

function PanicButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!state?.activatedAt) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(state.activatedAt).getTime()) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const locationText = useMemo(() => {
    if (!state?.coords) return "Not available";
    const { latitude, longitude, accuracy } = state.coords;
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`;
  }, [state]);

  const elapsedText = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  const triggerEmergency = () => {
    setLoading(true);
    setError("");
    if (!navigator.geolocation) {
      setLoading(false);
      setError("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const activatedAt = new Date().toISOString();
        const id = `EMG-${Date.now()}`;
        const hash = `${id.toLowerCase().replace("-", "")}`.padEnd(64, "a").slice(0, 64);
        const locationLabel = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(
          6
        )} (±${Math.round(position.coords.accuracy)}m)`;
        saveEvidence({
          id,
          titleEn: "Emergency Panic Alert",
          titleUr: "ہنگامی الرٹ",
          incidentType: "emergency",
          mediaType: "panic",
          timestamp: activatedAt,
          sealedAt: activatedAt,
          sealed: true,
          hash,
          status: "Flagged",
          riskLevel: "High",
          firGenerated: false,
          locationLabel,
          city: "Field",
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          aiAnalysis: {
            statement_en: "Emergency panic alert generated from field unit.",
            statement_ur: "فیلڈ یونٹ سے ہنگامی الرٹ جاری کیا گیا ہے۔",
            ppc_sections: [],
            case_score: 90,
            risk_assessment: "Immediate response recommended.",
            recommended_action: "Dispatch nearest emergency team.",
          },
          custodyTimeline: [
            { label: "Emergency Triggered", labelUr: "ایمرجنسی ٹرگر ہوئی", at: activatedAt },
            { label: "GPS Captured", labelUr: "جی پی ایس محفوظ کیا گیا", at: activatedAt },
          ],
        });
        setLoading(false);
        setState({
          activatedAt,
          coords: position.coords,
        });
      },
      (geoError) => {
        setLoading(false);
        setError(`Could not access location: ${geoError.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!countdown) return undefined;
    const t = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(t);
          triggerEmergency();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [countdown]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-xl ring-4 ring-red-200 transition hover:bg-red-700 ${
          state ? "animate-ping" : "animate-pulse"
        }`}
      >
        PANIC | ایمرجنسی
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Emergency Alert | ہنگامی الرٹ</h3>
            <p className="mt-2 text-sm text-slate-600">
              Triggering this sends your current location to emergency response coordination.
            </p>
            {countdown > 0 && <p className="mt-2 rounded bg-amber-50 p-2 text-sm font-semibold text-amber-700">Activating in {countdown}... | {countdown} میں فعال ہو رہی ہے</p>}

            {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            {state && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-800">
                  Emergency activated | ایمرجنسی فعال کر دی گئی
                </p>
                <p className="mt-2 text-sm text-slate-700">Location: {locationText}</p>
                <p className="text-sm text-slate-700">
                  Time: {new Date(state.activatedAt).toLocaleString("en-PK", { hour12: false })}
                </p>
                <p className="text-sm font-semibold text-red-700">Emergency activated {elapsedText} ago</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close | بند کریں
              </button>
              <button
                type="button"
                onClick={() => setCountdown(3)}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Getting Location..." : "Activate Emergency"}
              </button>
              {state && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `EMERGENCY ALERT from SHAHID.AI Location: ${locationText} Time: ${new Date(
                      state.activatedAt
                    ).toLocaleString("en-PK", { hour12: false })}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Send to WhatsApp
                </a>
              )}
              {state && (
                <button type="button" onClick={() => setState(null)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                  Cancel
                </button>
              )}
              {state && (
                <button type="button" onClick={() => alert("Confirmed - Notify Contacts")} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">
                  Confirmed - Notify Contacts
                </button>
              )}
              {state && (
                <button type="button" onClick={() => window.open("tel:15")} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
                  Call 15
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PanicButton;
