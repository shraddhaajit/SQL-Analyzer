import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, SectionTitle } from "../components/AppShell";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Model Performance" },
      { name: "description", content: "Evaluation, ablation, and dataset transparency." },
    ],
  }),
  component: Performance,
});

const METRICS = [
  { m: "Decision Tree", mae: 0.34, rmse: 0.62, r2: 0.78, med: 0.18 },
  { m: "Random Forest", mae: 0.21, rmse: 0.41, r2: 0.91, med: 0.09 },
  { m: "XGBoost", mae: 0.18, rmse: 0.36, r2: 0.93, med: 0.07 },
];

const ABLATION = [
  { m: "Decision Tree", synMae: 0.51, fullMae: 0.34, synR2: 0.62, fullR2: 0.78 },
  { m: "Random Forest", synMae: 0.32, fullMae: 0.21, synR2: 0.78, fullR2: 0.91 },
  { m: "XGBoost", synMae: 0.29, fullMae: 0.18, synR2: 0.81, fullR2: 0.93 },
];

function Performance() {
  const [tab, setTab] = useState<"curves" | "dataset">("curves");
  return (
    <>
      <PageHeader
        eyebrow="Diagnostics"
        title={<>How well it works. <em className="italic">Where it fails.</em></>}
        lede="Aggregate metrics, residuals, error by complexity, and an ablation that quantifies what the planner features earn."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <SectionTitle hint="20% held-out test set">Metrics</SectionTitle>
          <Table headers={["Model", "MAE (s)", "RMSE (s)", "R²", "Median |err|"]}
            rows={METRICS.map((m) => [m.m, m.mae, m.rmse, m.r2, m.med])} />
        </Card>

        <Card className="lg:col-span-5">
          <SectionTitle hint="What planner features earn">Ablation</SectionTitle>
          <div className="space-y-3">
            {ABLATION.map((a) => (
              <div key={a.m}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-display text-base">{a.m}</span>
                  <span className="font-mono text-muted-foreground">Δ MAE −{(a.synMae - a.fullMae).toFixed(2)}s</span>
                </div>
                <div className="relative h-3 rounded-full bg-white/40">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${a.synMae * 100}%`, background: "oklch(0.86 0.08 230 / 0.65)" }} />
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${a.fullMae * 100}%`, background: "oklch(0.82 0.14 60)" }} />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>syntactic {a.synMae}s</span>
                  <span>full {a.fullMae}s</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <SectionTitle hint="45° = perfect">Residuals — Predicted vs Actual</SectionTitle>
          <Residuals />
        </Card>

        <Card className="lg:col-span-5">
          <SectionTitle>Error Distribution</SectionTitle>
          <Histogram />
        </Card>
      </div>

      <div className="mt-6 mb-6 inline-flex rounded-full glass p-1">
        {(["curves", "dataset"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.18em] transition ${tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "curves" ? "Curves & Tiers" : "Dataset Explorer"}
          </button>
        ))}
      </div>

      {tab === "curves" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle hint="10% → 100%">Learning Curve</SectionTitle>
            <Lines />
          </Card>
          <Card>
            <SectionTitle hint="Tier 1 → 5">MAE by Complexity</SectionTitle>
            <TierBars />
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <SectionTitle>Summary</SectionTitle>
            <div className="space-y-3 text-sm">
              <Row k="Total rows" v="9,012" />
              <Row k="Features" v="22 + 1 label" />
              <Row k="Median exec" v="0.41s" />
              <Row k="Max exec (cap)" v="9.8s" />
            </div>
            <SectionTitle hint="Per tier">Tier Distribution</SectionTitle>
            <div className="space-y-1">
              {["1 - Simple 1,500", "2 - Filtered 1,500", "3 - Join 2,000", "4 - Aggregation 2,000", "5 - Complex 2,000"].map((t, i) => (
                <div key={t} className="flex items-center gap-2 text-xs">
                  <span className="w-32 font-mono text-muted-foreground">{t}</span>
                  <div className="h-2 flex-1 rounded-full bg-white/40">
                    <div className="h-full rounded-full" style={{ width: `${[16, 16, 22, 22, 22][i]}%`, background: "oklch(0.85 0.13 92)" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-8">
            <SectionTitle>Feature Correlation</SectionTitle>
            <Heatmap />
          </Card>
        </div>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 pb-2">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{k}</span>
      <span className="font-display text-xl">{v}</span>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {headers.map((h) => <th key={h} className="py-2 font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/30 transition hover:bg-white/30">
              {r.map((c, j) => (
                <td key={j} className={`py-3 ${j === 0 ? "font-display text-base" : "font-mono tabular-nums"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Residuals() {
  const pts = Array.from({ length: 120 }).map(() => {
    const x = Math.random() * 5;
    const y = x + (Math.random() - 0.5) * 0.7;
    return { x, y };
  });
  return (
    <svg viewBox="0 0 360 260" className="w-full">
      <line x1="30" y1="240" x2="350" y2="240" stroke="oklch(0.85 0.01 90)" />
      <line x1="30" y1="20" x2="30" y2="240" stroke="oklch(0.85 0.01 90)" />
      <line x1="30" y1="240" x2="350" y2="20" stroke="oklch(0.82 0.12 60 / 0.6)" strokeDasharray="4 4" />
      {pts.map((p, i) => (
        <circle key={i} cx={30 + (p.x / 5) * 320} cy={240 - (Math.max(0, Math.min(5, p.y)) / 5) * 220} r="3" fill="oklch(0.82 0.13 60 / 0.55)" />
      ))}
      <text x="350" y="255" textAnchor="end" fontSize="9" fill="oklch(0.5 0.02 85)">actual (s)</text>
      <text x="40" y="20" fontSize="9" fill="oklch(0.5 0.02 85)">predicted (s)</text>
    </svg>
  );
}

function Histogram() {
  const bins = [4, 9, 16, 28, 38, 30, 18, 9, 4, 2];
  const max = Math.max(...bins);
  return (
    <svg viewBox="0 0 320 200" className="w-full">
      {bins.map((v, i) => (
        <rect key={i} x={20 + i * 28} y={180 - (v / max) * 150} width="22" height={(v / max) * 150} rx="2"
          fill="oklch(0.86 0.13 92 / 0.8)" />
      ))}
      <line x1="160" y1="20" x2="160" y2="190" stroke="oklch(0.5 0.02 85)" strokeDasharray="3 3" />
      <text x="160" y="14" textAnchor="middle" fontSize="9" fill="oklch(0.5 0.02 85)">0 error</text>
    </svg>
  );
}

function Lines() {
  const series = [
    { c: "oklch(0.7 0.08 160)", pts: [0.55, 0.42, 0.38, 0.36, 0.35, 0.34, 0.34, 0.34, 0.34, 0.34] },
    { c: "oklch(0.78 0.13 92)", pts: [0.38, 0.30, 0.26, 0.24, 0.23, 0.22, 0.21, 0.21, 0.21, 0.21] },
    { c: "oklch(0.72 0.13 30)", pts: [0.34, 0.26, 0.22, 0.21, 0.20, 0.19, 0.19, 0.18, 0.18, 0.18] },
  ];
  return (
    <svg viewBox="0 0 360 220" className="w-full">
      <line x1="30" y1="200" x2="350" y2="200" stroke="oklch(0.85 0.01 90)" />
      <line x1="30" y1="20" x2="30" y2="200" stroke="oklch(0.85 0.01 90)" />
      {series.map((s, si) => {
        const d = s.pts.map((v, i) => `${i === 0 ? "M" : "L"} ${30 + (i / (s.pts.length - 1)) * 320} ${200 - (v / 0.6) * 170}`).join(" ");
        return <path key={si} d={d} fill="none" stroke={s.c} strokeWidth="2" />;
      })}
      <text x="40" y="16" fontSize="9" fill="oklch(0.5 0.02 85)">val MAE (s)</text>
    </svg>
  );
}

function TierBars() {
  const tiers = [
    { t: "Tier 1", dt: 0.08, rf: 0.06, xgb: 0.05 },
    { t: "Tier 2", dt: 0.12, rf: 0.09, xgb: 0.08 },
    { t: "Tier 3", dt: 0.28, rf: 0.19, xgb: 0.17 },
    { t: "Tier 4", dt: 0.41, rf: 0.26, xgb: 0.22 },
    { t: "Tier 5", dt: 0.62, rf: 0.38, xgb: 0.32 },
  ];
  return (
    <div className="space-y-3">
      {tiers.map((t) => (
        <div key={t.t}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-mono text-muted-foreground">{t.t}</span>
            <span className="font-mono">{t.dt} - {t.rf} - {t.xgb}</span>
          </div>
          <div className="flex gap-1">
            {[t.dt, t.rf, t.xgb].map((v, i) => (
              <div key={i} className="h-3 flex-1 rounded-sm bg-white/40">
                <div className="h-full rounded-sm" style={{ width: `${(v / 0.7) * 100}%`, background: ["oklch(0.85 0.08 160)", "oklch(0.85 0.13 92)", "oklch(0.82 0.12 30)"][i] }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Heatmap() {
  const labels = ["join", "where", "group", "order", "subq", "plan_rows", "plan_cost", "idx", "nodes", "cplx"];
  const n = labels.length;
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${n}, 1fr)` }}>
        <div />
        {labels.map((l) => <div key={l} className="font-mono text-[9px] text-muted-foreground -rotate-45 origin-left h-10">{l}</div>)}
        {labels.map((l, i) => (
          <>
            <div key={`r${i}`} className="font-mono text-[10px] text-muted-foreground pr-2">{l}</div>
            {labels.map((_, j) => {
              const v = i === j ? 1 : Math.max(-1, Math.min(1, Math.sin((i + 1) * (j + 1)) * 0.8 + (Math.random() - 0.5) * 0.2));
              const abs = Math.abs(v);
              return (
                <div key={`${i}-${j}`} className="aspect-square rounded-sm" style={{
                  background: v > 0 ? `oklch(${0.95 - abs * 0.2} ${abs * 0.15} 60)` : `oklch(${0.95 - abs * 0.2} ${abs * 0.1} 230)`,
                }} />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
