import React from "react";

interface SkeletonBlockProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBlock({ className = "", style }: SkeletonBlockProps) {
  return <div className={`animate-pulse bg-ha-divider rounded ${className}`} style={style} />;
}

export function SkeletonKPICard() {
  return (
    <div className="bg-ha-card rounded-xl p-4 border border-ha-divider">
      <SkeletonBlock className="h-4 w-20 mb-3" />
      <SkeletonBlock className="h-8 w-24 mb-2" />
      <SkeletonBlock className="h-3 w-16" />
    </div>
  );
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-ha-card rounded-xl p-4 border border-ha-divider">
      <SkeletonBlock className="h-4 w-32 mb-4" />
      <SkeletonBlock className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

export function SkeletonProgressBar() {
  return (
    <div className="bg-ha-card rounded-xl p-4 border border-ha-divider">
      <SkeletonBlock className="h-4 w-40 mb-3" />
      <SkeletonBlock className="h-3 w-full rounded-full mb-4" />
      <SkeletonBlock className="h-4 w-40 mb-3" />
      <SkeletonBlock className="h-3 w-full rounded-full" />
    </div>
  );
}

export function SkeletonOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>
      <SkeletonProgressBar />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonChart height={120} />
        <SkeletonChart height={120} />
      </div>
      <SkeletonChart height={280} />
    </div>
  );
}

export function SkeletonElectricityPage() {
  return (
    <div className="space-y-6">
      <SkeletonChart height={320} />
      <SkeletonChart height={100} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonChart height={200} />
        <SkeletonChart height={200} />
      </div>
      <SkeletonChart height={280} />
      <SkeletonChart height={250} />
    </div>
  );
}

export function SkeletonWaterPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonChart height={160} />
        <SkeletonChart height={160} />
      </div>
      <SkeletonChart height={280} />
    </div>
  );
}

/** Compact refresh badge for cached-data + background-refresh states */
export function RefreshBadge() {
  return (
    <div className="text-xs text-ha-text-secondary text-right -mb-4 animate-pulse">
      Updating...
    </div>
  );
}
