import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, Plane, Zap, Info, MapPin } from "lucide-react";

export default function InsightsScreen() {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [allFlights, setAllFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/summary").then(r => r.json()),
      fetch("/api/v1/fares/search?route=ALL&lead=ALL").then(r => r.json())
    ]).then(([sum, fares]) => {
      setSummaryData(sum);
      setAllFlights(fares.flights || []);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 font-medium">
          <Zap className="text-indigo-400" size={20} />
          <span>Generating insights...</span>
        </div>
      </div>
    );
  }

  // --- Insight Generation logic ---
  const generateInsights = () => {
    const insights: { title: string; description: string; icon: any; color: string; bgColor: string }[] = [];

    // Safety checks
    if (!summaryData?.results) return insights;

    // 1. Highest and Lowest Route Index
    let highestRoute = { route: "", lead: "", index: 0 };
    let lowestRoute = { route: "", lead: "", index: 1000 };
    const routes = Object.keys(summaryData.results);

    routes.forEach(route => {
      Object.keys(summaryData.results[route]).forEach(lead => {
        const idx = summaryData.results[route][lead]?.jevons_index;
        if (idx) {
          if (idx > highestRoute.index) highestRoute = { route, lead, index: idx };
          if (idx < lowestRoute.index) lowestRoute = { route, lead, index: idx };
        }
      });
    });

    if (highestRoute.index > 0) {
      insights.push({
        title: "Highest Current Premium",
        description: `Route ${highestRoute.route} for lead time ${highestRoute.lead} has the highest current index at ${highestRoute.index.toFixed(1)}.`,
        icon: TrendingUp,
        color: "text-rose-600",
        bgColor: "bg-rose-50"
      });
    }

    // 2. Route Baseline Comparisons
    routes.forEach(route => {
      const leads = Object.values(summaryData.results[route]) as any[];
      const validLeads = leads.filter(l => l && l.jevons_index);
      if (validLeads.length > 0) {
        const avgIndex = validLeads.reduce((acc, l) => acc + l.jevons_index, 0) / validLeads.length;
        if (avgIndex > 105) {
          insights.push({
            title: "Above Baseline",
            description: `${route} fares are on average ${(avgIndex - 100).toFixed(1)}% above baseline across tracked lead times.`,
            icon: MapPin,
            color: "text-amber-600",
            bgColor: "bg-amber-50"
          });
        } else if (avgIndex < 95) {
          insights.push({
            title: "Below Baseline",
            description: `${route} fares are on average ${(100 - avgIndex).toFixed(1)}% below baseline across tracked lead times.`,
            icon: MapPin,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50"
          });
        }
      }
    });

    // 3. Advance Booking Comparison (T+1 vs T+15)
    // Gather all T+1 and T+15 indices to find average
    let t1Sum = 0, t1Count = 0;
    let t15Sum = 0, t15Count = 0;

    routes.forEach(r => {
      const t1 = summaryData.results[r]["T+1"];
      if (t1 && t1.jevons_index) { t1Sum += t1.jevons_index; t1Count++; }

      const t15 = summaryData.results[r]["T+15"];
      if (t15 && t15.jevons_index) { t15Sum += t15.jevons_index; t15Count++; }
    });

    if (t1Count > 0 && t15Count > 0) {
      const t1Avg = t1Sum / t1Count;
      const t15Avg = t15Sum / t15Count;
      const diff = ((t1Avg - t15Avg) / t15Avg) * 100;

      if (diff > 5) {
        insights.push({
          title: "Advance Booking Advantage",
          description: `T+1 fares are ${diff.toFixed(1)}% higher than T+15 fares on average, showing a strong premium for last-minute bookings.`,
          icon: Clock,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50"
        });
      } else if (diff < -5) {
        insights.push({
          title: "Last-Minute Discounts",
          description: `T+1 fares are ${Math.abs(diff).toFixed(1)}% lower than T+15 fares on average, indicating last-minute price drops.`,
          icon: Clock,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50"
        });
      }
    }

    // 4. Time of Day Pricing Insight
    if (allFlights.length > 0) {
      const morning = allFlights.filter(f => { const h = parseInt(f.departure_time.split(":")[0]); return h >= 4 && h < 12; });
      const evening = allFlights.filter(f => { const h = parseInt(f.departure_time.split(":")[0]); return h >= 17 || h < 4; });

      const getMean = (arr: any[]) => arr.length ? arr.reduce((acc, f) => acc + f.total_fare, 0) / arr.length : 0;
      const morningAvg = getMean(morning);
      const eveningAvg = getMean(evening);

      if (morningAvg > 0 && eveningAvg > 0) {
        if (morningAvg > eveningAvg * 1.1) {
          insights.push({
            title: "Time of Day Premium",
            description: `Morning flights are typically more expensive, averaging ₹${Math.round(morningAvg - eveningAvg).toLocaleString()} higher than evening flights.`,
            icon: Info,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
          });
        } else if (eveningAvg > morningAvg * 1.1) {
          insights.push({
            title: "Time of Day Premium",
            description: `Evening flights command a premium, averaging ₹${Math.round(eveningAvg - morningAvg).toLocaleString()} higher than morning flights.`,
            icon: Info,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
          });
        }
      }

      // 5. Carrier Affordability
      const airlineMap = new Map();
      allFlights.forEach(f => {
        if(!airlineMap.has(f.airline)) airlineMap.set(f.airline, { fares: [], count: 0 });
        airlineMap.get(f.airline).fares.push(f.total_fare);
        airlineMap.get(f.airline).count++;
      });

      const airlineStats = Array.from(airlineMap.keys()).map(airline => {
        const fares = airlineMap.get(airline).fares;
        const avg = fares.reduce((a: number, b: number) => a + b, 0) / fares.length;
        return { airline, count: fares.length, avg };
      }).filter(a => a.count > 5).sort((a,b) => a.avg - b.avg);

      if (airlineStats.length >= 2) {
        const cheapest = airlineStats[0];
        insights.push({
          title: "Carrier Affordability",
          description: `${cheapest.airline} consistently offers the lowest average fares (₹${Math.round(cheapest.avg).toLocaleString()}) across tracked routes.`,
          icon: Plane,
          color: "text-emerald-600",
          bgColor: "bg-emerald-50"
        });
      }
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-3xl font-light text-slate-800 tracking-tight">Insights</h2>
        <p className="text-slate-500 mt-2 text-lg">Human-readable analysis generated from the latest market data.</p>
      </div>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
            Not enough data available to generate insights. Check back after next data collection.
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div
              key={idx}
              className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-slate-300 transition-all duration-300 flex items-start gap-5"
            >
              <div className={`p-4 rounded-full ${insight.bgColor} ${insight.color} shrink-0`}>
                 <insight.icon size={26} strokeWidth={1.5} />
              </div>
              <div className="pt-1">
                <h4 className="text-xl font-medium text-slate-800 tracking-tight mb-2">
                  {insight.title}
                </h4>
                <p className="text-slate-600 leading-relaxed text-[1.05rem]">
                  {insight.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
