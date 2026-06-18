import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/analyze", label: "Analyze" },
  { to: "/explain", label: "Explainability" },
  { to: "/performance", label: "Performance" },
  { to: "/history", label: "History" },
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
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Reactive aurora background */}
      <div
        ref={bgRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 transition-all duration-200 ease-out"
        style={{
          background:
            "radial-gradient(70vmax 70vmax at var(--mx,50%) var(--my,40%), oklch(0.95 0.06 10 / 0.6), transparent 55%), radial-gradient(55vmax 55vmax at calc(100% - var(--mx,50%)) calc(100% - var(--my,40%)), oklch(0.95 0.05 15 / 0.5), transparent 60%), radial-gradient(45vmax 45vmax at var(--mx,50%) 100%, oklch(0.96 0.04 355 / 0.4), transparent 60%), linear-gradient(180deg, oklch(0.99 0.005 10), oklch(0.98 0.01 10))",
        }}
      />
      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Floating orbs that drift with the mouse */}
      <div aria-hidden className="pointer-events-none fixed -top-32 -left-24 h-[40rem] w-[40rem] rounded-full animate-float-slow transition-transform duration-700 ease-out"
        style={{ background: "radial-gradient(closest-side, oklch(0.95 0.07 10 / 0.4), transparent)", transform: `translate3d(${(mouse.x - 0.5) * 60}px, ${(mouse.y - 0.5) * 60}px, 0)` }} />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-24 h-[36rem] w-[36rem] rounded-full animate-float-slow transition-transform duration-700 ease-out"
        style={{ background: "radial-gradient(closest-side, oklch(0.94 0.06 15 / 0.35), transparent)", animationDelay: "-7s", transform: `translate3d(${(0.5 - mouse.x) * 60}px, ${(0.5 - mouse.y) * 60}px, 0)` }} />
      <div aria-hidden className="pointer-events-none fixed top-1/3 left-1/2 h-[24rem] w-[24rem] rounded-full transition-transform duration-1000 ease-out"
        style={{ background: "radial-gradient(closest-side, oklch(0.96 0.05 355 / 0.3), transparent)", transform: `translate3d(${(mouse.x - 0.5) * 120}px, ${(mouse.y - 0.5) * 120}px, 0)` }} />

      <div className="relative flex min-h-screen">
        <Sidebar pathname={pathname} />
        <main className="flex-1 px-8 py-10 lg:px-14 lg:py-14">
          <div className="mx-auto max-w-7xl animate-fade-up">{children}</div>
        </main>
        {/* Cursor halo */}
        <div
          aria-hidden
          className="pointer-events-none fixed -z-10 h-[80rem] w-[80rem] rounded-full transition-transform duration-500 ease-out"
          style={{
            left: `calc(${mouse.x * 100}% - 40rem)`,
            top: `calc(${mouse.y * 100}% - 40rem)`,
            background:
              "radial-gradient(50% 50% at 50% 50%, oklch(0.92 0.08 5 / 0.08) 0%, oklch(0.94 0.05 10 / 0.04) 40%, oklch(0.96 0.03 15 / 0.01) 70%, transparent 100%)",
            mixBlendMode: "multiply",
            filter: "blur(100px)",
          }}
        />
      </div>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-10 px-7 py-10 lg:flex">
      <Link to="/" className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]">
        <div className="relative h-10 w-10 rounded-full glass-strong transition-transform duration-500 group-hover:rotate-180">
          <div className="absolute inset-1 rounded-full" style={{ background: "conic-gradient(from 0deg, oklch(0.95 0.06 10), oklch(0.94 0.05 15), oklch(0.96 0.04 355), oklch(0.95 0.06 10))" }} />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">SQL</div>
          <div className="font-display text-xl">Analyzer</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {nav.map((item, i) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ${
                active ? "glass text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/30"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-[10px] tabular-nums text-muted-foreground/70">0{i + 1}</span>
                <span>{item.label}</span>
              </span>
              <span className={`h-1 w-1 rounded-full transition-all ${active ? "bg-foreground scale-100" : "scale-0"}`} />
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">
          <div className="font-display text-base text-foreground">Scope</div>
          <p className="mt-1 leading-relaxed">
            PostgreSQL 15 - fixed schema - ~1.1M rows. Predictions valid within
            this environment.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <header className="mb-12">
      <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</div>
      <h1 className="mt-3 font-display text-5xl leading-[1.05] text-balance lg:text-6xl">{title}</h1>
      {lede && <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">{lede}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`group/card glass rounded-2xl p-6 transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_40px_100px_-30px_oklch(0.7_0.18_350/0.35)] hover:border-[oklch(0.85_0.1_350/0.7)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</div>
      <div className="mt-3 font-display text-4xl">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "low" | "med" | "high" | "crit"; children: ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-white/60 text-foreground border-white",
    low: "bg-[oklch(0.93_0.06_160/0.6)] text-[oklch(0.3_0.07_160)] border-[oklch(0.85_0.08_160/0.6)]",
    med: "bg-[oklch(0.93_0.1_95/0.7)] text-[oklch(0.35_0.08_85)] border-[oklch(0.85_0.12_92/0.6)]",
    high: "bg-[oklch(0.93_0.05_30/0.7)] text-[oklch(0.4_0.13_30)] border-[oklch(0.85_0.08_30/0.6)]",
    crit: "bg-[oklch(0.88_0.1_25/0.7)] text-[oklch(0.35_0.16_25)] border-[oklch(0.78_0.13_25/0.6)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] backdrop-blur ${tones[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
      <h2 className="font-display text-2xl">{children}</h2>
      {hint && <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{hint}</div>}
    </div>
  );
}
