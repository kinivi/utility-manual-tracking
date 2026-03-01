from __future__ import annotations

import hashlib
import pathlib

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from custom_components.utility_manual_tracking.action import (
    handle_reset_meter_statistics,
    handle_update_meter_value,
)
from custom_components.utility_manual_tracking.consts import (
    CONF_KNOWN_DEVICE_ENTITIES,
    DOMAIN,
    PLATFORMS,
)

PANEL_URL = "/utility_manual_tracking/panel"
PANEL_FRONTEND_PATH = str(pathlib.Path(__file__).parent / "frontend")


async def async_setup(hass: HomeAssistant, config: dict):
    """Setup the Utility Manual Tracking integration."""
    hass.data.setdefault(DOMAIN, {})
    hass.services.async_register(DOMAIN, "update_meter_value", handle_update_meter_value)
    hass.services.async_register(DOMAIN, "reset_meter_statistics", handle_reset_meter_statistics)

    # Serve built frontend files
    await hass.http.async_register_static_paths(
        [StaticPathConfig(PANEL_URL, PANEL_FRONTEND_PATH, cache_headers=True)]
    )

    # Register sidebar panel (cache-bust with file hash)
    js_path = pathlib.Path(PANEL_FRONTEND_PATH) / "utility-dashboard.js"
    js_hash = ""
    if js_path.exists():
        js_hash = hashlib.md5(js_path.read_bytes()).hexdigest()[:8]

    if DOMAIN not in hass.data.get("frontend_panels", {}):
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="Utilities",
            sidebar_icon="mdi:lightning-bolt-circle",
            frontend_url_path="utility-dashboard",
            config={
                "_panel_custom": {
                    "name": "utility-dashboard-panel",
                    "js_url": f"{PANEL_URL}/utility-dashboard.js?v={js_hash}",
                }
            },
        )

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the Utility Manual Tracking integration from a config entry."""
    entry.async_on_unload(entry.add_update_listener(_async_update_options))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old config entries to new version."""
    if config_entry.version < 2:
        new_data = {**config_entry.data, CONF_KNOWN_DEVICE_ENTITIES: []}
        hass.config_entries.async_update_entry(config_entry, data=new_data, version=2)
    return True


async def _async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update — reload the integration to pick up new device entities."""
    await hass.config_entries.async_reload(entry.entry_id)
