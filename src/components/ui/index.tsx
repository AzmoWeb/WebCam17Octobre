// Composants d'interface de base (Tailwind). Sans état : utilisables côté serveur et client.
import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "live";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/20",
  secondary: "bg-panel-3 text-ink hover:bg-line-strong",
  ghost: "bg-transparent text-ink-muted hover:bg-panel-3 hover:text-ink",
  danger: "bg-danger/15 text-danger hover:bg-danger hover:text-white",
  outline: "border border-line bg-transparent text-ink hover:border-line-strong hover:bg-panel-2",
  live: "bg-live text-white hover:bg-live/90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-3 text-[13px]",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-[15px]",
};

const ICON_SIZES: Record<Size, string> = { sm: "size-8 rounded-md", md: "size-10 rounded-lg", lg: "size-12 rounded-xl" };

export function buttonClass({
  variant = "secondary",
  size = "md",
  icon = false,
  block = false,
  className,
}: { variant?: Variant; size?: Size; icon?: boolean; block?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors select-none",
    "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
    VARIANTS[variant],
    icon ? ICON_SIZES[size] : SIZES[size],
    block && "w-full",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; icon?: boolean; block?: boolean; loading?: boolean };

export function Button({ variant, size, icon, block, loading, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, icon, block, className })} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const BADGES = {
  neutral: "bg-panel-3 text-ink-muted",
  brand: "bg-brand/15 text-brand-hover",
  live: "bg-live text-white uppercase tracking-wide",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  glass: "bg-black/60 text-white backdrop-blur",
};

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof BADGES; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-bold whitespace-nowrap", BADGES[tone], className)}>
      {children}
    </span>
  );
}

export function LiveBadge({ className, label = "En direct" }: { className?: string; label?: string }) {
  return (
    <Badge tone="live" className={className}>
      <span className="size-1.5 animate-pulse-dot rounded-full bg-white" />
      {label}
    </Badge>
  );
}

export function LiveDot({ on }: { on: boolean }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", on ? "animate-pulse-dot bg-live" : "bg-ink-dim")} />;
}

// ---------------------------------------------------------------------------
// Cartes et sections
// ---------------------------------------------------------------------------

export function Card({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-xl border border-line bg-panel", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, icon, actions, className }: { title: ReactNode; icon?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5", className)}>
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        {icon && <span className="text-brand">{icon}</span>}
        {title}
      </h2>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageTitle({ icon, title, subtitle, actions }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {icon && <span className="text-brand">{icon}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted sm:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {icon && <span className="text-brand">{icon}</span>}
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full bg-panel-3 px-2.5 text-[13px] font-semibold text-ink-muted", className)}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

const FIELD =
  "w-full rounded-lg border border-line bg-panel-2 text-ink placeholder:text-ink-dim transition-colors focus:border-brand focus:bg-panel focus:outline-none focus:ring-4 focus:ring-brand/20 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD, "h-11 px-3.5 text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "min-h-24 resize-y px-3.5 py-2.5 text-sm", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(FIELD, "h-11 cursor-pointer px-3 text-sm", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-muted">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-ink-dim">{hint}</span>}
    </div>
  );
}

const ALERTS = {
  error: { cls: "bg-danger/10 text-danger border-danger/30", icon: AlertTriangle },
  success: { cls: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  info: { cls: "bg-brand/10 text-ink border-brand/30", icon: Info },
  warning: { cls: "bg-warning/10 text-warning border-warning/30", icon: AlertTriangle },
};

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof ALERTS; children: ReactNode; className?: string }) {
  const { cls, icon: Icon } = ALERTS[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// États : vide, chargement
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-14 text-center", className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-panel-2 text-brand">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-ink-muted", className)} aria-label="Chargement" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** Squelette d'une grille de cartes de caméras. */
export function StreamGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="flex gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCard({ icon, value, label, tone = "brand" }: { icon: ReactNode; value: ReactNode; label: string; tone?: "brand" | "live" | "success" | "warning" }) {
  const tones = { brand: "bg-brand/15 text-brand-hover", live: "bg-live/15 text-live", success: "bg-success/15 text-success", warning: "bg-warning/15 text-warning" };
  return (
    <Card className="flex items-center gap-3.5 p-4">
      <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold tracking-tight">{value}</div>
        <div className="truncate text-[13px] text-ink-dim">{label}</div>
      </div>
    </Card>
  );
}
