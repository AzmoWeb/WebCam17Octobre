"use client";

import Link from "next/link";
import { BarChart3, Clock, PlayCircle, TrendingUp, Users } from "lucide-react";
import { formatDateTime, formatDuration, formatTime, secondsBetween } from "@/lib/utils";
import type { DashBroadcast } from "./DashboardView";

type Sample = { at: string; viewers: number };

export default function StatsCard({ broadcasts, samples }: { broadcasts: DashBroadcast[]; samples: Sample[] }) {
  const totalSeconds = broadcasts.reduce((n, b) => n + secondsBetween(b.started_at, b.ended_at), 0);
  const peak = broadcasts.reduce((n, b) => Math.max(n, b.peak_viewers), 0);
  const avgPeak = broadcasts.length ? Math.round(broadcasts.reduce((n, b) => n + b.peak_viewers, 0) / broadcasts.length) : 0;
  const last = broadcasts[0];

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <BarChart3 size={18} /> Statistiques
        </h3>
        <span className="muted small">{broadcasts.length} diffusion{broadcasts.length > 1 ? "s" : ""}</span>
      </div>
      <div className="card-body stack" style={{ gap: 20 }}>
        <div className="stats-grid">
          <Mini icon={<Clock size={18} />} value={formatDuration(totalSeconds)} label="Temps de diffusion total" />
          <Mini icon={<TrendingUp size={18} />} value={peak} label="Record de spectateurs" />
          <Mini icon={<Users size={18} />} value={avgPeak} label="Pic moyen par direct" />
        </div>

        {broadcasts.length === 0 ? (
          <p className="muted small">
            Aucune diffusion enregistrée. Les statistiques apparaissent dès ton premier direct (les hooks MediaMTX doivent
            être configurés, voir le README).
          </p>
        ) : (
          <>
            <div>
              <div className="row between" style={{ marginBottom: 8 }}>
                <strong className="small">
                  Audience — {last.ended_at ? "dernier direct" : "direct en cours"} ({formatDateTime(last.started_at)})
                </strong>
                <span className="tiny muted">pic {last.peak_viewers}</span>
              </div>
              <AudienceChart samples={samples} />
            </div>

            <div className="stack" style={{ gap: 0 }}>
              {broadcasts.slice(0, 8).map((b) => (
                <div key={b.id} className="list-row" style={{ padding: "10px 0" }}>
                  <span className={b.ended_at ? "live-dot" : "live-dot on"} />
                  <span className="grow small">{formatDateTime(b.started_at)}</span>
                  <span className="small muted">{formatDuration(secondsBetween(b.started_at, b.ended_at))}</span>
                  <span className="small muted" style={{ minWidth: 70, textAlign: "right" }}>
                    <Users size={12} /> {b.peak_viewers}
                  </span>
                  {b.ended_at ? (
                    <Link href={`/replay/${b.id}`} className="btn btn-sm btn-ghost">
                      <PlayCircle size={14} /> Replay
                    </Link>
                  ) : (
                    <span className="badge badge-live">LIVE</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          {value}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

/** Courbe SVG du nombre de spectateurs (un point par minute). */
function AudienceChart({ samples }: { samples: Sample[] }) {
  if (samples.length < 2) {
    return <p className="muted small">Pas encore assez de données (un point par minute pendant le direct).</p>;
  }
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
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="none" role="img" aria-label="Audience">
        <defs>
          <linearGradient id="aud" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="4 4" />
        ))}
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#aud)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="row between tiny muted">
        <span>{formatTime(samples[0].at)}</span>
        <span>max {max}</span>
        <span>{formatTime(samples[samples.length - 1].at)}</span>
      </div>
    </div>
  );
}
