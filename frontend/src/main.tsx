import React from "react";
import { createRoot, Root } from "react-dom/client";
import App from "./App";
import type { HomeAssistant } from "./types";
import cssText from "./index.css?inline";

class UtilityDashboardPanel extends HTMLElement {
  private _root: Root | null = null;
  private _hass: HomeAssistant | null = null;
  private _hassRef: { current: HomeAssistant | null } = { current: null };
  private _renderScheduled = false;
  private _mounted = false;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._hassRef.current = hass;

    if (!this._mounted) {
      // First render — mount immediately
      this._mounted = true;
      this._doRender();
    } else {
      // Subsequent updates — throttle to 1 fps max
      if (!this._renderScheduled) {
        this._renderScheduled = true;
        requestAnimationFrame(() => {
          this._renderScheduled = false;
          this._doRender();
        });
      }
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

customElements.define("utility-dashboard-panel", UtilityDashboardPanel);
