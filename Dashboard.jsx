import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Settings, 
  Wrench, 
  Database, 
  AlertTriangle, 
  TrendingUp, 
  IndianRupee 
} from "lucide-react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.get("/dashboard/stats");
      setStats(data);
    } catch (err) {
      setError("Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  // --- Chart.js Data Configuration ---

  // 1. Line Chart: Failure vs Preventive Maintenance Trends
  const trendData = {
    labels: stats.failure_trend.map(item => item.month),
    datasets: [
      {
        label: "Breakdown Failures",
        data: stats.failure_trend.map(item => item.failures),
        borderColor: "rgb(239, 68, 68)", // Red-500
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Preventive Maintenance",
        data: stats.failure_trend.map(item => item.preventive),
        borderColor: "rgb(16, 185, 129)", // Emerald-500
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { family: 'Outfit' } }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b', stepSize: 1 } }
    }
  };

  // 2. Doughnut Chart: Spare Parts Consumption by Category
  const doughnutData = {
    labels: stats.inventory_usage.map(item => item.category),
    datasets: [
      {
        data: stats.inventory_usage.map(item => item.quantity),
        backgroundColor: [
          "rgba(59, 130, 246, 0.75)",  // Blue
          "rgba(16, 185, 129, 0.75)",  // Emerald
          "rgba(245, 158, 11, 0.75)",  // Amber
          "rgba(139, 92, 246, 0.75)",  // Violet
          "rgba(236, 72, 153, 0.75)"   // Pink
        ],
        borderColor: "rgba(15, 23, 42, 0.9)",
        borderWidth: 2,
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94a3b8', font: { family: 'Outfit' } }
      }
    }
  };

  return (
    <div className="space-y-6 fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Workshop Control Hub</h2>
          <p className="text-xs text-slate-400">Real-time equipment statuses, parts log levels, and anomaly failure predictions.</p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Machinery */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-900 shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Settings size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Machinery</span>
            <h3 className="text-2xl font-extrabold text-white leading-none mt-1">{stats.total_machines}</h3>
          </div>
        </div>

        {/* Active Repairs */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-900 shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Wrench size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">In Maintenance</span>
            <h3 className="text-2xl font-extrabold text-white leading-none mt-1">{stats.machines_under_maintenance}</h3>
          </div>
        </div>

        {/* Parts Available */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-900 shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Database size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Parts Available</span>
            <h3 className="text-2xl font-extrabold text-white leading-none mt-1">{stats.available_spare_parts}</h3>
          </div>
        </div>

        {/* Monthly Cost */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-900 shadow-xl flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <IndianRupee size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Monthly Cost</span>
            <h3 className="text-2xl font-extrabold text-white leading-none mt-1">₹{stats.monthly_maintenance_cost.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Warning Center Dashboard Area */}
      {(stats.predicted_high_risk_machines > 0 || stats.low_stock_items > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.predicted_high_risk_machines > 0 && (
            <div className="flex items-center gap-4 rounded-2xl border border-red-500/15 bg-red-500/5 p-4 glow-danger">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">High Failure Risk Detected</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI predicts <b>{stats.predicted_high_risk_machines} machine(s)</b> are at high risk of sudden breakdown. Immediate check recommended.
                </p>
              </div>
            </div>
          )}
          {stats.low_stock_items > 0 && (
            <div className="flex items-center gap-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 glow-warning">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Low Inventory Stock Warning</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  There are <b>{stats.low_stock_items} spare parts</b> currently below the minimum safety threshold level.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Visualizations Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="glass-panel border border-slate-900 rounded-3xl p-6 md:col-span-2 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">Failure vs Preventive Trends</h4>
            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-slate-400">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Line data={trendData} options={trendOptions} />
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="glass-panel border border-slate-900 rounded-3xl p-6 shadow-2xl">
          <h4 className="text-sm font-bold text-white tracking-wide uppercase mb-4">Parts Consumed By Category</h4>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
