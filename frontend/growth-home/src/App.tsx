import { motion } from "framer-motion";
import { BusinessHeroCard } from "./components/BusinessHeroCard";
import { BentoKpiRibbon } from "./components/BentoKpiRibbon";
import { DashboardShell } from "./components/DashboardShell";
import { LiveCampaignCard } from "./components/LiveCampaignCard";
import { ActionRequiredCard } from "./components/ActionRequiredCard";
import { QuickActionsCard } from "./components/QuickActionsCard";
import { ScheduleMiniCard } from "./components/ScheduleMiniCard";
import { WeeklyPerformanceCard } from "./components/WeeklyPerformanceCard";
import { WelcomeHero } from "./components/WelcomeHero";
import type { BridgeAction, GrowthHomeBridge, GrowthHomeData } from "./types";

type Props = {
  data: GrowthHomeData;
  bridge: GrowthHomeBridge;
};

export function App({ data, bridge }: Props) {
  const spotlightId = data.spotlight.campaign?.id || "";
  const boostAction: BridgeAction = {
    targetRoute: "create",
    intent: "boost_weekend_traffic",
    metadata: { preset: "weekend_combo" },
  };
  const improveAction: BridgeAction = {
    targetRoute: "create",
    intent: "improve_campaign",
    metadata: { mode: "offer", sourceCampaignId: spotlightId },
  };

  return (
    <DashboardShell>
      <WelcomeHero businessName={data.businessName} tagline={data.tagline} delay={0.02} />

      {data.menuHint.show ? (
        <motion.div
          className="rounded-bento border border-sage/25 bg-sage-light/50 px-4 py-3 text-sm text-sage-deep shadow-innerGlow backdrop-blur-sm"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <strong className="font-semibold">Menu signal:</strong> {data.menuHint.itemCount} items on file. Add photos and
          stars so campaigns stay sharp.{" "}
          <button
            type="button"
            className="font-semibold text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay"
            onClick={() => bridge.navigate("menu-import")}
          >
            Update menu
          </button>
          {" · "}
          <button
            type="button"
            className="font-semibold text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay"
            onClick={() => bridge.onOpenMenuWizard()}
          >
            Quick setup
          </button>
        </motion.div>
      ) : null}

      <BentoKpiRibbon items={data.kpis} delay={0.06} footnote={data.kpiFootnote} />

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 xl:col-span-7">
          <BusinessHeroCard
            businessName={data.businessName}
            location={data.location}
            tagline={data.tagline}
            statusChip={data.statusChip}
            imageUrl={data.storefrontImageUrl}
            bridge={bridge}
            delay={0.08}
          />
        </div>
        <div className="col-span-12 flex flex-col gap-4 xl:col-span-5">
          <WeeklyPerformanceCard
            title={data.weekly.label}
            trendLabel={data.weekly.trendLabel}
            days={data.weekly.days}
            chartCaption={data.weekly.chartCaption}
            delay={0.1}
          />
          {data.schedule ? (
            <ScheduleMiniCard title={data.schedule.title} rows={data.schedule.rows} delay={0.12} />
          ) : null}
        </div>

        <div className="col-span-12 lg:col-span-7">
          <LiveCampaignCard
            campaign={data.spotlight.campaign}
            insight={data.spotlight.insight}
            peakTimeLabel={data.spotlight.peakTimeLabel}
            reachLabel={data.spotlight.reachLabel}
            redemptionLabel={data.spotlight.redemptionLabel}
            bridge={bridge}
            boostAction={boostAction}
            improveAction={improveAction}
            delay={0.11}
          />
        </div>
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-5">
          <QuickActionsCard actions={data.quickActions} bridge={bridge} delay={0.13} />
        </div>

        <div className="col-span-12">
          <ActionRequiredCard items={data.attention} bridge={bridge} delay={0.15} />
        </div>
      </div>
    </DashboardShell>
  );
}
