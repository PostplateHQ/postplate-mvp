import { motion } from "framer-motion";
import type { GrowthHomeBridge, TodayFocusItem } from "../types";

type Props = {
  items: TodayFocusItem[];
  bridge: GrowthHomeBridge;
  delay?: number;
};

export function TodaysFocusCard({ items, bridge, delay = 0 }: Props) {
  if (!items.length) return null;

  return (
    <motion.section
      className="flex h-full min-h-0 w-full flex-col rounded-bento border border-stone-200/45 bg-white/90 p-5 shadow-bento ring-1 ring-white/70 backdrop-blur-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      aria-label="Today’s focus"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">Priorities</p>
        <h3 className="mt-1 text-lg font-extrabold tracking-tight text-ink">Today’s focus</h3>
        <p className="mt-1 text-xs font-medium text-ink-muted">What to do next — and why it matters.</p>
      </div>
      <ul className="mt-4 flex min-w-0 flex-1 flex-col gap-3">
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            className="rounded-xl bg-[#FAFAFA] p-3 ring-1 ring-stone-200/60"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: delay + 0.06 + i * 0.05 }}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none" aria-hidden>
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-ink-muted">{item.reason}</p>
                {item.steps?.length ? (
                  <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-[11px] font-medium leading-snug text-ink/90 marker:font-bold">
                    {item.steps.map((step, si) => (
                      <li key={si}>{step}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </div>
            <motion.button
              type="button"
              onClick={() => bridge.onAction(item.action)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 w-full rounded-lg bg-ink py-2.5 text-center text-xs font-extrabold text-cream-50 shadow-sm sm:w-auto sm:px-4"
            >
              {item.cta}
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
