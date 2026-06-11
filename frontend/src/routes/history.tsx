import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, PageHeader, Pill, SectionTitle } from "../components/AppShell";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History" },
      { name: "description", content: "Past analyses and report export." },
    ],
  }),
  component: History,
});

type Row = { id: number; ts: string; q: string; model: string; ms: number; rules: number; risk: "low" | "med" | "high" };

const ROWS: Row[] = [
  { id: 1, ts: "Jun 11 - 14:02", q: "SELECT c.name, COUNT(o.id) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.name HAVING COUNT(o.id) > 5 ORDER BY 2 DESC", model: "RF", ms: 2108, rules: 3, risk: "med" },
  { id: 2, ts: "Jun 11 - 13:47", q: "SELECT * FROM products WHERE category = 'electronics' AND stock_count > 0", model: "XGB", ms: 142, rules: 1, risk: "low" },
  { id: 3, ts: "Jun 11 - 13:31", q: "SELECT p.method, SUM(p.amount) FROM payments p WHERE p.status = 'completed' GROUP BY p.method", model: "RF", ms: 1320, rules: 2, risk: "med" },
  { id: 4, ts: "Jun 11 - 13:18", q: "SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE amount > 500)", model: "DT", ms: 4210, rules: 4, risk: "high" },
  { id: 5, ts: "Jun 11 - 12:58", q: "SELECT department, AVG(salary) FROM employees GROUP BY department", model: "XGB", ms: 88, rules: 0, risk: "low" },
  { id: 6, ts: "Jun 11 - 12:41", q: "SELECT * FROM orders o, customers c WHERE o.order_date > '2024-06-01'", model: "RF", ms: 6840, rules: 5, risk: "high" },
  { id: 7, ts: "Jun 11 - 12:22", q: "SELECT DISTINCT city FROM customers WHERE email LIKE '%@gmail.com'", model: "DT", ms: 920, rules: 2, risk: "low" },
  { id: 8, ts: "Jun 11 - 11:58", q: "SELECT p.name, p.price FROM products p ORDER BY p.price DESC LIMIT 50", model: "RF", ms: 240, rules: 1, risk: "low" },
];

function History() {
  const [filter, setFilter] = useState<"all" | "low" | "med" | "high">("all");
  const rows = ROWS.filter((r) => filter === "all" ? true : r.risk === filter);

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title={<>Every query you've asked, <em className="italic">remembered well.</em></>}
        lede="Filter, reload, and export. The newest 500 analyses are kept; older entries are quietly retired."
      />

      <div className="space-y-6">

        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(["all", "low", "med", "high"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${filter === f ? "bg-foreground text-background" : "bg-white/40 hover:bg-white/60"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                className="rounded-lg border border-border/60 bg-white/60 px-3 py-1.5 text-xs"
              />
              <button className="rounded-full border border-border bg-white/60 px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition hover:bg-white/80">
                Download CSV
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-5 py-3 font-normal">Time</th>
                <th className="px-5 py-3 font-normal">Query</th>
                <th className="px-5 py-3 font-normal">Model</th>
                <th className="px-5 py-3 font-normal text-right">Predicted</th>
                <th className="px-5 py-3 font-normal text-right">Rules</th>
                <th className="px-5 py-3 font-normal">Risk</th>
                <th className="px-5 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/30 transition hover:bg-white/40">
                  <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{r.ts}</td>
                  <td className="px-5 py-3 w-[40%] max-w-0 truncate font-mono text-xs">{r.q}</td>
                  <td className="px-5 py-3 text-xs">{r.model}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{r.ms}ms</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{r.rules}</td>
                  <td className="px-5 py-3"><Pill tone={r.risk}>{r.risk}</Pill></td>
                  <td className="px-5 py-3 text-right">
                    <Link to="/analyze" className="text-xs text-foreground/70 hover:text-foreground">Load →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionTitle hint="">Export Last Analysis</SectionTitle>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Compiles the query, extracted vector, predictions, SHAP waterfall,
                and triggered advisor rules into a single document. Scope
                disclaimer is carried in the footer.
              </p>
            </div>
            <button className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background transition hover:opacity-90">
              Generate PDF
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
