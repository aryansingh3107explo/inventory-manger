import React, { useState } from "react";
import { api } from "../api";
import { 
  FileText, 
  Download, 
  Wrench, 
  Settings, 
  Database, 
  BrainCircuit, 
  TrendingUp,
  AlertCircle
} from "lucide-react";

export default function Reports() {
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  const reportsList = [
    {
      id: "maintenance",
      title: "Maintenance Schedule & Logs",
      desc: "Detailed logs of scheduled, pending, overdue, and completed maintenance runs including assigned technicians and repair remarks.",
      icon: Wrench,
      filename: "maintenance_report.pdf",
      color: "from-blue-500/10 to-indigo-500/5 text-blue-400"
    },
    {
      id: "health",
      title: "Machine Health & Telemetry",
      desc: "Operational list of machinery including installation dates, total running hours, and current status classifications (Operational, Down).",
      icon: Settings,
      filename: "machine_health_report.pdf",
      color: "from-teal-500/10 to-emerald-500/5 text-teal-400"
    },
    {
      id: "inventory",
      title: "Spare Parts Stock Status",
      desc: "Comprehensive stock inventory detailing quantities, shelf locations, and low-stock alerts highlighting items below safety minimums.",
      icon: Database,
      filename: "spare_parts_inventory_report.pdf",
      color: "from-amber-500/10 to-orange-500/5 text-amber-400"
    },
    {
      id: "usage",
      title: "Maintenance Parts Consumption",
      desc: "Historical logging of spare parts consumed across past machine repair tasks, showing quantities used and corresponding service dates.",
      icon: TrendingUp,
      filename: "spare_parts_usage_report.pdf",
      color: "from-violet-500/10 to-purple-500/5 text-purple-400"
    },
    {
      id: "ai",
      title: "AI Anomaly & Failure Risk",
      desc: "ML-generated predictions detailing failure probabilities, calculated risk levels, and auto-generated actionable recommendations.",
      icon: BrainCircuit,
      filename: "ai_prediction_report.pdf",
      color: "from-red-500/10 to-rose-500/5 text-red-400"
    }
  ];

  const handleDownload = async (reportId, filename) => {
    try {
      setError("");
      setDownloading(reportId);
      await api.downloadPdf(`/reports/${reportId}`, filename);
    } catch (err) {
      setError("Failed to download PDF report: " + err.message);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Document & Reports Portal</h2>
        <p className="text-xs text-slate-400">Generate and download official PDF reports summarizing workshop metrics, inventory, and predictions.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isCurrent = downloading === rep.id;

          return (
            <div key={rep.id} className="glass-panel border border-slate-900 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-800 transition-all">
              <div className="flex gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${rep.color}`}>
                  <Icon size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white tracking-wide">{rep.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{rep.desc}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-900/60 pt-4 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Format: <b>PDF</b></span>
                
                <button
                  onClick={() => handleDownload(rep.id, rep.filename)}
                  disabled={!!downloading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  <Download size={13} />
                  {isCurrent ? "Downloading..." : "Compile & Download"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
