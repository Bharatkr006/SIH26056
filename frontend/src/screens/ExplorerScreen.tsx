import React, { useEffect, useState, useMemo } from "react";
import { Search, Filter, Plane, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';

export default function ExplorerScreen() {
  const [faresConfig, setFaresConfig] = useState<any>({ flights: [] });
  const [summaryConfig, setSummaryConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedRoute, setSelectedRoute] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState("ALL");

  // Sort State
  const [sortKey, setSortKey] = useState<string>("total_fare");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const routes = [
    { id: "ALL", label: "All Routes" },
    { id: "DEL-BOM", label: "Delhi → Mumbai" },
    { id: "DEL-BLR", label: "Delhi → Bangalore" },
    { id: "BOM-BLR", label: "Mumbai → Bangalore" }
  ];

  const leadTimes = ["ALL", "T+1", "T+7", "T+15"];

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/fares/search?route=${encodeURIComponent(selectedRoute)}&lead=${encodeURIComponent(selectedLead)}`).then(res => res.json()),
      fetch("/api/v1/summary").then(res => res.json())
    ])
      .then(([fares, summ]) => {
        setFaresConfig(fares);
        setSummaryConfig(summ);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = () => {
    fetchData();
  };

  const flights = faresConfig?.flights || [];

  // Calculate Index
  const calculateIndex = () => {
    if (!summaryConfig?.results) return 100;
    let sum = 0;
    let count = 0;

    Object.keys(summaryConfig.results).forEach(route => {
      if (selectedRoute !== "ALL" && route !== selectedRoute) return;
      Object.keys(summaryConfig.results[route]).forEach(lead => {
        if (selectedLead !== "ALL" && lead !== selectedLead) return;
        sum += summaryConfig.results[route][lead].jevons_index || 100;
        count++;
      });
    });
    return count > 0 ? sum / count : 100;
  };

  // Compare Lead Times Data
  const leadTimeComparisonData = useMemo(() => {
    if (!summaryConfig?.results) return [];
    const data: any[] = [];
    ['T+1', 'T+7', 'T+15'].forEach(lead => {
      let sumMedian = 0;
      let count = 0;
      Object.keys(summaryConfig.results).forEach(route => {
        if (selectedRoute !== "ALL" && route !== selectedRoute) return;
        if (summaryConfig.results[route][lead]) {
          sumMedian += summaryConfig.results[route][lead].median_fare || 0;
          count++;
        }
      });
      if (count > 0) data.push({ lead, median: sumMedian / count });
    });
    return data;
  }, [summaryConfig, selectedRoute]);

  // Airline Comparison Data
  const airlineComparisonData = useMemo(() => {
    const airlines: Record<string, { sum: number, count: number }> = {};
    flights.forEach((f: any) => {
      if (!airlines[f.airline]) airlines[f.airline] = { sum: 0, count: 0 };
      airlines[f.airline].sum += parseFloat(f.total_fare || 0);
      airlines[f.airline].count += 1;
    });
    return Object.keys(airlines).map(a => ({ airline: a, avg: airlines[a].sum / airlines[a].count }));
  }, [flights]);

  const sortedFlights = useMemo(() => {
    return [...flights].sort((a, b) => {
      let valA = parseFloat(a[sortKey] || 0);
      let valB = parseFloat(b[sortKey] || 0);
      if (sortKey === 'airline') {
        valA = a.airline?.toLowerCase() || "";
        valB = b.airline?.toLowerCase() || "";
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [flights, sortKey, sortDirection]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Airfare Explorer</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Route</label>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {routes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Advance Purchase</label>
          <select value={selectedLead} onChange={(e) => setSelectedLead(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {leadTimes.map(lt => <option key={lt} value={lt}>{lt === 'ALL' ? 'All Timeframes' : `${lt} Days`}</option>)}
          </select>
        </div>
        <button onClick={handleFilter} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 h-[38px]">
          <Filter size={16} /> Filter Results
        </button>
      </div>

      {loading ? (
        <div className="p-10 animate-pulse text-slate-500 font-medium bg-white rounded-xl border border-slate-200 text-center">Fetching data...</div>
      ) : (
        <>
        {flights.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-4 opacity-90">Fare Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Median Fare", value: `₹${Math.round(sortedFlights.length > 0 ? sortedFlights[Math.floor(sortedFlights.length / 2)].total_fare : 0).toLocaleString()}` },
                { label: "Fare Range", value: `₹${Math.min(...sortedFlights.map(f => parseFloat(f.total_fare || 0))).toLocaleString()} - ₹${Math.max(...sortedFlights.map(f => parseFloat(f.total_fare || 0))).toLocaleString()}` },
                { label: "Observations", value: flights.length },
                { label: "Index", value: calculateIndex().toFixed(2) }
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xs uppercase font-semibold opacity-70 mb-1">{item.label}</div>
                  <div className="text-2xl font-bold">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-500" /> Compare Lead Times</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadTimeComparisonData}>
                  <XAxis dataKey="lead" />
                  <YAxis />
                  <Tooltip formatter={(val: number) => `₹${Math.round(val).toLocaleString()}`} />
                  <Bar dataKey="median" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500" /> Airline Comparison (Avg)</h3>
             <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={airlineComparisonData}>
                  <XAxis dataKey="airline" />
                  <YAxis />
                  <Tooltip formatter={(val: number) => `₹${Math.round(val).toLocaleString()}`} />
                  <Bar dataKey="avg" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Airline</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4 text-right">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedFlights.map((f: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-900">{f.airline}</td>
                  <td className="px-6 py-3 text-slate-500">{f.origin} → {f.destination}</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">₹{Math.round(f.total_fare).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
