import { motion } from "framer-motion";

type Day = { label: string; value: number; highlight?: boolean };

type Props = {
  title: string;
  trendLabel: string;
  days: Day[];
  delay?: number;
  chartCaption?: string;
};

export function WeeklyPerformanceCard({ title, trendLabel, days, delay = 0, chartCaption }: Props) {
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <motion.section
      className="relative flex h-full flex-col overflow-hidden rounded-bento border border-stone-200/45 bg-white/80 p-5 shadow-bento ring-1 ring-white/70 backdrop-blur-md sm:p-6"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -3 }}
    >
      <div className="pointer-events-none absolute right-4 top-4 text-honey">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M7 17L17 7M17 7H9M17 7V15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">This week</p>
          <h3 className="mt-1.5 text-lg font-extrabold tracking-tight text-ink">{title}</h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-honey-light shadow-md">
          {trendLabel}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink-muted">
        {chartCaption || "Best day is highlighted in honey — mirror that rhythm on social."}
      </p>
      <div className="mt-5 flex min-h-[11rem] flex-1 items-end justify-between gap-1.5 sm:gap-2">
        {days.map((d, i) => {
          const barPx = 12 + Math.round((d.value / max) * 128);
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <motion.div
                className={`relative w-full max-w-[40px] rounded-t-xl ${
                  d.highlight
                    ? "bg-gradient-to-t from-honey-deep via-honey to-honey-light shadow-lg ring-2 ring-honey/40"
                    : "bg-cream-200/95"
                }`}
                initial={{ height: 0 }}
                animate={{ height: barPx }}
                transition={{ duration: 0.55, delay: delay + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
                title={`${d.label}: ${d.value}`}
              />
              <span
                className={`text-[10px] font-bold sm:text-[11px] ${d.highlight ? "text-honey-deep" : "text-ink-muted"}`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
