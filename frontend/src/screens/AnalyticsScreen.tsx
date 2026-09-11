import React, { useEffect, useState } from "react";
import { Sunrise, Sun, Moon } from "lucide-react";
import clsx from "clsx";

export default function AnalyticsScreen() {
  const [faresConfig, setFaresConfig] = useState<any>(null);
  const [indexData, setIndexData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/fares").then(r => r.json()),
      fetch("/api/v1/index").then(r => r.json())
    ]).then(([fc, idx]) => {
      setFaresConfig(fc);
      setIndexData(idx);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const flights = faresConfig?.flights || [];

  const morning = flights.filter(f => { const h = parseInt(f.departure_time.split(":")[0]); return h >= 4 && h < 12; });
  const afternoon = flights.filter(f => { const h = parseInt(f.departure_time.split(":")[0]); return h >= 12 && h < 17; });
  const evening = flights.filter(f => { const h = parseInt(f.departure_time.split(":")[0]); return h >= 17 || h < 4; });

  const getMedian = (arr) => {
    if(!arr.length) return 0;
    const sorted = [...arr].sort((a,b) => a.total_fare - b.total_fare);
    return sorted[Math.floor(sorted.length / 2)].total_fare;
  };

  const getMean = (arr) => arr.length ? arr.reduce((acc, f) => acc + f.total_fare, 0) / arr.length : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Advanced Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-semibold text-slate-800 mb-6">Time-of-Day Analysis</h3>
           <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><Sunrise size={20}/></div>
                  <div>
                    <div className="font-semibold text-slate-800">Morning Fares <span className="text-xs text-slate-400 font-normal ml-1">04:00 - 11:59</span></div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">{morning.length} Observations</div>
                  </div>
               </div>
               <div className="text-right">
                  <div className="font-bold text-slate-800">₹{Math.round(getMean(morning)).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Mean Fare</div>
               </div>
             </div>

             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><Sun size={20}/></div>
                  <div>
                    <div className="font-semibold text-slate-800">Afternoon Fares <span className="text-xs text-slate-400 font-normal ml-1">12:00 - 16:59</span></div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">{afternoon.length} Observations</div>
                  </div>
               </div>
               <div className="text-right">
                  <div className="font-bold text-slate-800">₹{Math.round(getMean(afternoon)).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Mean Fare</div>
               </div>
             </div>

             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"><Moon size={20}/></div>
                  <div>
                    <div className="font-semibold text-slate-800">Evening/Night Fares <span className="text-xs text-slate-400 font-normal ml-1">17:00 - 03:59</span></div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">{evening.length} Observations</div>
                  </div>
               </div>
               <div className="text-right">
                  <div className="font-bold text-slate-800">₹{Math.round(getMean(evening)).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Mean Fare</div>
               </div>
             </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-semibold text-slate-800 mb-6">Index Methodology Comparison</h3>
           <div className="flex items-end gap-6 border-b border-slate-100 pb-6 mb-6">
             <div className="flex-1">
               <div className="text-sm font-semibold text-slate-500 uppercase mb-2">Primary: Jevons Index</div>
               <div className="text-4xl font-bold text-emerald-600">{indexData?.jevons_index?.toFixed(2)}</div>
             </div>
             <div className="flex-1">
               <div className="text-sm font-semibold text-slate-500 uppercase mb-2">Reference: Carli Index</div>
               <div className="text-3xl font-bold text-slate-400">{indexData?.carli_index?.toFixed(2)}</div>
             </div>
           </div>
           <p className="text-sm text-slate-600 leading-relaxed">
             Jevons utilizes the <strong>geometric mean</strong> of price relatives, meeting the time rehearsal, circularity, and commensurability tests outlined by the ILO Consumer Price Index manual. It mathematically resists substitution bias better than the arithmetic mean (Carli), making it the primary metric for official inflation monitoring in this prototype.
           </p>
        </div>

      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Lead-Time Analysis (Advance Purchase)</h3>
        <div className="flex gap-4">
          <div className="flex-1 p-4 rounded-xl border border-indigo-200 bg-indigo-50 shadow-sm">
             <div className="font-bold text-indigo-900 text-lg">T+7 Days</div>
             <div className="text-sm text-indigo-700">Currently active collection model</div>
          </div>
          <div className="flex-1 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 opacity-60">
             <div className="font-bold text-slate-500 text-lg">T+1 Day</div>
             <div className="text-sm text-slate-400">Analysis bucket pending scheduler config</div>
          </div>
          <div className="flex-1 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 opacity-60">
             <div className="font-bold text-slate-500 text-lg">T+15 Days</div>
             <div className="text-sm text-slate-400">Analysis bucket pending scheduler config</div>
          </div>
          <div className="flex-1 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 opacity-60">
             <div className="font-bold text-slate-500 text-lg">T+30 Days</div>
             <div className="text-sm text-slate-400">Analysis bucket pending scheduler config</div>
          </div>
        </div>
      </div>
    </div>
  );
}
