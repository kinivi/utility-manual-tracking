import React from "react";

interface CardProps {
  elevation?: 0 | 1 | 2;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const ELEVATION_CLASSES: Record<0 | 1 | 2, string> = {
  0: "bg-ha-card rounded-xl p-4 border border-ha-divider",
  1: "bg-ha-card rounded-xl p-4 shadow-sm border border-ha-divider",
  2: "bg-ha-card rounded-2xl p-5 shadow-md border border-ha-divider",
};

export function Card({ elevation = 1, className = "", children, onClick }: CardProps) {
  const interactive = onClick
    ? "cursor-pointer hover:shadow-md transition-shadow duration-200"
    : "";

  return (
    <div
      className={`${ELEVATION_CLASSES[elevation]} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {children}
    </div>
  );
}
