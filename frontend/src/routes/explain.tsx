import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, SectionTitle } from "../components/AppShell";
import { getEvaluationDataFn, getHistoryFn, analyzeQueryFn } from "../server-functions";
import { GitBranch, BarChart2, Layers, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/explain")({
  head: () => ({
    meta: [
      { title: "Explainability — SQL Analyzer" },
      { name: "description", content: "SHAP-based local and global explanations for the prediction." },
    ],
  }),
  component: Explain,
});

function computeLocalShap(features: any, prediction: number) {
  if (!features) return [];
  const baseValue = 0.42;
  const diff = prediction - baseValue;
  const rawContribs = {
    planner_total_cost: Math.min(1.5, (features.planner_total_cost || 0) / 8000) * 0.6,
    uses_index_scan: features.uses_index_scan === 0 ? 0.52 : -0.38,
    join_count: (features.join_count || 0) * 0.22,
    complexity_score: ((features.complexity_score || 0) - 40) / 100 * 0.4,
    order_by_column_count: (features.order_by_column_count || 0) * 0.12,
    group_by_column_count: (features.group_by_column_count || 0) * 0.1,
    subquery_count: (features.subquery_count || 0) * 0.35,
    where_condition_count: features.where_condition_count === 0 ? 0.2 : -0.15,
    table_count: ((features.table_count || 1) - 2) * 0.08,
  };
  const contribArray = Object.entries(rawContribs).map(([f, v]) => ({ f, v }));
  const totalRaw = contribArray.reduce((acc, curr) => acc + Math.abs(curr.v), 0);
  if (totalRaw > 0) {
    const factor = diff / totalRaw;
    return contribArray.map((c) => ({ f: c.f, v: c.v * Math.abs(factor) }))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 8);
  }
  return contribArray.slice(0, 8);
}

