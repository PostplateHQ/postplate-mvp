import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function DashboardShell({ children }: Props) {
  return (
    <motion.div
      className="growth-home-bento -mx-1 rounded-bento bg-bento-page bg-cover px-2 py-1 pb-14 pt-3 sm:px-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="mx-auto max-w-[1280px] space-y-6 lg:space-y-8">{children}</div>
    </motion.div>
  );
}
