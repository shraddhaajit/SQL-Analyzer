import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, SectionTitle } from "../components/AppShell";

export const Route = createFileRoute("/explain")({
  head: () => ({
    meta: [
      { title: "Explainability" },
      { name: "description", content: "SHAP-based local and global explanations for the prediction." },
    ],
  }),
  component: Explain,
});

const WATERFALL = [
  { f: "planner_total_cost", v: +0.84 },
  { f: "uses_index_scan", v: +0.52 },
  { f: "join_count", v: +0.31 },
  { f: "complexity_score", v: +0.18 },
  { f: "order_by_column_count", v: +0.09 },
  { f: "has_distinct", v: -0.04 },
  { f: "where_condition_count", v: -0.12 },
  { f: "table_count", v: -0.21 },
];

const GLOBAL = [
  ["planner_total_cost", 0.92],
  ["planner_estimated_rows", 0.78],
  ["join_count", 0.61],
  ["uses_index_scan", 0.55],
  ["complexity_score", 0.48],
  ["plan_node_count", 0.39],
  ["subquery_count", 0.34],
  ["aggregate_function_count", 0.27],
  ["nesting_depth", 0.21],
  ["order_by_column_count", 0.17],
] as const;

function Explain() {
  const [tab, setTab] = useState<"local" | "global">("local");
  return (
    <>
      <PageHeader
        eyebrow="Interpretability"
        title={<>Why the model believed what it <em className="italic">believed.</em></>}
        lede="SHAP decomposes each prediction into per-feature contributions. Local view inspects this query. Global view inspects the model."
      />

      <div className="mb-8 inline-flex rounded-full glass p-1">
        {(["local", "global"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.18em] transition ${tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "local" ? "This query" : "Model-wide"}
          </button>
        ))}
      </div>

      {tab === "local" ? <Local /> : <Global />}
    </>
  );
}

