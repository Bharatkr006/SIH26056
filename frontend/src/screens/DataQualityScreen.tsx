import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, XCircle, ShieldCheck, FileCheck, Layers, FileX, Activity, Database } from "lucide-react";

export default function DataQualityScreen() {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [faresConfig, setFaresConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/summary").then(res => res.json()),
      fetch("/api/v1/fares").then(res => res.json())
    ]).then(([sum, fc]) => {
      setSummaryData(sum);
      setFaresConfig(fc);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center p-12 text-slate-500">
       <Activity className="animate-pulse mr-2" size={20} /> Loading Data Quality...
    </div>
  );

  let totalRaw = 0;
  let totalCleaned = 0;
  let totalOutliers = 0;
  let totalValid = 0;
  let routeCount = 0;

  if (summaryData?.results) {
    const rkeys = Object.keys(summaryData.results);
    routeCount = rkeys.length;
    rkeys.forEach(route => {
      Object.keys(summaryData.results[route]).forEach(lead => {
        const pipe = summaryData.results[route][lead].pipeline;
        if (pipe) {
          totalRaw += pipe.raw_segments || 0;
          totalCleaned += pipe.cleaned_flights || 0;
          totalOutliers += pipe.filtered_outliers || 0;
          totalValid += pipe.final_dataset || 0;
        }
      });
    });
  }

  const nonDirectExclusions = totalRaw - totalCleaned;
  const outliers = faresConfig?.outliers || [];

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Database className="text-indigo-600" size={24} />
          Data Quality & Validation
        </h2>
        <p className="text-slate-500 text-sm mt-1">Comprehensive inspection of data pipeline integrity, source health, and validation rules.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div>
               <div className="text-slate-400 mb-2"><Layers size={20} /></div>
               <div className="text-2xl font-bold text-slate-800">{totalRaw}</div>
             </div>
             <div className="text-xs font-semibold text-slate-500 uppercase mt-2">Raw Quotes</div>
          </div>
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
             <div>
               <div className="text-emerald-500 mb-2"><FileCheck size={20} /></div>
               <div className="text-2xl font-bold text-emerald-700">{totalValid}</div>
             </div>
             <div className="text-xs font-semibold text-emerald-600 uppercase mt-2">Valid Observations</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
             <div>
               <div className="text-slate-500 mb-2"><FileX size={20} /></div>
               <div className="text-2xl font-bold text-slate-700">{nonDirectExclusions}</div>
             </div>
             <div className="text-xs font-semibold text-slate-600 uppercase mt-2">Excluded</div>
          </div>
          <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
             <div>
               <div className="text-amber-500 mb-2"><AlertCircle size={20} /></div>
               <div className="text-2xl font-bold text-amber-700">{totalOutliers}</div>
             </div>
             <div className="text-xs font-semibold text-amber-600 uppercase mt-2">Outliers</div>
          </div>
          <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
             <div>
               <div className="text-indigo-500 mb-2"><Activity size={20} /></div>
               <div className="text-xl font-bold text-indigo-700 flex items-center gap-2">
                 {totalRaw > 0 ? (
                   <>Healthy <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span></>
                 ) : "N/A"}
               </div>
             </div>
             <div className="text-xs font-semibold text-indigo-600 uppercase mt-2">Source Status</div>
          </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" size={20} />
          Validation Rules Breakdown
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Automated filtering ensures index integrity by removing structural errors, irrelevant payload, and statistical outliers before index calculations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 relative overflow-hidden">
            <div className="flex items-start justify-between">
               <div>
                  <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1">
                    <CheckCircle2 size={16} className="text-emerald-500"/> Valid
                  </div>
                  <div className="text-xs text-emerald-600 pr-4">Passed all quality constraints (direct flight, economy class, non-zero fare, within IQR).</div>
               </div>
            </div>
            <div className="mt-4 text-3xl font-bold text-emerald-700/80">{totalValid}</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden">
            <div className="flex items-start justify-between">
               <div>
                  <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                    <XCircle size={16} className="text-slate-500"/> Structural Exclusions
                  </div>
                  <div className="text-xs text-slate-500 pr-4">Non-direct connections, missing fields, or incorrect cabins removed during parse.</div>
               </div>
            </div>
            <div className="mt-4 text-3xl font-bold text-slate-400">{nonDirectExclusions}</div>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 relative overflow-hidden">
            <div className="flex items-start justify-between">
               <div>
                  <div className="flex items-center gap-2 font-semibold text-amber-800 mb-1">
                    <AlertCircle size={16} className="text-amber-500"/> Outliers Filtered
                  </div>
                  <div className="text-xs text-amber-600 pr-4">Rejected to prevent skewing index calculations. Out of [Q1-1.5*IQR, Q3+1.5*IQR].</div>
               </div>
            </div>
            <div className="mt-4 text-3xl font-bold text-amber-700/80">{totalOutliers}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8 opacity-90 transition-opacity">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-slate-600 text-sm font-semibold flex items-center justify-between">
          <span>Secondary: Statistical Outliers Review</span>
          <span className="bg-slate-200/50 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">{outliers.length} Items</span>
        </div>
        <div className="overflow-x-auto max-h-[300px]">
          {outliers.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium">No outliers detected in the latest collection batch.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-500 relative">
              <thead className="bg-white/90 backdrop-blur font-medium text-slate-400 sticky top-0 border-b border-slate-100 z-10">
                <tr>
                  <th className="px-4 py-2 font-medium">Flight</th>
                  <th className="px-4 py-2 font-medium">Departure</th>
                  <th className="px-4 py-2 font-medium text-right">Fare</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium text-center">Intervention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {outliers.map((o: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-600">{o.airline} <span className="text-slate-400 font-normal">({o.flight_number})</span></td>
                    <td className="px-4 py-2">{o.departure_time}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-600">₹{Math.round(o.total_fare).toLocaleString()}</td>
                    <td className="px-4 py-2 text-amber-600/70">IQR Exceeded</td>
                    <td className="px-4 py-2 text-center"><span className="text-red-500/70 border border-red-100/50 bg-red-50/50 px-1.5 py-0.5 rounded-sm uppercase" style={{fontSize: '0.65rem'}}>Excluded</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
