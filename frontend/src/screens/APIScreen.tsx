import React from "react";

export default function APIScreen() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">API Documentation</h2>
        <p className="text-slate-500 mt-1">REST endpoints for programmatic data access</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-xs tracking-wider">GET</span>
               <code className="text-sm font-semibold text-slate-700">/api/v1/index</code>
             </div>
             <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase font-semibold">Active</span>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">Returns current overarching statistical index metrics and baseline reference.</p>
            <div className="bg-slate-900 rounded-lg p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
{`{
  "jevons_index": 104.26,
  "carli_index": 105.85,
  "baseline_fare": 6500.0,
  "median_fare": 6730.0,
  "arithmetic_mean": 7123.47,
  "min_fare": 6529.0,
  "max_fare": 19353.0,
  "route": "DEL-BOM",
  "lead_days": 7
}`}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-xs tracking-wider">GET</span>
               <code className="text-sm font-semibold text-slate-700">/api/v1/fares</code>
             </div>
             <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase font-semibold">Active</span>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">Returns full detailed observation ledger including separated outlier arrays.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col opacity-75">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-xs tracking-wider">GET</span>
               <code className="text-sm font-semibold text-slate-700">/api/v1/routes/:id</code>
             </div>
             <span className="text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded uppercase font-semibold border border-dashed border-slate-300">Planned API</span>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600">Will return statistical aggregations for a specified route (e.g. BLR-BOM).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
