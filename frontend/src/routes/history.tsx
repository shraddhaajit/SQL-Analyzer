import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, PageHeader, Pill, SectionTitle } from "../components/AppShell";
import { getHistoryFn, clearHistoryFn, generatePdfReportFn } from "../server-functions";
import { Search, Trash2, FileText, ArrowUpRight, Clock, AlertTriangle, CheckCircle, Filter, Download } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — SQL Analyzer" },
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
  risk: "low" | "med" | "high";
};

function HistoryView() {
  const [filter, setFilter] = useState<"all" | "low" | "med" | "high">("all");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportOk, setExportOk] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");

  const fetchHistory = async (riskFilter: string) => {
    setIsLoading(true);
    try {
      const data = await getHistoryFn({ data: riskFilter === "all" ? "All" : riskFilter });
      if (data && Array.isArray(data)) {
        const formatted = data.map((item: any) => {
          let tsStr = "Just Now";
          if (item.created_at) {
            const dateObj = new Date(item.created_at.replace(" ", "T"));
            if (!isNaN(dateObj.getTime())) {
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              tsStr = `${months[dateObj.getMonth()]} ${dateObj.getDate()} · ${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
            }
          }
          return {
            id: item.id,
            ts: tsStr,
            q: item.query,
            model: item.primary_model,
            ms: Math.round(item.prediction * 1000),
            rules: item.rules_count,
            risk: item.risk_level.toLowerCase() as "low" | "med" | "high",
          };
        });
        setRows(formatted);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
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
      } catch {}
    }
  };

  const handleGeneratePdf = async () => {
    const cached = localStorage.getItem("sql_analyzer_current");
    if (!cached) {
      setExportMessage("No analysis found in this session. Please analyze a query first.");
      setExportOk(false);
      return;
    }
    setIsExporting(true);
    setExportMessage("Generating PDF report…");
    try {
      const data = JSON.parse(cached);
      const res = await generatePdfReportFn({
        data: {
          query: data.query,
          prediction: data.predictions.RF,
          risk: data.rules.length > 3 ? "High" : data.rules.length > 0 ? "Medium" : "Low",
          rules: data.rules,
        },
      });
      if (res && res.status === "success") {
        setExportMessage(`Report saved: ${res.filename}`);
        setExportOk(true);
      } else {
        setExportMessage("Failed to generate PDF. Check python configuration.");
        setExportOk(false);
      }
    } catch (e: any) {
      setExportMessage(`Generation failed: ${e.message || e}`);
      setExportOk(false);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredRows = rows.filter((r) =>
    search ? r.q.toLowerCase().includes(search.toLowerCase()) : true
  );

  const riskCounts = {
    all: rows.length,
    low: rows.filter((r) => r.risk === "low").length,
    med: rows.filter((r) => r.risk === "med").length,
    high: rows.filter((r) => r.risk === "high").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title={<>Every query you've asked, <em className="italic font-light">remembered well.</em></>}
        lede="Filter, reload, and export. The newest 500 analyses are kept; older entries are quietly retired."
      />

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", val: rows.length, icon: <Clock className="h-3.5 w-3.5" /> },
          { label: "Low Risk", val: riskCounts.low, icon: <CheckCircle className="h-3.5 w-3.5 text-[oklch(0.65_0.1_155)]" /> },
          { label: "Med Risk", val: riskCounts.med, icon: <AlertTriangle className="h-3.5 w-3.5 text-[oklch(0.65_0.12_88)]" /> },
          { label: "High Risk", val: riskCounts.high, icon: <AlertTriangle className="h-3.5 w-3.5 text-[oklch(0.60_0.15_28)]" /> },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-muted-foreground/60">{s.icon}</span>
            <div>
              <div className="font-display text-2xl font-semibold tracking-tight">{s.val}</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {/* Filters & search */}
        <Card className="!py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              {(["all", "low", "med", "high"] as const).map((f) => (
                <button
                  key={f}
                  id={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all ${
                    filter === f
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-white/45 text-muted-foreground hover:bg-white/65 hover:text-foreground"
                  }`}
                >
                  {f}
                  <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[8px]">{riskCounts[f]}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search queries…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border border-border/50 bg-white/60 pl-9 pr-3 py-1.5 text-[11px] outline-none placeholder:text-muted-foreground/50 text-foreground w-44 focus:ring-1 focus:ring-ring/40 transition-all focus:w-52"
                />
              </div>
              <button
                id="clear-history-btn"
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-white/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all hover:bg-[oklch(0.96_0.04_25/0.4)] hover:text-[oklch(0.42_0.15_25)] hover:border-[oklch(0.82_0.1_25/0.4)]"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>
        </Card>

        {/* History table */}
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="h-10 w-10 rounded-2xl glass flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground/40 animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground/70">Loading query ledger…</p>
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-white/20">
                    {["Time", "Query", "Model", "Predicted", "Rules", "Risk", ""].map((h) => (
                      <th key={h} className={`px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 font-normal ${h === "Predicted" || h === "Rules" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="group border-b border-border/25 transition-colors hover:bg-white/40">
                      <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground/60 whitespace-nowrap">{r.ts}</td>
                      <td className="px-5 py-3 max-w-[280px]">
                        <span className="block truncate font-mono text-[11px] text-foreground/80 group-hover:text-foreground transition-colors" title={r.q}>{r.q}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-lg bg-white/50 border border-border/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{r.model || "RF"}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-mono tabular-nums text-[11px] font-semibold ${
                          r.ms >= 2000 ? "text-[oklch(0.42_0.15_28)]" : r.ms >= 500 ? "text-[oklch(0.40_0.12_85)]" : "text-[oklch(0.40_0.1_160)]"
                        }`}>{r.ms}ms</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-[11px] text-muted-foreground/70">{r.rules}</td>
                      <td className="px-5 py-3"><Pill tone={r.risk} size="sm">{r.risk}</Pill></td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to="/analyze"
                          onClick={() => { localStorage.setItem("sql_analyzer_prefill", r.q); }}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50 transition-all hover:text-foreground group-hover:text-muted-foreground rounded-lg hover:bg-white/40 px-2 py-1"
                        >
                          Load
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length > 0 && (
                <div className="border-t border-border/30 px-5 py-2.5 text-[10px] text-muted-foreground/60 flex items-center justify-between">
                  <span>{filteredRows.length} {filteredRows.length === 1 ? "entry" : "entries"}</span>
                  {search && <span>Filtered from {rows.length} total</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-2xl glass flex items-center justify-center">
                <Clock className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {search ? `No results for "${search}"` : "No query history found."}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  {search ? "Try a different search term." : "Execute an analysis on the Query Analysis page to begin."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Export card */}
        <Card>
          <div className="flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <h2 className="font-display text-xl font-semibold tracking-tight">Export Last Analysis</h2>
            </div>
            {/* Description */}
            <p className="text-[13px] leading-relaxed text-muted-foreground max-w-2xl">
              Compiles the query, extracted feature vector, predictions from all three models, SHAP waterfall,
              and triggered advisor rules into a single PDF document. Scope disclaimer is carried in the footer.
            </p>
            {/* Status message */}
            {exportMessage && (
              <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] font-mono ${
                exportOk
                  ? "bg-[oklch(0.94_0.04_160/0.4)] border-[oklch(0.82_0.08_160/0.4)] text-[oklch(0.32_0.1_155)]"
                  : "bg-[oklch(0.94_0.04_25/0.4)] border-[oklch(0.82_0.1_25/0.4)] text-[oklch(0.4_0.14_25)]"
              }`}>
                {exportOk ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{exportMessage}</span>
              </div>
            )}
            {/* Button — aligned to the right */}
            <div className="flex justify-end pt-1">
              <button
                id="generate-pdf-btn"
                onClick={handleGeneratePdf}
                disabled={isExporting}
                className="flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-background transition-all hover:opacity-85 hover:gap-2.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <span className="h-3 w-3 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Generate PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
