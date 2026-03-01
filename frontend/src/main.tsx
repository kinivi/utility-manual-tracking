import React from "react";
import { createRoot, Root } from "react-dom/client";
import App from "./App";
import type { HomeAssistant } from "./types";
import "./index.css";

class UtilityDashboardPanel extends HTMLElement {
  private _root: Root | null = null;
  private _hass: HomeAssistant | null = null;
  private _mountPoint: HTMLDivElement | null = null;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    if (!this._mountPoint) {
      this._mountPoint = document.createElement("div");
      this._mountPoint.className = "utility-dashboard";
      this.appendChild(this._mountPoint);
      this._root = createRoot(this._mountPoint);
    }
    this._render();
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unmount();
      this._root = null;
      this._mountPoint = null;
    }
  }

  private _render() {
    if (this._root && this._hass) {
      this._root.render(<App hass={this._hass} />);
    }
  }
}

customElements.define("utility-dashboard-panel", UtilityDashboardPanel);
