import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, SectionTitle } from "../components/AppShell";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze" },
      { name: "description", content: "Submit a SQL query and inspect its predicted performance." },
    ],
  }),
  component: Analyze,
});

const SAMPLE = `SELECT c.name, COUNT(o.id) AS order_count, SUM(p.amount) AS total
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
  "Tier 1 — Simple SELECT",
  "Tier 2 — Multi-filter",
  "Tier 3 — Two-table JOIN",
  "Tier 4 — Aggregation",
  "Tier 5 — Complex composition",
];

const STRUCTURAL = [
  ["table_count", 3], ["join_count", 2], ["has_cross_join", 0], ["has_outer_join", 0],
  ["where_condition_count", 2], ["has_like", 0], ["has_in_list", 0],
  ["group_by_column_count", 1], ["order_by_column_count", 1], ["has_having", 1],
  ["subquery_count", 0], ["aggregate_function_count", 2], ["has_distinct", 0],
  ["union_count", 0], ["query_char_length", 318], ["nesting_depth", 1],
] as const;

const PLANNER = [
  ["planner_estimated_rows", "48,210"],
  ["planner_total_cost", "12,847.21"],
  ["planner_startup_cost", "0.42"],
  ["uses_index_scan", "false"],
  ["plan_node_count", 11],
  ["complexity_score", 62],
] as const;

function Analyze() {
  const [sql, setSql] = useState(SAMPLE);
  const [model, setModel] = useState<"DT" | "RF" | "XGB">("RF");

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
              className="block h-80 w-full resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between border-t border-border/40 bg-white/30 px-4 py-3">
              <select className="rounded-lg border border-border/60 bg-white/60 px-3 py-1.5 text-xs">
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <button className="rounded-full bg-foreground px-5 py-2 text-xs uppercase tracking-[0.18em] text-background transition hover:opacity-90">
                Analyze
              </button>
            </div>
          </Card>

          <Card>
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Status</div>
            <div className="mt-3 space-y-2 text-sm">
              {[
                ["Parsed via SQLGlot", "120ms"],
                ["EXPLAIN collected", "84ms"],
                ["Feature vector built", "11ms"],
                ["Models ran", "236ms"],
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
              <Gauge value={62} />
              <div className="mt-2 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">Medium</div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Predicted Time</div>
                  <div className="mt-3 font-display text-5xl tabular-nums">2.1<span className="text-2xl text-muted-foreground">s</span></div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">2,108 ms - interval 1.8s — 2.7s</div>
                </div>
                <Pill tone="med">Medium Risk</Pill>
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
                <div><div className="font-mono text-foreground">2.4s</div>DT</div>
                <div><div className="font-mono text-foreground">2.1s</div>RF</div>
                <div><div className="font-mono text-foreground">1.9s</div>XGB</div>
              </div>
              <div className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">High confidence</div>
            </Card>
          </div>

          {/* Features */}
          <Card>
            <SectionTitle hint="22 features - 2 sources">Extracted Vector</SectionTitle>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Structural — SQLGlot</div>
                <div className="space-y-1.5">
                  {STRUCTURAL.map(([k, v]) => (
                    <FeatureRow key={k} k={k} v={v} hot={k === "join_count"} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Planner — EXPLAIN</div>
                <div className="space-y-1.5">
                  {PLANNER.map(([k, v]) => (
                    <FeatureRow key={k} k={k} v={v} hot={k === "uses_index_scan" || k === "planner_total_cost"} />
                  ))}
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Raw EXPLAIN JSON</summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white/40 p-3 font-mono text-[11px] leading-relaxed">{`{"Plan": {"Node Type":"Aggregate","Total Cost":12847.21,"Plan Rows":48210,...}}`}</pre>
                </details>
              </div>
            </div>
          </Card>

          {/* Advisor */}
          <Card>
            <SectionTitle hint="3 triggered">Optimization Advisor</SectionTitle>
            <div className="space-y-3">
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

function FeatureRow({ k, v, hot }: { k: string; v: string | number; hot?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition ${hot ? "bg-[oklch(0.94_0.1_92/0.5)]" : "hover:bg-white/40"}`}>
      <span className="font-mono text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums">{String(v)}</span>
    </div>
  );
}

function Advice({ tone, title, body, rec }: { tone: "low" | "med" | "high" | "crit"; title: string; body: string; rec: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-white/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-lg">{title}</div>
        <Pill tone={tone}>{tone}</Pill>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-foreground/95 p-3 font-mono text-[11px] text-background">{rec}</pre>
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
      <text x="100" y="92" textAnchor="middle" className="font-display" fontSize="36" fill="currentColor">{value}</text>
    </svg>
  );
}
