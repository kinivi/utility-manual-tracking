from datetime import datetime

from custom_components.utility_manual_tracking.device_aware_fitter import (
    DeviceAwareExtrapolate,
    DeviceAwareInterpolate,
)
from custom_components.utility_manual_tracking.fitter import Datapoint


def test_device_aware_normal_distribution():
    """Known devices consume part of the total; base load fills the rest evenly."""
    old_datapoints = [
        Datapoint(100, datetime(2023, 10, 1, 10, 0)),
    ]
    new_datapoint = Datapoint(200, datetime(2023, 10, 1, 15, 0))
    # 5 hours, delta = 100 kWh
    # Device consumed 20 kWh in hour 12:00 and 10 kWh in hour 14:00
    # Total known = 30, residual = 70, base = 70/4 = 17.5 per hour
    device_data = {
        datetime(2023, 10, 1, 12, 0): 20.0,
        datetime(2023, 10, 1, 14, 0): 10.0,
    }
    fitter = DeviceAwareInterpolate(device_data)
    result = fitter.guesstimate(old_datapoints, new_datapoint)

    # Hours: 11:00, 12:00, 13:00, 14:00 (4 hours between 10:00 and 15:00 exclusive)
    assert len(result) == 4

    # Hour 11:00: 0 known + 17.5 base = 17.5 cumulative: 117.5
    assert result[0].timestamp == datetime(2023, 10, 1, 11, 0)
    assert abs(result[0].value - 117.5) < 0.001

    # Hour 12:00: 20 known + 17.5 base = 37.5 cumulative: 155.0
    assert result[1].timestamp == datetime(2023, 10, 1, 12, 0)
    assert abs(result[1].value - 155.0) < 0.001

    # Hour 13:00: 0 known + 17.5 base = 17.5 cumulative: 172.5
    assert result[2].timestamp == datetime(2023, 10, 1, 13, 0)
    assert abs(result[2].value - 172.5) < 0.001

    # Hour 14:00: 10 known + 17.5 base = 27.5 cumulative: 200.0
    assert result[3].timestamp == datetime(2023, 10, 1, 14, 0)
    assert abs(result[3].value - 200.0) < 0.001


def test_device_aware_devices_exceed_meter_delta():
    """When known devices report more than meter delta, base load is 0."""
    old_datapoints = [
        Datapoint(100, datetime(2023, 10, 1, 10, 0)),
    ]
    new_datapoint = Datapoint(150, datetime(2023, 10, 1, 13, 0))
    # 3 hours, delta = 50 kWh
    # Devices report 60 kWh total (exceeds meter delta)
    device_data = {
        datetime(2023, 10, 1, 11, 0): 30.0,
        datetime(2023, 10, 1, 12, 0): 30.0,
    }
    fitter = DeviceAwareInterpolate(device_data)
    result = fitter.guesstimate(old_datapoints, new_datapoint)

    # 2 hours: 11:00, 12:00
    assert len(result) == 2

    # base = max(0, 50-60) / 2 = 0
    # Hour 11:00: 30 + 0 = 30, cumulative: 130
    assert abs(result[0].value - 130.0) < 0.001
    # Hour 12:00: 30 + 0 = 30, cumulative: 160
    # Note: total (160) exceeds new_datapoint.value (150) — trusting device data
    assert abs(result[1].value - 160.0) < 0.001


def test_device_aware_no_device_data():
    """Without device data, behaves like linear interpolation."""
    old_datapoints = [
        Datapoint(100, datetime(2023, 10, 1, 10, 0)),
    ]
    new_datapoint = Datapoint(200, datetime(2023, 10, 1, 15, 0))
    # 5 hours, delta = 100, all base load: 100/4 = 25 per hour
    fitter = DeviceAwareInterpolate({})
    result = fitter.guesstimate(old_datapoints, new_datapoint)

    assert len(result) == 4
    # Pure even distribution: 125, 150, 175, 200
    assert abs(result[0].value - 125.0) < 0.001
    assert abs(result[1].value - 150.0) < 0.001
    assert abs(result[2].value - 175.0) < 0.001
    assert abs(result[3].value - 200.0) < 0.001


def test_device_aware_no_old_datapoints():
    """No old datapoints returns empty list."""
    new_datapoint = Datapoint(200, datetime(2023, 10, 1, 15, 0))
    fitter = DeviceAwareInterpolate({})
    result = fitter.guesstimate([], new_datapoint)
    assert len(result) == 0


def test_device_aware_single_hour_gap():
    """One hour gap produces no intermediate datapoints (same as linear)."""
    old_datapoints = [
        Datapoint(100, datetime(2023, 10, 1, 10, 0)),
    ]
    new_datapoint = Datapoint(110, datetime(2023, 10, 1, 11, 0))
    fitter = DeviceAwareInterpolate({})
    result = fitter.guesstimate(old_datapoints, new_datapoint)
    # No hours strictly between 10:00 and 11:00
    assert len(result) == 0


def test_device_aware_partial_device_data():
    """Device data for some hours only; others get 0 known consumption."""
    old_datapoints = [
        Datapoint(0, datetime(2023, 10, 1, 0, 0)),
    ]
    new_datapoint = Datapoint(100, datetime(2023, 10, 1, 5, 0))
    # 5 hours, delta = 100
    # Device has data only for hour 3:00 (15 kWh)
    device_data = {
        datetime(2023, 10, 1, 3, 0): 15.0,
    }
    fitter = DeviceAwareInterpolate(device_data)
    result = fitter.guesstimate(old_datapoints, new_datapoint)

    # 4 hours: 1:00, 2:00, 3:00, 4:00
    assert len(result) == 4
    # total_known = 15, residual = 85, base = 85/4 = 21.25
    base = 85.0 / 4

    # 1:00: 0 + 21.25 = 21.25, cumulative: 21.25
    assert abs(result[0].value - base) < 0.001
    # 2:00: 0 + 21.25, cumulative: 42.5
    assert abs(result[1].value - 2 * base) < 0.001
    # 3:00: 15 + 21.25 = 36.25, cumulative: 78.75
    assert abs(result[2].value - (2 * base + 15.0 + base)) < 0.001
    # 4:00: 0 + 21.25, cumulative: 100.0
    assert abs(result[3].value - 100.0) < 0.001


def test_device_aware_extrapolate_normal():
    """Extrapolation uses linear slope regardless of device data."""
    datapoints = [
        Datapoint(100, datetime(2023, 10, 1, 10, 0)),
        Datapoint(200, datetime(2023, 10, 1, 11, 0)),
    ]
    now = datetime(2023, 10, 1, 14, 0)

    extrap = DeviceAwareExtrapolate()
    result = extrap.guesstimate(datapoints, now)

    # slope = 100/hr, 3 hours later → 200 + 300 = 500
    assert result.value == 500
    assert result.timestamp == now


def test_device_aware_extrapolate_no_datapoints():
    """Extrapolation with no data returns None."""
    extrap = DeviceAwareExtrapolate()
    result = extrap.guesstimate([], datetime(2023, 10, 1, 14, 0))
    assert result is None


def test_device_aware_extrapolate_one_datapoint():
    """Extrapolation with one datapoint returns that value."""
    extrap = DeviceAwareExtrapolate()
    now = datetime(2023, 10, 1, 14, 0)
    result = extrap.guesstimate([Datapoint(42, datetime(2023, 10, 1, 10, 0))], now)
    assert result.value == 42
    assert result.timestamp == now
