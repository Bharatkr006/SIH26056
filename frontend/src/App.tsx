import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  BarChart,
  LineChart,
  LayoutDashboard,
  Map,
  Activity,
  Database,
  Search,
  BookOpen,
  Code
} from "lucide-react";
import OverviewScreen from "./screens/OverviewScreen";
import ExplorerScreen from "./screens/ExplorerScreen";
import RouteIntelligenceScreen from "./screens/RouteIntelligenceScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import DataQualityScreen from "./screens/DataQualityScreen";
import CollectionMonitorScreen from "./screens/CollectionMonitorScreen";
import MethodologyScreen from "./screens/MethodologyScreen";
import APIScreen from "./screens/APIScreen";
import clsx from "clsx";

function Sidebar() {
  const links = [
    { name: "Overview", to: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Airfare Explorer", to: "/explorer", icon: <Search size={20} /> },
    { name: "Route Intelligence", to: "/routes", icon: <Map size={20} /> },
    { name: "Analytics", to: "/analytics", icon: <BarChart size={20} /> },
    { name: "Data Quality", to: "/quality", icon: <Database size={20} /> },
    { name: "Collection Monitor", to: "/monitor", icon: <Activity size={20} /> },
    { name: "Methodology", to: "/methodology", icon: <BookOpen size={20} /> },
    { name: "API", to: "/api-docs", icon: <Code size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen fixed top-0 left-0 text-slate-300 flex flex-col z-20">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-emerald-400">✈</span> Airfare India
        </h2>
        <div className="text-xs text-slate-500 uppercase font-semibold mt-1 tracking-wider">
          Statistical Intelligence
        </div>
      </div>
      <nav className="flex-1 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                isActive ? "bg-slate-800 text-white border-l-4 border-emerald-400" : "hover:bg-slate-800 hover:text-white border-l-4 border-transparent"
              )
            }
          >
            {link.icon}
            {link.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-slate-800">
        <div className="text-xs flex items-center justify-between opacity-70">
          <span>System Status</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
      </div>
    </div>
  );
}

function TopBar({ presentationMode, setPresentationMode }) {
  const [status, setStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/v1/status");
      const data = await res.json();
      setStatus(data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (ds) => {
    if (!ds) return "";
    return new Date(ds).toLocaleString();
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 w-full shadow-sm">
      <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Real-time Airfare Price Intelligence</h1>
      <div className="flex items-center gap-6">
        <button
          onClick={() => setPresentationMode(!presentationMode)}
          className={clsx(
            "px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors",
            presentationMode
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          )}
        >
          {presentationMode ? "Exit Presentation" : "Presentation Mode"}
        </button>
        <div className="flex flex-col items-end">
          <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <span className={clsx("w-2 h-2 rounded-full", status?.is_collecting ? "bg-amber-400 animate-pulse" : "bg-emerald-500")}></span>
            {status?.is_collecting ? "Collection in progress" : "Data pipeline healthy"}
          </div>
          <div className="text-xs text-slate-500">
            Last collection: {status?.last_collection ? formatDate(status.last_collection) : "Unknown"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [presentationMode, setPresentationMode] = useState(false);

  return (
    <Router>
      <div className={clsx("flex min-h-screen bg-slate-50 font-sans", presentationMode ? "presentation-mode" : "")}>
        {!presentationMode && <Sidebar />}
        <div className={clsx("flex-1 flex flex-col transition-all", !presentationMode ? "ml-64" : "ml-0")}>
          <TopBar presentationMode={presentationMode} setPresentationMode={setPresentationMode} />
          <main className="p-8 pb-20">
            <Routes>
              <Route path="/" element={<OverviewScreen />} />
              <Route path="/explorer" element={<ExplorerScreen />} />
              <Route path="/routes" element={<RouteIntelligenceScreen />} />
              <Route path="/analytics" element={<AnalyticsScreen />} />
              <Route path="/quality" element={<DataQualityScreen />} />
              <Route path="/monitor" element={<CollectionMonitorScreen />} />
              <Route path="/methodology" element={<MethodologyScreen />} />
              <Route path="/api-docs" element={<APIScreen />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
