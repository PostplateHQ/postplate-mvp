import { motion } from "framer-motion";

const QUOTES: { text: string; attribution?: string }[] = [
  { text: "People who love to eat are always the best people.", attribution: "Julia Child" },
  { text: "One cannot think well, love well, sleep well, if one has not dined well.", attribution: "Virginia Woolf" },
  { text: "The only time to eat diet food is while you're waiting for the steak to cook.", attribution: "Julia Child" },
  { text: "Laughter is brightest where food is best.", attribution: "Irish proverb" },
  { text: "Good food is the foundation of genuine happiness.", attribution: "Auguste Escoffier" },
  { text: "Cooking is like love — it should be entered into with abandon or not at all.", attribution: "Harriet Van Horne" },
  { text: "There is no sincerer love than the love of food.", attribution: "George Bernard Shaw" },
  { text: "First we eat, then we do everything else.", attribution: "M.F.K. Fisher" },
  { text: "Food is our common ground, a universal experience.", attribution: "James Beard" },
  { text: "Great meals rarely start with “What’s in the freezer?”", attribution: "PostPlate" },
  { text: "Hospitality is making your guests feel like they’re at home — when you wish they were.", attribution: "Proverb" },
  { text: "A restaurant is a fantasy — a stage set and a show.", attribution: "Danny Meyer" },
];

function dayIndex() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 86400000;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % QUOTES.length;
}

type Props = {
  businessName: string;
  delay?: number;
};

export function DailyAnchorQuote({ businessName, delay = 0 }: Props) {
  const q = QUOTES[dayIndex()];

  return (
    <motion.aside
      className="relative overflow-hidden rounded-bento border border-stone-200/50 bg-gradient-to-br from-cream-100/90 via-white to-sage-light/40 px-5 py-4 shadow-bento ring-1 ring-white/80 sm:px-6 sm:py-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-honey/15 blur-2xl" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-deep/80">Today&apos;s anchor</p>
      <blockquote className="mt-2 font-quote text-lg font-semibold leading-snug text-ink sm:text-xl">
        &ldquo;{q.text}&rdquo;
      </blockquote>
      {q.attribution ? (
        <footer className="mt-2 text-xs font-semibold text-ink-muted">— {q.attribution}</footer>
      ) : null}
      <p className="mt-3 text-[11px] font-medium text-ink-muted">
        For <span className="font-bold text-sage-deep">{businessName}</span> — small rituals and clear offers compound.
      </p>
    </motion.aside>
  );
}
