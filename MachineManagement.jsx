import React, { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../App";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Activity, 
  Eye, 
  History, 
  Thermometer, 
  Cpu, 
  AlertCircle, 
  X,
  Gauge,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function MachineManagement() {
  const { user } = useContext(AuthContext);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  
  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [detailMachine, setDetailMachine] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    machine_id: "",
    machine_name: "",
    department: "",
    installation_date: "",
    running_hours: 0,
    status: "Operational"
  });
  const [telemetryData, setTelemetryData] = useState({
    temperature: 65,
    vibration: 2.0
  });

  const isEditor = user?.role === "Admin" || user?.role === "Engineer";
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const data = await api.get("/machines");
      setMachines(data);
    } catch (err) {
      setError("Failed to fetch machinery records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      machine_id: "",
      machine_name: "",
      department: "Machining Shop",
      installation_date: new Date().toISOString().split('T')[0],
      running_hours: 0,
      status: "Operational"
    });
    setSelectedMachine(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (machine) => {
    setFormData({
      machine_id: machine.machine_id,
      machine_name: machine.machine_name,
      department: machine.department,
      installation_date: machine.installation_date,
      running_hours: machine.running_hours,
      status: machine.status
    });
    setSelectedMachine(machine);
    setShowAddEditModal(true);
  };

  const handleOpenTelemetry = (machine) => {
    setSelectedMachine(machine);
    setTelemetryData({ temperature: 65, vibration: 2.0 });
    setShowTelemetryModal(true);
  };

  const handleOpenDetails = async (machine) => {
    try {
      const data = await api.get(`/machines/${machine.machine_id}/history`);
      setDetailMachine(data);
      setShowDetailPanel(true);
    } catch (err) {
      alert("Failed to fetch machine records: " + err.message);
    }
  };

  const handleSaveMachine = async (e) => {
    e.preventDefault();
    try {
      if (selectedMachine) {
        // Edit mode (Note: machine_id is read-only)
        await api.put(`/machines/${selectedMachine.machine_id}`, {
          machine_name: formData.machine_name,
          department: formData.department,
          running_hours: formData.running_hours,
          status: formData.status
        });
      } else {
        // Add mode
        await api.post("/machines", formData);
      }
      setShowAddEditModal(false);
      fetchMachines();
    } catch (err) {
      alert("Error saving machine: " + err.message);
    }
  };

  const handleLogTelemetry = async (e) => {
    e.preventDefault();
    try {
      const result = await api.post("/telemetry", {
        machine_id: selectedMachine.machine_id,
        temperature: parseFloat(telemetryData.temperature),
        vibration: parseFloat(telemetryData.vibration)
      });
      setShowTelemetryModal(false);
      alert(`Telemetry logged successfully for ${selectedMachine.machine_id}.\nAI Risk Prediction: ${result.ai_prediction.failure_probability}% (${result.ai_prediction.risk_level})`);
      fetchMachines();
    } catch (err) {
      alert("Failed to log telemetry: " + err.message);
    }
  };

  const handleDelete = async (machineId) => {
    if (!window.confirm(`Are you sure you want to delete ${machineId}? This deletes all maintenance history.`)) return;
    try {
      await api.delete(`/machines/${machineId}`);
      fetchMachines();
    } catch (err) {
      alert("Failed to delete machine: " + err.message);
    }
  };

  const filteredMachines = machines.filter(m => 
    m.machine_id.toLowerCase().includes(search.toLowerCase()) ||
    m.machine_name.toLowerCase().includes(search.toLowerCase()) ||
    m.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Machinery Registry</h2>
          <p className="text-xs text-slate-400">Track operating parameters, inspect logs, and feed mechanical sensor telemetry.</p>
        </div>
        {isEditor && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            Register Machine
          </button>
        )}
      </div>

      {/* Search & Alerts */}
      <div className="flex items-center gap-3 glass-panel rounded-2xl p-3 border border-slate-900">
        <Search size={18} className="text-slate-500 ml-2" />
        <input
          type="text"
          placeholder="Filter machines by name, ID or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredMachines.map((m) => {
            const statusColors = {
              Operational: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
              "Under Maintenance": "bg-amber-500/10 text-amber-400 border border-amber-500/25",
              Down: "bg-red-500/10 text-red-400 border border-red-500/25"
            };

            return (
              <div key={m.machine_id} className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-900 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">{m.department}</span>
                      <h3 className="text-lg font-bold text-white leading-tight mt-0.5">{m.machine_name}</h3>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1">ID: <code className="text-emerald-400 font-mono">{m.machine_id}</code></p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusColors[m.status] || "bg-slate-800 text-slate-400"}`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-slate-900/80 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operating Hours</span>
                      <span className="font-semibold text-slate-300">{m.running_hours.toFixed(1)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Serviced</span>
                      <span className="font-semibold text-slate-300">{m.last_service || "Never"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2 border-t border-slate-900/80 pt-4">
                  <button
                    onClick={() => handleOpenDetails(m)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 py-2 text-xs font-semibold text-slate-300 transition-all"
                  >
                    <Eye size={14} />
                    Details
                  </button>
                  
                  <button
                    onClick={() => handleOpenTelemetry(m)}
                    className="flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-2 text-emerald-400 transition-all"
                    title="Log Sensor Telemetry"
                  >
                    <Activity size={15} />
                  </button>

                  {isEditor && (
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="flex items-center justify-center rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 p-2 text-blue-400 transition-all"
                      title="Edit Machine Details"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(m.machine_id)}
                      className="flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-2 text-red-400 transition-all"
                      title="Delete Machine"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD/EDIT MACHINE MODAL --- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button 
              onClick={() => setShowAddEditModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">
              {selectedMachine ? `Edit ${selectedMachine.machine_id}` : "Register New Machine"}
            </h3>
            
            <form onSubmit={handleSaveMachine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Machine ID</label>
                <input
                  type="text"
                  required
                  disabled={!!selectedMachine}
                  placeholder="e.g. Lathe-05"
                  value={formData.machine_id}
                  onChange={(e) => setFormData({...formData, machine_id: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Machine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Lathe Machine"
                  value={formData.machine_name}
                  onChange={(e) => setFormData({...formData, machine_name: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Machining Shop">Machining Shop</option>
                  <option value="Milling Shop">Milling Shop</option>
                  <option value="Welding Shop">Welding Shop</option>
                  <option value="Steam Power House">Steam Power House</option>
                  <option value="Electronics Workshop">Electronics Workshop</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Install Date</label>
                  <input
                    type="date"
                    required
                    value={formData.installation_date}
                    onChange={(e) => setFormData({...formData, installation_date: e.target.value})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operating Hours</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.running_hours}
                    onChange={(e) => setFormData({...formData, running_hours: parseFloat(e.target.value) || 0})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Machine Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Operational">Operational</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Down">Down</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
              >
                {selectedMachine ? "Update Machine Details" : "Register Machine"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG TELEMETRY MODAL --- */}
      {showTelemetryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button 
              onClick={() => setShowTelemetryModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Activity size={20} className="text-emerald-400 animate-pulse" />
              Log Sensor Telemetry
            </h3>
            <p className="text-xs text-slate-400 mb-4">Logging sensor values for <b>{selectedMachine?.machine_id}</b> automatically runs the AI breakdown predictive classification.</p>
            
            <form onSubmit={handleLogTelemetry} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Temperature (°C)</label>
                  <span className="text-sm font-mono text-emerald-400">{telemetryData.temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="120"
                  step="0.5"
                  value={telemetryData.temperature}
                  onChange={(e) => setTelemetryData({...telemetryData, temperature: parseFloat(e.target.value)})}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>40°C (Idle)</span>
                  <span>80°C (Warning)</span>
                  <span>120°C (Critical)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vibration Level (mm/s)</label>
                  <span className="text-sm font-mono text-emerald-400">{telemetryData.vibration} mm/s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="15.0"
                  step="0.1"
                  value={telemetryData.vibration}
                  onChange={(e) => setTelemetryData({...telemetryData, vibration: parseFloat(e.target.value)})}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0.2 mm/s (Smooth)</span>
                  <span>5.0 mm/s (Moderate)</span>
                  <span>15.0 mm/s (Severe Anomaly)</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
              >
                Log Values & Predict Anomaly
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL SLIDE-OUT PANEL --- */}
      {showDetailPanel && detailMachine && (() => {
        const latestPred = detailMachine.predictions.length > 0 ? detailMachine.predictions[0] : null;
        const probability = latestPred ? latestPred.failure_probability : 0;
        const riskLevel = latestPred ? latestPred.risk_level : "None";

        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (probability / 100) * circumference;

        const riskColors = {
          High: {
            badge: "bg-red-500/10 text-red-400 border-red-500/20 glow-danger animate-pulse",
            bar: "rgb(239, 68, 68)"
          },
          Medium: {
            badge: "bg-amber-500/10 text-amber-400 border-amber-500/20 glow-warning",
            bar: "rgb(245, 158, 11)"
          },
          Low: {
            badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            bar: "rgb(16, 185, 129)"
          },
          None: {
            badge: "bg-slate-800 text-slate-500 border-slate-800",
            bar: "rgb(100, 116, 139)"
          }
        };

        const activeColors = riskColors[riskLevel] || riskColors.None;

        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
            <div className="h-full w-full max-w-lg border-l border-slate-900 bg-slate-950 p-6 overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">{detailMachine.machine.machine_name}</h3>
                  <p className="text-xs text-slate-400">Database Record ID: <span className="font-mono text-emerald-400">{detailMachine.machine.machine_id}</span></p>
                </div>
                <button 
                  onClick={() => setShowDetailPanel(false)}
                  className="rounded-lg border border-slate-900 bg-slate-900/50 p-2 text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Visual AI Risk Gauge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="flex flex-col items-center justify-center bg-slate-900/10 border border-slate-900 rounded-2xl p-5 shadow-inner">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="none" />
                        <circle cx="50" cy="50" r={radius} stroke={activeColors.bar} strokeWidth="8" fill="none"
                                strokeDasharray={circumference} strokeDashoffset={offset}
                                strokeLinecap="round" className="transition-all duration-1000" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-extrabold text-white leading-none tracking-tight">{probability}%</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-1">{riskLevel} Risk</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500">Department</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{detailMachine.machine.department}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Running Hours</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{detailMachine.machine.running_hours.toFixed(1)} hrs</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Commission Date</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{detailMachine.machine.installation_date}</p>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Verdict Box */}
                {latestPred && (
                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 glow-green">
                    <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Sparkles size={12} />
                      IR-Works AI Diagnostic Verdict
                    </h5>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {latestPred.recommendations || "Locomotive parameters are within normal threshold. Scheduled checks should continue."}
                    </p>
                  </div>
                )}

                {/* Maintenance Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <History size={14} className="text-emerald-400" />
                    Locomotive Maintenance Timeline
                  </h4>

                  <div className="relative border-l border-slate-900 ml-3 pl-6 space-y-6">
                    {/* Future / Current Event */}
                    <div className="relative">
                      <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 border-2 border-emerald-500 text-emerald-400">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      </span>
                      <h5 className="font-bold text-white text-xs">
                        {detailMachine.machine.status === "Under Maintenance" ? "Undergoing Active Overhaul" : "Next Scheduled Audit"}
                      </h5>
                      <p className="text-slate-500 text-[10px] uppercase font-semibold mt-0.5">
                        {detailMachine.machine.status === "Under Maintenance" ? "In Progress" : "Standard 3-Month Routine"}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                        {detailMachine.machine.status === "Under Maintenance" 
                          ? "Technicians are currently completing log service routine and parts checkup."
                          : "Audit will be automatically triggered by scheduler upon next running hour threshold."}
                      </p>
                    </div>

                    {/* Past Maintenance Logs */}
                    {detailMachine.maintenances.map((m) => (
                      <div key={m.maintenance_id} className="relative">
                        <span className={`absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 border-2 ${
                          m.status === "Completed" ? "border-emerald-500 text-emerald-400" : "border-amber-500 text-amber-400"
                        }`}>
                          <CheckCircle2 size={12} />
                        </span>
                        <h5 className="font-bold text-slate-200 text-xs">{m.remarks || "Routine Checkup Completed"}</h5>
                        <p className="text-slate-500 text-[10px] uppercase font-semibold mt-0.5">
                          {m.maintenance_date} • Tech: {m.technician}
                        </p>
                        <p className="text-slate-400 text-[11px] mt-1">
                          Status classification: <b className="text-slate-300">{m.status}</b>
                        </p>
                      </div>
                    ))}

                    {/* Base Installation Event */}
                    <div className="relative">
                      <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 border-2 border-blue-500 text-blue-400">
                        <Settings size={12} />
                      </span>
                      <h5 className="font-bold text-slate-400 text-xs">Locomotive Commissioned</h5>
                      <p className="text-slate-500 text-[10px] uppercase font-semibold mt-0.5">
                        {detailMachine.machine.installation_date}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                        Equipment successfully installed, aligned, and calibrated in the {detailMachine.machine.department}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
