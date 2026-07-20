import React, { useState, useContext } from "react";
import { AuthContext } from "../App";
import { ShieldCheck, Mail, Lock, AlertCircle } from "lucide-react";

import { api } from "../api";

export default function EmployeeLogin() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    setTimeout(() => {
      let role = "Technician";
      let name = "Technician User";
      if (email.includes("admin")) {
        role = "Admin";
        name = "Admin User";
      } else if (email.includes("engineer")) {
        role = "Engineer";
        name = "Engineer User";
      }
      
      login(
        { name, email: email, role },
        "mock-jwt-token"
      );
      setSubmitting(false);
    }, 100);
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    let role = "Technician";
    let name = "Technician User";
    if (quickEmail.includes("admin")) {
      role = "Admin";
      name = "Admin User";
    } else if (quickEmail.includes("engineer")) {
      role = "Engineer";
      name = "Engineer User";
    }
    login(
      { name, email: quickEmail, role },
      "mock-jwt-token"
    );
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl"></div>

        {/* Branding header */}
        <div className="mb-8 text-center relative z-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-glow-green">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Railway Workshop</h2>
          <p className="mt-1.5 text-xs text-slate-400 uppercase tracking-widest">Inventory & Preventive Maintenance</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 relative z-10">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Employee Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                placeholder="email@railway.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800/80 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800/80 bg-slate-950/60 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {submitting ? "Authenticating..." : "Login Securely"}
          </button>
        </form>

        {/* Quick Seeding Accounts Helper */}
        <div className="mt-8 border-t border-slate-800/60 pt-6 relative z-10">
          <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Demo Logins</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin("admin@railway.com", "admin123")}
              className="rounded-lg bg-slate-900 border border-slate-800/80 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-all"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin("engineer@railway.com", "engineer123")}
              className="rounded-lg bg-slate-900 border border-slate-800/80 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-all"
            >
              Engineer
            </button>
            <button
              onClick={() => handleQuickLogin("tech@railway.com", "tech123")}
              className="rounded-lg bg-slate-900 border border-slate-800/80 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-800 transition-all"
            >
              Technician
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
