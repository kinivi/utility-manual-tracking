import React from "react";
import { useSettings } from "../hooks/useSettings";
import { Card } from "../components/ui/Card";

interface FieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

function SettingField({ label, description, value, onChange, min = 0, max, step = 0.01, unit }: FieldProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
      <div>
        <div className="text-sm font-medium text-ha-text">{label}</div>
        <div className="text-xs text-ha-text-secondary">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="w-28 px-3 py-1.5 text-sm border border-ha-divider rounded-lg bg-white text-ha-text text-right focus:outline-none focus:ring-2 focus:ring-ha-primary"
        />
        {unit && <span className="text-sm text-ha-text-secondary w-12">{unit}</span>}
      </div>
    </div>
  );
}

export function Settings() {
  const { settings, setSettings } = useSettings();

  return (
    <div className="max-w-2xl space-y-6">
      {/* Rates */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-1">Utility Rates</h3>
        <p className="text-xs text-ha-text-secondary mb-3">
          Used for cost calculations throughout the dashboard.
        </p>
        <div className="divide-y divide-ha-divider">
          <SettingField
            label="Electricity Rate"
            description="Cost per kilowatt-hour"
            value={settings.electricityRate}
            onChange={(v) => setSettings({ electricityRate: v })}
            step={0.01}
            unit={`${settings.currency}/kWh`}
          />
          <SettingField
            label="Water Rate"
            description="Cost per cubic meter"
            value={settings.waterRate}
            onChange={(v) => setSettings({ waterRate: v })}
            step={0.1}
            unit={`${settings.currency}/m³`}
          />
        </div>
      </Card>

      {/* Budgets */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-1">Monthly Budgets</h3>
        <p className="text-xs text-ha-text-secondary mb-3">
          Set monthly consumption targets for progress tracking.
        </p>
        <div className="divide-y divide-ha-divider">
          <SettingField
            label="Electricity Budget"
            description="Monthly electricity allowance"
            value={settings.monthlyElectricityBudget}
            onChange={(v) => setSettings({ monthlyElectricityBudget: v })}
            step={10}
            unit="kWh"
          />
          <SettingField
            label="Water Budget"
            description="Monthly water allowance"
            value={settings.monthlyWaterBudget}
            onChange={(v) => setSettings({ monthlyWaterBudget: v })}
            step={0.5}
            unit="m³"
          />
        </div>
      </Card>

      {/* Anomaly Settings */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-1">Anomaly Detection</h3>
        <p className="text-xs text-ha-text-secondary mb-3">
          Controls how sensitive the anomaly detection is. Lower values mean more alerts.
        </p>
        <SettingField
          label="Sensitivity (\u03c3 multiplier)"
          description="Standard deviations from mean to trigger alert"
          value={settings.anomalySensitivity}
          onChange={(v) => setSettings({ anomalySensitivity: v })}
          min={1}
          max={4}
          step={0.5}
          unit="\u03c3"
        />
      </Card>

      {/* Currency */}
      <Card>
        <h3 className="text-base font-semibold text-ha-text mb-1">Display</h3>
        <div className="py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-ha-text">Currency Symbol</div>
            <div className="text-xs text-ha-text-secondary">Shown in cost displays</div>
          </div>
          <select
            value={settings.currency}
            onChange={(e) => setSettings({ currency: e.target.value })}
            className="px-3 py-1.5 text-sm border border-ha-divider rounded-lg bg-white text-ha-text focus:outline-none focus:ring-2 focus:ring-ha-primary"
          >
            <option value="\u20ac">{"\u20ac"} (EUR)</option>
            <option value="$">$ (USD)</option>
            <option value="\u00a3">{"\u00a3"} (GBP)</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </Card>

      <div className="text-xs text-ha-text-secondary text-center py-4">
        Settings are stored locally in your browser. They persist across sessions but not across devices.
      </div>
    </div>
  );
}
