import { motion } from "framer-motion";
import type { ActiveCampaignHero, BridgeAction, GrowthHomeBridge, ImpactTone } from "../types";

function perfStyle(tone: ImpactTone) {
  if (tone === "good") return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
  if (tone === "bad") return "bg-red-50 text-red-900 ring-red-200/70";
  return "bg-amber-50 text-amber-950 ring-amber-200/80";
}

type Props = {
  hero: ActiveCampaignHero;
  imageUrl: string | null;
  businessName: string;
  bridge: GrowthHomeBridge;
  boostAction: BridgeAction;
  delay?: number;
  className?: string;
};

export function ActiveCampaignHeroCard({
  hero,
  imageUrl,
  businessName,
  bridge,
  boostAction,
  delay = 0,
  className = "",
}: Props) {
  return (
    <motion.article
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-bento border border-stone-200/50 bg-white shadow-bento ring-1 ring-white/80 md:flex-row ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -3 }}
    >
      <div className="relative min-h-[200px] w-full shrink-0 md:w-[42%] md:max-w-md">
        <button
          type="button"
          onClick={() => bridge.onViewCampaign(hero.campaignId)}
          className="group relative h-full min-h-[200px] w-full border-0 bg-cream-200/50 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 md:min-h-full"
          aria-label={`View campaign ${hero.name}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-sage-light/90 via-cream-100 to-honey-light/30 px-6">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/95 text-xl font-black text-sage-deep shadow-lift ring-1 ring-stone-200/60">
                {businessName
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "PP"}
              </span>
              <p className="text-center text-xs font-semibold text-ink-muted">Your spotlight visual</p>
            </div>
          )}
          <span className="absolute left-4 top-4 inline-flex rounded-lg bg-honey px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink shadow-md ring-2 ring-white/90">
            Live
          </span>
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 p-5 sm:p-6 md:p-7">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Active campaign</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{hero.name}</h2>
          <p className="mt-1 text-sm font-medium text-ink-muted">{hero.offerSummary}</p>
        </div>

        <div className="flex flex-wrap gap-6 border-y border-stone-200/60 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Redeemed</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">{hero.redeemed}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Claimed</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">{hero.claimed}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Est. revenue</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">{hero.estRevenueLabel}</p>
          </div>
        </div>

        <p className={`rounded-xl px-3 py-2.5 text-sm font-semibold leading-snug ring-1 ${perfStyle(hero.performanceTone)}`}>
          {hero.performanceLine}
        </p>

        <div className="flex flex-wrap gap-2.5">
          <motion.button
            type="button"
            onClick={() => bridge.onViewCampaign(hero.campaignId)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-cream-50 shadow-md"
          >
            View
          </motion.button>
          <motion.button
            type="button"
            onClick={() => bridge.onAction(boostAction)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl border-2 border-stone-200/90 bg-white px-5 py-2.5 text-sm font-bold text-ink shadow-soft"
          >
            Boost
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
