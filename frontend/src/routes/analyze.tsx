import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, Pill, SectionTitle } from "../components/AppShell";
import { analyzeQueryFn, saveHistoryFn, getHistoryFn } from "../server-functions";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze" },
      { name: "description", content: "Submit a SQL query and inspect its predicted performance." },
    ],
  }),
  component: Analyze,
});

const SAMPLE = `SELECT c.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN payments p ON p.order_id = o.id
WHERE o.order_date >= '2024-01-01'
  AND p.status = 'completed'
GROUP BY c.name
HAVING COUNT(o.id) > 5
ORDER BY total DESC
LIMIT 100;`;

const TIERS = [
  "Select Preset Query...",
  "Tier 1 — Simple SELECT",
  "Tier 2 — Multi-filter",
  "Tier 3 — Two-table JOIN",
  "Tier 4 — Aggregation",
  "Tier 5 — Complex composition",
];

const PRESETS = [
  "",
  "SELECT * FROM customers WHERE id = 42;",
  "SELECT * FROM products WHERE category = 'Electronics' AND price > 1200;",
  "SELECT * FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.amount > 500;",
  "SELECT customer_id, COUNT(*) AS total_orders FROM orders GROUP BY customer_id HAVING COUNT(*) > 10;",
  "SELECT c.name FROM customers c WHERE c.id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 10);"
];

const FEATURE_ORDER = [
  "table_count",
  "join_count",
  "has_cross_join",
  "has_outer_join",
  "where_condition_count",
  "has_like",
  "has_in_list",
  "group_by_column_count",
  "order_by_column_count",
  "has_having",
  "subquery_count",
  "aggregate_function_count",
  "has_distinct",
  "union_count",
  "query_char_length",
  "nesting_depth",
  "planner_estimated_rows",
  "planner_total_cost",
  "planner_startup_cost",
  "uses_index_scan",
  "plan_node_count",
  "complexity_score"
];

function getRisk(
  complexity: number,
  prediction: number
): "low" | "med" | "high" {

  if (complexity >= 65 || prediction >= 3)
    return "high";

  if (complexity >= 35 || prediction >= 1)
    return "med";

  return "low";
}

