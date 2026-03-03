// Home Assistant types

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  connection: {
    sendMessagePromise: <T = any>(msg: Record<string, any>) => Promise<T>;
    subscribeEvents: (
      callback: (event: any) => void,
      eventType: string
    ) => Promise<() => void>;
  };
  language: string;
  locale: {
    language: string;
    number_format: string;
  };
}

// Statistics types

export interface StatisticValue {
  start: string | number;
  end: string | number;
  sum?: number;
  change?: number;
  mean?: number;
  min?: number;
  max?: number;
  state?: number;
}

export type StatisticsResult = Record<string, StatisticValue[]>;

// Water meter types

export interface WaterMeterData {
  entityId: string;
  label: string;
  location: "kitchen" | "bathroom";
  temp: "cold" | "hot";
  currentReading: number;
  dailyUsage: number;
  unit: string;
  previousReading?: number;
  lastReadingDate?: string;
}

// Electricity data

export interface ElectricityReading {
  value: number;
  timestamp: Date;
  delta?: number;
  cost?: number;
}

export interface DailyConsumption {
  date: string;
  value: number;
  cost?: number;
}

export interface DeviceConsumption {
  name: string;
  entityId: string;
  value: number;
  color: string;
}

// Forecast types

export interface ForecastResult {
  dailyRate: number;
  monthlyForecast: number;
  annualForecast: number;
  confidence: number;
  trendDirection: "up" | "down" | "stable";
  trendPercent: number;
}

// Anomaly types

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  message: string;
  severity: "normal" | "warning" | "critical";
}

// Settings

export interface DashboardSettings {
  electricityRate: number;
  waterRate: number;
  monthlyElectricityBudget: number;
  monthlyWaterBudget: number;
  anomalySensitivity: number;
  currency: string;
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  electricityRate: 0.35,
  waterRate: 4.8,
  monthlyElectricityBudget: 300,
  monthlyWaterBudget: 10,
  anomalySensitivity: 2,
  currency: "€",
};

// Tab types

export type TabId = "situation" | "electricity" | "water" | "settings";

export type UtilityType = "electricity" | "water";

export interface MonthlyConsumptionPoint {
  monthKey: string;     // "2025-01", "2025-02", etc.
  label: string;        // "Jan 25", "Feb 25"
  usage: number;        // kWh or m³
  cost: number;
  utility: UtilityType;
  source: "actual" | "estimated";
}

export interface UsageFunnelStage {
  id: "total" | "known" | "base" | "over_budget";
  label: string;
  value: number;
  percent: number;
}

export interface DashboardMetrics {
  electricity: {
    dailyRate: number;
    monthTotal: number;
    monthCost: number;
    yearTotal: number;      // YTD kWh
    yearCost: number;       // YTD electricity cost
    forecast: ForecastResult;
    sparkline: number[];
    anomaly: AnomalyResult | null;
  };
  water: {
    dailyRate: number;      // L/day
    monthEstimate: number;  // m³
    monthCost: number;
    yearCostEstimate: number; // YTD water cost estimate
  };
  yearRunningCost: number;  // electricity + water YTD combined
  dailyAvgCost: number;     // yearRunningCost / days elapsed this year
  budgetPace: {
    percent: number;        // current month usage vs budget %
    daysRemaining: number;
    status: "good" | "warning" | "over";
  };
  funnelStages: UsageFunnelStage[];
  monthlyPoints: MonthlyConsumptionPoint[];
}
