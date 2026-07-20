import React, { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../App";
import { 
  Plus, 
  Calendar, 
  User, 
  Info, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  Trash2,
  FileText
} from "lucide-react";

export default function MaintenanceScheduler() {
  const { user } = useContext(AuthContext);
  const [maintenances, setMaintenances] = useState([]);
  const [machines, setMachines] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedMaint, setSelectedMaint] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    machine_id: "",
    maintenance_date: "",
    technician: "",
    remarks: "",
    status: "Scheduled",
    parts_used: [] // list of {part_id, quantity_used}
  });
  
  // Adding part helper inside schedule modal
  const [currentPartId, setCurrentPartId] = useState("");
  const [currentPartQty, setCurrentPartQty] = useState(1);

  const [completionRemarks, setCompletionRemarks] = useState("");

  const isEditor = user?.role === "Admin" || user?.role === "Engineer";
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [maintData, machData, partData] = await Promise.all([
        api.get("/maintenance"),
        api.get("/machines"),
        api.get("/parts")
      ]);
      setMaintenances(maintData);
      setMachines(machData);
      setParts(partData);
    } catch (err) {
      setError("Failed to fetch maintenance records.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    if (machines.length === 0) {
      alert("Please register a machine first!");
      return;
    }
    setFormData({
      machine_id: machines[0].machine_id,
      maintenance_date: new Date().toISOString().split('T')[0],
      technician: user?.name || "",
      remarks: "",
      status: "Scheduled",
      parts_used: []
    });
    setCurrentPartId("");
    setCurrentPartQty(1);
    setShowAddModal(true);
  };

  const handleAddPartToForm = () => {
    if (!currentPartId) return;
    const selectedPart = parts.find(p => p.part_id === parseInt(currentPartId, 10));
    if (!selectedPart) return;

    // Check if part is already added
    const existingIndex = formData.parts_used.findIndex(p => p.part_id === selectedPart.part_id);
    if (existingIndex > -1) {
      const updatedParts = [...formData.parts_used];
      updatedParts[existingIndex].quantity_used += parseInt(currentPartQty, 10);
      setFormData({ ...formData, parts_used: updatedParts });
    } else {
      setFormData({
        ...formData,
        parts_used: [
          ...formData.parts_used,
          { part_id: selectedPart.part_id, part_name: selectedPart.part_name, quantity_used: parseInt(currentPartQty, 10) }
        ]
      });
    }
  };

  const handleRemovePartFromForm = (partId) => {
    setFormData({
      ...formData,
      parts_used: formData.parts_used.filter(p => p.part_id !== partId)
    });
  };

  const handleScheduleMaint = async (e) => {
    e.preventDefault();
    try {
      await api.post("/maintenance", {
        machine_id: formData.machine_id,
        maintenance_date: formData.maintenance_date,
        technician: formData.technician,
        remarks: formData.remarks,
        status: formData.status,
        parts_used: formData.parts_used.map(p => ({
          part_id: p.part_id,
          quantity_used: p.quantity_used
        }))
      });
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert("Error scheduling maintenance: " + err.message);
    }
  };

  const handleOpenComplete = (maint) => {
    setSelectedMaint(maint);
    setCompletionRemarks(maint.remarks || "");
    setShowCompleteModal(true);
  };

  const handleCompleteMaint = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/maintenance/${selectedMaint.maintenance_id}`, {
        status: "Completed",
        remarks: completionRemarks,
        maintenance_date: new Date().toISOString().split('T')[0] // Set date to completion date
      });
      setShowCompleteModal(false);
      fetchData();
    } catch (err) {
      alert("Error completing maintenance: " + err.message);
    }
  };

  const handleDelete = async (maintId) => {
    if (!window.confirm("Are you sure you want to cancel and delete this maintenance record?")) return;
    try {
      await api.delete(`/maintenance/${maintId}`);
      fetchData();
    } catch (err) {
      alert("Error deleting record: " + err.message);
    }
  };

  // Grouping maintenances
  const completedList = maintenances.filter(m => m.status === "Completed");
  const upcomingList = maintenances.filter(m => m.status === "Scheduled");
  const overdueList = maintenances.filter(m => m.status === "Overdue");

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Maintenance Scheduler</h2>
          <p className="text-xs text-slate-400">Track upcoming services, view overdue inspection warnings, and complete logged job sheets.</p>
        </div>
        {isEditor && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            Schedule Service
          </button>
        )}
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* OVERDUE COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
              <h3 className="text-sm font-bold text-red-400 tracking-wider uppercase flex items-center gap-2">
                <AlertTriangle size={16} />
                Overdue Checkups ({overdueList.length})
              </h3>
            </div>
            <div className="space-y-3">
              {overdueList.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">No overdue maintenance tasks.</p>
              ) : (
                overdueList.map(m => (
                  <MaintenanceCard key={m.maintenance_id} m={m} onComplete={handleOpenComplete} onDelete={handleDelete} isAdmin={isAdmin} />
                ))
              )}
            </div>
          </div>

          {/* UPCOMING COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <h3 className="text-sm font-bold text-amber-400 tracking-wider uppercase flex items-center gap-2">
                <Clock size={16} />
                Upcoming Tasks ({upcomingList.length})
              </h3>
            </div>
            <div className="space-y-3">
              {upcomingList.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">No upcoming maintenance scheduled.</p>
              ) : (
                upcomingList.map(m => (
                  <MaintenanceCard key={m.maintenance_id} m={m} onComplete={handleOpenComplete} onDelete={handleDelete} isAdmin={isAdmin} />
                ))
              )}
            </div>
          </div>

          {/* COMPLETED COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <h3 className="text-sm font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                <CheckCircle size={16} />
                Job Logs Completed ({completedList.length})
              </h3>
            </div>
            <div className="space-y-3">
              {completedList.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">No completed maintenance history logged.</p>
              ) : (
                completedList.map(m => (
                  <MaintenanceCard key={m.maintenance_id} m={m} onDelete={handleDelete} isAdmin={isAdmin} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/SCHEDULE MAINTENANCE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Schedule Machine Service</h3>
            
            <form onSubmit={handleScheduleMaint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Machinery</label>
                <select
                  value={formData.machine_id}
                  onChange={(e) => setFormData({...formData, machine_id: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {machines.map(m => (
                    <option key={m.machine_id} value={m.machine_id}>{m.machine_name} ({m.machine_id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Date</label>
                  <input
                    type="date"
                    required
                    value={formData.maintenance_date}
                    onChange={(e) => setFormData({...formData, maintenance_date: e.target.value})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Technician</label>
                  <input
                    type="text"
                    required
                    placeholder="Technician Name"
                    value={formData.technician}
                    onChange={(e) => setFormData({...formData, technician: e.target.value})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks / Details</label>
                <textarea
                  placeholder="e.g. Inspect spindle and calibrate axis coordinates."
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 h-20 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed (Deducts stock immediately)</option>
                </select>
              </div>

              {/* Spare Parts Consumed sub-form */}
              <div className="border-t border-slate-800/80 pt-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Associate Spare Parts Consumed</label>
                <div className="flex gap-2 mb-3">
                  <select
                    value={currentPartId}
                    onChange={(e) => setCurrentPartId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Choose Spare SKU --</option>
                    {parts.map(p => (
                      <option key={p.part_id} value={p.part_id}>{p.part_name} (Stock: {p.quantity})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={currentPartQty}
                    onChange={(e) => setCurrentPartQty(parseInt(e.target.value, 10) || 1)}
                    className="w-16 rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-slate-100 text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPartToForm}
                    className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>

                {/* Selected parts list */}
                {formData.parts_used.length > 0 && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3.5 space-y-2">
                    {formData.parts_used.map(p => (
                      <div key={p.part_id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{p.part_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-emerald-400">Qty: {p.quantity_used}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePartFromForm(p.part_id)}
                            className="text-red-400 hover:text-red-300 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
              >
                Schedule Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- COMPLETE MAINTENANCE MODAL --- */}
      {showCompleteModal && selectedMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button 
              onClick={() => setShowCompleteModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400 animate-pulse" />
              Complete Service Sheet
            </h3>
            <p className="text-xs text-slate-400 mb-4">Complete maintenance details for machine <b>{selectedMaint.machine_id}</b>. This will deduct associated parts stock and update machine health status.</p>
            
            <form onSubmit={handleCompleteMaint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Final Job Remarks</label>
                <textarea
                  required
                  placeholder="Provide final inspection and repair details..."
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 h-24 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
              >
                Log Completion & Update Inventory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-Component: Maintenance Card
function MaintenanceCard({ m, onComplete, onDelete, isAdmin }) {
  const cardBorderColors = {
    Completed: "border-emerald-500/10",
    Scheduled: "border-amber-500/10",
    Overdue: "border-red-500/15 glow-danger animate-pulse"
  };

  return (
    <div className={`glass-panel rounded-2xl p-4.5 border shadow-md flex flex-col justify-between ${cardBorderColors[m.status] || "border-slate-800"}`}>
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">{m.machine_id}</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-0.5">
              <Calendar size={12} className="text-slate-500" />
              {m.maintenance_date}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-400 leading-normal border-t border-slate-900/60 pt-3">
          <p className="flex items-center gap-1"><User size={12} className="text-slate-500" /> <b>Tech:</b> {m.technician}</p>
          {m.remarks && <p className="flex items-start gap-1"><FileText size={12} className="text-slate-500 mt-0.5 shrink-0" /> <span><b>Remarks:</b> {m.remarks}</span></p>}
        </div>

        {/* Display parts consumed if any */}
        {m.parts_used.length > 0 && (
          <div className="mt-3 bg-slate-900/20 border border-slate-900/40 rounded-lg p-2.5 text-[10px] space-y-1">
            <span className="text-slate-500 font-bold uppercase">Parts Consumed:</span>
            {m.parts_used.map(p => (
              <div key={p.id} className="flex justify-between text-slate-300 font-mono">
                <span>{p.part_name}</span>
                <span className="font-bold text-emerald-400">×{p.quantity_used}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {m.status !== "Completed" && (
        <div className="mt-4 flex gap-2 border-t border-slate-900/50 pt-3">
          {onComplete && (
            <button
              onClick={() => onComplete(m)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95"
            >
              <CheckCircle size={12} />
              Complete Job
            </button>
          )}

          {isAdmin && onDelete && (
            <button
              onClick={() => onDelete(m.maintenance_id)}
              className="rounded-lg bg-slate-900 hover:bg-slate-800 p-2 text-red-400 border border-slate-850"
              title="Delete Record"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
