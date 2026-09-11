import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Activity, FileDigit } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function OverviewScreen() {
  const [indexData, setIndexData] = useState<any>(null);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/index").then(res => res.json()),
      fetch("/api/v1/pipeline").then(res => res.json()),
      fetch("/api/v1/status").then(res => res.json())
    ]).then(([idx, pl, st]) => {
      setIndexData(idx);
      setPipelineData(pl);
      setStatusData(st);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-10 animate-pulse text-slate-500 font-medium">Loading intelligence data...</div>;

  const diff = indexData?.jevons_index - 100;
  const isUp = diff > 0;
  const isDown = diff < 0;

  // Mock historical for the chart since the backend doesn't store a time-series DB yet
  const mockHistory = [
    { date: "Sept 06", index: 101.2 },
    { date: "Sept 07", index: 102.4 },
    { date: "Sept 08", index: 100.8 },
    { date: "Sept 09", index: 103.1 },
    { date: "Sept 10", index: 103.8 },
    { date: "Current", index: indexData?.jevons_index || 104.26 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Hero Section */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="text-emerald-400 font-semibold tracking-wider text-sm uppercase mb-4 flex items-center gap-2">
            <Activity size={16} /> Airfare Price Index (Jevons)
          </div>
          <div className="flex items-end gap-6 mb-6">
            <div className="text-7xl font-bold font-sans tracking-tight">
              {indexData?.jevons_index?.toFixed(2)}
            </div>
            <div className={`flex items-center gap-2 text-2xl font-medium pb-2 ${isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isUp ? <TrendingUp size={28} /> : isDown ? <TrendingDown size={28} /> : <Minus size={28} />}
              {isUp ? '+' : ''}{diff.toFixed(2)}% vs baseline
            </div>
          </div>

          <div className="flex gap-8 text-sm text-slate-300">
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
              <span className="opacity-70 block text-xs uppercase mb-1">Baseline</span>
              <span className="font-semibold text-white">₹{indexData?.baseline_fare?.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
              <span className="opacity-70 block text-xs uppercase mb-1">Route</span>
              <span className="font-semibold text-white">{indexData?.route}</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
              <span className="opacity-70 block text-xs uppercase mb-1">Advance Purchase</span>
              <span className="font-semibold text-white">T+{indexData?.lead_days} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-900 flex items-center gap-4 shadow-sm">
        <div className="bg-blue-600 text-white p-2 rounded-lg">
          <FileDigit size={20} />
        </div>
        <div>
          <span className="block font-semibold">Automated Inference</span>
          <span className="block opacity-90 text-sm">
            Current {indexData?.route} fares are {Math.abs(diff).toFixed(2)}% {isUp ? 'above' : 'below'} the configured baseline. Real-time collection executed via EaseMyTrip API interception.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-lg text-slate-800 mb-6 flex items-center gap-2">
            Index Trend
          </h3>
          <div className="h-64 relative">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={mockHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                 <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                 <Tooltip
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                 />
                 <Line type="monotone" dataKey="index" stroke="#1e3a8a" strokeWidth={3} dot={{r: 4, fill: '#1e3a8a', strokeWidth: 0}} activeDot={{r: 6}} />
               </LineChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-lg">
               <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-md">
                 Historical series will populate as collection runs accumulate
               </div>
             </div>
          </div>
        </div>

        {/* Snapshot & Pipeline */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-lg text-slate-800 mb-4">Current Route Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Median Fare</div>
                <div className="text-xl font-semibold text-slate-800">₹{indexData?.median_fare?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Mean Fare</div>
                <div className="text-xl font-semibold text-slate-800">₹{indexData?.arithmetic_mean?.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Price Range</div>
                <div className="text-sm font-semibold text-slate-700">₹{indexData?.min_fare?.toLocaleString()} — ₹{indexData?.max_fare?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Observations</div>
                <div className="text-sm font-semibold text-slate-700">{pipelineData?.final_observations} valid quotes</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="font-semibold text-lg text-slate-800 mb-4">Collection Pipeline Funnel</h3>
             <div className="flex justify-between items-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="text-center group relative flex-1">
                  <div className="text-2xl font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{pipelineData?.raw_quotes}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Raw Quotes</div>
                </div>
                <div className="text-slate-300">→</div>
                <div className="text-center group relative flex-1">
                  <div className="text-2xl font-bold text-blue-500 group-hover:text-blue-600 transition-colors">{pipelineData?.cleaned}</div>
                  <div className="text-xs font-semibold text-blue-600 uppercase mt-1 bg-blue-100 inline-block px-2 py-0.5 rounded">Cleaned</div>
                </div>
                <div className="text-slate-300">→</div>
                 <div className="text-center group relative flex-1">
                  <div className="text-2xl font-bold text-emerald-500 group-hover:text-emerald-600 transition-colors">{pipelineData?.final_observations}</div>
                  <div className="text-xs font-semibold text-emerald-600 uppercase mt-1 bg-emerald-100 inline-block px-2 py-0.5 rounded">Valid Output</div>
                </div>
             </div>
             <p className="text-xs text-center text-slate-500 mt-4">
               {pipelineData?.excluded} exclusions applied (non-direct, zero-fare, IQR outliers)
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}
