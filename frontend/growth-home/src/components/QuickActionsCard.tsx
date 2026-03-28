import { motion } from "framer-motion";
import type { GrowthHomeBridge, QuickActionItem } from "../types";

type Props = {
  actions: QuickActionItem[];
  bridge: GrowthHomeBridge;
  delay?: number;
};

export function QuickActionsCard({ actions, bridge, delay = 0 }: Props) {
  return (
    <motion.section
      className="h-full rounded-bento border border-stone-200/45 bg-white/85 p-5 shadow-bento ring-1 ring-white/80 backdrop-blur-md sm:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -3 }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">Quick actions</p>
      <h3 className="mt-1.5 text-lg font-extrabold tracking-tight text-ink">Fast shortcuts</h3>
      <p className="mt-1 text-sm font-medium text-ink-muted">Tappable tiles — built for gloved hands and busy shifts.</p>
      <div className="mt-4 grid gap-2.5">
        {actions.map((q, i) => (
          <motion.button
            key={q.id}
            type="button"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: delay + i * 0.04 }}
            whileHover={{ scale: 1.015, x: 2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => bridge.onAction(q.action)}
            className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-gradient-to-r from-cream-50/90 to-white/95 px-4 py-3.5 text-left shadow-soft ring-1 ring-white/60 transition-colors hover:border-clay/40 hover:from-clay-light/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lg text-honey-light shadow-md">
              {q.icon || "→"}
            </span>
            <span className="text-sm font-bold leading-snug text-ink">{q.title}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
