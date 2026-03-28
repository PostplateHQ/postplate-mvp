import { motion } from "framer-motion";
import type { GrowthHomeBridge, QuickActionItem } from "../types";

type Props = {
  title: string;
  subtitle?: string;
  rows: { label: string; value: string }[];
  delay?: number;
  fastTracks?: QuickActionItem[];
  bridge?: GrowthHomeBridge;
};

export function ScheduleMiniCard({ title, subtitle, rows, delay = 0, fastTracks = [], bridge }: Props) {
  return (
    <motion.section
      className="flex h-full min-h-0 w-full flex-col rounded-bento border border-stone-200/40 bg-surface-glass p-5 shadow-bento ring-1 ring-white/60 backdrop-blur-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-light text-sage-deep">◷</span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">Calendar</p>
          <h3 className="text-base font-extrabold text-ink">{title}</h3>
          {subtitle ? <p className="mt-1 max-w-[28rem] text-xs leading-relaxed text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>
      <ul className="mt-4 min-w-0 space-y-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-start justify-between gap-3 rounded-xl bg-white/60 px-3 py-2.5 ring-1 ring-stone-200/50"
          >
            <span className="text-sm font-semibold text-ink-muted">{row.label}</span>
            <span className="shrink-0 text-right text-sm font-extrabold text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
      {fastTracks.length > 0 && bridge ? (
        <div className="mt-4 border-t border-stone-200/50 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage-deep">Fast tracks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {fastTracks.map((q, i) => (
              <motion.button
                key={q.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: delay + 0.05 + i * 0.04 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => bridge.onAction(q.action)}
                className={
                  i < 2
                    ? "min-h-[44px] rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-cream-50 shadow-md ring-1 ring-ink/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2"
                    : "min-h-[44px] rounded-full border-2 border-stone-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-honey focus-visible:ring-offset-2"
                }
              >
                {q.icon ? <span className="mr-1">{q.icon}</span> : null}
                {q.title}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
