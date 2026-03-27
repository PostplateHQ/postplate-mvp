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

export type GrowthHomeData = {
  businessName: string;
  location: string;
  tagline: string;
  statusChip: string;
  storefrontImageUrl: string | null;
  kpis: {
    id: string;
    label: string;
    value: string;
    hint: string;
    barPct: number;
  }[];
  /** Trust caption under the KPI ribbon (optional for older bundles). */
  kpiFootnote?: string;
  weekly: {
    label: string;
    trendLabel: string;
    /** Explains that weekly bars are illustrative / not a forecast. */
    chartCaption?: string;
    days: { label: string; value: number; highlight?: boolean }[];
  };
  spotlight: {
    campaign: LiveCampaignDTO | null;
    insight: string;
    peakTimeLabel: string;
    reachLabel: string;
    redemptionLabel: string;
  };
  attention: {
    id: string;
    title: string;
    detail: string;
    cta: string;
    action: BridgeAction;
    tone?: "default" | "warm";
  }[];
  quickActions: QuickActionItem[];
  schedule: {
    title: string;
    rows: { label: string; value: string }[];
  } | null;
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