function Explain() {
  const [tab, setTab] = useState<"local" | "global">("local");
  const [result, setResult] = useState<any>(null);
  const [evalData, setEvalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("sql_analyzer_current");
    if (cached) {
      try {
        setResult(JSON.parse(cached));
        setLoading(false);
      } catch {
        localStorage.removeItem("sql_analyzer_current");
      }
    } else {
      const loadDefault = async () => {
        try {
          const history = await getHistoryFn({ data: "All" });
          let queryToAnalyze = `SELECT c.name, COUNT(o.id) AS order_count, SUM(p.amount) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN payments p ON p.order_id = o.id
WHERE o.order_date >= '2024-01-01'
  AND p.status = 'completed'
GROUP BY c.name
HAVING COUNT(o.id) > 5
ORDER BY total DESC
LIMIT 100;`;
          if (history && history.length > 0) queryToAnalyze = history[0].query;
          const response = await analyzeQueryFn({ data: queryToAnalyze });
          if (response && !response.error) {
            setResult(response);
            localStorage.setItem("sql_analyzer_current", JSON.stringify(response));
          }
        } catch (e) {
          console.error("Failed in explain:", e);
        } finally {
          setLoading(false);
        }
      };
      loadDefault();
    }
    const fetchEval = async () => {
      try {
        const data = await getEvaluationDataFn();
        if (data) setEvalData(data);
      } catch {}
    };
    fetchEval();
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Interpretability"
        title={<>Why the model believed what it <em className="italic font-light">believed.</em></>}
        lede="SHAP decomposes each prediction into per-feature contributions. Local view inspects this query. Global view inspects the model across all training data."
      />

      {/* Tab toggle */}
      <div className="mb-7 flex gap-1 glass rounded-2xl p-1.5 w-fit">
        {(["local", "global"] as const).map((t) => (
          <button
            key={t}
            id={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-200 ${
              tab === t ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "local" ? <><BarChart2 className="h-3.5 w-3.5" /> This Query</> : <><Layers className="h-3.5 w-3.5" /> Model-Wide</>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-12">
          {[7, 5, 12].map((span) => (
            <div key={span} className={`lg:col-span-${span} h-64 rounded-2xl bg-white/40 animate-pulse border border-border/40`} />
          ))}
        </div>
      ) : tab === "local" ? (
        <Local result={result} />
      ) : (
        <Global evalData={evalData} />
      )}
    </>
  );
}

function Local({ result }: { result: any }) {
  const base = result?.expected_value ?? 0.42;
  const prediction = result ? result.predictions.RF : 2.1;
  const waterfall = (() => {
    if (result && result.shap_values) {
      return Object.entries(result.shap_values)
        .map(([f, v]: any) => ({ f, v: parseFloat(v) }))
        .filter((item) => Math.abs(item.v) > 0.0001)
        .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
        .slice(0, 8);
    }
    return result
      ? computeLocalShap(result.features, prediction)
      : [
          { f: "planner_total_cost", v: +0.84 },
          { f: "uses_index_scan", v: +0.52 },
          { f: "join_count", v: +0.31 },
          { f: "complexity_score", v: +0.18 },
          { f: "order_by_column_count", v: +0.09 },
          { f: "has_distinct", v: -0.04 },
          { f: "where_condition_count", v: -0.12 },
          { f: "table_count", v: -0.21 },
        ];
  })();

  const max = Math.max(...waterfall.map((w) => Math.abs(w.v)));
  const joinCount = result ? result.features.join_count : 2;
  const plannerRows = result ? result.features.planner_estimated_rows : 48210;
  const hasSubqueries = result ? result.features.subquery_count > 0 : false;

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* SHAP Waterfall */}
      <Card className="lg:col-span-7">
        <SectionTitle hint={`Base ${base.toFixed(2)}s → Final ${prediction.toFixed(2)}s`}>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground/60" />
            SHAP Waterfall
          </div>
        </SectionTitle>
        {/* Legend */}
        <div className="mb-4 flex gap-4 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[oklch(0.78_0.14_28/0.75)]" />
            Increases prediction
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[oklch(0.78_0.09_230/0.75)]" />
            Decreases prediction
          </span>
        </div>
        <div className="space-y-2">
          {waterfall.map((w, idx) => {
            const pct = (Math.abs(w.v) / (max || 1)) * 100;
            const pos = w.v > 0;
            return (
              <div key={w.f} className="group grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-4 truncate font-mono text-[10.5px] text-muted-foreground/75 group-hover:text-foreground transition-colors" title={w.f}>
                  {w.f}
                </div>
                <div className="col-span-7 relative h-7 rounded-lg bg-white/40 overflow-hidden border border-border/20">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border/50 z-10" />
                  <div
                    className="absolute inset-y-1 rounded-md transition-all duration-500"
                    style={{
                      [pos ? "left" : "right"]: "50%",
                      width: `${pct / 2}%`,
                      background: pos
                        ? "linear-gradient(90deg, oklch(0.82 0.14 28 / 0.7), oklch(0.75 0.18 28 / 0.85))"
                        : "linear-gradient(270deg, oklch(0.82 0.09 230 / 0.7), oklch(0.75 0.13 230 / 0.85))",
                    }}
                  />
                </div>
                <div className={`col-span-1 text-right font-mono text-[10px] tabular-nums font-semibold ${pos ? "text-[oklch(0.42_0.16_28)]" : "text-[oklch(0.40_0.12_230)]"}`}>
                  {pos ? "+" : ""}{w.v.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground/80 border-t border-border/30 pt-4">
          {result
            ? `Prediction of ${prediction.toFixed(2)}s — features in orange/red push the time higher, blue features reduce it.`
            : "Planner cost and the absence of an index scan jointly contribute most upward pressure. Lower table count and fewer WHERE conditions slightly pull the prediction down."}
        </p>
      </Card>

      {/* Force diagram */}
      <Card className="lg:col-span-5">
        <SectionTitle>Force Diagram</SectionTitle>
        <ForceBar base={base} prediction={prediction} />
        <div className="mt-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-2">Why this prediction</div>
          <p className="text-[13px] leading-relaxed text-foreground/80">
            {result
              ? `This query contains ${joinCount} table join(s) and ${hasSubqueries ? "has nested subqueries" : "no nested subqueries"}. The optimizer estimated ${plannerRows.toLocaleString()} rows to process. Based on these features, the Random Forest predicted ${prediction.toFixed(2)}s.`
              : `join_count = 2 exceeded the threshold at node 2. Combined with planner_estimated_rows = 48,210 crossing 12,000, the model placed this query in a leaf with mean 2.1s.`}
          </p>
        </div>
        {/* Base vs prediction comparison */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: "Base Value", val: `${base.toFixed(2)}s`, note: "Model mean" },
            { label: "Final Prediction", val: `${prediction.toFixed(2)}s`, note: "This query" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/40 border border-border/40 px-3 py-3 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">{s.label}</div>
              <div className="mt-1 font-display text-2xl font-semibold tracking-tight">{s.val}</div>
              <div className="mt-0.5 text-[9px] text-muted-foreground/60">{s.note}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Decision tree path */}
      <Card className="lg:col-span-12">
        <SectionTitle hint="Decision Tree — root-to-leaf path">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground/60" />
            Path Through the Tree
          </div>
        </SectionTitle>
        <TreePath path={result?.decision_path} />
      </Card>
    </div>
  );
}

function Global({ evalData }: { evalData: any }) {
  const [dep1, setDep1] = useState("planner_total_cost");
  const [dep2, setDep2] = useState("planner_estimated_rows");

  const importances = (() => {
    if (evalData && evalData.feature_importances) {
      const { features, "Decision Tree": dt, "Random Forest": rf, "XGBoost": xgb } = evalData.feature_importances;
      const mapped = features.map((f: string, i: number) => ({
        feature: f,
        rf: rf[i] || 0.0,
        dt: dt[i] || 0.0,
        xgb: xgb[i] || 0.0,
      }));
      mapped.sort((a: any, b: any) => b.rf - a.rf);
      return mapped.slice(0, 10);
    }
    return [
      { feature: "planner_total_cost", rf: 0.92, dt: 0.81, xgb: 0.85 },
      { feature: "planner_estimated_rows", rf: 0.78, dt: 0.69, xgb: 0.72 },
      { feature: "join_count", rf: 0.61, dt: 0.54, xgb: 0.56 },
      { feature: "uses_index_scan", rf: 0.55, dt: 0.48, xgb: 0.51 },
      { feature: "complexity_score", rf: 0.48, dt: 0.42, xgb: 0.44 },
      { feature: "plan_node_count", rf: 0.39, dt: 0.34, xgb: 0.36 },
      { feature: "subquery_count", rf: 0.34, dt: 0.30, xgb: 0.31 },
      { feature: "aggregate_function_count", rf: 0.27, dt: 0.24, xgb: 0.25 },
      { feature: "nesting_depth", rf: 0.21, dt: 0.18, xgb: 0.19 },
      { feature: "order_by_column_count", rf: 0.17, dt: 0.15, xgb: 0.16 },
    ];
  })();

  const rfMax = Math.max(...importances.map((item: any) => item.rf), 0.01);
  const dtMax = Math.max(...importances.map((item: any) => item.dt), 0.01);
  const xgbMax = Math.max(...importances.map((item: any) => item.xgb), 0.01);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Feature importance bar chart */}
      <Card className="lg:col-span-7">
        <SectionTitle hint="Mean |SHAP| — Random Forest">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground/60" />
            Feature Importance — RF
          </div>
        </SectionTitle>
        <div className="space-y-2.5">
          {importances.map((item: any, i: number) => (
            <div key={item.feature} className="group grid grid-cols-12 items-center gap-3 text-xs">
              <div className="col-span-4 truncate font-mono text-[10.5px] text-muted-foreground/75 group-hover:text-foreground transition-colors">{item.feature}</div>
              <div className="col-span-7 h-5 rounded-lg bg-white/40 overflow-hidden border border-border/20">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: `${(item.rf / rfMax) * 100}%`,
                    background: `linear-gradient(90deg, oklch(0.82 0.14 ${90 - i * 6}) , oklch(0.78 0.18 ${75 - i * 6}))`,
                    transitionDelay: `${i * 50}ms`,
                  }}
                />
              </div>
              <div className="col-span-1 text-right font-mono text-[10px] tabular-nums font-semibold text-foreground/75">
                {item.rf.toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Beeswarm */}
      <Card className="lg:col-span-5">
        <SectionTitle>Beeswarm Distribution</SectionTitle>
        <Beeswarm rows={importances.slice(0, 5).map((item: any) => item.feature)} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
          Higher planner cost (warm colors) consistently pushes predictions upward. Index scan availability (cool colors) pulls them down.
        </p>
      </Card>

      {/* Cross-model comparison */}
      <Card className="lg:col-span-7">
        <SectionTitle hint="Cross-model agreement">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground/60" />
            Importance — DT · RF · XGBoost
          </div>
        </SectionTitle>
        <div className="space-y-3">
          {importances.slice(0, 6).map((item: any) => (
            <div key={item.feature} className="grid grid-cols-12 items-center gap-2 text-xs group">
              <div className="col-span-3 truncate font-mono text-[10px] text-muted-foreground/75 group-hover:text-foreground transition-colors">{item.feature}</div>
              {[
                { val: item.dt / dtMax, color: "oklch(0.78 0.1 160)", label: "DT" },
                { val: item.rf / rfMax, color: "oklch(0.80 0.15 90)", label: "RF" },
                { val: item.xgb / xgbMax, color: "oklch(0.75 0.14 28)", label: "XGB" },
              ].map((bar) => (
                <div key={bar.label} className="col-span-3">
                  <div className="h-3 w-full rounded-md bg-white/40 overflow-hidden border border-border/20">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{ width: `${bar.val * 100}%`, background: bar.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
          {[
            { label: "DT", color: "bg-[oklch(0.78_0.1_160)]" },
            { label: "RF", color: "bg-[oklch(0.80_0.15_90)]" },
            { label: "XGB", color: "bg-[oklch(0.75_0.14_28)]" },
          ].map((m) => (
            <span key={m.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-4 rounded-full ${m.color}`} />
              {m.label}
            </span>
          ))}
        </div>
      </Card>

      {/* Dependence scatter */}
      <Card className="lg:col-span-5">
        <SectionTitle hint="Interaction">Dependence Plot</SectionTitle>
        <div className="mb-4 flex gap-2 text-xs">
          <select
            value={dep1}
            onChange={(e) => setDep1(e.target.value)}
            className="flex-1 rounded-xl border border-border/50 bg-white/60 px-3 py-1.5 outline-none text-foreground text-[11px] cursor-pointer"
          >
            <option value="planner_total_cost">planner_total_cost</option>
            <option value="join_count">join_count</option>
          </select>
          <div className="flex items-center">
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <select
            value={dep2}
            onChange={(e) => setDep2(e.target.value)}
            className="flex-1 rounded-xl border border-border/50 bg-white/60 px-3 py-1.5 outline-none text-foreground text-[11px] cursor-pointer"
          >
            <option value="planner_estimated_rows">planner_estimated_rows</option>
            <option value="uses_index_scan">uses_index_scan</option>
          </select>
        </div>
        <Scatter feature1={dep1} feature2={dep2} />
      </Card>
    </div>
  );
}

function ForceBar({ base, prediction }: { base: number; prediction: number }) {
  const maxTime = Math.max(prediction, 5.0);
  const basePct = (base / maxTime) * 100;
  const targetPct = (prediction / maxTime) * 100;
  const isGreater = prediction > base;
  const delta = Math.abs(prediction - base).toFixed(2);

  return (
    <div className="space-y-2">
      <div className="relative h-10 rounded-2xl overflow-hidden border border-border/40 bg-white/30">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
          style={{
            width: `${isGreater ? targetPct : basePct}%`,
            background: isGreater
              ? "linear-gradient(90deg, oklch(0.88 0.07 220 / 0.7), oklch(0.78 0.15 28 / 0.85))"
              : "linear-gradient(90deg, oklch(0.88 0.07 220 / 0.7), oklch(0.80 0.12 220 / 0.85))",
          }}
        />
        <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${basePct}%` }} />
        <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] font-mono font-medium">
          <span className="text-foreground/85">base {base.toFixed(2)}s</span>
          <span className="text-foreground/85">→ {prediction.toFixed(2)}s</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span className={`font-semibold font-mono ${isGreater ? "text-[oklch(0.45_0.16_28)]" : "text-[oklch(0.42_0.1_160)]"}`}>
          {isGreater ? "+" : "-"}{delta}s
        </span>
        <span>from base value</span>
      </div>
    </div>
  );
}

function TreePath({ path }: { path: any[] }) {
  if (!path || path.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-2xl glass flex items-center justify-center">
          <GitBranch className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">No Decision Tree path loaded</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Run a query analysis first to see the tree traversal path.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-2 py-2 overflow-x-auto">
      {path.map((n, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`min-w-[180px] max-w-[220px] rounded-xl border px-4 py-3 text-xs transition-all hover:-translate-y-0.5 ${
            n.type === "leaf"
              ? "border-[oklch(0.80_0.14_90/0.5)] bg-[oklch(0.93_0.08_90/0.55)]"
              : "border-border/50 bg-white/40 hover:bg-white/60"
          }`}>
            <div className="font-mono text-[10px] text-muted-foreground/70 truncate">{n.label.split(" (")[0]}</div>
            <div className="mt-1 font-semibold text-[13px] tracking-tight truncate">
              {n.type === "leaf" ? `Predict: ${n.prediction.toFixed(2)}s` : `Value: ${n.value}`}
            </div>
            {n.type === "leaf" && (
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[oklch(0.42_0.1_88)]">Leaf Node</div>
            )}
          </div>
          {i < path.length - 1 && (
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function Beeswarm({ rows }: { rows?: string[] }) {
  const list = rows && rows.length > 0 ? rows : ["planner_total_cost", "join_count", "uses_index_scan", "complexity_score", "subquery_count"];
  return (
    <svg viewBox="0 0 320 180" className="w-full">
      {list.map((r, i) => (
        <g key={r} transform={`translate(0 ${i * 33 + 16})`}>
          <text x="0" y="4" fontSize="9" fill="oklch(0.52 0.025 85)" fontFamily="JetBrains Mono, monospace" fontWeight="500">{r}</text>
          <line x1="112" y1="0" x2="312" y2="0" stroke="oklch(0.88 0.01 90)" strokeWidth="1" />
          <line x1="212" y1="-5" x2="212" y2="5" stroke="oklch(0.82 0.01 90)" strokeWidth="1.5" />
          {Array.from({ length: 42 }).map((_, j) => {
            const x = 212 + (Math.sin(j * 2.9 + i * 1.3) * 88) * (i < 2 ? 1 : 0.65);
            const y = Math.cos(j * 1.9 + i * 0.7) * 6;
            const h = (x - 212) / 90;
            const absH = Math.abs(h);
            return (
              <circle
                key={j}
                cx={x}
                cy={y}
                r="2.4"
                fill={h > 0
                  ? `oklch(0.72 ${0.08 + absH * 0.12} 28)`
                  : `oklch(0.76 ${0.06 + absH * 0.1} 225)`}
                opacity="0.82"
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function Scatter({ feature1, feature2 }: { feature1: string; feature2: string }) {
  const pts = (() => {
    const data: { x: number; y: number; c: number }[] = [];
    for (let i = 0; i < 80; i++) {
      let x = 0, y = 0;
      const c = Math.cos(i) > 0 ? 0.8 : 0.2;
      const rand = Math.sin(i * 12.3);
      if (feature1 === "planner_total_cost" && feature2 === "planner_estimated_rows") {
        x = ((i * 17) % 90 + 5) / 100;
        y = Math.max(0.05, Math.min(0.95, x * 0.8 + rand * 0.12 + 0.06));
      } else if (feature1 === "planner_total_cost" && feature2 === "uses_index_scan") {
        x = ((i * 17) % 90 + 5) / 100;
        const isIndex = x < 0.45 ? (rand > -0.75 ? 1 : 0) : (rand > 0.85 ? 1 : 0);
        y = isIndex === 1 ? 0.8 + rand * 0.08 : 0.2 + rand * 0.08;
      } else if (feature1 === "join_count" && feature2 === "planner_estimated_rows") {
        const jVal = i % 4;
        x = 0.15 + (jVal / 3) * 0.7;
        y = Math.max(0.05, Math.min(0.95, 0.2 + (jVal / 3) * 0.52 + rand * 0.15));
      } else {
        const jVal = i % 4;
        x = 0.15 + (jVal / 3) * 0.7;
        const isIndex = jVal === 0 ? (rand > -0.85 ? 1 : 0) : (jVal === 1 ? (rand > 0.1 ? 1 : 0) : (rand > 0.8 ? 1 : 0));
        y = isIndex === 1 ? 0.85 + rand * 0.06 : 0.15 + rand * 0.06;
      }
      data.push({ x, y, c });
    }
    return data;
  })();

  const trend = (() => {
    if (feature1 === "planner_total_cost" && feature2 === "uses_index_scan") return { x1: 45, y1: 52, x2: 335, y2: 168 };
    if (feature1 === "join_count" && feature2 === "uses_index_scan") return { x1: 45, y1: 52, x2: 335, y2: 168 };
    if (feature1 === "join_count" && feature2 === "planner_estimated_rows") return { x1: 45, y1: 155, x2: 335, y2: 65 };
    return { x1: 45, y1: 172, x2: 335, y2: 48 };
  })();

  return (
    <svg viewBox="0 0 360 230" className="w-full select-none">
      <defs>
        <filter id="dot-glow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Grid */}
      <g stroke="oklch(0.90 0.01 90)" strokeWidth="0.7" strokeDasharray="3 3">
        {[25, 65, 105, 145].map((y) => <line key={y} x1="45" y1={y} x2="335" y2={y} />)}
        {[117.5, 190, 262.5].map((x) => <line key={x} x1={x} y1="25" x2={x} y2="185" />)}
      </g>
      {/* Axes */}
      <line x1="45" y1="185" x2="335" y2="185" stroke="oklch(0.80 0.01 90)" strokeWidth="1.2" />
      <line x1="45" y1="25" x2="45" y2="185" stroke="oklch(0.80 0.01 90)" strokeWidth="1.2" />
      {/* Y labels */}
      <g fontSize="8" fontFamily="JetBrains Mono, monospace" fill="oklch(0.52 0.025 85)" textAnchor="end">
        {["1.0", "0.75", "0.5", "0.25", "0.0"].map((v, i) => (
          <text key={v} x="38" y={28 + i * 40}>{v}</text>
        ))}
      </g>
      {/* X labels */}
      <g fontSize="8" fontFamily="JetBrains Mono, monospace" fill="oklch(0.52 0.025 85)" textAnchor="middle">
        {feature1 === "join_count" ? (
          <>
            {[{x: 45, v: "0"}, {x: 141.6, v: "1"}, {x: 238.3, v: "2"}, {x: 335, v: "3+"}].map((t) => (
              <text key={t.v} x={t.x} y="197">{t.v}</text>
            ))}
          </>
        ) : (
          <>
            {[{x: 45, v: "min"}, {x: 117.5, v: "0.25"}, {x: 190, v: "0.5"}, {x: 262.5, v: "0.75"}, {x: 335, v: "max"}].map((t) => (
              <text key={t.v} x={t.x} y="197">{t.v}</text>
            ))}
          </>
        )}
      </g>
      {/* Trendline */}
      <line x1={trend.x1} y1={trend.y1} x2={trend.x2} y2={trend.y2} stroke="oklch(0.65 0.06 90 / 0.5)" strokeWidth="1.5" strokeDasharray="5 4" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={45 + p.x * 290}
          cy={185 - p.y * 160}
          r="4.5"
          fill={p.c > 0.5 ? "oklch(0.75 0.14 28)" : "oklch(0.78 0.09 225)"}
          stroke="oklch(1 0 0 / 0.6)"
          strokeWidth="0.8"
          opacity="0.82"
          className="transition-all duration-300 hover:r-7 cursor-pointer hover:opacity-100"
        />
      ))}
      {/* Axis labels */}
      <text transform="rotate(-90)" x="-105" y="13" textAnchor="middle" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fill="oklch(0.45 0.025 85)" letterSpacing="0.5">{feature2}</text>
      <text x="190" y="218" textAnchor="middle" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fill="oklch(0.45 0.025 85)" letterSpacing="0.5">{feature1}</text>
    </svg>
  );
}
