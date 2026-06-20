import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, Pill, SectionTitle, StatTile } from "../components/AppShell";
import { getHistoryFn, getEvaluationMetricsFn, getDbStatsFn } from "../server-functions";
import { Activity, Database, AlertTriangle, Lightbulb, ArrowRight, TrendingUp, Layers, Cpu } from "lucide-react";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "SQL Analyzer — Overview" },
      { name: "description", content: "Query performance overview and recent activity." },
    ],
  }),
  component: Overview,
} as any));

type RecentItem = {
  t: string;
  q: string;
  risk: "low" | "med" | "high";
  ms: number;
};

function Overview() {
  const [totalQueries, setTotalQueries] = useState(0);
  const [avgTime, setAvgTime] = useState("—");
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [topRule, setTopRule] = useState("None");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [riskStats, setRiskStats] = useState({ low: 0, med: 0, high: 0 });
  const [loading, setLoading] = useState(true);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [schemaSizes, setSchemaSizes] = useState<{ name: string; count: string }[]>([]);

  const [modelMetrics, setModelMetrics] = useState<{ n: string; m: string; t: string; r2: string }[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await getHistoryFn({ data: "All" });
        if (data && Array.isArray(data) && data.length > 0) {
          setTotalQueries(data.length);

          const totalTime = data.reduce((acc: number, curr: any) => acc + curr.prediction, 0);
          const avg = totalTime / data.length;
          setAvgTime(avg >= 1.0 ? `${avg.toFixed(2)}s` : `${(avg * 1000).toFixed(0)}ms`);

          let highCount = 0, lowCount = 0, medCount = 0;
          let rulesTriggeredTotal = 0;
          const ruleFrequency: Record<string, number> = {};

          data.forEach((item: any) => {
            const r = item.risk_level.toLowerCase();
            if (r === "high") highCount++;
            else if (r === "med") medCount++;
            else lowCount++;
            rulesTriggeredTotal += item.rules_count || 0;

            const q = item.query.toUpperCase();
            if (q.includes("JOIN") && item.rules_count > 0) ruleFrequency["Missing Index on Join Key"] = (ruleFrequency["Missing Index on Join Key"] || 0) + 1;
            if (q.includes("SELECT *")) ruleFrequency["SELECT *"] = (ruleFrequency["SELECT *"] || 0) + 1;
            if (q.includes("LIKE") && q.includes("%")) ruleFrequency["Leading Wildcard in LIKE"] = (ruleFrequency["Leading Wildcard in LIKE"] || 0) + 1;
            if (q.includes("ORDER BY")) ruleFrequency["ORDER BY Sort Cost"] = (ruleFrequency["ORDER BY Sort Cost"] || 0) + 1;
            if (q.includes("SELECT") && (q.includes("IN (SELECT") || q.includes("EXISTS (SELECT"))) ruleFrequency["Correlated Subquery"] = (ruleFrequency["Correlated Subquery"] || 0) + 1;
          });

          setHighRiskCount(highCount);

          if (rulesTriggeredTotal > 0) {
            let maxRule = "Missing Join Index", maxCount = 0;
            Object.entries(ruleFrequency).forEach(([name, count]) => {
              if (count > maxCount) { maxCount = count; maxRule = name; }
            });
            setTopRule(maxRule);
          } else {
            setTopRule("None Triggered");
          }

          const lowPct = Math.round((lowCount / data.length) * 100);
          const medPct = Math.round((medCount / data.length) * 100);
          const highPct = 100 - lowPct - medPct;
          setRiskStats({ low: lowPct, med: medPct, high: highPct });

          const recentItems = data.slice(0, 6).map((item: any) => {
            let timeStr = "Just Now";
            if (item.created_at) {
              const dateObj = new Date(item.created_at.replace(" ", "T"));
              if (!isNaN(dateObj.getTime())) {
                timeStr = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
              }
            }
            return {
              t: timeStr,
              q: item.query,
              risk: item.risk_level.toLowerCase() as "low" | "med" | "high",
              ms: Math.round(item.prediction * 1000),
            };
          });
          setRecent(recentItems);
        } else {
          setTotalQueries(0);
          setAvgTime("—");
          setHighRiskCount(0);
          setTopRule("None Triggered");
          setRiskStats({ low: 100, med: 0, high: 0 });
          setRecent([]);
        }
      } catch (e) {
        console.error("Dashboard fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    const loadMetricsAndStats = async () => {
      try {
        const stats = await getDbStatsFn();
        if (stats && stats.counts) {
          setSchemaSizes([
            { name: "customers", count: stats.counts.customers.toLocaleString() },
            { name: "orders",   count: stats.counts.orders.toLocaleString()   },
            { name: "products", count: stats.counts.products.toLocaleString() },
            { name: "employees",count: stats.counts.employees.toLocaleString()},
            { name: "payments", count: stats.counts.payments.toLocaleString() },
          ]);
        }
      } catch (e) {
        console.error("Schema stats failed:", e);
      } finally {
        setSchemaLoading(false);
      }

      try {
        const metricsData = await getEvaluationMetricsFn();
        if (metricsData && Array.isArray(metricsData) && metricsData.length > 0) {
          // Parse the CSV rows into per-model full-feature records
          const modelMap: Record<string, { mae: string; r2: string; role: string }> = {
            "Decision Tree": { mae: "—", r2: "—", role: "Interpretable" },
            "Random Forest": { mae: "—", r2: "—", role: "Primary — intervals" },
            "XGBoost":       { mae: "—", r2: "—", role: "Highest accuracy" },
          };
          metricsData.forEach((row: any) => {
            const isFull = row.Features?.includes("Full");
            const maeVal = parseFloat(row.MAE);
            const r2Val  = parseFloat(row.R2);
            if (isFull && row.Model && modelMap[row.Model]) {
              if (!isNaN(maeVal)) {
                const displayVal = maeVal < 1.0 ? (maeVal * 1000).toFixed(1) : maeVal.toFixed(1);
                modelMap[row.Model].mae = `MAE ${displayVal}ms`;
              }
              if (!isNaN(r2Val)) modelMap[row.Model].r2 = `R² ${r2Val.toFixed(2)}`;
            }
          });
          setModelMetrics([
            { n: "Decision Tree", m: modelMap["Decision Tree"].mae, t: modelMap["Decision Tree"].role, r2: modelMap["Decision Tree"].r2 },
            { n: "Random Forest", m: modelMap["Random Forest"].mae, t: modelMap["Random Forest"].role, r2: modelMap["Random Forest"].r2 },
            { n: "XGBoost",       m: modelMap["XGBoost"].mae,       t: modelMap["XGBoost"].role,       r2: modelMap["XGBoost"].r2       },
          ]);
        }
        // If CSV not found, modelMetrics stays empty — UI will show empty state
      } catch (e) {
        console.error("Metrics CSV failed:", e);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadDashboardData();
    loadMetricsAndStats();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Edition — 01"
        title={<>Anticipate the cost <em className="italic not-italic font-light">before</em> the query runs.</>}
        lede="A research surface for predicting PostgreSQL execution time using syntactic structure and planner intuition. Every prediction is bounded by a known schema."
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Queries Analyzed"
          value={loading ? <span className="text-muted-foreground/50 text-2xl">…</span> : totalQueries}
          sub="lifetime query logs"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatTile
          label="Avg Predicted Time"
          value={loading ? <span className="text-muted-foreground/50 text-2xl">…</span> : avgTime}
          sub="across analyzed queries"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatTile
          label="High Risk Queries"
          value={loading ? <span className="text-muted-foreground/50 text-2xl">…</span> : highRiskCount}
          sub="predicted execution > 3s"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatTile
          label="Top Warning"
          value={<span className="text-xl leading-tight">{topRule}</span>}
          sub="most common suggestion"
          icon={<Lightbulb className="h-4 w-4" />}
        />
      </div>

      {/* Risk + Recent queries */}
      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle hint="Logs aggregate">Risk Distribution</SectionTitle>
          <Donut stats={riskStats} total={totalQueries} />
          <div className="mt-5 flex flex-col gap-2">
            {[
              { tone: "low" as const, label: "Low risk", val: riskStats.low },
              { tone: "med" as const, label: "Medium risk", val: riskStats.med },
              { tone: "high" as const, label: "High risk", val: riskStats.high },
            ].map((r) => (
              <div key={r.tone} className="flex items-center justify-between text-xs">
                <Pill tone={r.tone}>{r.label}</Pill>
                <div className="flex items-center gap-3 flex-1 ml-3">
                  <div className="h-1.5 flex-1 rounded-full bg-white/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${r.val}%`,
                        background: r.tone === "low" ? "oklch(0.78 0.1 160)" : r.tone === "med" ? "oklch(0.78 0.15 90)" : "oklch(0.72 0.14 28)",
                      }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-muted-foreground w-8 text-right">{r.val}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <SectionTitle hint="Click to re-analyze">Recent Queries</SectionTitle>
          <div className="divide-y divide-border/40">
            {recent.length > 0 ? (
              recent.map((r, i) => (
                <Link
                  key={i}
                  to="/analyze"
                  onClick={() => { localStorage.setItem("sql_analyzer_prefill", r.q); }}
                  className="group flex items-center gap-3 py-2.5 transition-all hover:bg-white/35 -mx-2 px-2 rounded-xl"
                >
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60 w-10">{r.t}</span>
                  <span className="flex-1 truncate font-mono text-[11px] text-foreground/75 group-hover:text-foreground transition-colors">{r.q}</span>
                  <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground font-mono w-14 text-right">{r.ms}ms</span>
                  <Pill tone={r.risk} size="sm">{r.risk}</Pill>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-all -translate-x-1 group-hover:translate-x-0" />
                </Link>
              ))
            ) : (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 h-10 w-10 rounded-full glass flex items-center justify-center">
                  <Activity className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No recent queries. Analyze a query to begin.</p>
              </div>
            )}
          </div>
          <Link
            to="/analyze"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-background transition-all hover:opacity-85 hover:gap-3 active:scale-95"
          >
            Analyze a new query
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* Models + Schema */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-4 w-4 text-muted-foreground/60" />
            <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">Models in Service</div>
          </div>
          <div className="space-y-3">
            {metricsLoading ? (
              // Loading skeleton
              [1, 2, 3].map((i) => (
                <div key={i} className="flex items-start justify-between gap-3 pb-3 border-b border-border/35 last:border-0 last:pb-0">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-24 bg-white/40 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-white/30 rounded animate-pulse" />
                  </div>
                  <div className="space-y-1.5 items-end flex flex-col">
                    <div className="h-3 w-16 bg-white/40 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-white/30 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : modelMetrics.length > 0 ? (
              modelMetrics.map((m, idx) => (
                <div key={m.n} className={`flex items-start justify-between gap-3 pb-3 ${idx < modelMetrics.length - 1 ? "border-b border-border/35" : ""}`}>
                  <div>
                    <div className="font-semibold text-[13px] tracking-tight">{m.n}</div>
                    <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{m.t}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[11px] text-foreground/80">{m.m}</div>
                    <div className="font-mono text-[10px] text-muted-foreground/60">{m.r2}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="text-sm text-muted-foreground">Evaluation metrics unavailable</div>
                <div className="text-xs text-muted-foreground/60 mt-1">Run training pipeline to generate.</div>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-muted-foreground/60" />
            <SectionTitle hint="Read-only">Schema in Scope</SectionTitle>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mt-4">
            {schemaLoading ? (
              // Loading skeleton
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-white/35 px-3 py-3 h-20 animate-pulse" />
              ))
            ) : schemaSizes.length > 0 ? (
              schemaSizes.map((s, i) => (
                <div key={s.name} className="rounded-xl border border-border/50 bg-white/35 px-3 py-3 hover:bg-white/50 transition-colors group">
                  <div className="font-mono text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{s.name}</div>
                  <div className="mt-1.5 font-display text-xl font-semibold tabular-nums tracking-tight">{s.count}</div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/50">rows</div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                Database schema stats unavailable.
              </div>
            )}
          </div>
          <div className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground/70">
            <Layers className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>Predictions are valid only within this schema and the hardware configuration used for training. Scope is carried in every generated report.</p>
          </div>
        </Card>
      </div>
    </>
  );
}

function Donut({ stats, total }: { stats: { low: number; med: number; high: number }; total: number }) {
  const segs = [
    { val: stats.low, color: "oklch(0.78 0.1 160)" },
    { val: stats.med, color: "oklch(0.78 0.15 90)" },
    { val: stats.high, color: "oklch(0.72 0.14 28)" },
  ].filter((s) => s.val > 0);

  let acc = 0;
  const r = 68, cx = 100, cy = 100;
  const gap = 0.02; // gap between segments in radians

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48">
      <defs>
        <filter id="shadow-ring" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
        </filter>
      </defs>
      {/* Track ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(0.91 0.015 90)" strokeWidth="20" />
      {/* Segments */}
      {segs.map((s, i) => {
        const startAngle = (acc / 100) * Math.PI * 2 - Math.PI / 2 + gap;
        acc += s.val;
        const endAngle = (acc / 100) * Math.PI * 2 - Math.PI / 2 - gap;
        const large = endAngle - startAngle > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 2px 4px oklch(0 0 0 / 0.1))" }}
          />
        );
      })}
      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="30" fontWeight="600" fontFamily="Inter, sans-serif" fill="currentColor">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="oklch(0.55 0.025 85)" letterSpacing="2.5" fontFamily="Inter, sans-serif" fontWeight="600">QUERIES</text>
    </svg>
  );
}
