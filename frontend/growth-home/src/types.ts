export type RouteParams = Record<string, string>;

export type BridgeAction = {
  targetRoute?: string;
  intent?: string;
  metadata?: Record<string, unknown>;
  entityId?: string;
  label?: string;
};

export type SmartActionItem = {
  id?: string;
  title: string;
  reason: string;
  ctaLabel: string;
  action: BridgeAction;
};

export type QuickActionItem = {
  id: string;
  title: string;
  icon?: string;
  action: BridgeAction;
};

/** Traffic-light signal for metrics and copy */
export type ImpactTone = "good" | "warn" | "bad";

export type LiveCampaignDTO = {
  id: string;
  title: string;
  goal?: string;
  offerValue?: string;
  headline?: string;
  status?: string;
  customersGained?: number;
  engagementLift?: number;
  revenueImpact?: number;
  channels?: string[];
  bestChannel?: string;
};

export type ImpactSignalLevel = "low" | "moderate" | "strong";

export type HealthImpactStrip = {
  health: {
    tone: ImpactTone;
    title: string;
    subtitle: string;
  };
  /** Confirms how to read the row (esp. low impact). */
  impactSignal: {
    level: ImpactSignalLevel;
    badge: string;
    explainer: string;
  };
  /** 7-ish points (e.g. Mon–Sun weights) for the activity sparkline. */
  trendSpark: number[];
  /** Raw counts for funnel bars (QR → claim → visit). */
  funnelSnapshot: {
    scans: number;
    claimed: number;
    redeemed: number;
  };
  /** 0–100 for ring chart; null if unknown. */
  conversionPercent: number | null;
  estimatedRevenue: {
    value: string;
    label: string;
    trend?: string;
    trendTone?: ImpactTone;
    /** Soft signal when value is missing or zero. */
    strength?: ImpactSignalLevel;
  };
  guestsDriven: {
    value: string;
    label: string;
    subValue?: string;
    trend?: string;
    trendTone?: ImpactTone;
    strength?: ImpactSignalLevel;
  };
  claimToRedeem: {
    value: string;
    label: string;
    trend?: string;
    trendTone?: ImpactTone;
    strength?: ImpactSignalLevel;
  };
};

export type MoneyStory = {
  headline: string;
  detail?: string;
};

export type TodayFocusItem = {
  id: string;
  icon: string;
  title: string;
  reason: string;
  cta: string;
  action: BridgeAction;
  /** Numbered checklist under the reason (e.g. QR placement steps). */
  steps?: string[];
};

export type ActiveCampaignHero = {
  campaignId: string;
  name: string;
  offerSummary: string;
  redeemed: number;
  claimed: number;
  estRevenueLabel: string;
  performanceLine: string;
  performanceTone: ImpactTone;
};

export type WeeklyFlowStep = {
  range: string;
  title: string;
  highlight?: boolean;
};

export type GrowthHomeData = {
  businessName: string;
  location: string;
  tagline: string;
  statusChip: string;
  storefrontImageUrl: string | null;
  /** Decision bar: health + money + guests + conversion */
  healthImpact: HealthImpactStrip;
  /** One-line “money story” under the health strip */
  moneyStory: MoneyStory | null;
  /** Hero row when a live campaign exists */
  activeCampaign: ActiveCampaignHero | null;
  weekly: {
    label: string;
    eyebrow?: string;
    purpose?: string;
    marketingIntent?: string;
    slowHoursTip?: string;
    rhythmSteps?: { when: string; title: string; detail: string }[];
    /** Simplified Mon–Sun flow (preferred when set) */
    flowSteps?: WeeklyFlowStep[];
    weeklyInsightLine?: string;
    dataAttribution?: string;
    trendLabel: string;
    chartCaption?: string;
    days: { label: string; value: number; highlight?: boolean }[];
  };
  spotlight: {
    campaign: LiveCampaignDTO | null;
    insight: string;
    intelligence?: {
      insight: string;
      risk?: string;
      suggestion?: string;
    };
    peakTimeLabel: string;
    reachLabel: string;
    redemptionLabel: string;
    claimLabel?: string;
    conversionLabel?: string;
    revenueEstLabel?: string;
  };
  attention: {
    id: string;
    title: string;
    detail: string;
    cta: string;
    action: BridgeAction;
    tone?: "default" | "warm";
    urgency?: string;
    impact?: string;
  }[];
  quickActions: QuickActionItem[];
  todayFocus: TodayFocusItem[];
  menuHint: {
    show: boolean;
    itemCount: number;
    onUploadPath: boolean;
  };
};

export type GrowthHomeBridge = {
  navigate: (route: string, params?: RouteParams) => void;
  onAction: (action: BridgeAction) => void;
  onNewCampaign: () => void;
  onOpenMenuWizard: () => void;
  onEditBusiness: () => void;
  onViewCampaign: (campaignId: string) => void;
  onPauseCampaign: (campaignId: string) => Promise<void>;
};