function Analyze() {
  const [sql, setSql] = useState(SAMPLE);
  const [model, setModel] = useState<"DT" | "RF" | "XGB">("RF");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Load last analyzed query on mount if it exists
  useEffect(() => {
    const cached = localStorage.getItem("sql_analyzer_current");
    const prefill = localStorage.getItem("sql_analyzer_prefill");

    const runInitialAnalysis = async (queryText: string) => {
      setIsLoading(true);
      setError(null);
      setStatus("Analyzing query...");
      try {
        const response = await analyzeQueryFn({ data: queryText });
        if (response.error) {
          setError(response.error);
          setResult(null);
        } else {
          setResult(response);
          localStorage.setItem("sql_analyzer_current", JSON.stringify(response));
          if (response.query_error) {
            setError(response.query_error);
          } else {
            setError(null);
          }
        }
      } catch (e: any) {
        setError(e.message || "An unexpected execution error occurred");
        setResult(null);
      } finally {
        setIsLoading(false);
        setStatus("Ready");
      }
    };

    if (prefill) {
      setSql(prefill);
      localStorage.removeItem("sql_analyzer_prefill");
      runInitialAnalysis(prefill);
    } else if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setResult(parsed);
        setSql(parsed.query || SAMPLE);
      } catch (e) {
        localStorage.removeItem("sql_analyzer_current");
        checkHistoryAndAnalyze();
      }
    } else {
      checkHistoryAndAnalyze();
    }

    async function checkHistoryAndAnalyze() {
      try {
        const history = await getHistoryFn({ data: "All" });
        if (history && history.length > 0) {
          const latest = history[0].query;
          setSql(latest);
          runInitialAnalysis(latest);
        } else {
          setSql(SAMPLE);
          runInitialAnalysis(SAMPLE);
        }
      } catch (err) {
        setSql(SAMPLE);
        runInitialAnalysis(SAMPLE);
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!sql.trim()) return;
    setIsLoading(true);
    setError(null);
    
    // Simulate pipeline progression
    setStatus("Parsing query...");
    await new Promise(r => setTimeout(r, 200));
    
    setStatus("Running EXPLAIN...");
    await new Promise(r => setTimeout(r, 250));
    
    setStatus("Inference on ML models...");
    
    try {
      const response = await analyzeQueryFn({ data: sql });
      if (response.error) {
        setError(response.error);
        setResult(null);
      } else {
        setResult(response);
        localStorage.setItem("sql_analyzer_current", JSON.stringify(response));
        
        if (response.query_error) {
          setError(response.query_error);
        } else {
          setError(null);
        }
        
        // Log to history SQLite database
        const predSeconds = response.predictions[model];
        const complexityScore = response.features.complexity_score;
        await saveHistoryFn({
          data: {
            query: sql,
            prediction: predSeconds,
            risk: getRisk(complexityScore, predSeconds),
            model: model,
            rulesCount: response.rules.length
          }
        });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected execution error occurred");
      setResult(null);
    } finally {
      setIsLoading(false);
      setStatus("Ready");
    }
  };

  const handlePresetSelect = (idx: number) => {
    if (idx > 0 && PRESETS[idx]) {
      setSql(PRESETS[idx]);
    }
  };

  const activePred = result ? result.predictions[model] : 2.1;
  const complexity = result ? result.features.complexity_score : 62;
  const activeRisk = getRisk(complexity, activePred);
  const interval = result ? result.intervals.RF : { lower: 1.8, upper: 2.7 };
  const dbConnected = result ? result.db_connected : false;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={<>Compose a query. <em className="italic">Read its future.</em></>}
        lede="Parse the structure, ask the planner, route through three models, surface honest uncertainty. No execution required."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Editor */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/40 bg-white/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.85_0.12_30)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.88_0.12_92)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.85_0.08_160)]" />
                <span className="ml-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">query.sql</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {sql.length} chars - {sql.split(/\s+/).filter(Boolean).length} tokens
              </span>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              placeholder="Enter your SELECT query here..."
              className="block h-80 w-full resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between border-t border-border/40 bg-white/30 px-4 py-3">
              <select 
                onChange={(e) => handlePresetSelect(e.target.selectedIndex)}
                className="rounded-lg border border-border/60 bg-white/60 px-3 py-1.5 text-xs text-foreground outline-none"
              >
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button 
                onClick={handleAnalyze}
                disabled={isLoading}
                className="rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.18em] text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Running..." : "Analyze"}
              </button>
            </div>
          </Card>

          {/* Status or Errors */}
          {error && (
            <Card className="border-[oklch(0.82_0.12_30/0.4)] bg-[oklch(0.93_0.05_30/0.4)]">
              <div className="text-[10px] uppercase tracking-[0.24em] text-[oklch(0.45_0.13_30)] font-semibold">Inference Error</div>
              <p className="mt-2 font-mono text-xs text-[oklch(0.4_0.12_30)] leading-relaxed">{error}</p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Status / Timing</div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${dbConnected ? "bg-[oklch(0.85_0.08_160)]" : "bg-[oklch(0.85_0.12_30)]"}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {dbConnected ? "PG Connected" : "PG Offline (Fallbacks Active)"}
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {[
                ["Parser Pipeline", result ? `${result.timings.parse_ms}ms` : (isLoading ? status : "—")],
                ["Explain Features", result ? `${result.timings.explain_ms}ms` : "—"],
                ["Axiom Building", result ? `${result.timings.vector_ms}ms` : "—"],
                ["ML Multi-Model Inference", result ? `${result.timings.models_ms}ms` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.13_92)]" />
                    {k}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Complexity</div>
              <Gauge value={complexity} />
              <div className="mt-2 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {complexity < 34 ? "Low" : complexity < 67 ? "Medium" : "High"}
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Predicted Time</div>
                  <div className="mt-3 font-display text-5xl tabular-nums">
                    {activePred >= 1 ? `${activePred.toFixed(2)}` : `${(activePred * 1000).toFixed(0)}`}
                    <span className="text-2xl text-muted-foreground">{activePred >= 1 ? "s" : "ms"}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {(activePred * 1000).toFixed(0)} ms - interval {interval.lower.toFixed(2)}s — {interval.upper.toFixed(2)}s
                  </div>
                </div>
                <Pill tone={activeRisk}>{activeRisk} Risk</Pill>
              </div>
              <div className="mt-5 flex gap-1.5">
                {(["DT", "RF", "XGB"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`flex-1 rounded-lg px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
                      model === m ? "bg-foreground text-background" : "bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                <div>
                  <div className="font-mono text-foreground">
                    {result ? `${result.predictions.DT.toFixed(2)}s` : "2.4s"}
                  </div>
                  DT
                </div>
                <div>
                  <div className="font-mono text-foreground">
                    {result ? `${result.predictions.RF.toFixed(2)}s` : "2.1s"}
                  </div>
                  RF
                </div>
                <div>
                  <div className="font-mono text-foreground">
                    {result ? `${result.predictions.XGB.toFixed(2)}s` : "1.9s"}
                  </div>
                  XGB
                </div>
              </div>
              <div className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {result ? (Math.abs(interval.upper - interval.lower) < 1.0 ? "High confidence" : "Moderate confidence") : "High confidence"}
              </div>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <SectionTitle hint={`${result ? "Real features loaded" : "Sample values"}`}>Extracted Vector</SectionTitle>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Structural — SQLGlot</div>
                <div className="space-y-1.5">
                  {FEATURE_ORDER.slice(0, 16).map((k) => {
                    const val = result ? result.features[k] : 0;
                    return <FeatureRow key={k} k={k} v={val} hot={val > 0 && (k === "join_count" || k === "subquery_count")} />;
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Planner — EXPLAIN</div>
                <div className="space-y-1.5">
                  {FEATURE_ORDER.slice(16).map((k) => {
                    const val = result ? result.features[k] : 0;
                    return <FeatureRow key={k} k={k} v={val} hot={val > 0 && (k === "uses_index_scan" || k === "planner_total_cost")} />;
                  })}
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Raw EXPLAIN Plan</summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white/40 p-3 font-mono text-[11px] leading-relaxed">
                    {result ? JSON.stringify({ Plan: result.features }, null, 2) : `{"Plan": {"Node Type":"Aggregate","Total Cost":12847.21,"Plan Rows":48210}}`}
                  </pre>
                </details>
              </div>
            </div>
          </Card>

          {/* Advisor */}
          <Card>
            <SectionTitle hint={`${result ? `${result.rules.length} triggered` : "3 triggered"}`}>Optimization Advisor</SectionTitle>
            <div className="space-y-3">
              {result ? (
                result.rules.length > 0 ? (
                  result.rules.map((rule: any) => (
                    <Advice
                      key={rule.rule}
                      tone={rule.impact.toLowerCase() === "critical" ? "crit" : rule.impact.toLowerCase() === "high" ? "high" : "med"}
                      title={rule.rule}
                      body={rule.problem}
                      rec={rule.recommendation}
                      before={rule.before}
                      after={rule.after}
                    />
                  ))
                ) : (
                  <div className="py-2 text-center text-xs text-muted-foreground bg-white/30 rounded-xl border border-border/40">
                    No optimization issues detected. Excellent query structure!
                  </div>
                )
              ) : (
                <>
                  <Advice
                    tone="high"
                    title="Missing index on join key"
                    body="Two joins without index scans. Sequential scan cost multiplies per join."
                    rec="CREATE INDEX ON orders(customer_id); CREATE INDEX ON payments(order_id);"
                  />
                  <Advice
                    tone="high"
                    title="High planner cost - no index scans"
                    body="Planner cost is in the top quartile and the chosen plan is entirely sequential."
                    rec="Review WHERE / JOIN / ORDER BY columns as index candidates. Run ANALYZE."
                  />
                  <Advice
                    tone="med"
                    title="ORDER BY without supporting index"
                    body="A full sort runs on the aggregated result set."
                    rec="Index the (customer_id, total) pair, or use a covering index."
                  />
                </>
              )}
            </div>
          </Card>

          <Link
            to="/explain"
            className="inline-flex items-center gap-2 text-sm text-foreground/80 transition hover:text-foreground"
          >
            View full SHAP explanation
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </>
  );
}

function FeatureRow({ k, v, hot }: { k: string; v: string | number | boolean; hot?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition ${hot ? "bg-[oklch(0.94_0.1_92/0.5)]" : "hover:bg-white/40"}`}>
      <span className="font-mono text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums">{typeof v === "boolean" ? String(v) : typeof v === "number" && v % 1 !== 0 ? v.toFixed(2) : String(v)}</span>
    </div>
  );
}

function Advice({ tone, title, body, rec, before, after }: { tone: "low" | "med" | "high" | "crit"; title: string; body: string; rec: string; before?: string; after?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-white/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-lg">{title}</div>
        <Pill tone={tone}>{tone}</Pill>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-3 text-xs font-semibold text-muted-foreground">Recommendation:</div>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-foreground/95 p-3 font-mono text-[11px] text-background">{rec}</pre>
      {before && after && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Original SQL</div>
            <pre className="overflow-x-auto rounded-lg bg-white/50 border border-border/40 p-2 font-mono text-[10px] text-foreground h-24 whitespace-pre">{before}</pre>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-[oklch(0.45_0.13_160)] tracking-wider mb-1">Optimized Rewrite</div>
            <pre className="overflow-x-auto rounded-lg bg-[oklch(0.95_0.05_160/0.4)] border border-[oklch(0.85_0.08_160/0.4)] p-2 font-mono text-[10px] text-[oklch(0.3_0.07_160)] h-24 whitespace-pre">{after}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const angle = (value / 100) * 180 - 90;
  return (
    <svg viewBox="0 0 200 120" className="mx-auto mt-2 h-32 w-full">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="oklch(0.85 0.09 160)" />
          <stop offset="0.5" stopColor="oklch(0.87 0.14 92)" />
          <stop offset="1" stopColor="oklch(0.78 0.13 30)" />
        </linearGradient>
      </defs>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="oklch(0.94 0.01 90)" strokeWidth="14" strokeLinecap="round" />
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#g)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(value / 100) * 251} 999`} />
      <g transform={`rotate(${angle} 100 100)`}>
        <line x1="100" y1="100" x2="100" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="100" cy="100" r="5" fill="currentColor" />
      </g>
      <text x="100" y="92" textAnchor="middle" className="font-display" fontSize="36" fill="currentColor">{value.toFixed(0)}</text>
    </svg>
  );
}
