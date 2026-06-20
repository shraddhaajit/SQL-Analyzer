import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Search,
  BookOpen,
  BarChart3,
  Clock,
  Database,
  Zap,
  TrendingUp,
} from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze", icon: Search },
  { to: "/explain", label: "Explainability", icon: BookOpen },
  { to: "/performance", label: "Performance", icon: BarChart3 },
  { to: "/history", label: "History", icon: Clock },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bgRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.4 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setMouse({ x, y });
      if (bgRef.current) {
        bgRef.current.style.setProperty("--mx", `${x * 100}%`);
        bgRef.current.style.setProperty("--my", `${y * 100}%`);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Reactive aurora background */}
      <div
        ref={bgRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-all duration-300 ease-out"
        style={{
          background:
            "radial-gradient(72vmax 72vmax at var(--mx,50%) var(--my,40%), oklch(0.95 0.065 8 / 0.65), transparent 55%), radial-gradient(58vmax 58vmax at calc(100% - var(--mx,50%)) calc(100% - var(--my,40%)), oklch(0.94 0.055 12 / 0.52), transparent 60%), radial-gradient(48vmax 48vmax at var(--mx,50%) 100%, oklch(0.96 0.042 350 / 0.42), transparent 62%), linear-gradient(160deg, oklch(0.99 0.004 8), oklch(0.985 0.008 340))",
        }}
      />
      {/* Grain texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Floating orbs */}
      <div aria-hidden className="pointer-events-none fixed -top-32 -left-24 h-[44rem] w-[44rem] rounded-full animate-float-slow transition-transform duration-[800ms] ease-out"
        style={{ background: "radial-gradient(closest-side, oklch(0.95 0.075 8 / 0.38), transparent)", transform: `translate3d(${(mouse.x - 0.5) * 55}px, ${(mouse.y - 0.5) * 55}px, 0)` }} />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-24 h-[38rem] w-[38rem] rounded-full animate-float-slow transition-transform duration-[800ms] ease-out"
        style={{ background: "radial-gradient(closest-side, oklch(0.94 0.062 15 / 0.32), transparent)", animationDelay: "-8s", transform: `translate3d(${(0.5 - mouse.x) * 55}px, ${(0.5 - mouse.y) * 55}px, 0)` }} />
      <div aria-hidden className="pointer-events-none fixed top-1/3 left-1/2 h-[26rem] w-[26rem] rounded-full transition-transform duration-[1100ms] ease-out"
        style={{ background: "radial-gradient(closest-side, oklch(0.96 0.05 350 / 0.28), transparent)", transform: `translate3d(${(mouse.x - 0.5) * 110}px, ${(mouse.y - 0.5) * 110}px, 0)` }} />

      <div className="relative flex min-h-screen">
        <Sidebar pathname={pathname} />
        <main className="flex-1 px-6 py-8 lg:px-12 lg:py-12 overflow-x-hidden">
          <div className="mx-auto max-w-7xl animate-fade-up">{children}</div>
        </main>
        {/* Cursor halo */}
        <div
          aria-hidden
          className="pointer-events-none fixed -z-10 h-[90rem] w-[90rem] rounded-full transition-transform duration-[600ms] ease-out"
          style={{
            left: `calc(${mouse.x * 100}% - 45rem)`,
            top: `calc(${mouse.y * 100}% - 45rem)`,
            background:
              "radial-gradient(50% 50% at 50% 50%, oklch(0.92 0.09 5 / 0.07) 0%, oklch(0.94 0.055 10 / 0.035) 40%, oklch(0.96 0.03 15 / 0.01) 70%, transparent 100%)",
            mixBlendMode: "multiply",
            filter: "blur(80px)",
          }}
        />
      </div>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 px-5 py-8 lg:flex border-r border-white/30">
      {/* Logo */}
      <Link to="/" className="group flex items-center gap-3 px-2 transition-all duration-300 hover:scale-[1.02]">
        <div className="relative h-9 w-9 shrink-0">
          <div className="absolute inset-0 rounded-xl glass-strong overflow-hidden">
            <div className="absolute inset-0.5 rounded-[10px]" style={{ background: "conic-gradient(from 180deg, oklch(0.9 0.1 8), oklch(0.88 0.08 350), oklch(0.92 0.07 15), oklch(0.9 0.1 8))" }} />
            <Database className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" strokeWidth={2.5} />
          </div>
          <div className="absolute -inset-1 rounded-2xl animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: "conic-gradient(from 0deg, oklch(0.9 0.1 8 / 0.6), transparent, oklch(0.9 0.1 8 / 0.6))" }} />
        </div>
        <div className="leading-none">
          <div className="text-[9px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">SQL</div>
          <div className="font-display text-lg font-semibold tracking-tight text-foreground">Analyzer</div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        <div className="px-3 mb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/60">Navigation</div>
        {nav.map((item, i) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "glass text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/35"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-foreground/70" />
              )}
              <Icon
                className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                  active ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground/70"
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="flex-1">{item.label}</span>
              <span className={`text-[9px] tabular-nums font-mono text-muted-foreground/50 transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`}>
                0{i + 1}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Status card */}
      <div className="mt-auto space-y-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">System</div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Database", value: "PostgreSQL 15", ok: true },
              { label: "Models", value: "DT · RF · XGB", ok: true },
              { label: "Schema", value: "~1.1M rows", ok: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/70">{s.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse-dot ${s.ok ? "bg-[oklch(0.75_0.12_160)]" : "bg-[oklch(0.75_0.12_25)]"}`} />
                  <span className="font-mono text-[10px] text-foreground/70">{s.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Scope</div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            Predictions valid within this schema & hardware config.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <header className="mb-10">
      <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        {eyebrow}
      </div>
      <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance lg:text-5xl">
        {title}
      </h1>
      {lede && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`group/card glass rounded-2xl p-6 transition-all duration-400 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, icon, trend }: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  trend?: { dir: "up" | "down"; val: string };
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, oklch(0.5 0.15 340), transparent)", transform: "translate(30%, -30%)" }} />
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      <div className="font-display text-3xl font-semibold tracking-tight leading-none">{value}</div>
      {(sub || trend) && (
        <div className="mt-2.5 flex items-center gap-2">
          {sub && <div className="text-[11px] text-muted-foreground/75">{sub}</div>}
          {trend && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              trend.dir === "up" ? "bg-[oklch(0.93_0.06_25/0.5)] text-[oklch(0.42_0.14_25)]" : "bg-[oklch(0.93_0.05_160/0.5)] text-[oklch(0.38_0.1_160)]"
            }`}>{trend.dir === "up" ? "↑" : "↓"} {trend.val}</span>
          )}
        </div>
      )}
    </Card>
  );
}

