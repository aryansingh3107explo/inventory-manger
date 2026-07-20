import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  BrainCircuit, 
  HelpCircle, 
  Activity, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Sparkles,
  Play
} from "lucide-react";

export default function AIPrediction() {
  const [machines, setMachines] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Simulator states
  const [simMachineId, setSimMachineId] = useState("");
  const [simTemp, setSimTemp] = useState(70);
  const [simVibration, setSimVibration] = useState(2.5);
  const [simHours, setSimHours] = useState("");
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machData, predData] = await Promise.all([
        api.get("/machines"),
        api.get("/predictions")
      ]);
      setMachines(machData);
      setPredictions(predData);
      if (machData.length > 0) {
        setSimMachineId(machData[0].machine_id);
        setSimHours(machData[0].running_hours);
      }
    } catch (err) {
      setError("Failed to fetch AI predictions registry.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    try {
      setSimLoading(true);
      const result = await api.predictFailure({
        machine_id: simMachineId,
        temperature: parseFloat(simTemp),
        vibration: parseFloat(simVibration),
        hours: simHours ? parseFloat(simHours) : undefined
      });
      setSimResult(result);
    } catch (err) {
      alert("Simulation failed: " + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleMachineChange = (machineId) => {
    setSimMachineId(machineId);
    const machine = machines.find(m => m.machine_id === machineId);
    if (machine) {
      setSimHours(machine.running_hours);
    }
  };

  // Map machines to their latest prediction
  const getLatestPrediction = (machineId) => {
    return predictions.find(p => p.machine_id === machineId);
  };

  // Sort machines by risk level (High, then Medium, then Low, then N/A)
  const sortedMachines = [...machines].sort((a, b) => {
    const predA = getLatestPrediction(a.machine_id);
    const predB = getLatestPrediction(b.machine_id);
    
    const score = { High: 3, Medium: 2, Low: 1, undefined: 0 };
    const scoreA = score[predA?.risk_level] || 0;
    const scoreB = score[predB?.risk_level] || 0;
    
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">AI Predictive Prognostics</h2>
        <p className="text-xs text-slate-400">Classify structural anomalies, forecast equipment failure risk, and run simulated stress tests.</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* SIMULATOR PANEL */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wider uppercase mb-1.5 flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                Telemetry Simulator
              </h3>
              <p className="text-xs text-slate-500 mb-6">Model virtual sensor conditions to test machine failure probabilities in real time.</p>
              
              <form onSubmit={handleSimulate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Simulated Machine</label>
                  <select
                    value={simMachineId}
                    onChange={(e) => handleMachineChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {machines.map(m => (
                      <option key={m.machine_id} value={m.machine_id}>{m.machine_name} ({m.machine_id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Temperature (°C)</label>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{simTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="125"
                    step="0.5"
                    value={simTemp}
                    onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vibration Level (mm/s)</label>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{simVibration} mm/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="15.0"
                    step="0.1"
                    value={simVibration}
                    onChange={(e) => setSimVibration(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operating Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={simHours}
                    onChange={(e) => setSimHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 5000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play size={12} fill="currentColor" />
                  {simLoading ? "Calculating..." : "Compute Anomaly Prognostic"}
                </button>
              </form>
            </div>

            {/* Sim Result Render */}
            {simResult && (
              <div className="mt-6 border-t border-slate-800/80 pt-5 space-y-3.5 fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Predicted Probability</span>
                    <div className="text-3xl font-extrabold text-white mt-0.5">{simResult.failure_probability}%</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                    simResult.risk_level === "High" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    simResult.risk_level === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {simResult.risk_level} Risk
                  </span>
                </div>
                {simResult.recommendations && (
                  <div className="rounded-xl bg-slate-950/50 border border-slate-900 p-3 text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">AI Recommendations:</span>
                    <ul className="list-disc pl-4 mt-1.5 space-y-1 text-slate-300">
                      {simResult.recommendations.split(", ").map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MACHINERY AI RISK REGISTRY */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wider uppercase border-b border-slate-900 pb-2">
              Machine Failure Classification Registry
            </h3>

            <div className="space-y-4">
              {sortedMachines.map(m => {
                const pred = getLatestPrediction(m.machine_id);
                
                const riskColors = {
                  High: {
                    badge: "bg-red-500/10 text-red-400 border-red-500/20 glow-danger animate-pulse",
                    bar: "bg-red-500"
                  },
                  Medium: {
                    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20 glow-warning",
                    bar: "bg-amber-500"
                  },
                  Low: {
                    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    bar: "bg-emerald-500"
                  },
                  None: {
                    badge: "bg-slate-800 text-slate-500 border-slate-800",
                    bar: "bg-slate-800"
                  }
                };

                const activeRisk = pred ? riskColors[pred.risk_level] : riskColors.None;

                return (
                  <div key={m.machine_id} className="glass-panel rounded-2xl p-5 border border-slate-900 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">{m.department}</span>
                      <h4 className="text-base font-bold text-white leading-tight">{m.machine_name}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Hours: <b>{m.running_hours.toFixed(1)} hrs</b></span>
                        <span>•</span>
                        <span>ID: <code className="font-mono text-emerald-400">{m.machine_id}</code></span>
                      </div>
                    </div>

                    <div className="flex-1 max-w-xs space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Failure Risk Score</span>
                        <span className="text-slate-300 font-mono">{pred ? `${pred.failure_probability}%` : "No Telemetry"}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${activeRisk.bar}`} 
                          style={{ width: `${pred ? pred.failure_probability : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border tracking-wider ${activeRisk.badge}`}>
                        {pred ? `${pred.risk_level} Risk` : "N/A"}
                      </span>
                      {pred && pred.recommendations && (
                        <span className="text-[10px] text-slate-400 text-right mt-1 max-w-[180px] truncate" title={pred.recommendations}>
                          Rec: {pred.recommendations.split(", ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
