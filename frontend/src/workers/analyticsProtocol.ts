import type { DashboardMetrics } from "../types";
import type { ComputeMetricsInput } from "../utils/analyticsEngine";

export type AnalyticsRequest = {
  type: "compute_metrics";
  id: number;
  payload: ComputeMetricsInput;
};

export type AnalyticsResponse =
  | {
      type: "compute_metrics_result";
      id: number;
      payload: DashboardMetrics;
    }
  | {
      type: "compute_metrics_error";
      id: number;
      error: string;
    };

