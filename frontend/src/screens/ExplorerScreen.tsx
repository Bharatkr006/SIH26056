import React, { useEffect, useState } from "react";
import { Search, Filter, Plane } from "lucide-react";

export default function ExplorerScreen() {
  const [faresConfig, setFaresConfig] = useState<any>({ flights: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/fares")
      .then(res => res.json())
      .then(data => {
        setFaresConfig(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 animate-pulse text-slate-500 font-medium">Loading flight ledger...</div>;

  const flights = faresConfig?.flights || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Airfare Explorer</h2>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">From</label>
          <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>Delhi (DEL)</option>
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">To</label>
          <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>Mumbai (BOM)</option>
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Advance Purchase</label>
          <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>T+7 Days</option>
            <option disabled>T+1 Day (Not Configured)</option>
            <option disabled>T+15 Days (Not Configured)</option>
          </select>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 h-[38px]">
          <Filter size={16} /> Filter Results
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Plane size={18} className="text-indigo-500" /> Complete Flight Ledger
          </h3>
          <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            {flights.length} Valid Observations
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Airline / Flight</th>
                <th className="px-6 py-4">Dep – Arr</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4 text-right">Base Fare</th>
                <th className="px-6 py-4 text-right">Taxes</th>
                <th className="px-6 py-4 text-right font-bold text-slate-900 border-l border-slate-100 bg-slate-50/30">Total Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flights.map((f: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{f.airline}</div>
                    <div className="text-xs text-slate-500 font-mono">{f.flight_number}</div>
                  </td>
                  <td className="px-6 py-3 font-medium">
                    {f.departure_time} <span className="text-slate-300 mx-1">→</span> {f.arrival_time}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{f.duration}</td>
                  <td className="px-6 py-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{f.fare_class || f.cabin}</span>
                  </td>
                  <td className="px-6 py-3 text-right font-mono">₹{Math.round(f.base_fare).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-mono">₹{Math.round(f.taxes).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900 font-mono border-l border-slate-100 bg-slate-50/10">
                    ₹{Math.round(f.total_fare).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
