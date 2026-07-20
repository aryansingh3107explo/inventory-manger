import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings, 
  Wrench, 
  Database, 
  ScanQrCode, 
  BrainCircuit, 
  FileText, 
  LogOut, 
  User, 
  Menu, 
  X,
  ShieldCheck
} from "lucide-react";

import EmployeeLogin from "./pages/EmployeeLogin";
import Dashboard from "./pages/Dashboard";
import MachineManagement from "./pages/MachineManagement";
import InventoryManagement from "./pages/InventoryManagement";
import MaintenanceScheduler from "./pages/MaintenanceScheduler";
import AIPrediction from "./pages/AIPrediction";
import QRCodeTracking from "./pages/QRCodeTracking";
import Reports from "./pages/Reports";
import NotificationCenter from "./components/NotificationCenter";
import WorkshopAssistant from "./components/WorkshopAssistant";
import { insforge } from "./api";

export const AuthContext = createContext(null);

// Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const NavigationLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["Admin", "Engineer", "Technician"] },
    { name: "Machines", path: "/machines", icon: Settings, roles: ["Admin", "Engineer", "Technician"] },
    { name: "Spare Parts", path: "/inventory", icon: Database, roles: ["Admin", "Engineer", "Technician"] },
    { name: "Scheduler", path: "/scheduler", icon: Wrench, roles: ["Admin", "Engineer", "Technician"] },
    { name: "AI Predictions", path: "/predictions", icon: BrainCircuit, roles: ["Admin", "Engineer"] },
    { name: "QR Codes & Scanner", path: "/qr-scanner", icon: ScanQrCode, roles: ["Admin", "Engineer", "Technician"] },
    { name: "Reports", path: "/reports", icon: FileText, roles: ["Admin", "Engineer"] }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Mobile Toggle */}
      <button 
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Panel */}
      <aside 
        className={`fixed bottom-0 top-0 left-0 z-40 w-64 border-r border-slate-900 bg-slate-950/80 p-4 transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            {/* Header branding */}
            <div className="mb-8 flex items-center gap-2.5 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-bold text-slate-950">
                IR
              </div>
              <div>
                <h1 className="font-bold tracking-wide text-white leading-none">IR Workshop</h1>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Predictive System</span>
              </div>
            </div>

            {/* Profile widget */}
            <div className="mb-6 rounded-2xl bg-slate-900/50 p-4 border border-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                  <User size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-400">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav list */}
            <nav className="space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logout footer */}
          <button
            onClick={logout}
            className="flex items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-900/60 bg-slate-950/20 backdrop-blur-md px-6 flex items-center justify-between md:pl-72 transition-all duration-300">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zone: Northern Railways</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        <main className="flex-1 p-6 md:pl-72 transition-all duration-300">
          <div className="mx-auto max-w-6xl">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/machines" element={<MachineManagement />} />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/scheduler" element={<MaintenanceScheduler />} />
              <Route 
                path="/predictions" 
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Engineer"]}>
                    <AIPrediction />
                  </ProtectedRoute>
                } 
              />
              <Route path="/qr-scanner" element={<QRCodeTracking />} />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Engineer"]}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </main>

        {/* Global Floating Chatbot */}
        <WorkshopAssistant />
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore user session or auto-login to bypass login screen
    const storedUser = localStorage.getItem("railway_user");
    const storedToken = localStorage.getItem("railway_token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      if (storedToken === "mock-jwt-token") {
        insforge.setAccessToken(null);
      } else {
        insforge.setAccessToken(storedToken);
      }
    } else {
      const defaultUser = { name: "Admin User", email: "admin@railway.com", role: "Admin" };
      localStorage.setItem("railway_token", "mock-jwt-token");
      localStorage.setItem("railway_user", JSON.stringify(defaultUser));
      insforge.setAccessToken(null);
      setUser(defaultUser);
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("railway_token", token);
    localStorage.setItem("railway_user", JSON.stringify(userData));
    if (token === "mock-jwt-token") {
      insforge.setAccessToken(null);
    } else {
      insforge.setAccessToken(token);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("railway_token");
    localStorage.removeItem("railway_user");
    insforge.setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <EmployeeLogin />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <NavigationLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
