import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, Pill, SectionTitle, StatTile } from "../components/AppShell";
import { getHistoryFn, getEvaluationMetricsFn, getDbStatsFn } from "../server-functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview" },
      { name: "description", content: "Query performance overview and recent activity." },
    ],
  }),
  component: Overview,
});

type RecentItem = {
  t: string;
  q: string;
  risk: "low" | "med" | "high";
  ms: number;
};

function Overview() {
  const [totalQueries, setTotalQueries] = useState(0);
  const [avgTime, setAvgTime] = useState("0.00s");
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [topRule, setTopRule] = useState("None");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [riskStats, setRiskStats] = useState({ low: 100, med: 0, high: 0 });

  const [schemaSizes, setSchemaSizes] = useState([
    { name: "customers", count: "100,000" },
    { name: "orders", count: "500,000" },
    { name: "products", count: "10,000" },
    { name: "employees", count: "5,000" },
    { name: "payments", count: "500,000" },
  ]);

  const [modelMetrics, setModelMetrics] = useState([
    { n: "Decision Tree", m: "MAE 35.4ms", t: "Interpretable" },
    { n: "Random Forest", m: "MAE 30.5ms", t: "Primary - intervals" },
    { n: "XGBoost", m: "MAE 32.4ms", t: "Highest accuracy" },
  ]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await getHistoryFn({ data: "All" });
        if (data && Array.isArray(data) && data.length > 0) {
          setTotalQueries(data.length);

          // Calculate average time
          const totalTime = data.reduce((acc: number, curr: any) => acc + curr.prediction, 0);
          const avg = totalTime / data.length;
          setAvgTime(avg >= 1.0 ? `${avg.toFixed(2)}s` : `${(avg * 1000).toFixed(0)}ms`);

          // Calculate high risk and rules counts
          let highCount = 0;
          let lowCount = 0;
          let medCount = 0;
          let rulesTriggeredTotal = 0;
          const ruleFrequency: Record<string, number> = {};

          data.forEach((item: any) => {
            const r = item.risk_level.toLowerCase();
            if (r === "high") highCount++;
            else if (r === "med") medCount++;
            else lowCount++;
            rulesTriggeredTotal += item.rules_count || 0;

            const q = item.query.toUpperCase();
            if (q.includes("JOIN") && item.rules_count > 0) {
              ruleFrequency["Missing Index on Join Key"] = (ruleFrequency["Missing Index on Join Key"] || 0) + 1;
            }
            if (q.includes("SELECT *")) {
              ruleFrequency["SELECT *"] = (ruleFrequency["SELECT *"] || 0) + 1;
            }
            if (q.includes("LIKE") && q.includes("%")) {
              ruleFrequency["Leading Wildcard in LIKE"] = (ruleFrequency["Leading Wildcard in LIKE"] || 0) + 1;
            }
            if (q.includes("ORDER BY")) {
              ruleFrequency["ORDER BY Sort Cost"] = (ruleFrequency["ORDER BY Sort Cost"] || 0) + 1;
            }
            if (q.includes("SELECT") && (q.includes("IN (SELECT") || q.includes("EXISTS (SELECT"))) {
              ruleFrequency["Correlated Subquery"] = (ruleFrequency["Correlated Subquery"] || 0) + 1;
            }
          });

          setHighRiskCount(highCount);
          
          if (rulesTriggeredTotal > 0) {
            let maxRule = "Missing Join Index";
            let maxCount = 0;
            Object.entries(ruleFrequency).forEach(([name, count]) => {
              if (count > maxCount) {
                maxCount = count;
                maxRule = name;
              }
            });
            setTopRule(maxRule);
          } else {
            setTopRule("None Triggered");
          }

          // Percentages for risk donut chart
          const lowPct = Math.round((lowCount / data.length) * 100);
          const medPct = Math.round((medCount / data.length) * 100);
          const highPct = 100 - lowPct - medPct;
          setRiskStats({ low: lowPct, med: medPct, high: highPct });

          // Get last 5 queries
          const recentItems = data.slice(0, 5).map((item: any) => {
            let timeStr = "Just Now";
            if (item.created_at) {
              const dateObj = new Date(item.created_at.replace(" ", "T"));
              if (!isNaN(dateObj.getTime())) {
                timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              }
            }
            return {
              t: timeStr,
              q: item.query,
              risk: item.risk_level.toLowerCase() as "low" | "med" | "high",
              ms: Math.round(item.prediction * 1000)
            };
          });
          setRecent(recentItems);
        } else {
          setTotalQueries(0);
          setAvgTime("0.00s");
          setHighRiskCount(0);
          setTopRule("None Triggered");
          setRiskStats({ low: 100, med: 0, high: 0 });
          setRecent([]);
        }
      } catch (e) {
        console.error("Dashboard database fetch failed:", e);
      }
    };

    const loadMetricsAndStats = async () => {
      try {
        const stats = await getDbStatsFn();
        if (stats && stats.counts) {
          setSchemaSizes([
            { name: "customers", count: stats.counts.customers.toLocaleString() },
            { name: "orders", count: stats.counts.orders.toLocaleString() },
            { name: "products", count: stats.counts.products.toLocaleString() },
            { name: "employees", count: stats.counts.employees.toLocaleString() },
            { name: "payments", count: stats.counts.payments.toLocaleString() },
          ]);
        }
      } catch (e) {
        console.error("Dashboard DB stats fetch failed:", e);
      }

      try {
        const metricsData = await getEvaluationMetricsFn();
        if (metricsData && Array.isArray(metricsData)) {
          const updated = [
            { n: "Decision Tree", m: "MAE 35.4ms", t: "Interpretable" },
            { n: "Random Forest", m: "MAE 30.5ms", t: "Primary - intervals" },
            { n: "XGBoost", m: "MAE 32.4ms", t: "Highest accuracy" },
          ];
          metricsData.forEach((row: any) => {
            const mName = row.Model;
            const isFull = row.Features.includes("Full");
            const maeVal = parseFloat(row.MAE);
            if (isFull && !isNaN(maeVal)) {
              const matched = updated.find(item => item.n === mName);
              if (matched) {
                const displayVal = maeVal < 1.0 ? (maeVal * 1000).toFixed(1) : maeVal.toFixed(1);
                matched.m = `MAE ${displayVal}ms`;
              }
            }
          });
          setModelMetrics(updated);
        }
      } catch (e) {
        console.error("Dashboard metrics fetch failed:", e);
      }
    };

    loadDashboardData();
    loadMetricsAndStats();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Edition - 01"
        title={<>Anticipate the cost <em className="italic">before</em> the query runs.</>}
        lede="A research surface for predicting PostgreSQL execution time using syntactic structure and planner intuition. Every prediction is bounded by a known schema."
      />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Queries Analyzed" value={totalQueries} sub="lifetime query logs" />
        <StatTile label="Avg Predicted Time" value={avgTime} sub="across analyzed queries" />
        <StatTile label="High Risk Queries" value={highRiskCount} sub="predicted execution > 3s" />
        <StatTile label="Top Triggered Suggestion" value={<span className="text-2xl">{topRule}</span>} sub="common optimization warning" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle hint="Logs aggregate">Risk Distribution</SectionTitle>
          <Donut stats={riskStats} total={totalQueries} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill tone="low">Low - {riskStats.low}%</Pill>
            <Pill tone="med">Medium - {riskStats.med}%</Pill>
            <Pill tone="high">High - {riskStats.high}%</Pill>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <SectionTitle hint="Click a row to reload">Recent Queries</SectionTitle>
          <div className="divide-y divide-border/50">
            {recent.length > 0 ? (
              recent.map((r, i) => (
                <Link
                  key={i}
                  to="/analyze"
                  onClick={() => {
                    localStorage.setItem("sql_analyzer_prefill", r.q);
                  }}
                  className="group flex items-center justify-between gap-4 py-3 transition hover:bg-white/30 -mx-2 px-2 rounded-lg"
                >
                  <span className="text-[11px] tabular-nums text-muted-foreground w-12">{r.t}</span>
                  <span className="flex-1 truncate font-mono text-xs text-foreground/80">{r.q}</span>
                  <span className="tabular-nums text-xs text-muted-foreground w-16 text-right">{r.ms}ms</span>
                  <Pill tone={r.risk}>{r.risk}</Pill>
                </Link>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent queries. Analyze a query to begin.
              </div>
            )}
          </div>
          <Link
            to="/analyze"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm text-background transition hover:opacity-90"
          >
            Analyze a new query
            <span aria-hidden>-&gt;</span>
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Models in service</div>
          <div className="mt-4 space-y-3">
            {modelMetrics.map((m) => (
              <div key={m.n} className="flex items-baseline justify-between border-b border-border/40 pb-2 last:border-0">
                <div>
                  <div className="font-display text-lg">{m.n}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.t}</div>
                </div>
                <div className="font-mono text-xs">{m.m}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle hint="Read-only">Schema in scope</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {schemaSizes.map((s) => (
              <div key={s.name} className="rounded-xl border border-border/60 bg-white/30 px-3 py-3">
                <div className="font-mono text-xs text-muted-foreground">{s.name}</div>
                <div className="mt-1 font-display text-xl tabular-nums">{s.count}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Predictions are valid only within this schema and the hardware
            configuration used for training. Carried in every report.
          </p>
        </Card>
      </div>
    </>
  );
}

function Donut({ stats, total }: { stats: { low: number; med: number; high: number }; total: number }) {
  const segs = [
    { val: stats.low, color: "oklch(0.86 0.08 160)" },
    { val: stats.med, color: "oklch(0.87 0.13 92)" },
    { val: stats.high, color: "oklch(0.82 0.11 30)" },
  ].filter(s => s.val > 0);
  
  let acc = 0;
  const r = 70, cx = 100, cy = 100;
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-52 w-52">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(0.94 0.01 90)" strokeWidth="22" />
      {segs.map((s, i) => {
        const start = (acc / 100) * Math.PI * 2 - Math.PI / 2;
        acc += s.val;
        const end = (acc / 100) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
        return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={s.color} strokeWidth="22" strokeLinecap="butt" />;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" className="font-display" fontSize="28" fill="currentColor">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="9" fill="oklch(0.5 0.02 85)" letterSpacing="2">QUERIES</text>
    </svg>
  );
}
