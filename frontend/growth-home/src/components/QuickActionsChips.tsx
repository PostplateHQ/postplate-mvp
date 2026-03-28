import { motion } from "framer-motion";
import type { GrowthHomeBridge, QuickActionItem } from "../types";

type Props = {
  actions: QuickActionItem[];
  bridge: GrowthHomeBridge;
  delay?: number;
  /** Screen-reader / heading label */
  title?: string;
};

export function QuickActionsChips({ actions, bridge, delay = 0, title = "More shortcuts" }: Props) {
  if (!actions.length) return null;

  return (
    <motion.section
      className="rounded-bento border border-stone-200/40 bg-white/80 px-4 py-3 shadow-bento ring-1 ring-white/70 backdrop-blur-md sm:px-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      aria-label={title}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">{title}</p>
      <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch]">
        {actions.map((q, i) => (
          <motion.button
            key={q.id}
            type="button"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: delay + i * 0.03 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => bridge.onAction(q.action)}
            className="min-h-[44px] shrink-0 rounded-full border border-stone-200/70 bg-cream-50/95 px-4 py-2.5 text-left text-sm font-bold text-ink shadow-soft ring-1 ring-white/80 hover:border-clay/35 hover:bg-clay-light/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2"
          >
            {q.icon ? <span className="mr-1.5 inline-block opacity-80">{q.icon}</span> : null}
            {q.title}
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
