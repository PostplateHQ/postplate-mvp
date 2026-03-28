import { motion } from "framer-motion";

export type KpiItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  barPct: number;
};

type Props = {
  items: KpiItem[];
  delay?: number;
  footnote?: string;
};

export function BentoKpiRibbon({ items, delay = 0, footnote }: Props) {
  return (
    <motion.section
      className="rounded-bento border border-stone-200/50 bg-surface-glass p-4 shadow-bento backdrop-blur-md sm:p-5 lg:p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ boxShadow: "0 12px 40px rgba(28, 25, 23, 0.08), 0 4px 12px rgba(28, 25, 23, 0.05)" }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((k, i) => {
            const pct = Math.min(100, Math.max(6, k.barPct));
            return (
              <motion.div
                key={k.id}
                className="flex min-w-0 flex-col justify-end border-b border-stone-200/40 pb-3 lg:border-b-0 lg:pb-0"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: delay + i * 0.04 }}
              >
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-ink-muted">{k.label}</p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cream-200/90">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-sage/80 via-honey to-clay"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.85, delay: delay + 0.12 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-2 truncate text-lg font-extrabold tabular-nums tracking-tight text-ink">{k.value}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-muted">{k.hint}</p>
              </motion.div>
            );
          })}
        </div>
        <div className="hidden shrink-0 flex-col justify-center gap-3 border-t border-stone-200/50 pt-4 sm:flex lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <motion.div
            className="rounded-2xl bg-ink px-5 py-3 text-center text-cream-50 shadow-lift"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-honey-light/90">Pulse</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">On track</p>
          </motion.div>
          <p className="max-w-[160px] text-center text-[11px] leading-snug text-ink-muted">
            Tap any card below — everything is built for quick decisions between services.
          </p>
        </div>
      </div>
      {footnote ? (
        <p className="mt-4 border-t border-stone-200/50 pt-3 text-center text-[10px] font-medium leading-snug text-ink-muted/90 sm:text-left">
          {footnote}
        </p>
      ) : null}
    </motion.section>
  );
}
