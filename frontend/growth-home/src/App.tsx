import { motion } from "framer-motion";
import { ActiveCampaignHeroCard } from "./components/ActiveCampaignHeroCard";
import { ActionRequiredCard } from "./components/ActionRequiredCard";
import { BusinessHeroCard } from "./components/BusinessHeroCard";
import { DashboardShell } from "./components/DashboardShell";
import { HealthImpactBar } from "./components/HealthImpactBar";
import { LiveCampaignCard } from "./components/LiveCampaignCard";
import { QuickActionsChips } from "./components/QuickActionsChips";
import { TodaysFocusCard } from "./components/TodaysFocusCard";
import { WeeklyPerformanceCard } from "./components/WeeklyPerformanceCard";
import { DailyAnchorQuote } from "./components/DailyAnchorQuote";
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

  const oneTapAction: BridgeAction = {
    targetRoute: "create",
    intent: "create_offer",
    metadata: { mode: "offer", autoSuggest: true },
  };

  return (
    <DashboardShell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="lg:col-span-7">
          <WelcomeHero businessName={data.businessName} tagline={data.tagline} delay={0.02} />
        </div>
        <div className="lg:col-span-5">
          <DailyAnchorQuote businessName={data.businessName} delay={0.03} />
        </div>
      </div>

      <HealthImpactBar strip={data.healthImpact} delay={0.04} />

      {data.moneyStory ? (
        <motion.p
          className="rounded-xl border border-stone-200/50 bg-white/70 px-4 py-3 text-sm font-semibold text-ink shadow-sm"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.07 }}
        >
          <span className="text-sage-deep">{data.moneyStory.headline}</span>
          {data.moneyStory.detail ? (
            <span className="mt-1 block text-xs font-medium text-ink-muted">{data.moneyStory.detail}</span>
          ) : null}
        </motion.p>
      ) : null}

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

      <div className="grid grid-cols-12 items-stretch gap-4 lg:gap-5">
        <div className="col-span-12 flex lg:col-span-8">
          {data.activeCampaign ? (
            <ActiveCampaignHeroCard
              className="w-full"
              hero={data.activeCampaign}
              imageUrl={data.storefrontImageUrl}
              businessName={data.businessName}
              bridge={bridge}
              boostAction={boostAction}
              delay={0.08}
            />
          ) : (
            <BusinessHeroCard
              className="w-full"
              businessName={data.businessName}
              location={data.location}
              tagline={data.tagline}
              statusChip={data.statusChip}
              imageUrl={data.storefrontImageUrl}
              bridge={bridge}
              delay={0.08}
            />
          )}
        </div>

        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <TodaysFocusCard items={data.todayFocus} bridge={bridge} delay={0.09} />
          <QuickActionsChips
            actions={data.quickActions}
            bridge={bridge}
            delay={0.1}
            title="Quick actions"
          />
          <motion.div
            className="rounded-bento border border-dashed border-honey/40 bg-honey/5 px-4 py-3 text-center shadow-sm"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.11 }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">1-tap</p>
            <motion.button
              type="button"
              onClick={() => bridge.onAction(oneTapAction)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-2 w-full rounded-xl bg-ink py-2.5 text-sm font-bold text-cream-50 shadow-md"
            >
              Run something for me
            </motion.button>
          </motion.div>
        </div>

        <div className="col-span-12">
          <LiveCampaignCard
            campaign={data.spotlight.campaign}
            insight={data.spotlight.insight}
            peakTimeLabel={data.spotlight.peakTimeLabel}
            reachLabel={data.spotlight.reachLabel}
            redemptionLabel={data.spotlight.redemptionLabel}
            claimLabel={data.spotlight.claimLabel}
            conversionLabel={data.spotlight.conversionLabel}
            revenueEstLabel={data.spotlight.revenueEstLabel}
            intelligence={data.spotlight.intelligence}
            bridge={bridge}
            boostAction={boostAction}
            improveAction={improveAction}
            delay={0.11}
          />
        </div>

        <div className="col-span-12">
          <WeeklyPerformanceCard
            title={data.weekly.label}
            trendLabel={data.weekly.trendLabel}
            days={data.weekly.days}
            chartCaption={data.weekly.chartCaption}
            eyebrow={data.weekly.flowSteps?.length ? "Weekly rhythm" : data.weekly.eyebrow}
            purpose={data.weekly.flowSteps?.length ? undefined : data.weekly.purpose}
            marketingIntent={data.weekly.flowSteps?.length ? undefined : data.weekly.marketingIntent}
            slowHoursTip={data.weekly.flowSteps?.length ? undefined : data.weekly.slowHoursTip}
            rhythmSteps={data.weekly.flowSteps?.length ? [] : data.weekly.rhythmSteps}
            flowSteps={data.weekly.flowSteps}
            weeklyInsightLine={data.weekly.weeklyInsightLine}
            dataAttribution={data.weekly.dataAttribution}
            delay={0.12}
          />
        </div>

        <div className="col-span-12">
          <ActionRequiredCard items={data.attention} bridge={bridge} delay={0.14} />
        </div>
      </div>
    </DashboardShell>
  );
}
