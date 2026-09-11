import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Activity, ShieldCheck, Database, Calendar } from "lucide-react";

export default function OverviewScreen() {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/summary").then((res) => {
        if (!res.ok) throw new Error("Failed to load summary");
        return res.json();
      }),
      fetch("/api/v1/status").then((res) => {
        if (!res.ok) throw new Error("Failed to load status");
        return res.json();
      })
    ])
      .then(([sum, st]) => {
        setSummaryData(sum);
        setStatusData(st);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-10">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Activity className="animate-spin text-emerald-500" size={32} />
          <span className="font-medium">Loading intelligence data...</span>
        </div>
      </div>
    );
  }

  // Aggregate metrics
  let totalObservations = 0;
  let totalRaw = 0;
  let totalCleaned = 0;
  let totalExcluded = 0;
  let overallIndexSum = 0;
  let indexCount = 0;

  const insightCandidates: { route: string; lead: string; diff: number; current: number; base: number }[] = [];

  if (summaryData?.results) {
    Object.keys(summaryData.results).forEach((route) => {
      Object.keys(summaryData.results[route]).forEach((lead) => {
        const data = summaryData.results[route][lead];
        totalObservations += data.pipeline?.final_dataset || data.sample_size || 0;
        totalRaw += data.pipeline?.raw_segments || 0;
        totalCleaned += data.pipeline?.cleaned_flights || 0;
        totalExcluded += (data.pipeline?.raw_segments || 0) - (data.pipeline?.final_dataset || 0);

        if (data.jevons_index) {
          overallIndexSum += data.jevons_index;
          indexCount++;

          const diff = data.jevons_index - 100;
          insightCandidates.push({ route, lead, diff, current: data.median_fare, base: data.baseline_fare });
        }
      });
    });
  }

  const overallIndex = indexCount > 0 ? overallIndexSum / indexCount : 100;
  const globalDiff = overallIndex - 100;
  const isUp = globalDiff > 0;
  const isDown = globalDiff < 0;

  // Real Insights
  insightCandidates.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const insights =
    insightCandidates.length > 0
      ? insightCandidates.slice(0, 3).map((item) => {
          const isIncrease = item.diff > 0;
          return `For ${item.route} booked ${item.lead.replace('T+', '')} days in advance, fares are running ${Math.abs(item.diff).toFixed(1)}% ${
            isIncrease ? "higher" : "lower"
          } than the historical baseline.`;
        })
      : ["No sufficient data available yet to generate insights."];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* Hero Section */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden ring-1 ring-slate-800 isolate">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-0">
          <div className="text-emerald-400 font-bold tracking-wider text-sm md:text-base uppercase mb-2 flex items-center gap-2">
            <Activity size={20} /> AIRFARE PRICE INDEX
          </div>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mb-8">
            Real-time tracking of Indian domestic airfares relative to standard baselines.
          </p>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex items-end gap-6">
              <div className="text-6xl md:text-7xl font-bold font-sans tracking-tight leading-none">
                {overallIndex.toFixed(2)}
              </div>
              <div
                className={`flex items-center gap-2 text-xl md:text-3xl font-medium pb-1.5 ${
                  isUp ? "text-red-400" : isDown ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {isUp ? <TrendingUp size={32} /> : isDown ? <TrendingDown size={32} /> : <Minus size={32} />}
                {isUp ? "+" : ""}
                {globalDiff.toFixed(2)}%
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl backdrop-blur-md min-w-[140px]">
                <span className="flex items-center gap-1.5 opacity-60 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Database size={14}/> Active Routes
                </span>
                <span className="font-semibold text-lg">{summaryData?.results ? Object.keys(summaryData.results).length : 0}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl backdrop-blur-md min-w-[140px]">
                <span className="flex items-center gap-1.5 opacity-60 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Calendar size={14}/> Last Run
                </span>
                <span className="font-semibold text-lg">{summaryData?.generated_at ? new Date(summaryData.generated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Insights & Trend */}
        <div className="lg:col-span-2 space-y-6">

          {/* Key Insights */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                Key Insights
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="bg-blue-50 border border-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center shrink-0 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-slate-700 pt-1 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historical Trend */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-500" />
                Historical Trend
              </h3>
            </div>
            <div className="p-10 flex flex-col items-center justify-center text-center bg-slate-50/30 min-h-[220px]">
              <div className="bg-slate-100 p-3 rounded-full mb-3">
                <Database className="text-slate-400" size={24} />
              </div>
              <h4 className="text-slate-700 font-medium mb-1">Insufficient Historical Data</h4>
              <p className="text-slate-500 text-sm max-w-sm">Trend visualization requires multiple collections over time. The chart will appear here once enough data is gathered.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Pipeline Engine */}
        <div className="space-y-6">

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full isolate">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Pipeline Engine</h3>
              <Link to="/monitor" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full transition-colors">
                Monitor
              </Link>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
              <div className="relative">
                {/* Pipeline visual line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100 rounded-full z-0"></div>

                <div className="space-y-6 relative">
                  {/* Step 1 */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-sm text-slate-500 font-medium z-10">
                      RQ
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Raw Quotes</div>
                      <div className="text-2xl font-bold text-slate-800 leading-none">{totalRaw.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0 shadow-sm text-blue-600 font-medium z-10">
                      CL
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Cleaned Flights</div>
                      <div className="text-2xl font-bold text-slate-800 leading-none">{totalCleaned.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center shrink-0 shadow-sm text-emerald-600 font-medium z-10">
                      VO
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Valid Output</div>
                      <div className="text-2xl font-bold text-slate-800 leading-none">{totalObservations.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center mt-auto">
                <div className="text-amber-800 font-semibold mb-1 text-sm">{totalExcluded.toLocaleString()} Dropped</div>
                <div className="text-amber-700/70 text-xs">Exclusions applied during validation & processing.</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
