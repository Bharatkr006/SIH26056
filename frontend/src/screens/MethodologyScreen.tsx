import React from "react";
import { BookOpenText, FunctionSquare, Filter, DatabaseZap } from "lucide-react";

export default function MethodologyScreen() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800">Index Methodology</h2>
        <p className="text-slate-500 mt-1">Mathematical and statistical foundation of the Airfare Price Intelligence system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
           <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
             <FunctionSquare size={24} />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-3">Jevons Price Index (Primary)</h3>
           <p className="text-slate-600 text-sm leading-relaxed mb-6">
             The system uses the unweighted geometric mean of price relatives (Jevons Index). This is the internationally endorsed method (by the ILO and IMF) for calculating elementary aggregate price indices, as it satisfies the time reversal test and mitigates the substitution bias inherent in arithmetic indices like Carli.
           </p>
           <div className="bg-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto text-slate-700 border border-slate-100">
             J = exp( (1/n) * Σ ln( p_i / p_0 ) ) * 100
           </div>
           <ul className="mt-4 text-xs text-slate-500 space-y-2">
             <li><span className="font-semibold">p_i</span> : Observed total fare (Base + Tax)</li>
             <li><span className="font-semibold">p_0</span> : Configured baseline reference fare</li>
             <li><span className="font-semibold">n</span> : Count of valid observations</li>
           </ul>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
           <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
             <Filter size={24} />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-3">IQR Outlier Filtering</h3>
           <p className="text-slate-600 text-sm leading-relaxed mb-6">
             To prevent extreme premium fares (e.g., last seats sold at 500% markup) from artificially inflating the index, the system applies Interquartile Range (IQR) fencing. This provides robust non-parametric detection of statistical outliers.
           </p>
           <div className="bg-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto text-slate-700 border border-slate-100">
             IQR = Q3 - Q1<br/><br/>
             Lower Fence = Q1 - (1.5 * IQR)<br/>
             Upper Fence = Q3 + (1.5 * IQR)
           </div>
           <p className="text-xs text-slate-500 mt-4 leading-relaxed">
             Observations falling outside this fence are preserved in the database for auditing but are excluded from the final aggregate sample (n) used for index computation.
           </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-lg">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
          <DatabaseZap className="text-emerald-400" />
          End-to-End Execution Flow
        </h3>

        <div className="space-y-4 font-medium text-sm">
          <div className="flex bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <span className="w-8 text-slate-400 font-mono">01</span>
            <div>
              <div className="text-emerald-300">Automated Browser Agent</div>
              <div className="text-slate-400 font-normal mt-1">Headless Chromium connects to configured OTA routes for T+N lead times.</div>
            </div>
          </div>
          <div className="flex bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <span className="w-8 text-slate-400 font-mono">02</span>
            <div>
              <div className="text-emerald-300">Network Interception</div>
              <div className="text-slate-400 font-normal mt-1">XHR/Fetch responses are intercepted mid-flight to capture raw JSON payloads.</div>
            </div>
          </div>
          <div className="flex bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <span className="w-8 text-slate-400 font-mono">03</span>
            <div>
              <div className="text-emerald-300">Data Cleansing</div>
              <div className="text-slate-400 font-normal mt-1">Non-direct flights dropped. Zero-fares dropped. Sold-out buckets ignored. Airline codes normalized.</div>
            </div>
          </div>
          <div className="flex bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <span className="w-8 text-slate-400 font-mono">04</span>
            <div>
              <div className="text-emerald-300">Observation Validation</div>
              <div className="text-slate-400 font-normal mt-1">IQR filters apply. Valid <i>n</i> observations remaining are passed to statistical engine.</div>
            </div>
          </div>
          <div className="flex bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <span className="w-8 text-slate-400 font-mono">05</span>
            <div>
              <div className="text-emerald-300">Calculation & Storage</div>
              <div className="text-slate-400 font-normal mt-1">Jevons and Carli indices calculated. Full ledger written to persistent CSV storage.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
