"""Algorithms for utility manual tracking."""

from __future__ import annotations
import datetime

from dataclasses import dataclass

from custom_components.utility_manual_tracking.fitter import (
    Datapoint,
    Extrapolate,
    Interpolate,
)
from custom_components.utility_manual_tracking.linear_fitter import (
    LinearExtrapolate,
    LinearInterpolate,
)
from custom_components.utility_manual_tracking.device_aware_fitter import (
    DeviceAwareExtrapolate,
    DeviceAwareInterpolate,
)


@dataclass(frozen=True)
class Algorithm:
    """Algorithm class."""

    interpolate: Interpolate
    extrapolate: Extrapolate


ALGORITHMS: dict[str, Algorithm] = {
    "linear": Algorithm(LinearInterpolate(), LinearExtrapolate()),
    "device_aware": Algorithm(DeviceAwareInterpolate(), DeviceAwareExtrapolate()),
}

DEFAULT_ALGORITHM = "linear"


def interpolate(
    algorithm: str,
    old_datapoints: list[Datapoint],
    new_datapoint: Datapoint,
    device_hourly_consumption: dict[datetime.datetime, float] | None = None,
) -> list[Datapoint]:
    """Interpolate a new datapoint based on old datapoints."""
    if algorithm not in ALGORITHMS:
        algorithm = DEFAULT_ALGORITHM

    if algorithm == "device_aware" and device_hourly_consumption is not None:
        fitter = DeviceAwareInterpolate(device_hourly_consumption)
        return fitter.guesstimate(old_datapoints, new_datapoint)

    return ALGORITHMS[algorithm].interpolate.guesstimate(old_datapoints, new_datapoint)


def extrapolate(
    algorithm: str | None, datapoints: list[Datapoint], now: datetime.datetime
) -> Datapoint:
    """Extrapolate a new datapoint based on old datapoints."""
    if algorithm not in ALGORITHMS:
        algorithm = DEFAULT_ALGORITHM
    return ALGORITHMS[algorithm].extrapolate.guesstimate(datapoints, now)
