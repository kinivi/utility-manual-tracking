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
  start: string;
  end: string;
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
