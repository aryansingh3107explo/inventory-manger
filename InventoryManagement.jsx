import React, { useState, useEffect, useContext } from "react";
import { api } from "../api";
import { AuthContext } from "../App";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Package, 
  Tag, 
  MapPin, 
  X
} from "lucide-react";

export default function InventoryManagement() {
  const { user } = useContext(AuthContext);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [adjustType, setAdjustType] = useState("issue"); // issue or return

  // Form states
  const [formData, setFormData] = useState({
    part_number: "",
    part_name: "",
    category: "",
    quantity: 0,
    min_stock: 5,
    supplier: "",
    location: ""
  });
  const [adjustQty, setAdjustQty] = useState(1);

  const isEditor = user?.role === "Admin" || user?.role === "Engineer";
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const data = await api.get("/parts");
      setParts(data);
    } catch (err) {
      setError("Failed to fetch inventory logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      part_number: "",
      part_name: "",
      category: "Bearings",
      quantity: 10,
      min_stock: 5,
      supplier: "",
      location: ""
    });
    setSelectedPart(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (part) => {
    setFormData({
      part_number: part.part_number,
      part_name: part.part_name,
      category: part.category,
      quantity: part.quantity,
      min_stock: part.min_stock,
      supplier: part.supplier,
      location: part.location
    });
    setSelectedPart(part);
    setShowAddEditModal(true);
  };

  const handleOpenAdjust = (part, type) => {
    setSelectedPart(part);
    setAdjustType(type);
    setAdjustQty(1);
    setShowStockAdjustModal(true);
  };

  const handleSavePart = async (e) => {
    e.preventDefault();
    try {
      if (selectedPart) {
        await api.put(`/parts/${selectedPart.part_id}`, formData);
      } else {
        await api.post("/parts", formData);
      }
      setShowAddEditModal(false);
      fetchParts();
    } catch (err) {
      alert("Error saving part: " + err.message);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      const endpoint = adjustType === "issue" ? "issue" : "return";
      await api.post(`/parts/${selectedPart.part_id}/${endpoint}`, {
        quantity: parseInt(adjustQty, 10)
      });
      setShowStockAdjustModal(false);
      fetchParts();
    } catch (err) {
      alert(`Failed to ${adjustType} stock: ` + err.message);
    }
  };

  const handleDelete = async (partId) => {
    if (!window.confirm("Are you sure you want to remove this spare part SKU from inventory?")) return;
    try {
      await api.delete(`/parts/${partId}`);
      fetchParts();
    } catch (err) {
      alert("Failed to delete spare part: " + err.message);
    }
  };

  const filteredParts = parts.filter(p => 
    p.part_number.toLowerCase().includes(search.toLowerCase()) ||
    p.part_name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  // Statistics Summary counts
  const totalSKUs = parts.length;
  const totalStockCount = parts.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockCount = parts.filter(p => p.quantity < p.min_stock).length;

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Spare Parts Inventory</h2>
          <p className="text-xs text-slate-400">Manage replacements catalog, track rack locations, and audit minimum safety thresholds.</p>
        </div>
        {isEditor && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus size={16} />
            Add Spare Part
          </button>
        )}
      </div>

      {/* Inventory Mini Summary Widgets */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel border border-slate-900 rounded-2xl p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Package size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total SKUs</span>
            <p className="text-lg font-bold text-slate-200 leading-none mt-0.5">{totalSKUs}</p>
          </div>
        </div>

        <div className="glass-panel border border-slate-900 rounded-2xl p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Tag size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Pieces</span>
            <p className="text-lg font-bold text-slate-200 leading-none mt-0.5">{totalStockCount}</p>
          </div>
        </div>

        <div className="glass-panel border border-slate-900 rounded-2xl p-4 flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${lowStockCount > 0 ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-slate-500"}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Critical Stock</span>
            <p className={`text-lg font-bold leading-none mt-0.5 ${lowStockCount > 0 ? "text-red-400 font-extrabold" : "text-slate-400"}`}>{lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 glass-panel rounded-2xl p-3 border border-slate-900">
        <Search size={18} className="text-slate-500 ml-2" />
        <input
          type="text"
          placeholder="Search by part number, catalog name, supplier, or shelf location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
      </div>

      {/* Parts Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
          {error}
        </div>
      ) : (
        <div className="glass-panel border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-900/30 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Part Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Min. Threshold</th>
                  <th className="px-6 py-4 flex items-center gap-1"><MapPin size={12} /> Location</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80 text-sm">
                {filteredParts.map((p) => {
                  const isLow = p.quantity < p.min_stock;
                  return (
                    <tr key={p.part_id} className={`hover:bg-slate-900/15 ${isLow ? "bg-red-500/[0.01]" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{p.part_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">Part #: {p.part_number}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{p.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-extrabold ${isLow ? "text-red-400" : "text-slate-100"}`}>
                            {p.quantity}
                          </span>
                          {isLow && (
                            <span className="flex items-center gap-0.5 rounded bg-red-500/10 px-1 py-0.5 text-[9px] font-bold text-red-400 border border-red-500/10 uppercase">
                              <AlertTriangle size={8} /> Low
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{p.supplier}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">{p.min_stock} pcs</td>
                      <td className="px-6 py-4 text-slate-300 font-semibold">{p.location}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {/* Issue button */}
                          <button
                            onClick={() => handleOpenAdjust(p, "issue")}
                            className="rounded bg-red-500/10 hover:bg-red-500/20 p-2 text-red-400 border border-red-500/20 transition-all"
                            title="Issue Parts"
                          >
                            <ArrowDownLeft size={14} />
                          </button>
                          {/* Return button */}
                          <button
                            onClick={() => handleOpenAdjust(p, "return")}
                            className="rounded bg-emerald-500/10 hover:bg-emerald-500/20 p-2 text-emerald-400 border border-emerald-500/20 transition-all"
                            title="Return Parts"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                          {/* Edit button */}
                          {isEditor && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="rounded bg-blue-500/10 hover:bg-blue-500/20 p-2 text-blue-400 border border-blue-500/20 transition-all"
                              title="Edit Details"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          {/* Delete button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(p.part_id)}
                              className="rounded bg-slate-900 hover:bg-slate-800 p-2 text-slate-400 border border-slate-800 transition-all"
                              title="Remove Spare SKU"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT PART DETAILS MODAL --- */}
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
              {selectedPart ? `Edit Spare Part Details` : "Add Spare Part to Stock"}
            </h3>
            
            <form onSubmit={handleSavePart} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Part Number</label>
                <input
                  type="text"
                  required
                  disabled={!!selectedPart}
                  placeholder="e.g. BRG-6205"
                  value={formData.part_number}
                  onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Part Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Double Sealed Ball Bearing 6205"
                  value={formData.part_name}
                  onChange={(e) => setFormData({...formData, part_name: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bearings, Lubricants, Seals"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    disabled={!!selectedPart} // Edit quantity through Issue/Return buttons
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value, 10) || 0})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Minimum Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value, 10) || 0})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Supplier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SKF Bearings India"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location Shelf</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cabinet B, Shelf A-3"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-glow-green hover:opacity-95 active:scale-[0.98] transition-all"
              >
                {selectedPart ? "Save Part Details" : "Add Spare Part"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- STOCK ADJUSTMENT MODAL (ISSUE / RETURN) --- */}
      {showStockAdjustModal && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button 
              onClick={() => setShowStockAdjustModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              {adjustType === "issue" ? (
                <>
                  <ArrowDownLeft size={20} className="text-red-400" />
                  Issue Spare Parts
                </>
              ) : (
                <>
                  <ArrowUpRight size={20} className="text-emerald-400" />
                  Return Spare Parts
                </>
              )}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {adjustType === "issue" 
                ? `Enter quantity to issue for ${selectedPart.part_name}. (Current Stock: ${selectedPart.quantity})` 
                : `Enter quantity returned to stock for ${selectedPart.part_name}.`
              }
            </p>
            
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={adjustType === "issue" ? selectedPart.quantity : undefined}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className={`w-full mt-2 rounded-xl py-3 text-sm font-bold text-slate-950 transition-all ${
                  adjustType === "issue" 
                    ? "bg-red-500 shadow-glow-red hover:opacity-95 active:scale-[0.98]" 
                    : "bg-emerald-500 shadow-glow-green hover:opacity-95 active:scale-[0.98]"
                }`}
              >
                {adjustType === "issue" ? "Issue Stock" : "Return Stock"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
