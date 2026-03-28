import { motion } from "framer-motion";

type Props = {
  businessName: string;
  tagline: string;
  delay?: number;
};

export function WelcomeHero({ businessName, tagline, delay = 0 }: Props) {
  return (
    <motion.header
      className="px-1"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted">Growth assistant</p>
      <h1 className="mt-2 font-extrabold tracking-tight text-ink" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", lineHeight: 1.15 }}>
        <span className="text-sage-deep">{businessName}</span>
        <span className="text-ink"> — decisions first</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ink-muted">{tagline}</p>
    </motion.header>
  );
}
