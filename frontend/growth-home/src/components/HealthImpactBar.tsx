import { motion } from "framer-motion";
import type { HealthImpactStrip, ImpactSignalLevel, ImpactTone } from "../types";
import { ImpactVisualRow } from "./ImpactVisualRow";

function toneDot(tone: ImpactTone) {
  if (tone === "good") return "bg-emerald-600";
  if (tone === "bad") return "bg-red-500";
  return "bg-amber-500";
}

function trendClass(tone: ImpactTone | undefined) {
  if (!tone || tone === "good") return "text-emerald-700";
  if (tone === "bad") return "text-red-600";
  return "text-amber-700";
}

function signalPillClass(level: ImpactSignalLevel) {
  if (level === "low") return "bg-amber-100 text-amber-950 ring-amber-300/80";
  if (level === "strong") return "bg-emerald-100 text-emerald-950 ring-emerald-300/80";
  return "bg-slate-100 text-slate-800 ring-slate-200/90";
}

function cardShell(strength: ImpactSignalLevel | undefined) {
  const base = "rounded-2xl border border-[#EFEFEF] bg-white p-4 shadow-sm";
  if (strength === "low") return `${base} ring-2 ring-amber-200/70 bg-amber-50/25`;
  if (strength === "strong") return `${base} ring-1 ring-emerald-200/70`;
  return base;
}

type Props = {
  strip: HealthImpactStrip;
  delay?: number;
};

export function HealthImpactBar({ strip, delay = 0 }: Props) {
  const { health, impactSignal, estimatedRevenue, guestsDriven, claimToRedeem, trendSpark, funnelSnapshot, conversionPercent } = strip;

  const cards = [
    {
      key: "health",
      shell: cardShell(undefined),
      node: (
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneDot(health.tone)}`} aria-hidden />
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Health</p>
          </div>
          <p className="mt-3 text-lg font-extrabold leading-tight text-ink">{health.title}</p>
          <p className="mt-1 text-xs font-medium text-ink-muted">{health.subtitle}</p>
        </div>
      ),
    },
    {
      key: "rev",
      shell: cardShell(estimatedRevenue.strength),
      node: (
        <div className="flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{estimatedRevenue.label}</p>
          <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-ink">{estimatedRevenue.value}</p>
          {estimatedRevenue.trend ? (
            <p className={`mt-1 text-xs font-semibold ${trendClass(estimatedRevenue.trendTone)}`}>{estimatedRevenue.trend}</p>
          ) : (
            <p className="mt-1 text-xs font-medium text-ink-muted">From live offer modeling</p>
          )}
          {estimatedRevenue.strength === "low" ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-800/90">Low signal</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "guests",
      shell: cardShell(guestsDriven.strength),
      node: (
        <div className="flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{guestsDriven.label}</p>
          <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-ink">{guestsDriven.value}</p>
          {guestsDriven.subValue ? (
            <p className="mt-0.5 text-xs font-semibold text-sage-deep">{guestsDriven.subValue}</p>
          ) : null}
          {guestsDriven.trend ? (
            <p className={`mt-1 text-xs font-semibold ${trendClass(guestsDriven.trendTone)}`}>{guestsDriven.trend}</p>
          ) : null}
          {guestsDriven.strength === "low" ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-800/90">No claims yet</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "conv",
      shell: cardShell(claimToRedeem.strength),
      node: (
        <div className="flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{claimToRedeem.label}</p>
          <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-ink">{claimToRedeem.value}</p>
          {claimToRedeem.trend ? (
            <p className={`mt-1 text-xs font-semibold ${trendClass(claimToRedeem.trendTone)}`}>{claimToRedeem.trend}</p>
          ) : (
            <p className="mt-1 text-xs font-medium text-ink-muted">Claimed → redeemed</p>
          )}
          {claimToRedeem.strength === "low" ? (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-800/90">Needs claims</p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <motion.section
      className="rounded-bento border border-stone-200/60 bg-[#F9F9F7] p-4 shadow-sm sm:p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      aria-label="Today’s impact"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Today’s impact</p>
          <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-ink-muted">
            We label impact <span className="font-semibold text-ink">low</span> when scans, claims, or modeled revenue are flat — so you know it&apos;s a
            visibility or follow-through problem, not a mystery.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide ring-1 ${signalPillClass(impactSignal.level)}`}
          >
            {impactSignal.badge}
          </span>
          <p className="max-w-sm text-right text-xs font-medium leading-snug text-ink-muted sm:max-w-xs">{impactSignal.explainer}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.key}
            className={c.shell}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: delay + 0.05 + i * 0.04 }}
          >
            {c.node}
          </motion.div>
        ))}
      </div>

      <ImpactVisualRow
        spark={trendSpark}
        funnel={funnelSnapshot}
        conversionPct={conversionPercent}
        signalLevel={impactSignal.level}
        delay={delay + 0.12}
      />
    </motion.section>
  );
}
