import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, PageHeader, Pill, SectionTitle, StatTile } from "../components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview" },
      { name: "description", content: "Query performance overview and recent activity." },
    ],
  }),
  component: Overview,
});

const recent = [
  { t: "14:02", q: "SELECT c.name, COUNT(o.id) FROM customers c JOIN orders o...", risk: "high" as const, ms: 2840 },
  { t: "13:47", q: "SELECT * FROM products WHERE category = 'electronics'...", risk: "low" as const, ms: 142 },
  { t: "13:31", q: "SELECT p.method, SUM(p.amount) FROM payments p GROUP BY...", risk: "med" as const, ms: 1320 },
  { t: "13:18", q: "SELECT name FROM customers WHERE id IN (SELECT customer_id...", risk: "high" as const, ms: 4210 },
  { t: "12:58", q: "SELECT department, AVG(salary) FROM employees GROUP BY...", risk: "low" as const, ms: 88 },
];

function Overview() {
  return (
    <>
      <PageHeader
        eyebrow="Edition - 01"
        title={<>Anticipate the cost <em className="italic">before</em> the query runs.</>}
        lede="A research surface for predicting PostgreSQL execution time using syntactic structure and planner intuition. Every prediction is bounded by a known schema."
      />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile label="Queries Analyzed" value="1,284" sub="lifetime, this session" />
        <StatTile label="Avg Predicted Time" value="0.91s" sub="across last 50 queries" />
        <StatTile label="High Risk Today" value="17" sub="predicted > 3s" />
        <StatTile label="Top Rule" value={<span className="text-2xl">Missing Join Index</span>} sub="triggered 42% of time" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <SectionTitle hint="Last 7 days">Risk Distribution</SectionTitle>
          <Donut />
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill tone="low">Low - 58%</Pill>
            <Pill tone="med">Medium - 28%</Pill>
            <Pill tone="high">High - 14%</Pill>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <SectionTitle hint="Click a row to reload">Recent Queries</SectionTitle>
          <div className="divide-y divide-border/50">
            {recent.map((r, i) => (
              <Link
                key={i}
                to="/analyze"
                className="group flex items-center justify-between gap-4 py-3 transition hover:bg-white/30 -mx-2 px-2 rounded-lg"
              >
                <span className="text-[11px] tabular-nums text-muted-foreground w-12">{r.t}</span>
                <span className="flex-1 truncate font-mono text-xs text-foreground/80">{r.q}</span>
                <span className="tabular-nums text-xs text-muted-foreground w-16 text-right">{r.ms}ms</span>
                <Pill tone={r.risk}>{r.risk}</Pill>
              </Link>
            ))}
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
            {[
              { n: "Decision Tree", m: "MAE 0.34s", t: "Interpretable" },
              { n: "Random Forest", m: "MAE 0.21s", t: "Primary - intervals" },
              { n: "XGBoost", m: "MAE 0.18s", t: "Highest accuracy" },
            ].map((m) => (
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
            {[
              ["customers", "100,000"],
              ["orders", "500,000"],
              ["products", "10,000"],
              ["employees", "5,000"],
              ["payments", "500,000"],
            ].map(([n, c]) => (
              <div key={n} className="rounded-xl border border-border/60 bg-white/30 px-3 py-3">
                <div className="font-mono text-xs text-muted-foreground">{n}</div>
                <div className="mt-1 font-display text-xl tabular-nums">{c}</div>
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

function Donut() {
  const segs = [
    { val: 58, color: "oklch(0.86 0.08 160)" },
    { val: 28, color: "oklch(0.87 0.13 92)" },
    { val: 14, color: "oklch(0.82 0.11 30)" },
  ];
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
      <text x={cx} y={cy - 4} textAnchor="middle" className="font-display" fontSize="28" fill="currentColor">1,284</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="9" fill="oklch(0.5 0.02 85)" letterSpacing="2">QUERIES</text>
    </svg>
  );
}
