import { motion } from "framer-motion";
import type { GrowthHomeBridge } from "../types";

type Props = {
  businessName: string;
  location: string;
  tagline: string;
  statusChip: string;
  imageUrl: string | null;
  bridge: GrowthHomeBridge;
  delay?: number;
  /** Fill grid row height when beside calendar (e.g. `h-full`). */
  className?: string;
};

export function BusinessHeroCard({
  businessName,
  location,
  tagline,
  statusChip,
  imageUrl,
  bridge,
  delay = 0,
  className = "",
}: Props) {
  return (
    <motion.article
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-bento border border-stone-200/40 bg-white/85 shadow-bento ring-1 ring-white/80 backdrop-blur-md ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-honey-light/35 to-transparent blur-2xl" />
      <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={() => bridge.onEditBusiness()}
          className="group relative flex min-h-[210px] w-full cursor-pointer border-0 bg-cream-200/40 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2 md:h-full md:min-h-[260px]"
          aria-label="Edit business profile and storefront image"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-sage-light/90 via-cream-100 to-honey-light/25 px-6">
              <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl bg-white/95 text-2xl font-black tracking-tight text-sage-deep shadow-lift ring-1 ring-stone-200/60">
                {businessName
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "PP"}
              </span>
              <p className="text-center text-sm font-semibold text-ink-muted">Add your storefront photo — guests trust what they can see.</p>
            </div>
          )}
          <span className="absolute left-4 top-4 inline-flex rotate-[-2deg] rounded-lg bg-honey px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink shadow-md ring-2 ring-white/90">
            {statusChip}
          </span>
          <span className="absolute bottom-4 left-4 rounded-full bg-ink/90 px-4 py-2 text-xs font-bold text-cream-50 shadow-lift backdrop-blur-sm">
            Edit business
          </span>
        </button>

        <div className="relative flex min-h-0 flex-col justify-center gap-5 p-6 sm:p-8 md:h-full">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Your spot</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[1.65rem]">{businessName}</h2>
            <p className="mt-1.5 text-sm font-semibold text-sage-deep">{location}</p>
            <p className="mt-4 text-sm font-medium leading-relaxed text-ink-muted">{tagline}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={() => bridge.onNewCampaign()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="tap-scale rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-cream-50 shadow-lift ring-1 ring-ink/20"
            >
              New campaign
            </motion.button>
            <motion.button
              type="button"
              onClick={() => bridge.navigate("campaigns", { status: "active" })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="tap-scale rounded-2xl border-2 border-stone-200/80 bg-white/90 px-5 py-3 text-sm font-bold text-ink shadow-soft"
            >
              View live offers
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
