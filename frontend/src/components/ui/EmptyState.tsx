import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-ha-text-secondary mb-3 opacity-40">{icon}</div>
      <p className="text-sm font-medium text-ha-text-secondary">{title}</p>
      {description && (
        <p className="text-xs text-ha-text-secondary mt-1 max-w-xs">{description}</p>
      )}
    </div>
  );
}
