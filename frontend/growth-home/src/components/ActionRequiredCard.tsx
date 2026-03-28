import { motion } from "framer-motion";
import type { BridgeAction, GrowthHomeBridge } from "../types";

type Item = {
  id: string;
  title: string;
  detail: string;
  cta: string;
  action: BridgeAction;
  tone?: "default" | "warm";
  urgency?: string;
  impact?: string;
};

type Props = {
  items: Item[];
  bridge: GrowthHomeBridge;
  delay?: number;
};

export function ActionRequiredCard({ items, bridge, delay = 0 }: Props) {
  return (
    <motion.section
      className="overflow-hidden rounded-bento border border-stone-800/80 bg-ink-soft px-5 py-5 text-cream-100 shadow-lift sm:px-6 sm:py-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-honey-light/90">Needs your attention</p>
          <h3 className="mt-1 text-lg font-extrabold tracking-tight text-cream-50 sm:text-xl">Next best moves</h3>
          <p className="mt-0.5 text-xs font-medium text-cream-200/80 sm:text-sm">High-impact steps with clear timing and payoff.</p>
        </div>
        <motion.button
          type="button"
          onClick={() => bridge.navigate("campaigns", { status: "drafts" })}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold text-cream-50 backdrop-blur-sm"
        >
          Review actions
        </motion.button>
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            className={`flex min-h-0 flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 ${
              item.tone === "warm"
                ? "border-honey/35 bg-gradient-to-br from-honey/15 to-transparent"
                : "border-white/10 bg-white/5"
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: delay + i * 0.05 }}
            whileHover={{ scale: 1.005, borderColor: "rgba(212, 162, 74, 0.45)" }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-cream-50" title={item.title}>
                {item.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-cream-200/85">{item.detail}</p>
              {item.urgency ? (
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-200/95">{item.urgency}</p>
              ) : null}
              {item.impact ? (
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-200/90">{item.impact}</p>
              ) : null}
            </div>
            <motion.button
              type="button"
              onClick={() => bridge.onAction(item.action)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 rounded-lg border border-white/20 bg-honey/95 px-3 py-2 text-[11px] font-extrabold text-ink shadow-md sm:ml-2"
            >
              {item.cta}
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
