import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, Pill, SectionTitle } from "../components/AppShell";
import { getHistoryFn, clearHistoryFn, generatePdfReportFn } from "../server-functions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History" },
      { name: "description", content: "Past analyses and report export." },
    ],
  }),
  component: HistoryView,
});

type HistoryRow = { 
  id: number; 
  ts: string; 
  q: string; 
  model: string; 
  ms: number; 
  rules: number; 
  risk: "low" | "med" | "high" 
};

function HistoryView() {
  const [filter, setFilter] = useState<"all" | "low" | "med" | "high">("all");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchHistory = async (riskFilter: string) => {
    setIsLoading(true);
    try {
      // API call to server function
      const data = await getHistoryFn({ data: riskFilter === "all" ? "All" : riskFilter });
      if (data && Array.isArray(data)) {
        const formatted = data.map((item: any) => {
          // Format date slightly
          let tsStr = "Just Now";
          if (item.created_at) {
            // e.g. "2026-06-18 14:02:11" -> "Jun 18 - 14:02"
            const dateObj = new Date(item.created_at.replace(" ", "T"));
            if (!isNaN(dateObj.getTime())) {
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              tsStr = `${months[dateObj.getMonth()]} ${dateObj.getDate()} - ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            }
          }
          return {
            id: item.id,
            ts: tsStr,
            q: item.query,
            model: item.primary_model,
            ms: Math.round(item.prediction * 1000),
            rules: item.rules_count,
            risk: item.risk_level.toLowerCase() as "low" | "med" | "high"
          };
        });
        setRows(formatted);
      }
    } catch (e) {
      console.error("Failed to load sqlite history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(filter);
  }, [filter]);

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to clear all query history?")) {
      try {
        await clearHistoryFn();
        setRows([]);
      } catch (e) {
        console.error("Failed to clear history:", e);
      }
    }
  };

  const handleGeneratePdf = async () => {
    const cached = localStorage.getItem("sql_analyzer_current");
    if (!cached) {
      setExportMessage("Error: No analysis found in this session. Please analyze a query first.");
      return;
    }
    
    setIsExporting(true);
    setExportMessage("Generating PDF report...");
    try {
      const data = JSON.parse(cached);
      const res = await generatePdfReportFn({
        data: {
          query: data.query,
          prediction: data.predictions.RF, // default to RF prediction
          risk: data.rules.length > 3 ? "High" : data.rules.length > 0 ? "Medium" : "Low",
          rules: data.rules
        }
      });
      if (res && res.status === "success") {
        setExportMessage(`Success! PDF report generated inside project workspace: ${res.filename}`);
      } else {
        setExportMessage("Failed to generate PDF. Check python configuration.");
      }
    } catch (e: any) {
      setExportMessage(`Generation failed: ${e.message || e}`);
    } finally {
      setIsExporting(false);
    }
  };

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
                  className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${filter === f ? "bg-foreground text-background" : "bg-white/40 hover:bg-white/60"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleClearHistory}
                className="rounded-full border border-border bg-white/60 px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                Clear History
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-muted-foreground">Loading SQLite query ledger...</div>
          ) : rows.length > 0 ? (
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
                    <td className="px-5 py-3 w-[40%] max-w-0 truncate font-mono text-xs" title={r.q}>{r.q}</td>
                    <td className="px-5 py-3 text-xs">{r.model}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{r.ms}ms</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{r.rules}</td>
                    <td className="px-5 py-3"><Pill tone={r.risk}>{r.risk}</Pill></td>
                    <td className="px-5 py-3 text-right">
                      <Link 
                        to="/analyze" 
                        onClick={() => {
                          // Pre-fill query editor by setting temporary item
                          localStorage.setItem("sql_analyzer_prefill", r.q);
                        }}
                        className="text-xs text-foreground/70 hover:text-foreground"
                      >
                        Load →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No query history found. Execute an analysis on the Query Analysis page.
            </div>
          )}
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
              {exportMessage && (
                <div className="mt-3 text-xs font-mono text-foreground bg-white/50 p-2.5 rounded-lg border border-border/40">
                  {exportMessage}
                </div>
              )}
            </div>
            <button 
              onClick={handleGeneratePdf}
              disabled={isExporting}
              className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {isExporting ? "Generating..." : "Generate PDF"}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
