import React, { useState, useEffect } from "react";
import { Bell, AlertTriangle, Settings, Database, CheckCircle2 } from "lucide-react";
import { api } from "../api";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const [machines, parts, predictions] = await Promise.all([
        api.get("/machines"),
        api.get("/parts"),
        api.get("/predictions")
      ]);

      const alerts = [];

      // 1. Check Down machines
      machines.forEach(m => {
        if (m.status === "Down") {
          alerts.push({
            id: `down-${m.machine_id}`,
            type: "danger",
            title: "Equipment Breakdown",
            message: `Locomotive Gear/Machine ${m.machine_name} (${m.machine_id}) is currently Down!`,
            icon: Settings,
            time: "Immediate Check"
          });
        }
      });

      // 2. Check High Risk predictions
      // Group predictions by machine and find latest
      const latestPreds = {};
      predictions.forEach(p => {
        if (!latestPreds[p.machine_id] || new Date(p.prediction_date) > new Date(latestPreds[p.machine_id].prediction_date)) {
          latestPreds[p.machine_id] = p;
        }
      });

      Object.keys(latestPreds).forEach(mId => {
        const p = latestPreds[mId];
        const machine = machines.find(m => m.machine_id === mId);
        if (p.risk_level === "High" && machine && machine.status !== "Down") {
          alerts.push({
            id: `risk-${mId}`,
            type: "warning",
            title: "High Failure Anomaly",
            message: `AI predicts ${machine.machine_name} (${mId}) is at ${p.failure_probability}% failure probability!`,
            icon: AlertTriangle,
            time: "Action Required"
          });
        }
      });

      // 3. Check Low Stock parts
      parts.forEach(p => {
        if (p.quantity < p.min_stock) {
          alerts.push({
            id: `stock-${p.part_id}`,
            type: "warning",
            title: "Critical Parts Shortage",
            message: `${p.part_name} (${p.part_number}) stock is low: ${p.quantity} left (min: ${p.min_stock}).`,
            icon: Database,
            time: "Replenish Stock"
          });
        }
      });

      // If no warnings, add a clean default notification
      if (alerts.length === 0) {
        alerts.push({
          id: "all-clear",
          type: "success",
          title: "All Systems Operational",
          message: "All workshop machinery and parts inventory levels are stable.",
          icon: CheckCircle2,
          time: "Standard Operations"
        });
      }

      setNotifications(alerts);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const activeAlertsCount = notifications.filter(n => n.id !== "all-clear").length;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative rounded-xl border border-slate-900 bg-slate-900/50 p-2.5 text-slate-400 hover:text-slate-200 focus:outline-none transition-all active:scale-95"
      >
        <Bell size={18} />
        {activeAlertsCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white shadow-glow-red animate-pulse">
            {activeAlertsCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-3 z-50 w-80 rounded-2xl border border-slate-900 bg-slate-950 p-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workshop Alert Center</span>
              {activeAlertsCount > 0 && (
                <span className="text-[10px] rounded-full bg-red-500/10 px-2 py-0.5 font-bold text-red-400 uppercase tracking-wide">
                  {activeAlertsCount} Warning(s)
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 scrollbar-thin">
              {notifications.map(n => {
                const Icon = n.icon;
                const borderColors = {
                  danger: "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10",
                  warning: "border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10",
                  success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
                };

                return (
                  <div 
                    key={n.id} 
                    className={`flex items-start gap-3 rounded-xl border p-3 text-xs transition-all ${borderColors[n.type]}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white leading-tight">{n.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">{n.message}</p>
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-2">
                        {n.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
