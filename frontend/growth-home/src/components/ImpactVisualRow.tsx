import { motion } from "framer-motion";
import type { ImpactSignalLevel } from "../types";

type Funnel = { scans: number; claimed: number; redeemed: number };

type Props = {
  spark: number[];
  funnel: Funnel;
  conversionPct: number | null;
  signalLevel: ImpactSignalLevel;
  delay?: number;
};

function buildSparkPath(values: number[], w: number, h: number) {
  if (!values.length) return "";
  const max = Math.max(1, ...values);
  const pad = 4;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(values: number[], w: number, h: number) {
  if (!values.length) return "";
  const line = buildSparkPath(values, w, h);
  const max = Math.max(1, ...values);
  const pad = 4;
  const yBase = h - pad;
  const firstX = pad;
  const lastX = pad + (values.length > 1 ? (w - pad * 2) : 0) * (values.length > 1 ? 1 : 0);
  return `${line} L ${lastX} ${yBase} L ${firstX} ${yBase} Z`;
}

export function ImpactVisualRow({ spark, funnel, conversionPct, signalLevel, delay = 0 }: Props) {
  const w = 280;
  const h = 72;
  const pathLine = buildSparkPath(spark, w, h);
  const pathArea = buildAreaPath(spark, w, h);
  const maxF = Math.max(1, funnel.scans, funnel.claimed, funnel.redeemed);

  const bar = (label: string, val: number, color: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-cream-100">{val}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (100 * val) / maxF)}%` }}
          transition={{ duration: 0.7, delay: delay + 0.15, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );

  const donutR = 36;
  const c = 2 * Math.PI * donutR;
  const pct = conversionPct != null && conversionPct >= 0 ? Math.min(100, conversionPct) : 0;
  const dash = (pct / 100) * c;

  return (
    <motion.div
      className="mt-4 grid gap-4 rounded-2xl border border-slate-700/80 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4 text-cream-50 shadow-inner sm:grid-cols-3 sm:gap-5 sm:p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      aria-label="Impact visuals"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">Activity pulse</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Rhythm weights (Mon→Sun) — timing, not dollars.</p>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="mt-2 overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="impactSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(212 162 74)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(212 162 74)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={pathArea} fill="url(#impactSparkFill)" />
          <path
            d={pathLine}
            fill="none"
            stroke="rgb(250 204 21)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pink-200/90">Funnel mix</p>
        <p className="text-[11px] text-slate-400">QR scans → claims → visits (this store).</p>
        {bar("QR scans", funnel.scans, "bg-cyan-400")}
        {bar("Claimed", funnel.claimed, "bg-fuchsia-400/90")}
        {bar("Redeemed", funnel.redeemed, "bg-emerald-400")}
      </div>

      <div className="flex flex-col items-center justify-center text-center sm:border-l sm:border-white/10 sm:pl-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/90">Visit rate</p>
        <p className="mt-1 text-[11px] text-slate-400">Claim → redeem ring</p>
        <div className="relative mt-2 h-[92px] w-[92px]">
          <svg width="92" height="92" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r={donutR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={donutR}
              fill="none"
              stroke="rgb(250 204 21)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold tabular-nums text-cream-50">
              {conversionPct != null ? `${conversionPct}%` : "—"}
            </span>
          </div>
        </div>
        <p className="mt-1 text-[10px] font-medium text-slate-500">
          {signalLevel === "low" ? "Low until scans and visits move" : "Higher ring = stronger follow-through"}
        </p>
      </div>
    </motion.div>
  );
}
