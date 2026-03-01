# Utility Manual Tracking — Device-Aware Smoothing Spec

Fork: `github.com/kinivi/utility-manual-tracking`

## Overview

Custom HACS integration for Home Assistant that tracks utility meters (electricity, gas, water) via manual readings. Instead of relying on smart meters, users submit physical meter readings through the HA UI, and the component generates hourly statistics by interpolating between readings.

The key addition is the **device-aware algorithm** — instead of pure linear interpolation (spreading consumption evenly), it uses real consumption data from individually-measured devices (smart plugs, energy monitors) to create realistic hourly distributions.

## Problem

Linear interpolation produces flat, unrealistic statistics:
- 707 kWh over 126 days = 5.6 kWh/day, every day identical
- Energy Dashboard shows no variation, making it useless for analysis

With device-aware smoothing:
- Days when the washing machine ran show 9-12 kWh
- Idle days show ~5.2 kWh
- The distribution reflects actual usage patterns

## Architecture

The component creates its own sensor entities — it does **not** replace existing HA helpers (input_number, input_datetime). It integrates alongside them via automation.

### Data Flow

```
User enters reading in dashboard (input_number + input_datetime)
  → Automation fires
    → Calls utility_manual_tracking.update_meter_value
      → Sensor stores reading
      → Queries device statistics from HA recorder
      → Runs device-aware interpolation
      → Backfills external statistics via async_add_external_statistics
        → Energy Dashboard shows results
```

## Device-Aware Algorithm

Core logic in `device_aware_fitter.py:DeviceAwareInterpolate.guesstimate()`.

### Steps

1. Calculate `delta_v` = new_reading - previous_reading (total consumption in period)
2. Query HA recorder for hourly `change` statistics from configured device entities
3. For each hour between readings, look up known device consumption `K[h]`
4. Sum total known: `K = sum(K[h] for all hours)`
5. Calculate residual base load:
   ```
   residual = max(0, delta_v - K)
   base_per_hour = residual / num_hours
   ```
6. Each hour gets: `consumption[h] = K[h] + base_per_hour`
7. Build cumulative datapoints for statistics

### Edge Case: K > delta_v

When known device consumption exceeds the meter delta (measurement error, meter rounding), `residual = 0`. Only device data is used. The algorithm trusts device sensors over the meter in this case.

### Extrapolation

Future extrapolation (current state estimation) uses linear slope-based approach since we cannot predict future device usage.

### Unit Normalization

The `_query_device_consumption` method passes `{"energy": self._attr_native_unit_of_measurement}` to `statistics_during_period`. This ensures all device statistics are normalized to the meter's unit (e.g., a washer reporting in Wh gets converted to kWh automatically by HA).

## Files Modified/Created

### New Files

| File | Purpose |
|------|---------|
| `device_aware_fitter.py` | `DeviceAwareInterpolate` and `DeviceAwareExtrapolate` classes |
| `tests/test_device_aware_fitter.py` | 9 test cases for the algorithm |

### Modified Files

| File | Changes |
|------|---------|
| `consts.py` | Added `CONF_ALGORITHM`, `CONF_KNOWN_DEVICE_ENTITIES` constants |
| `algorithms.py` | Registered `device_aware` in `ALGORITHMS` dict; `interpolate()` accepts optional `device_hourly_consumption` kwarg and creates fresh `DeviceAwareInterpolate` instance per call |
| `sensor.py` | Added `known_device_entities` param, `_query_device_consumption()` method, device data querying in `set_value()` and `reset_statistics()` |
| `config_flow.py` | Two-step config flow (Step 1: algorithm dropdown, Step 2: EntitySelector for devices); `OptionsFlowWithConfigEntry` for reconfiguration; `VERSION = 2` |
| `__init__.py` | `async_migrate_entry()` for v1->v2 migration; options update listener; registered `reset_meter_statistics` service |
| `statistics.py` | `reset_statistics()` uses `get_instance(hass)` + `clear_statistics(instance, [id])` with try/except; `backfill_statistics()` unchanged |
| `services.yaml` | Added `reset_meter_statistics` service definition |
| `translations/en.json` | Strings for device_aware step, options flow, error messages |