export function Pill({
  tone = "neutral",
  children,
  size = "md",
}: {
  tone?: "neutral" | "low" | "med" | "high" | "crit";
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/65 text-foreground border-white/80",
    low: "bg-[oklch(0.94_0.055_160/0.65)] text-[oklch(0.28_0.09_155)] border-[oklch(0.82_0.09_160/0.55)]",
    med: "bg-[oklch(0.94_0.09_90/0.70)] text-[oklch(0.32_0.09_82)] border-[oklch(0.82_0.13_90/0.55)]",
    high: "bg-[oklch(0.93_0.055_28/0.70)] text-[oklch(0.38_0.15_28)] border-[oklch(0.82_0.09_28/0.55)]",
    crit: "bg-[oklch(0.88_0.1_22/0.72)] text-[oklch(0.32_0.18_22)] border-[oklch(0.75_0.14_22/0.55)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm font-medium ${
      size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]"
    } uppercase tracking-[0.14em] ${tones[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75 shrink-0" />
      {children}
    </span>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-xl font-semibold tracking-tight">{children}</h2>
      {hint && <div className="shrink-0 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "outline" | "accent" }) {
  const variants = {
    default: "bg-foreground/8 text-foreground/70 border-transparent",
    outline: "bg-transparent text-muted-foreground border-border/60",
    accent: "bg-[oklch(0.93_0.07_340/0.5)] text-[oklch(0.28_0.1_340)] border-[oklch(0.82_0.1_340/0.4)]",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
}