function Local() {
  const base = 0.62;
  const final = base + WATERFALL.reduce((a, b) => a + b.v, 0);
  const max = Math.max(...WATERFALL.map((w) => Math.abs(w.v)));
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <SectionTitle hint={`Base ${base.toFixed(2)} → Final ${final.toFixed(2)}`}>SHAP Waterfall</SectionTitle>
        <div className="space-y-1.5">
          {WATERFALL.map((w) => {
            const pct = (Math.abs(w.v) / max) * 100;
            const pos = w.v > 0;
            return (
              <div key={w.f} className="grid grid-cols-12 items-center gap-2 text-xs">
                <div className="col-span-4 truncate font-mono text-muted-foreground">{w.f}</div>
                <div className="col-span-7 relative h-6 rounded-md bg-white/40">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                  <div
                    className="absolute inset-y-1 rounded-sm transition-all"
                    style={{
                      [pos ? "left" : "right"]: "50%",
                      width: `${pct / 2}%`,
                      background: pos ? "oklch(0.82 0.14 30 / 0.7)" : "oklch(0.82 0.08 230 / 0.7)",
                    }}
                  />
                </div>
                <div className={`col-span-1 text-right font-mono tabular-nums ${pos ? "text-[oklch(0.45_0.15_30)]" : "text-[oklch(0.45_0.1_230)]"}`}>
                  {pos ? "+" : ""}{w.v.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Planner cost and the absence of an index scan jointly contribute most
          of the upward pressure on the predicted time. Lower table count and
          fewer where conditions slightly pull the prediction down.
        </p>
      </Card>

      <Card className="lg:col-span-5">
        <SectionTitle>Force</SectionTitle>
        <ForceBar />
        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Why this prediction</div>
          <p className="mt-2 text-sm leading-relaxed">
            join_count = 2 exceeded the threshold of 1.5 at node 2, indicating
            elevated join cost. Combined with planner_estimated_rows = 48,210
            crossing 12,000 at node 6, the model placed this query in a leaf
            with mean execution time <span className="font-mono">2.1s</span>.
          </p>
        </div>
      </Card>

      <Card className="lg:col-span-12">
        <SectionTitle hint="Decision Tree only - max_depth 5">Path through the tree</SectionTitle>
        <TreePath />
      </Card>
    </div>
  );
}

function Global() {
  const max = Math.max(...GLOBAL.map(([, v]) => v));
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <SectionTitle hint="Mean |SHAP|">Feature Importance — RF</SectionTitle>
        <div className="space-y-2">
          {GLOBAL.map(([k, v]) => (
            <div key={k} className="grid grid-cols-12 items-center gap-3 text-xs">
              <div className="col-span-4 truncate font-mono text-muted-foreground">{k}</div>
              <div className="col-span-7 h-5 rounded-md bg-white/40">
                <div
                  className="h-full rounded-md"
                  style={{ width: `${(v / max) * 100}%`, background: "linear-gradient(90deg, oklch(0.88 0.12 92), oklch(0.82 0.14 60))" }}
                />
              </div>
              <div className="col-span-1 text-right font-mono tabular-nums">{v.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-5">
        <SectionTitle>Beeswarm</SectionTitle>
        <Beeswarm />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Higher planner cost (warm) consistently pushes predictions upward.
          Index scan availability (cool) pulls them down.
        </p>
      </Card>

      <Card className="lg:col-span-7">
        <SectionTitle hint="Cross-model agreement">Importance - DT - RF - XGBoost</SectionTitle>
        <div className="space-y-2.5">
          {GLOBAL.slice(0, 6).map(([k, v]) => (
            <div key={k} className="grid grid-cols-12 items-center gap-2 text-xs">
              <div className="col-span-3 truncate font-mono text-muted-foreground">{k}</div>
              {[0.88, 1, 0.92].map((mul, i) => (
                <div key={i} className="col-span-3 h-3 rounded-sm bg-white/40">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${v * mul * 100}%`,
                      background: ["oklch(0.85 0.08 160)", "oklch(0.85 0.13 92)", "oklch(0.82 0.12 30)"][i],
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.08_160)]" /> DT</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.85_0.13_92)]" /> RF</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.82_0.12_30)]" /> XGB</span>
        </div>
      </Card>

      <Card className="lg:col-span-5">
        <SectionTitle hint="Interaction">Dependence</SectionTitle>
        <div className="mb-3 flex gap-2 text-xs">
          <select className="flex-1 rounded-lg border border-border/60 bg-white/60 px-3 py-1.5">
            <option>planner_total_cost</option>
            <option>join_count</option>
          </select>
          <select className="flex-1 rounded-lg border border-border/60 bg-white/60 px-3 py-1.5">
            <option>planner_estimated_rows</option>
            <option>uses_index_scan</option>
          </select>
        </div>
        <Scatter />
      </Card>
    </div>
  );
}

function ForceBar() {
  return (
    <div className="relative h-12 rounded-full overflow-hidden border border-border/50">
      <div className="absolute inset-y-0 left-0 w-[64%]" style={{ background: "linear-gradient(90deg, oklch(0.92 0.08 230 / 0.7), oklch(0.85 0.13 30 / 0.85))" }} />
      <div className="absolute inset-y-0 left-[64%] w-[36%]" style={{ background: "oklch(0.85 0.13 30 / 0.85)" }} />
      <div className="absolute inset-y-0 left-[64%] w-px bg-foreground" />
      <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] font-mono">
        <span className="text-background/90">base 0.62</span>
        <span className="text-background/90">→ 2.10s</span>
      </div>
    </div>
  );
}

function TreePath() {
  const nodes = [
    { l: "planner_total_cost ≤ 8.5k", v: "12,847", branch: "right" },
    { l: "join_count ≤ 1.5", v: "2", branch: "right" },
    { l: "uses_index_scan = true", v: "false", branch: "left" },
    { l: "planner_estimated_rows ≤ 12k", v: "48,210", branch: "right" },
    { l: "leaf - μ 2.1s - n=84", v: "predicted 2.1s", branch: "leaf" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 overflow-x-auto">
      {nodes.map((n, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`min-w-[180px] rounded-xl border px-4 py-3 text-xs transition ${n.branch === "leaf" ? "border-[oklch(0.82_0.12_30/0.6)] bg-[oklch(0.93_0.08_92/0.6)]" : "border-border/60 bg-white/40"}`}>
            <div className="font-mono text-[11px] text-muted-foreground">{n.l}</div>
            <div className="mt-1 font-display text-lg">{n.v}</div>
          </div>
          {i < nodes.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  );
}

function Beeswarm() {
  const rows = ["planner_total_cost", "join_count", "uses_index_scan", "complexity_score", "subquery_count"];
  return (
    <svg viewBox="0 0 320 180" className="w-full">
      {rows.map((r, i) => (
        <g key={r} transform={`translate(0 ${i * 32 + 16})`}>
          <text x="0" y="4" fontSize="9" fill="oklch(0.5 0.02 85)" fontFamily="monospace">{r}</text>
          <line x1="110" y1="0" x2="310" y2="0" stroke="oklch(0.9 0.01 90)" />
          <line x1="210" y1="-6" x2="210" y2="6" stroke="oklch(0.85 0.01 90)" />
          {Array.from({ length: 40 }).map((_, j) => {
            const x = 210 + (Math.random() - 0.5) * 180 * (i < 2 ? 1 : 0.6);
            const y = (Math.random() - 0.5) * 10;
            const h = (x - 210) / 90;
            return <circle key={j} cx={x} cy={y} r="2.2" fill={h > 0 ? `oklch(0.78 ${0.1 + Math.abs(h) * 0.05} 30)` : `oklch(0.82 ${0.05 + Math.abs(h) * 0.05} 230)`} opacity="0.85" />;
          })}
        </g>
      ))}
    </svg>
  );
}

function Scatter() {
  const pts = Array.from({ length: 80 }).map(() => {
    const x = Math.random();
    const noise = (Math.random() - 0.5) * 0.3;
    const y = Math.min(1, x * 0.8 + noise + 0.1);
    const c = Math.random();
    return { x, y, c };
  });
  return (
    <svg viewBox="0 0 320 200" className="w-full">
      <line x1="30" y1="180" x2="310" y2="180" stroke="oklch(0.85 0.01 90)" />
      <line x1="30" y1="20" x2="30" y2="180" stroke="oklch(0.85 0.01 90)" />
      {pts.map((p, i) => (
        <circle key={i} cx={30 + p.x * 280} cy={180 - p.y * 160} r="3"
          fill={p.c > 0.5 ? `oklch(0.78 0.13 30)` : `oklch(0.82 0.08 230)`} opacity="0.75" />
      ))}
    </svg>
  );
}
