"""Config flow for Utility Manual Tracking."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, OptionsFlowWithConfigEntry
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from custom_components.utility_manual_tracking.consts import (
    CONF_ALGORITHM,
    CONF_KNOWN_DEVICE_ENTITIES,
    CONF_METER_CLASS,
    CONF_METER_NAME,
    CONF_METER_UNIT,
    DOMAIN,
)


class UtilityManualTrackingConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 2

    def __init__(self) -> None:
        self._user_input: dict[str, Any] = {}

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Get the options flow handler."""
        return UtilityManualTrackingOptionsFlow(config_entry)

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        errors: dict[str, str] = {}

        if user_input is not None:
            algorithm = user_input.get(CONF_ALGORITHM, "linear")

            # device_aware only valid for energy meters
            if algorithm == "device_aware" and user_input.get(CONF_METER_CLASS, "").lower() != "energy":
                errors["base"] = "device_aware_energy_only"
            else:
                self._user_input = user_input

                if algorithm == "device_aware":
                    return await self.async_step_device_aware()

                return self.async_create_entry(
                    title=user_input[CONF_METER_NAME],
                    data={
                        CONF_METER_NAME: user_input[CONF_METER_NAME],
                        CONF_METER_UNIT: user_input[CONF_METER_UNIT],
                        CONF_METER_CLASS: user_input[CONF_METER_CLASS],
                        CONF_ALGORITHM: algorithm,
                        CONF_KNOWN_DEVICE_ENTITIES: [],
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_METER_NAME): str,
                    vol.Required(CONF_METER_UNIT): str,
                    vol.Required(CONF_METER_CLASS): str,
                    vol.Optional(CONF_ALGORITHM, default="linear"): SelectSelector(
                        SelectSelectorConfig(
                            options=["linear", "device_aware"],
                            mode=SelectSelectorMode.DROPDOWN,
                        )
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_device_aware(self, user_input: dict[str, Any] | None = None):
        """Second step: select known device entities for smart smoothing."""
        if user_input is not None:
            return self.async_create_entry(
                title=self._user_input[CONF_METER_NAME],
                data={
                    CONF_METER_NAME: self._user_input[CONF_METER_NAME],
                    CONF_METER_UNIT: self._user_input[CONF_METER_UNIT],
                    CONF_METER_CLASS: self._user_input[CONF_METER_CLASS],
                    CONF_ALGORITHM: self._user_input.get(CONF_ALGORITHM, "device_aware"),
                    CONF_KNOWN_DEVICE_ENTITIES: user_input.get(CONF_KNOWN_DEVICE_ENTITIES, []),
                },
            )

        return self.async_show_form(
            step_id="device_aware",
            data_schema=vol.Schema(
                {
                    vol.Optional(CONF_KNOWN_DEVICE_ENTITIES, default=[]): EntitySelector(
                        EntitySelectorConfig(
                            domain="sensor",
                            device_class="energy",
                            multiple=True,
                        )
                    ),
                }
            ),
        )


class UtilityManualTrackingOptionsFlow(OptionsFlowWithConfigEntry):
    """Options flow for reconfiguring known device entities."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        algorithm = self.config_entry.data.get(CONF_ALGORITHM, "linear")

        if algorithm != "device_aware":
            # No options to configure for linear algorithm
            return self.async_create_entry(data={})

        if user_input is not None:
            return self.async_create_entry(data=user_input)

        current_entities = self.config_entry.options.get(
            CONF_KNOWN_DEVICE_ENTITIES,
            self.config_entry.data.get(CONF_KNOWN_DEVICE_ENTITIES, []),
        )

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_KNOWN_DEVICE_ENTITIES,
                        default=current_entities,
                    ): EntitySelector(
                        EntitySelectorConfig(
                            domain="sensor",
                            device_class="energy",
                            multiple=True,
                        )
                    ),
                }
            ),
        )
