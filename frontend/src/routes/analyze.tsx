import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, Pill, SectionTitle } from "../components/AppShell";
import { analyzeQueryFn, saveHistoryFn } from "../server-functions";
import {
  Play, ChevronRight, CheckCircle2, XCircle, Zap, AlertCircle,
  Code2, Cpu, Lightbulb, BarChart2,
} from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze — SQL Analyzer" },
      { name: "description", content: "Submit a SQL query and inspect its predicted performance." },
    ],
  }),
  component: Analyze,
});

/* ─────────────────────────── Constants ─────────────────────────── */
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
  "SELECT c.name FROM customers c WHERE c.id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 10);",
];

const FEATURE_ORDER = [
  "table_count", "join_count", "has_cross_join", "has_outer_join", "where_condition_count",
  "has_like", "has_in_list", "group_by_column_count", "order_by_column_count", "has_having",
  "subquery_count", "aggregate_function_count", "has_distinct", "union_count", "query_char_length",
  "nesting_depth", "planner_estimated_rows", "planner_total_cost", "planner_startup_cost",
  "uses_index_scan", "plan_node_count", "complexity_score",
];

/* ─────────────────────────── Risk helpers ─────────────────────────
 * Predictions from backend are already in SECONDS (divided by 1000).
 *   low  < 0.5 s   AND  complexity < 35
 *   med  < 2.0 s   AND  complexity < 65
 *   high otherwise
 * ──────────────────────────────────────────────────────────────────*/
function getRisk(complexity: number, prediction: number): "low" | "med" | "high" {
  if (prediction >= 2.0 || complexity >= 65) return "high";
  if (prediction >= 0.5 || complexity >= 35) return "med";
  return "low";
}

function fmtSec(seconds: number): { val: string; unit: string } {
  return seconds >= 1
    ? { val: seconds.toFixed(2), unit: "s" }
    : { val: (seconds * 1000).toFixed(0), unit: "ms" };
}

