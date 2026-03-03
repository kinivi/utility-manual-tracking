import React from "react";
import { createRoot, Root } from "react-dom/client";
import App from "./App";
import type { HomeAssistant } from "./types";
import cssText from "./index.css?inline";

/**
 * Entities whose state changes should trigger a React re-render.
 * All other HA entity changes are ignored (no re-render).
 */
const RELEVANT_ENTITIES = new Set([
  // Electricity meter
  "sensor.utility_manual_tracking_electricity_meter_energy",
  // Known devices
  "sensor.bathroom_washer_energy_this_month",
  "sensor.smart_plug_servers_energy",
  "sensor.smart_plug_vacuum_energy",
  // Water meters
  "sensor.water_kitchen_cold_meter",
  "sensor.water_kitchen_hot_meter",
  "sensor.water_bathroom_cold_meter",
  "sensor.water_bathroom_hot_meter",
  // Water daily sensors
  "sensor.water_kitchen_cold_daily",
  "sensor.water_kitchen_hot_daily",
  "sensor.water_bathroom_cold_daily",
  "sensor.water_bathroom_hot_daily",
  "sensor.water_total_daily",
]);

/**
 * Build a signature string from relevant entity states.
 * Only re-render when this signature changes.
 */
function entitySignature(hass: HomeAssistant): string {
  let sig = "";
  for (const id of RELEVANT_ENTITIES) {
    const entity = hass.states[id];
    if (entity) {
      sig += id + ":" + entity.state + ":" + entity.last_updated + ";";
    }
  }
  return sig;
}

class UtilityDashboardPanel extends HTMLElement {
  private _root: Root | null = null;
  private _hass: HomeAssistant | null = null;
  private _mounted = false;
  private _rafId: number | null = null;
  private _lastSignature = "";

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (!this._mounted) {
      // First render — mount immediately
      this._mounted = true;
      this._lastSignature = entitySignature(hass);
      this._doRender();
      return;
    }

    // Check if any relevant entity actually changed
    const sig = entitySignature(hass);
    if (sig === this._lastSignature) return; // nothing changed
    this._lastSignature = sig;

    // Batch into a single rAF (avoids render storms)
    if (this._rafId === null) {
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        this._doRender();
      });
    }
  }

  connectedCallback() {
    if (!this._root) {
      // Use Shadow DOM so Tailwind CSS applies inside HA's own shadow tree
      const shadow = this.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = cssText;
      shadow.appendChild(style);

      const mountPoint = document.createElement("div");
      mountPoint.className = "utility-dashboard";
      shadow.appendChild(mountPoint);

      this._root = createRoot(mountPoint);
    }
    this._doRender();
  }

  disconnectedCallback() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._root) {
      this._root.unmount();
      this._root = null;
      this._mounted = false;
    }
  }

  private _doRender() {
    if (this._root && this._hass) {
      this._root.render(<App hass={this._hass} />);
    }
  }
}

if (!customElements.get("utility-dashboard-panel")) {
  customElements.define("utility-dashboard-panel", UtilityDashboardPanel);
}