## Config Flow

### Step 1: Basic Setup
- Meter name (e.g., "Electricity Meter")
- Meter unit (e.g., "kWh")
- Meter class (e.g., "energy")
- Algorithm dropdown: `linear` | `device_aware`

### Step 2: Device Selection (only if device_aware)
- Multi-select `EntitySelector` filtered to `domain=sensor, device_class=energy`
- User picks known device entities (smart plugs, energy monitors)

### Options Flow
- Available post-setup to add/remove known device entities
- Triggers integration reload on save

### Config Entry Migration
- v1 -> v2: Adds empty `known_device_entities: []` to existing entries

## Services

### `utility_manual_tracking.update_meter_value`
Submit a new meter reading.
- **target**: entity_id of the tracking sensor
- **value** (required): meter reading (float)
- **date** (optional): reading date in `YYYY-mm-dd HH` format

### `utility_manual_tracking.reset_meter_statistics`
Clear and recalculate all statistics from stored readings. Useful after bug fixes or config changes.
- **target**: entity_id of the tracking sensor

## HA Integration Points

### Recorder Statistics API
- `statistics_during_period()` — queries hourly `change` data from device entities with unit normalization
- `async_add_external_statistics()` — writes backfilled hourly statistics
- `clear_statistics()` — clears old statistics before re-backfill (requires `Recorder` instance, not `HomeAssistant`)

### Entity Storage
- Uses `homeassistant.helpers.storage.Store` for persistence
- Stores: last_read, last_updated, previous_reads (up to 10), algorithm, known_device_entities
- Survives HA restarts

### Automation Integration
The existing meters dashboard at `/meters-dashboard/input` has an automation (`automation.submit_electricity_meter_reading`) that forwards readings to the component:
```yaml
- action: utility_manual_tracking.update_meter_value
  target:
    entity_id: sensor.utility_manual_tracking_electricity_meter_energy
  data:
    value: "{{ states('input_number.electricity_input') | float }}"
    date: "{{ states('input_datetime.electricity_input_date') }} 00"
```

## Current Configuration

- **Sensor**: `sensor.utility_manual_tracking_electricity_meter_energy`
- **Algorithm**: `device_aware`
- **Known devices**:
  - `sensor.bathroom_washer_energy_this_month` (Wh, auto-converted to kWh)
  - `sensor.smart_plug_servers_energy` (kWh)
  - `sensor.smart_plug_vacuum_energy` (kWh)
- **Readings stored**:
  - 55,411 kWh @ 2025-09-21
  - 56,118 kWh @ 2026-01-25
- **Statistics**: 127 daily entries, non-uniform distribution reflecting device activity

## Bugs Found and Fixed

### Unit Mismatch (commit 91313cf)
`sensor.bathroom_washer_energy_this_month` reports in Wh while others use kWh. Without unit normalization, the washer's contribution was inflated 1000x. Fixed by passing `{"energy": self._attr_native_unit_of_measurement}` to `statistics_during_period`.

### Missing reset_meter_statistics Service (commit 1ea49c1)
Handler existed in `action.py` but was never registered in `__init__.py` or defined in `services.yaml`.

### clear_statistics API Mismatch (commit d1c39cf)
`clear_statistics` expects `(instance: Recorder, statistic_ids: list[str])` but code was passing `(hass: HomeAssistant, statistic_id: str)`. Fixed to use `get_instance(hass)` and wrap in list.

### Robustness Fixes (commit 903be56)
- Wrapped `clear_statistics` and `reset_statistics` in try/except so backfill proceeds even if clearing fails
- Moved row aggregation inside try/except in `_query_device_consumption`
- Handle `row["start"]` being either a `datetime` object or a numeric timestamp (HA version dependent)

## Known Issues

- Submitting a reading with the same timestamp as the last reading raises an unhandled `ValueError` (500 error). No deduplication or overwrite logic.
- Water meters are not touched — only electricity uses device-aware smoothing.
