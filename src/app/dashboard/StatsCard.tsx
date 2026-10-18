import Link from "next/link";
import { BarChart3, Clock, PlayCircle, TrendingUp, Users } from "lucide-react";
import { Badge, buttonClass, Card, CardHeader, LiveDot } from "@/components/ui";
import { formatDateTime, formatDuration, formatTime, secondsBetween } from "@/lib/utils";

export type DashBroadcast = { id: string; started_at: string; ended_at: string | null; peak_viewers: number };
type Sample = { at: string; viewers: number };

export default function StatsCard({ broadcasts, samples }: { broadcasts: DashBroadcast[]; samples: Sample[] }) {
  const totalSeconds = broadcasts.reduce((n, b) => n + secondsBetween(b.started_at, b.ended_at), 0);
  const peak = broadcasts.reduce((n, b) => Math.max(n, b.peak_viewers), 0);
  const avgPeak = broadcasts.length ? Math.round(broadcasts.reduce((n, b) => n + b.peak_viewers, 0) / broadcasts.length) : 0;
  const last = broadcasts[0];

  return (
    <Card>
      <CardHeader
        icon={<BarChart3 className="size-[18px]" />}
        title="Statistiques"
        actions={<span className="text-[13px] text-ink-dim">{broadcasts.length} diffusion{broadcasts.length > 1 ? "s" : ""}</span>}
      />
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: <Clock className="size-4" />, v: formatDuration(totalSeconds), l: "Temps de diffusion" },
            { icon: <TrendingUp className="size-4" />, v: peak, l: "Record de spectateurs" },
            { icon: <Users className="size-4" />, v: avgPeak, l: "Pic moyen par direct" },
          ].map((x) => (
            <div key={x.l} className="flex items-center gap-3 rounded-lg bg-panel-2 p-3">
              <span className="grid size-9 place-items-center rounded-lg bg-brand/15 text-brand-hover">{x.icon}</span>
              <div>
                <div className="font-extrabold">{x.v}</div>
                <div className="text-xs text-ink-dim">{x.l}</div>
              </div>
            </div>
          ))}
        </div>

        {!last ? (
          <p className="text-sm text-ink-dim">
            Aucune diffusion enregistrée. Les statistiques apparaissent dès ton premier direct (hooks MediaMTX configurés).
          </p>
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                <strong>
                  Audience — {last.ended_at ? "dernier direct" : "direct en cours"} ({formatDateTime(last.started_at)})
                </strong>
                <span className="text-xs text-ink-dim">pic {last.peak_viewers}</span>
              </div>
              <AudienceChart samples={samples} />
            </div>
            <ul className="divide-y divide-line">
              {broadcasts.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <LiveDot on={!b.ended_at} />
                  <span className="flex-1">{formatDateTime(b.started_at)}</span>
                  <span className="text-ink-dim">{formatDuration(secondsBetween(b.started_at, b.ended_at))}</span>
                  <span className="hidden w-16 text-right text-ink-dim sm:inline">
                    <Users className="mr-1 inline size-3" />
                    {b.peak_viewers}
                  </span>
                  {b.ended_at ? (
                    <Link href={`/replay/${b.id}`} className={buttonClass({ variant: "ghost", size: "sm" })}>
                      <PlayCircle className="size-3.5" /> Replay
                    </Link>
                  ) : (
                    <Badge tone="live">Live</Badge>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

/** Courbe SVG du nombre de spectateurs (un point par minute). */
function AudienceChart({ samples }: { samples: Sample[] }) {
  if (samples.length < 2) return <p className="text-sm text-ink-dim">Pas encore assez de données (un point par minute pendant le direct).</p>;
  const W = 600;
  const H = 160;
  const max = Math.max(1, ...samples.map((s) => s.viewers));
  const t0 = new Date(samples[0].at).getTime();
  const t1 = new Date(samples[samples.length - 1].at).getTime();
  const x = (s: Sample) => ((new Date(s.at).getTime() - t0) / Math.max(1, t1 - t0)) * W;
  const y = (s: Sample) => H - 8 - (s.viewers / max) * (H - 24);
  const line = samples.map((s, i) => `${i ? "L" : "M"}${x(s).toFixed(1)},${y(s).toFixed(1)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label="Courbe d'audience">
        <defs>
          <linearGradient id="aud" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#9147ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9147ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#2f2f35" strokeDasharray="4 4" />
        ))}
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#aud)" />
        <path d={line} fill="none" stroke="#a970ff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-ink-dim">
        <span>{formatTime(samples[0].at)}</span>
        <span>max {max}</span>
        <span>{formatTime(samples[samples.length - 1].at)}</span>
      </div>
    </div>
  );
}
