import { createContext, useContext } from "react";
import type { HomeAssistant } from "../types";

export const HassContext = createContext<HomeAssistant | null>(null);

export function useHass(): HomeAssistant {
  const hass = useContext(HassContext);
  if (!hass) throw new Error("useHass must be used within HassContext.Provider");
  return hass;
}
