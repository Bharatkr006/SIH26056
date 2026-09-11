import React, { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";

export default function RouteIntelligenceScreen() {
  const [indexData, setIndexData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/index")
      .then(res => res.json())
      .then(setIndexData);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Route Intelligence Network</h2>
      </div>

      <div className="flex gap-6">
        <div className="w-1/3 space-y-4">
           {/* Active Route */}
           <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden group cursor-pointer">
             <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"><Navigation size={120} /></div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold uppercase mb-4">
                 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active Pipeline
               </div>
               <div className="text-3xl font-bold mb-1">DEL → BOM</div>
               <div className="text-indigo-200 mb-6 font-medium">Delhi to Mumbai</div>

               <div className="grid grid-cols-2 gap-4 border-t border-indigo-500/50 pt-4">
                 <div>
                   <div className="text-xs uppercase font-semibold text-indigo-300">Price Index</div>
                   <div className="text-xl font-bold">{indexData?.jevons_index?.toFixed(2)}</div>
                 </div>
                 <div>
                   <div className="text-xs uppercase font-semibold text-indigo-300">Median Fare</div>
                   <div className="text-xl font-bold">₹{indexData?.median_fare?.toLocaleString()}</div>
                 </div>
               </div>
             </div>
           </div>

           {/* Pending Routes */}
           <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm opacity-60">
             <div className="text-sm font-semibold text-slate-400 uppercase mb-4">Pending Network Expansion</div>
             <div className="space-y-4">
               <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                 <div className="font-semibold text-slate-700">BLR → DEL</div>
                 <div className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">Not Connected</div>
               </div>
               <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                 <div className="font-semibold text-slate-700">MAA → DEL</div>
                 <div className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">Not Connected</div>
               </div>
               <div className="flex justify-between items-center">
                 <div className="font-semibold text-slate-700">CCU → BOM</div>
                 <div className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">Not Connected</div>
               </div>
             </div>
           </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center relative overflow-hidden min-h-[500px]">
           <div className="absolute inset-0 bg-slate-50" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

           <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-2xl">
              <MapPin size={48} className="text-indigo-400 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Geospatial Routing Visualization</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Geographic visualization will automatically render connections as additional source APIs are integrated into the pipeline.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
