"""Device-aware fitter for the utility manual tracking component.

Instead of pure linear interpolation, this fitter uses known device
consumption data (from smart plugs, energy monitors) to create a more
realistic hourly distribution. The remaining "base load" (total meter
delta minus known device consumption) is spread evenly across hours.
"""

from __future__ import annotations

import datetime

from custom_components.utility_manual_tracking.fitter import (
    GRANULAR_DELTA,
    Datapoint,
    Extrapolate,
    Interpolate,
)


class DeviceAwareInterpolate(Interpolate):
    """Interpolate using known device consumption data.

    For each hour between readings:
      consumption[h] = known_device[h] + base_load_per_hour

    Where base_load_per_hour = max(0, meter_delta - total_known) / num_hours.
    """

    def __init__(
        self, device_hourly_consumption: dict[datetime.datetime, float] | None = None
    ) -> None:
        self._device_hourly_consumption: dict[datetime.datetime, float] = (
            device_hourly_consumption or {}
        )

    def guesstimate(
        self, old_datapoints: list[Datapoint], new_datapoint: Datapoint
    ) -> list[Datapoint]:
        if len(old_datapoints) == 0:
            return []

        latest_old = old_datapoints[-1]
        delta_v = new_datapoint.value - latest_old.value

        # Build hour-aligned timestamps between latest_old and new_datapoint
        hours: list[datetime.datetime] = []
        current = latest_old.timestamp + GRANULAR_DELTA
        while current < new_datapoint.timestamp:
            hour_key = current.replace(minute=0, second=0, microsecond=0)
            hours.append(hour_key)
            current += GRANULAR_DELTA

        if not hours:
            return []

        num_hours = len(hours)

        # Look up known device consumption for each hour
        known_per_hour: list[float] = []
        total_known = 0.0
        for h in hours:
            k = self._device_hourly_consumption.get(h, 0.0)
            known_per_hour.append(k)
            total_known += k

        # Base load: residual after subtracting known devices.
        # Clamped to 0 when devices report more than the meter delta
        # (trust device data per user requirement).
        residual = max(0.0, delta_v - total_known)
        base_per_hour = residual / num_hours

        # Build cumulative datapoints
        cumulative = latest_old.value
        result: list[Datapoint] = []
        for i, h in enumerate(hours):
            consumption = known_per_hour[i] + base_per_hour
            cumulative += consumption
            result.append(Datapoint(cumulative, h))

        return result


class DeviceAwareExtrapolate(Extrapolate):
    """For extrapolation, reuse linear behavior.

    We cannot predict future device usage, so extrapolation uses the
    same slope-based approach as LinearExtrapolate.
    """

    def guesstimate(
        self, datapoints: list[Datapoint], now: datetime.datetime
    ) -> Datapoint:
        if len(datapoints) == 0:
            return None

        if len(datapoints) == 1:
            return Datapoint(datapoints[0].value, now)

        latest = datapoints[-1]
        second_latest = datapoints[-2]
        diff_secs = (latest.timestamp - second_latest.timestamp).total_seconds()
        diff_val = latest.value - second_latest.value
        slope = diff_val / diff_secs

        return Datapoint(
            latest.value + slope * (now - latest.timestamp).total_seconds(),
            now,
        )
