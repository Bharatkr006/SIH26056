import React, { useEffect, useState } from "react";
import { MapPin, TrendingUp, TrendingDown, Minus, Info, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";

const routeDetails = [
  { id: "DEL-BOM", name: "Delhi → Mumbai" },
  { id: "DEL-BLR", name: "Delhi → Bangalore" },
  { id: "BOM-BLR", name: "Mumbai → Bangalore" }
];

export default function RouteIntelligenceScreen() {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/summary")
      .then(res => res.json())
      .then(data => {
        setSummaryData(data);
        if (data?.results) {
          const firstActive = routeDetails.find(r => data.results[r.id]);
          if (firstActive) setSelectedRoute(firstActive.id);
        }
      })
      .catch(console.error);
  }, []);

  // Helper to aggregate route info across lead times
  const getRouteStats = (routeId: string) => {
    const dataNode = summaryData?.results?.[routeId];
    if (!dataNode) return null;

    let totalJevons = 0;
    let avgMedian = 0;
    let count = 0;

    Object.values(dataNode).forEach((ld: any) => {
      if (ld.jevons_index) {
        totalJevons += ld.jevons_index;
        avgMedian += ld.median_fare || 0;
        count++;
      }
    });

    if (count === 0) return null;

    const avgJevons = totalJevons / count;
    const medFare = Math.round(avgMedian / count);
    const diff = avgJevons - 100;

    return {
      index: avgJevons,
      median: medFare,
      change: diff,
      isUp: diff > 0,
      isDown: diff < 0
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Route Intelligence</h2>
        <p className="text-slate-500 text-sm mt-1">Comparative analysis of fare performance across active domestic corridors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Master List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Index</th>
                    <th className="px-6 py-4">Median Fare</th>
                    <th className="px-6 py-4">Change</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeDetails.map((route) => {
                    const stats = getRouteStats(route.id);
                    const isActive = !!stats;
                    const isSelected = selectedRoute === route.id;

                    return (
                      <tr
                        key={route.id}
                        onClick={() => isActive && setSelectedRoute(route.id)}
                        className={clsx(
                          "transition-colors",
                          isActive ? "cursor-pointer hover:bg-slate-50" : "opacity-60 bg-slate-50/50 cursor-not-allowed",
                          isSelected ? "bg-indigo-50/50" : ""
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{route.id}</div>
                          <div className="text-xs text-slate-500">{route.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <span className="font-bold text-slate-900">{stats.index.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <span className="font-mono font-medium">₹{stats.median.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <span className={clsx("text-xs font-bold px-2 py-1 rounded inline-flex items-center gap-1",
                              stats.isUp ? "bg-red-100 text-red-700" : stats.isDown ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {stats.isUp && <TrendingUp size={12} />}
                              {stats.isDown && <TrendingDown size={12} />}
                              {!stats.isUp && !stats.isDown && <Minus size={12} />}
                              {stats.isUp ? '+' : ''}{stats.change.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isActive ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 size={14} /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                              <AlertCircle size={14} /> No Data
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {isActive && (
                            <ChevronRight size={18} className={clsx("transition-transform ml-auto", isSelected ? "text-indigo-600 translate-x-1" : "text-slate-400")} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Detail View */}
        <div className="lg:col-span-1">
          {selectedRoute && summaryData?.results?.[selectedRoute] ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 sticky top-6">
               <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-white">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <MapPin size={18} className="text-indigo-500" />
                    {selectedRoute}
                  </h3>
                  <div className="text-xs text-slate-500 pl-6.5">{routeDetails.find(r => r.id === selectedRoute)?.name}</div>
               </div>

               <div className="p-6 space-y-4 bg-slate-50/30">
                 <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advance Purchase Breakdown</h4>

                 <div className="space-y-3">
                   {Object.keys(summaryData.results[selectedRoute])
                     // Sort lead times like T+1, T+7, T+15
                     .sort((a, b) => {
                       const numA = parseInt(a.replace(/\D/g, '')) || 0;
                       const numB = parseInt(b.replace(/\D/g, '')) || 0;
                       return numA - numB;
                     })
                     .map(lead => {
                     const data = summaryData.results[selectedRoute][lead];
                     const isUp = data.jevons_index > 100;
                     const isDown = data.jevons_index < 100;

                     return (
                       <div key={lead} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors">
                         <div className="flex justify-between items-center mb-4">
                           <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold text-xs ring-1 ring-indigo-200 ring-inset">{lead}</span>
                           <span className={clsx("text-xs font-bold px-2 py-0.5 rounded",
                              isUp ? "bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset" : isDown ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 ring-inset"
                            )}>
                              {isUp ? '+' : ''}{(data.jevons_index - 100).toFixed(1)}%
                           </span>
                         </div>

                         <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                           <div>
                             <div className="text-slate-500 text-xs mb-1">Index</div>
                             <div className="font-bold text-slate-800">{data.jevons_index.toFixed(2)}</div>
                           </div>
                           <div>
                             <div className="text-slate-500 text-xs mb-1">Median Fare</div>
                             <div className="font-mono font-medium text-slate-800">₹{Math.round(data.median_fare).toLocaleString()}</div>
                           </div>
                           <div>
                             <div className="text-slate-500 text-xs mb-1">Baseline</div>
                             <div className="font-mono text-slate-500">₹{Math.round(data.baseline_fare).toLocaleString()}</div>
                           </div>
                           <div>
                             <div className="text-slate-500 text-xs mb-1">Sample Size</div>
                             <div className="font-semibold text-slate-800 flex items-center gap-1">
                               {data.sample_size || data.pipeline?.final_dataset || 0} <span className="text-[10px] text-slate-400 font-normal">flights</span>
                             </div>
                           </div>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed p-8 text-center h-full flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
               <Info size={32} className="mb-3 text-slate-400" />
               <p className="font-medium text-sm">Select an active route to view deep-dive advance purchase metrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
