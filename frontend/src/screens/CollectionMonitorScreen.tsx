import React, { useEffect, useState } from "react";
import { PlayCircle, Loader2, CheckCircle2, History, Activity, BarChart2 } from "lucide-react";
import clsx from "clsx";

export default function CollectionMonitorScreen() {
  const [status, setStatus] = useState<any>(null);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => {
    Promise.all([
      fetch("/api/v1/status").then(r => r.json()).catch(() => null),
      fetch("/api/v1/pipeline").then(r => r.json()).catch(() => null),
      fetch("/api/v1/summary").then(r => r.json()).catch(() => null)
    ])
    .then(([st, pl, sum]) => {
      setStatus(st);
      setPipelineData(pl);
      setSummaryData(sum);
      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to fetch pipeline status", err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRunCollection = async () => {
    try {
      await fetch("/api/v1/collect", { method: "POST" });
      fetchStatus();
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) return null;

  const steps = [
    "Scheduler Trigger",
    "Headless Browser Launch",
    "Target Site Navigation",
    "Network Interception (API)",
    "JSON Parser Decoder",
    "Data Validation Engine",
    "IQR Outlier Filter",
    "Jevons Index Calculation"
  ];

  const formatDate = (ds: string) => ds ? new Date(ds).toLocaleString() : "N/A";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Collection Monitor</h2>
          <p className="text-slate-500 text-sm mt-1">Live status of automated multi-route data pipelines</p>
        </div>
        <button
          onClick={handleRunCollection}
          disabled={status?.is_collecting}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all",
            status?.is_collecting
              ? "bg-amber-100 text-amber-700 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg"
          )}
        >
          {status?.is_collecting ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
          {status?.is_collecting ? "Collection in Progress..." : "Run Multi-Route Collection"}
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl text-white">
         <h3 className="text-lg font-semibold mb-8 flex items-center gap-2">
           <Activity className={status?.is_collecting ? "text-amber-400 animate-pulse" : "text-emerald-400"} />
           {status?.is_collecting ? "Pipeline Execution Active..." : "Pipeline Idle / Ready"}
         </h3>

         <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-700 before:to-slate-800">
            {steps.map((step, idx) => {
              const isPast = status?.is_collecting ? idx < 2 : true;
              const isCurrent = status?.is_collecting && idx === 2;
              return (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className={clsx(
                    "flex items-center justify-center w-8 h-8 rounded-full border-4 border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md relative z-10",
                    isCurrent ? "bg-amber-400 text-slate-900 animate-pulse" : isPast ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-500"
                  )}>
                    {isPast && !isCurrent ? <CheckCircle2 size={16} /> : null}
                    {isCurrent ? <Loader2 className="animate-spin" size={16} /> : null}
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
                    <h4 className={clsx("font-semibold text-sm", isPast || isCurrent ? "text-slate-200" : "text-slate-500")}>{step}</h4>
                  </div>
                </div>
              )
            })}
         </div>
      </div>

      {/* Multi-Route Results Matrix */}
      {summaryData && summaryData.results && !status?.is_collecting && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart2 className="text-indigo-600" />
            Active Collection Results
          </h3>
          <p className="text-slate-500 text-sm mb-6">Generated: {formatDate(summaryData.generated_at)}</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.keys(summaryData.results).map((route) => (
              <div key={route} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="font-bold tracking-tight text-slate-800">{route}</h4>
                </div>

                <div className="divide-y divide-slate-100">
                  {Object.keys(summaryData.results[route]).map((leadTime) => {
                    const data = summaryData.results[route][leadTime];
                    const jevons = data.jevons_index;
                    const isUp = jevons > 100;
                    const isDown = jevons < 100;

                    return (
                      <div key={leadTime} className="p-5 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{leadTime} Advance</div>
                            <div className="flex items-baseline gap-2 mt-1">
                               <div className="text-2xl font-black text-slate-800">{jevons ? jevons.toFixed(2) : "N/A"}</div>
                               {jevons && <div className={clsx("text-xs font-bold px-1.5 py-0.5 rounded", isUp ? "bg-red-100 text-red-700" : isDown ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                                 {isUp ? `+${(jevons - 100).toFixed(2)}%` : isDown ? `-${(100 - jevons).toFixed(2)}%` : '0.00%'}
                               </div>}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-600">Vol: {data.sample_size}</div>
                            <div className="text-xs text-slate-400">Base: ₹{data.baseline_fare}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
