import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export default function DataQualityScreen() {
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [faresConfig, setFaresConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/pipeline").then(res => res.json()),
      fetch("/api/v1/fares").then(res => res.json())
    ]).then(([pl, fc]) => {
      setPipelineData(pl);
      setFaresConfig(fc);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const validRate = ((pipelineData?.final_observations / pipelineData?.raw_quotes) * 100).toFixed(1);
  const outliers = faresConfig?.outliers || [];

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4">Data Quality Center</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-sm font-semibold text-slate-500 uppercase mb-2">Overall Data Quality</div>
          <div className="text-4xl font-bold text-slate-800">{validRate}%</div>
          <div className="text-sm text-slate-500 mt-2">Conversion of raw quotes to valid index observations</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Pipeline Rejection Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={16}/> Valid Observations</span>
              <span className="font-bold text-emerald-600">{pipelineData?.final_observations}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${validRate}%`}}></div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-600 flex items-center gap-2"><XCircle className="text-red-500" size={16}/> Non-direct / Zero-fare Exclusions</span>
              <span className="font-bold text-slate-700">{pipelineData?.raw_quotes - pipelineData?.cleaned}</span>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-600 flex items-center gap-2"><AlertCircle className="text-amber-500" size={16}/> Statistical Outliers (IQR)</span>
              <span className="font-bold text-amber-600">{pipelineData?.outliers_filtered}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 text-red-900 font-semibold flex items-center justify-between">
          <span>Statistical Outliers Review (IQR Fence Exclusion)</span>
          <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded font-bold">{outliers.length} Records</span>
        </div>
        <div className="overflow-x-auto">
          {outliers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No outliers detected in the current run.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Flight</th>
                  <th className="px-6 py-3">Departure</th>
                  <th className="px-6 py-3 text-right">Fare</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outliers.map((o: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{o.airline} <span className="text-slate-400 font-normal">({o.flight_number})</span></td>
                    <td className="px-6 py-3">{o.departure_time}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-800">₹{Math.round(o.total_fare).toLocaleString()}</td>
                    <td className="px-6 py-3 text-xs text-amber-600 font-medium">IQR bounds exceeded</td>
                    <td className="px-6 py-3 text-center"><span className="bg-red-100 text-red-700 font-medium px-2 py-1 rounded text-xs uppercase">Flagged & Excluded</span></td>
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
