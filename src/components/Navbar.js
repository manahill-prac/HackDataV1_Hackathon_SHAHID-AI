import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard", urdu: "ڈیش بورڈ" },
  { to: "/capture", label: "Capture Evidence", urdu: "ثبوت محفوظ کریں" },
  { to: "/cctv", label: "CCTV Portal", urdu: "سی سی ٹی وی پورٹل" },
  { to: "/voice", label: "Voice Evidence", urdu: "آواز ثبوت" },
  { to: "/analytics", label: "Analytics", urdu: "تجزیات" },
  { to: "/face-intelligence", label: "Face Intelligence", urdu: "چہرہ انٹیلیجنس" },
  { to: "/prediction-engine", label: "Prediction", urdu: "پیش گوئی" },
  { to: "/verify", label: "Verify", urdu: "تصدیق" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
      isActive
        ? "bg-[#4F8090]/35 text-[#F2F2F2] shadow-inner shadow-black/20"
        : "text-[#B6C1D1] hover:bg-[#4F8090]/20 hover:text-[#F2F2F2]"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#4F8090]/30 bg-[#1A202C]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" className="text-[#4F8090]">
              <path fill="currentColor" d="M12 2l8 3v6c0 5.55-3.84 10.74-8 12c-4.16-1.26-8-6.45-8-12V5l8-3zm0 4.18L6 8.25V11c0 4.05 2.55 7.95 6 9.34c3.45-1.39 6-5.29 6-9.34V8.25l-6-2.07z" />
            </svg>
            <div>
              <p className="text-2xl font-black tracking-tight text-[#F2F2F2]">SHAHID.AI</p>
              <p className="hidden text-xs font-medium text-[#B6C1D1] md:block">
                Pakistan&apos;s First AI Crime Intelligence Platform
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-[#4F8090]/40 px-3 py-2 text-sm font-semibold text-[#F2F2F2] md:hidden"
          >
            Menu | مینیو
          </button>
        </div>

        <nav className="mt-3 hidden flex-wrap items-center gap-2 md:flex">
          {links.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/demo"
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-bold transition whitespace-nowrap border ${
                isActive
                  ? "border-[#EF9B20] bg-[#EF9B20]/20 text-[#EF9B20]"
                  : "border-[#EF9B20]/50 text-[#EF9B20] hover:bg-[#EF9B20]/10"
              }`
            }
          >
            ⚡ Demo
          </NavLink>
        </nav>

        <div
          className={`mt-3 grid w-full gap-2 overflow-hidden transition-all md:hidden ${
            open ? "max-h-96" : "max-h-0"
          }`}
        >
          {links.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setOpen(false)}>
              {item.label}
              <span className="ml-1 text-xs text-[#B6C1D1]">| {item.urdu}</span>
            </NavLink>
          ))}
          <NavLink
            to="/demo"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-bold transition border ${
                isActive
                  ? "border-[#EF9B20] bg-[#EF9B20]/20 text-[#EF9B20]"
                  : "border-[#EF9B20]/50 text-[#EF9B20]"
              }`
            }
          >
            ⚡ Demo Mode
          </NavLink>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
