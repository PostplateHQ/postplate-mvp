import { motion } from "framer-motion";

type Day = { label: string; value: number; highlight?: boolean };

type RhythmStep = { when: string; title: string; detail: string };

type FlowStep = { range: string; title: string; highlight?: boolean };

type Props = {
  title: string;
  trendLabel: string;
  days: Day[];
  delay?: number;
  chartCaption?: string;
  eyebrow?: string;
  purpose?: string;
  marketingIntent?: string;
  slowHoursTip?: string;
  rhythmSteps?: RhythmStep[];
  flowSteps?: FlowStep[];
  weeklyInsightLine?: string;
  dataAttribution?: string;
};

export function WeeklyPerformanceCard({
  title,
  trendLabel,
  days,
  delay = 0,
  chartCaption,
  eyebrow = "Rhythm",
  purpose,
  marketingIntent,
  slowHoursTip,
  rhythmSteps = [],
  flowSteps = [],
  weeklyInsightLine,
  dataAttribution,
}: Props) {
  const max = Math.max(1, ...days.map((d) => d.value));

  const chart = (
    <div className="flex h-full min-h-[9rem] flex-col">
      <p className="text-xs font-medium leading-relaxed text-ink-muted">
        {chartCaption || "Highlight shows when to push hardest — hover a bar for the mix index."}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted/80">
        {dataAttribution || "Shape is illustrative until day-level activity is connected"}
      </p>
      <div className="mt-2 flex flex-1 items-end justify-between gap-1 sm:gap-1.5">
        {days.map((d, i) => {
          const barPx = 10 + Math.round((d.value / max) * 96);
          const tip =
            d.highlight && weeklyInsightLine
              ? weeklyInsightLine
              : `${d.label}: relative weight ${d.value} — use for timing, not dollar totals.`;
          return (
            <div key={d.label} className="flex h-full min-h-[7rem] flex-1 flex-col items-center justify-end gap-1.5">
              <motion.div
                className={`relative w-full max-w-[36px] rounded-t-lg ${
                  d.highlight
                    ? "bg-gradient-to-t from-honey-deep via-honey to-honey-light shadow-md ring-2 ring-honey/40"
                    : "bg-cream-200/95"
                }`}
                initial={{ height: 0 }}
                animate={{ height: barPx }}
                transition={{ duration: 0.55, delay: delay + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
                title={tip}
              />
              <span
                className={`text-[9px] font-bold sm:text-[10px] ${d.highlight ? "text-honey-deep" : "text-ink-muted"}`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.section
      className="relative overflow-hidden rounded-bento border border-stone-200/45 bg-white/80 p-5 shadow-bento ring-1 ring-white/70 backdrop-blur-md sm:p-6"
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
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">{eyebrow}</p>
          <h3 className="mt-1.5 text-lg font-extrabold tracking-tight text-ink">{title}</h3>
        </div>
        <span className="inline-flex max-w-[11rem] items-center rounded-full bg-ink px-3 py-1.5 text-center text-[11px] font-bold leading-snug text-honey-light shadow-md sm:max-w-none">
          {trendLabel}
        </span>
      </div>

      {flowSteps.length ? (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {flowSteps.map((step) => (
              <div
                key={`${step.range}-${step.title}`}
                className={`rounded-xl px-2 py-3 text-center ring-1 ${
                  step.highlight
                    ? "bg-honey/15 ring-honey/40"
                    : "bg-cream-100/80 ring-stone-200/60"
                }`}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-muted">{step.range}</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{step.title}</p>
              </div>
            ))}
          </div>
          {weeklyInsightLine ? (
            <p className="mt-4 text-sm font-medium leading-relaxed text-ink-muted">
              <span className="font-bold text-sage-deep">Tip: </span>
              {weeklyInsightLine}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch lg:gap-5">
          <div className="lg:col-span-5">
            {purpose ? <p className="text-sm leading-relaxed text-ink-muted">{purpose}</p> : null}
            {rhythmSteps.length ? (
              <div className={`rounded-xl bg-sage-light/35 px-3 py-3 ring-1 ring-sage/20 ${purpose ? "mt-3" : ""}`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage-deep">Suggested weekly flow</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {rhythmSteps.map((step) => (
                    <li
                      key={`${step.when}-${step.title}`}
                      className="rounded-lg bg-white/50 px-2.5 py-2 text-xs leading-snug text-ink ring-1 ring-sage/15 sm:text-[13px]"
                      title={step.detail}
                    >
                      <span className="font-extrabold text-sage-deep">{step.when}</span>
                      <span className="font-bold text-ink"> · {step.title}</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-ink-muted sm:text-xs">{step.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 lg:col-span-4">
            {marketingIntent ? (
              <p className="rounded-xl bg-cream-100/90 px-3 py-2.5 text-xs leading-relaxed text-ink ring-1 ring-stone-200/60 sm:text-sm">
                <span className="font-semibold text-ink">Why marketing here: </span>
                {marketingIntent}
              </p>
            ) : null}
            {slowHoursTip ? (
              <p className="text-xs italic leading-relaxed text-ink-muted sm:text-sm">
                <span className="font-semibold not-italic text-ink">Slow hours: </span>
                {slowHoursTip}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 lg:col-span-3">{chart}</div>
        </div>
      )}

      {flowSteps.length ? <div className="mt-6 min-h-0 lg:max-w-md">{chart}</div> : null}
    </motion.section>
  );
}
