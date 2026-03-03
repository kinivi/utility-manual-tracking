/// <reference lib="webworker" />

import { computeMetricsSync } from "../utils/analyticsEngine";
import type { AnalyticsRequest, AnalyticsResponse } from "./analyticsProtocol";

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<AnalyticsRequest>) => {
  const msg = event.data;
  if (!msg || msg.type !== "compute_metrics") return;

  try {
    const result = computeMetricsSync(msg.payload);
    const response: AnalyticsResponse = {
      type: "compute_metrics_result",
      id: msg.id,
      payload: result,
    };
    ctx.postMessage(response);
  } catch (err) {
    const response: AnalyticsResponse = {
      type: "compute_metrics_error",
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(response);
  }
};

export {};

