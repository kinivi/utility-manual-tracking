import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardMetrics } from "../types";
import { computeMetrics, type ComputeMetricsInput } from "../utils/analyticsEngine";
import type { AnalyticsRequest, AnalyticsResponse } from "../workers/analyticsProtocol";
import AnalyticsWorker from "../workers/analytics.worker?worker&inline";

type WorkerMode = "worker" | "fallback";

interface PendingRequest {
  resolve: (value: DashboardMetrics) => void;
  reject: (reason?: unknown) => void;
}

export function useAnalyticsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, PendingRequest>());
  const nextIdRef = useRef(1);
  const [mode, setMode] = useState<WorkerMode>("worker");
  const [workerError, setWorkerError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      setMode("fallback");
      setWorkerError("Worker API unavailable");
      return;
    }

    try {
      const worker = new AnalyticsWorker();

      worker.onmessage = (event: MessageEvent<AnalyticsResponse>) => {
        const msg = event.data;
        const pending = pendingRef.current.get(msg.id);
        if (!pending) return;
        pendingRef.current.delete(msg.id);

        if (msg.type === "compute_metrics_result") {
          pending.resolve(msg.payload);
          return;
        }
        pending.reject(new Error(msg.error));
      };

      worker.onerror = (event) => {
        setMode("fallback");
        setWorkerError(event.message || "Worker runtime error");

        pendingRef.current.forEach(({ reject }) =>
          reject(new Error("Analytics worker failed"))
        );
        pendingRef.current.clear();
      };

      workerRef.current = worker;
    } catch (err) {
      setMode("fallback");
      setWorkerError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current.forEach(({ reject }) =>
        reject(new Error("Analytics worker terminated"))
      );
      pendingRef.current.clear();
    };
  }, []);

  const computeMetricsAsync = useCallback(
    async (input: ComputeMetricsInput): Promise<DashboardMetrics> => {
      if (mode === "fallback" || !workerRef.current) {
        return computeMetrics(input);
      }

      const id = nextIdRef.current++;
      const worker = workerRef.current;
      const msg: AnalyticsRequest = {
        type: "compute_metrics",
        id,
        payload: input,
      };

      return new Promise<DashboardMetrics>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        try {
          worker.postMessage(msg);
        } catch (err) {
          pendingRef.current.delete(id);
          setMode("fallback");
          setWorkerError(err instanceof Error ? err.message : String(err));
          void computeMetrics(input).then(resolve).catch(reject);
        }
      });
    },
    [mode]
  );

  return { computeMetricsAsync, mode, workerError };
}