/* ─────────────────────────── Component ─────────────────────────── */
function Analyze() {
  const [sql, setSql] = useState(SAMPLE);
  const [model, setModel] = useState<"DT" | "RF" | "XGB">("RF");
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  /* ── Restore cached result or prefill from history ── */
  useEffect(() => {
    const prefill = localStorage.getItem("sql_analyzer_prefill");
    const cached = localStorage.getItem("sql_analyzer_current");

    if (prefill) {
      setSql(prefill);
      localStorage.removeItem("sql_analyzer_prefill");
      runAnalysis(prefill);
    } else if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setResult(parsed);
        setSql(parsed.query || SAMPLE);
      } catch {
        localStorage.removeItem("sql_analyzer_current");
      }
    }
    // If nothing cached, just show the editor with the sample query, no auto-run
  }, []);

  /* ── Core analysis runner ── */
  const runAnalysis = async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setPipelineStep(0);

    try {
      // Small delays so the pipeline steps are visually observable
      await new Promise((r) => setTimeout(r, 180));
      setPipelineStep(1);
      await new Promise((r) => setTimeout(r, 200));
      setPipelineStep(2);

      const response = await analyzeQueryFn({ data: query });

      if (response.error) {
        setError(response.error);
        setResult(null);
      } else {
        setResult(response);
        localStorage.setItem("sql_analyzer_current", JSON.stringify(response));
        setError(response.query_error ?? null);

        // Persist to history only on explicit user-run (not initial page load)
        if (!localStorage.getItem("_initial_load")) {
          const predSeconds = response.predictions[model];
          const complexityScore = response.features.complexity_score;
          await saveHistoryFn({
            data: {
              query,
              prediction: predSeconds,
              risk: getRisk(complexityScore, predSeconds),
              model,
              rulesCount: response.rules.length,
            },
          });
        }
      }
    } catch (e: any) {
      setError(e.message || "Unexpected backend error");
      setResult(null);
    } finally {
      setIsLoading(false);
      setPipelineStep(-1);
    }
  };

  const handleAnalyze = () => runAnalysis(sql);

  const handlePresetSelect = (idx: number) => {
    if (idx > 0 && PRESETS[idx]) setSql(PRESETS[idx]);
  };

  /* ── Derived values — ONLY from real result, never fake ── */
  const activePred = result?.predictions[model] ?? null;
  const complexity = result?.features.complexity_score ?? null;
  const activeRisk = activePred !== null && complexity !== null
    ? getRisk(complexity, activePred)
    : null;
  const interval = result?.intervals.RF ?? null;
  const dbConnected = result?.db_connected ?? null;

  const predDisplay = activePred !== null ? fmtSec(activePred) : null;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={<>Compose a query. <em className="italic font-light">Read its future.</em></>}
        lede="Parse the structure, ask the planner, route through three models, surface honest uncertainty. No execution required."
      />

      <div className="grid gap-5 lg:grid-cols-12">
        {/* ── Left: editor + pipeline ── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Editor card */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/40 bg-white/40 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.12_25)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.85_0.12_90)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.09_155)]" />
                <Code2 className="ml-2 h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">query.sql</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                {sql.length} chars · {sql.split(/\s+/).filter(Boolean).length} tokens
              </span>
            </div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              placeholder="Enter your SELECT query here…"
              className="block h-72 w-full resize-none bg-transparent px-5 py-4 font-mono text-[12.5px] leading-[1.7] text-foreground/90 outline-none placeholder:text-muted-foreground/40 selection:bg-[oklch(0.88_0.1_340/0.3)]"
            />
            <div className="flex items-center justify-between border-t border-border/40 bg-white/30 px-4 py-3 gap-3">
              <select
                onChange={(e) => handlePresetSelect(e.target.selectedIndex)}
                className="flex-1 rounded-xl border border-border/50 bg-white/60 px-3 py-1.5 text-[11px] text-foreground outline-none cursor-pointer hover:bg-white/80 transition-colors"
              >
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button
                id="analyze-btn"
                onClick={handleAnalyze}
                disabled={isLoading}
                className="flex shrink-0 items-center gap-2 rounded-full bg-foreground px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-background transition-all hover:opacity-85 hover:gap-2.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-background/70 animate-pulse" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    Analyze
                  </>
                )}
              </button>
            </div>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-[oklch(0.78_0.14_25/0.4)] bg-[oklch(0.94_0.04_25/0.45)] !p-4">
              <div className="flex items-start gap-2.5">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.48_0.15_25)]" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[oklch(0.45_0.14_25)]">Inference Error</div>
                  <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[oklch(0.4_0.13_25)]">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Pipeline status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground/70" />
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pipeline Status</div>
              </div>
              {dbConnected !== null && (
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${dbConnected ? "bg-[oklch(0.75_0.1_160)] animate-pulse-dot" : "bg-[oklch(0.75_0.12_25)]"}`} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {dbConnected ? "PG Connected" : "PG Offline"}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {([
                ["Parser Pipeline", result?.timings.parse_ms != null ? `${result.timings.parse_ms}ms` : (isLoading && pipelineStep >= 0 ? "Parsing…" : "—")],
                ["Explain Features", result?.timings.explain_ms != null ? `${result.timings.explain_ms}ms` : (isLoading && pipelineStep >= 1 ? "Running EXPLAIN…" : "—")],
                ["Axiom Building",   result?.timings.vector_ms  != null ? `${result.timings.vector_ms}ms`  : "—"],
                ["ML Multi-Model Inference", result?.timings.models_ms != null ? `${result.timings.models_ms}ms` : (isLoading && pipelineStep >= 2 ? "Inferring…" : "—")],
              ] as [string, string][]).map(([k, v], idx) => (
                <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-border/25 last:border-0">
                  <span className="flex items-center gap-2 text-muted-foreground/80">
                    {result ? (
                      <CheckCircle2 className="h-3 w-3 text-[oklch(0.72_0.1_160)] shrink-0" />
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isLoading && pipelineStep === idx ? "bg-[oklch(0.72_0.14_92)] animate-pulse" : "bg-border/60"}`} />
                    )}
                    {k}
                  </span>
                  <span className={`font-mono text-[11px] tabular-nums ${result ? "text-foreground/80" : "text-muted-foreground/60"}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right: results panel ── */}
        <div className="lg:col-span-7 space-y-5">

          {/* ── Empty state: no result yet ── */}
          {!result && !isLoading && (
            <Card className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="h-14 w-14 rounded-2xl glass flex items-center justify-center">
                <BarChart2 className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <div>
                <p className="font-semibold text-foreground/70">No analysis yet</p>
                <p className="mt-1 text-[12px] text-muted-foreground/60 max-w-xs">
                  Write or select a query, then click <strong>Analyze</strong> to see predictions, feature vectors, and optimization advice.
                </p>
              </div>
              <button
                onClick={handleAnalyze}
                className="mt-2 flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-background transition-all hover:opacity-85 active:scale-95"
              >
                <Play className="h-3 w-3 fill-current" />
                Run sample query
              </button>
            </Card>
          )}

          {/* ── Loading skeleton ── */}
          {isLoading && !result && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-52 rounded-2xl bg-white/40 animate-pulse border border-border/30" />
              <div className="h-52 rounded-2xl bg-white/40 animate-pulse border border-border/30" />
              <div className="sm:col-span-2 h-48 rounded-2xl bg-white/40 animate-pulse border border-border/30" />
            </div>
          )}

          {/* ── Real results ── */}
          {result && (
            <>
              {/* Gauge + prediction cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Complexity gauge */}
                <Card>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-1">Complexity Score</div>
                  <Gauge value={complexity!} />
                  <div className="mt-2 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      complexity! < 35 ? "bg-[oklch(0.92_0.05_160/0.5)] text-[oklch(0.32_0.1_160)]"
                      : complexity! < 65 ? "bg-[oklch(0.92_0.09_90/0.5)] text-[oklch(0.34_0.1_82)]"
                      : "bg-[oklch(0.92_0.06_25/0.5)] text-[oklch(0.38_0.15_25)]"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                      {complexity! < 35 ? "Low complexity" : complexity! < 65 ? "Medium complexity" : "High complexity"}
                    </span>
                  </div>
                </Card>

                {/* Prediction */}
                <Card>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Predicted Time</div>
                    <Pill tone={activeRisk!} size="sm">{activeRisk} Risk</Pill>
                  </div>
                  <div className="font-display text-4xl font-semibold tabular-nums tracking-tight leading-none">
                    {predDisplay!.val}
                    <span className="text-xl font-normal text-muted-foreground ml-0.5">{predDisplay!.unit}</span>
                  </div>
                  {interval && (
                    <div className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">
                      interval: {fmtSec(interval.lower).val}{fmtSec(interval.lower).unit} — {fmtSec(interval.upper).val}{fmtSec(interval.upper).unit}
                    </div>
                  )}

                  {/* Model toggle */}
                  <div className="mt-4 flex gap-1">
                    {(["DT", "RF", "XGB"] as const).map((m) => (
                      <button
                        key={m}
                        id={`model-${m.toLowerCase()}`}
                        onClick={() => setModel(m)}
                        className={`flex-1 rounded-xl px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                          model === m ? "bg-foreground text-background shadow-sm" : "bg-white/40 text-muted-foreground hover:bg-white/65 hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* All three predictions from backend */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                    {(["DT", "RF", "XGB"] as const).map((m) => {
                      const pred = result.predictions[m];
                      const fmt = fmtSec(pred);
                      return (
                        <div key={m} className={`rounded-lg py-2 px-1 transition-colors ${model === m ? "bg-white/50" : "bg-white/25"}`}>
                          <div className="font-mono text-[12px] font-medium tabular-nums text-foreground/85">
                            {fmt.val}{fmt.unit}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">{m}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Confidence based on real interval width */}
                  {interval && (
                    <div className="mt-2.5 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/65">
                      {(interval.upper - interval.lower) < 0.5 ? "↑ High confidence" : (interval.upper - interval.lower) < 1.5 ? "~ Moderate confidence" : "↓ Wide interval"}
                    </div>
                  )}
                </Card>
              </div>

              {/* Feature vector */}
              <Card>
                <SectionTitle hint={result.db_connected ? "Real planner features" : "Heuristic planner features"}>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground/60" />
                    Extracted Feature Vector
                  </div>
                </SectionTitle>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70 flex items-center gap-1.5">
                      <Code2 className="h-3 w-3" /> Structural — SQLGlot
                    </div>
                    <div className="space-y-0.5">
                      {FEATURE_ORDER.slice(0, 16).map((k) => {
                        const val = result.features[k];
                        const isHot = (k === "join_count" || k === "subquery_count") && Number(val) > 0;
                        return <FeatureRow key={k} k={k} v={val} hot={isHot} />;
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/70 flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> Planner — {result.db_connected ? "EXPLAIN" : "Heuristic"}
                    </div>
                    <div className="space-y-0.5">
                      {FEATURE_ORDER.slice(16).map((k) => {
                        const val = result.features[k];
                        const isHot = (k === "planner_total_cost" && Number(val) > 5000) || (k === "uses_index_scan" && Number(val) === 0);
                        return <FeatureRow key={k} k={k} v={val} hot={isHot} />;
                      })}
                    </div>
                    <details className="mt-4 group">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        Raw feature JSON
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-white/45 border border-border/40 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
                        {JSON.stringify(result.features, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </Card>

              {/* Optimization Advisor — only real rules from backend */}
              <Card>
                <SectionTitle hint={`${result.rules.length} rule${result.rules.length !== 1 ? "s" : ""} triggered`}>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-muted-foreground/60" />
                    Optimization Advisor
                  </div>
                </SectionTitle>
                <div className="space-y-3">
                  {result.rules.length > 0 ? (
                    result.rules.map((rule: any) => (
                      <Advice
                        key={rule.rule}
                        tone={
                          rule.impact?.toLowerCase() === "critical" ? "crit"
                          : rule.impact?.toLowerCase() === "high" ? "high"
                          : rule.impact?.toLowerCase() === "low" ? "low"
                          : "med"
                        }
                        title={rule.rule}
                        body={rule.problem}
                        rec={rule.recommendation}
                        before={rule.before}
                        after={rule.after}
                      />
                    ))
                  ) : (
                    <div className="flex items-center gap-3 py-4 px-4 text-sm text-muted-foreground bg-[oklch(0.93_0.05_160/0.3)] rounded-xl border border-[oklch(0.84_0.07_160/0.4)]">
                      <CheckCircle2 className="h-5 w-5 text-[oklch(0.65_0.1_160)] shrink-0" />
                      No optimization issues detected — excellent query structure!
                    </div>
                  )}
                </div>
              </Card>

              <Link
                to="/explain"
                className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-[12px] font-medium text-muted-foreground transition-all hover:text-foreground hover:shadow-sm group"
              >
                View full SHAP explanation
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Sub-components ─────────────────────── */

function FeatureRow({ k, v, hot }: { k: string; v: string | number | boolean; hot?: boolean }) {
  const display =
    typeof v === "boolean" ? String(v)
    : typeof v === "number" && !Number.isInteger(v) ? v.toFixed(4)
    : String(v ?? "—");
  return (
    <div className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
      hot ? "bg-[oklch(0.92_0.1_90/0.45)] border border-[oklch(0.84_0.12_90/0.3)]" : "hover:bg-white/45"
    }`}>
      <span className="font-mono text-[10.5px] text-muted-foreground/75 truncate mr-2">{k}</span>
      <span className={`font-mono text-[10.5px] tabular-nums shrink-0 ${hot ? "text-[oklch(0.35_0.1_82)] font-semibold" : "text-foreground/80"}`}>{display}</span>
    </div>
  );
}

function Advice({ tone, title, body, rec, before, after }: {
  tone: "low" | "med" | "high" | "crit";
  title: string;
  body: string;
  rec: string;
  before?: string;
  after?: string;
}) {
  const [open, setOpen] = useState(false);
  const styles = {
    low:  { border: "border-[oklch(0.84_0.07_160/0.4)]", bg: "bg-[oklch(0.97_0.025_160/0.35)]", iconColor: "text-[oklch(0.62_0.1_160)]"  },
    med:  { border: "border-[oklch(0.82_0.12_90/0.4)]",  bg: "bg-[oklch(0.97_0.04_90/0.35)]",  iconColor: "text-[oklch(0.6_0.12_85)]"   },
    high: { border: "border-[oklch(0.82_0.1_28/0.45)]",  bg: "bg-[oklch(0.97_0.025_28/0.35)]", iconColor: "text-[oklch(0.58_0.14_28)]"  },
    crit: { border: "border-[oklch(0.76_0.14_22/0.55)]", bg: "bg-[oklch(0.96_0.04_22/0.4)]",   iconColor: "text-[oklch(0.52_0.18_22)]"  },
  }[tone];

  const Icon = tone === "low" ? CheckCircle2 : tone === "crit" ? XCircle : AlertCircle;

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/20 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          <span className={`mt-0.5 shrink-0 ${styles.iconColor}`}><Icon className="h-4 w-4" /></span>
          <div>
            <div className="font-semibold text-[13px] tracking-tight">{title}</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Pill tone={tone} size="sm">{tone}</Pill>
          <ChevronRight className={`h-4 w-4 text-muted-foreground/50 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Recommendation</div>
            <pre className="overflow-x-auto rounded-xl bg-foreground/92 p-3 font-mono text-[11px] leading-relaxed text-background/90 whitespace-pre-wrap">{rec}</pre>
          </div>
          {before && after && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Original SQL</div>
                <pre className="overflow-x-auto rounded-xl bg-white/55 border border-border/40 p-2.5 font-mono text-[10px] text-foreground/80 h-20">{before}</pre>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.42_0.12_155)] mb-1.5">Optimized Rewrite</div>
                <pre className="overflow-x-auto rounded-xl bg-[oklch(0.94_0.05_160/0.45)] border border-[oklch(0.82_0.09_160/0.4)] p-2.5 font-mono text-[10px] text-[oklch(0.28_0.09_155)] h-20">{after}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = (clamped / 100) * 180 - 90;
  const needleColor =
    clamped < 35 ? "oklch(0.75 0.1 160)"
    : clamped < 65 ? "oklch(0.75 0.15 90)"
    : "oklch(0.70 0.14 28)";

  return (
    <svg viewBox="0 0 200 118" className="mx-auto mt-1 h-28 w-full">
      <defs>
        <linearGradient id="gauge-grad" x1="0" x2="1">
          <stop offset="0%"   stopColor="oklch(0.78 0.1 160)" />
          <stop offset="50%"  stopColor="oklch(0.78 0.15 90)" />
          <stop offset="100%" stopColor="oklch(0.72 0.14 28)" />
        </linearGradient>
      </defs>
      {/* Track */}
      <path d="M 18 100 A 82 82 0 0 1 182 100" fill="none" stroke="oklch(0.92 0.018 90)" strokeWidth="14" strokeLinecap="round" />
      {/* Filled arc */}
      <path
        d="M 18 100 A 82 82 0 0 1 182 100"
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * 257} 999`}
      />
      {/* Tick marks */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const a = (tick / 100) * Math.PI - Math.PI;
        return (
          <line
            key={tick}
            x1={100 + 90 * Math.cos(a)} y1={100 + 90 * Math.sin(a)}
            x2={100 + 96 * Math.cos(a)} y2={100 + 96 * Math.sin(a)}
            stroke="oklch(0.80 0.01 90)" strokeWidth="1.5"
          />
        );
      })}
      {/* Needle */}
      <g transform={`rotate(${angle} 100 100)`} style={{ transition: "transform 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <line x1="100" y1="100" x2="100" y2="28" stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill={needleColor} />
        <circle cx="100" cy="100" r="3" fill="white" />
      </g>
      {/* Value */}
      <text x="100" y="90" textAnchor="middle" fontSize="32" fontWeight="700" fontFamily="Inter, sans-serif" fill="currentColor">{clamped.toFixed(0)}</text>
      <text x="100" y="104" textAnchor="middle" fontSize="8" fontFamily="Inter, sans-serif" fill="oklch(0.55 0.02 85)" fontWeight="600" letterSpacing="2">/100</text>
    </svg>
  );
}
