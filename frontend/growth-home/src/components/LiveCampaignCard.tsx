import { motion } from "framer-motion";
import type { BridgeAction, GrowthHomeBridge, LiveCampaignDTO } from "../types";

type Props = {
  campaign: LiveCampaignDTO | null;
  insight: string;
  peakTimeLabel: string;
  reachLabel: string;
  redemptionLabel: string;
  claimLabel?: string;
  conversionLabel?: string;
  revenueEstLabel?: string;
  intelligence?: {
    insight: string;
    risk?: string;
    suggestion?: string;
  };
  bridge: GrowthHomeBridge;
  boostAction: BridgeAction;
  improveAction: BridgeAction;
  delay?: number;
};

export function LiveCampaignCard({
  campaign,
  insight,
  peakTimeLabel,
  reachLabel,
  redemptionLabel,
  claimLabel,
  conversionLabel,
  revenueEstLabel,
  intelligence,
  bridge,
  boostAction,
  improveAction,
  delay = 0,
}: Props) {
  if (!campaign) {
    return (
      <motion.section
        className="rounded-bento border-2 border-dashed border-stone-300/80 bg-gradient-to-br from-cream-100/90 to-white p-10 text-center shadow-bento"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
      >
        <p className="text-base font-bold text-ink">Nothing live yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-ink-muted">
          Launch an offer so this spotlight fills with reach, conversion, and clear next steps.
        </p>
        <motion.button
          type="button"
          onClick={() => bridge.onNewCampaign()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 rounded-2xl bg-ink px-6 py-3 text-sm font-bold text-cream-50 shadow-lift"
        >
          Create campaign
        </motion.button>
      </motion.section>
    );
  }

  const id = campaign.id;
  const intel = intelligence || { insight };

  const stats = [
    { k: "Redemptions", v: redemptionLabel },
    { k: "QR scans", v: reachLabel },
    { k: "Conversion", v: conversionLabel || "—" },
    { k: "Est. revenue", v: revenueEstLabel || "—" },
    { k: "Peak time", v: peakTimeLabel },
  ];

  return (
    <motion.section
      className="relative overflow-hidden rounded-bento bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] p-6 text-cream-50 shadow-lift ring-1 ring-stone-700/50 sm:p-7"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4 }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-honey/25 to-clay/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-honey-light/90">Live performance</p>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[1.65rem]">{campaign.title}</h3>
          <p className="mt-1.5 text-sm font-medium text-cream-200/90">{campaign.offerValue || campaign.headline || campaign.goal}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-honey px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink shadow-md">
          Live
        </span>
      </div>
      <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((cell) => (
          <div
            key={cell.k}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-innerGlow backdrop-blur-sm sm:px-4 sm:py-3.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-cream-200/70">{cell.k}</p>
            <p className="mt-1.5 text-lg font-extrabold tabular-nums sm:text-xl">{cell.v}</p>
          </div>
        ))}
      </div>
      {claimLabel ? (
        <p className="relative mt-3 text-xs font-medium text-cream-200/75">Offers claimed (this run): {claimLabel}</p>
      ) : null}

      <div className="relative mt-5 space-y-2 text-sm leading-relaxed text-cream-100/95">
        {intel.insight ? (
          <p>
            <span className="font-bold text-honey-light">Insight: </span>
            <span className="text-cream-100/90">{intel.insight}</span>
          </p>
        ) : null}
        {intel.risk ? (
          <p>
            <span className="font-bold text-amber-200">Risk: </span>
            <span className="text-cream-200/85">{intel.risk}</span>
          </p>
        ) : null}
        {intel.suggestion ? (
          <p>
            <span className="font-bold text-emerald-200/90">Suggestion: </span>
            <span className="text-cream-100/90">{intel.suggestion}</span>
          </p>
        ) : null}
      </div>
      <div className="relative mt-6 flex flex-wrap gap-2.5">
        <motion.button
          type="button"
          onClick={() => bridge.onViewCampaign(id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-xl bg-cream-50 px-4 py-2.5 text-sm font-bold text-ink shadow-md"
        >
          View
        </motion.button>
        <motion.button
          type="button"
          onClick={() => bridge.onAction(boostAction)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-xl bg-[#C89B3C] px-4 py-2.5 text-sm font-bold text-ink shadow-md"
        >
          Boost
        </motion.button>
        <motion.button
          type="button"
          onClick={() => bridge.onAction(improveAction)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-cream-50 backdrop-blur-sm"
        >
          Improve
        </motion.button>
        <motion.button
          type="button"
          onClick={() => void bridge.onPauseCampaign(id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-cream-200"
        >
          Pause
        </motion.button>
      </div>
    </motion.section>
  );
}
