# CLAUDE.md — Agent Instructions for utility-manual-tracking

## Project

HACS custom integration for Home Assistant. Fork of `kinivi/utility-manual-tracking`. Adds device-aware smart smoothing for electricity meter statistics.

## Deployment

Code is deployed via HACS from GitHub — **not** local file copy. The workflow is:
1. Push to `github.com/kinivi/utility-manual-tracking`
2. User downloads update in HACS
3. User restarts HA
4. Only then can you test changes via MCP

Never suggest copying files to `/config/custom_components/` manually.

## Scope

- **Only electricity meters**. Do not touch water, gas, or any other meter type.
- The component creates its own sensors. It does **not** replace existing HA helpers (input_number, input_datetime). It integrates alongside them.

## HA Recorder API Pitfalls

These caused real bugs. Pay attention:

### clear_statistics signature
```python
# WRONG — causes TypeError
clear_statistics(hass, statistic_id)

# CORRECT — requires Recorder instance and a list
from homeassistant.components.recorder import get_instance
instance = get_instance(hass)
clear_statistics(instance, [statistic_id])
```
`async_add_external_statistics` takes `hass: HomeAssistant` but `clear_statistics` takes `instance: Recorder`. They are inconsistent — always check the actual signature.

### statistics_during_period unit normalization
```python
# WRONG — returns raw units (Wh stays Wh, kWh stays kWh, they get mixed)
statistics_during_period(hass, start, end, entity_ids, "hour", None, {"change"})

# CORRECT — pass the target unit so HA normalizes everything
statistics_during_period(hass, start, end, entity_ids, "hour",
    {"energy": self._attr_native_unit_of_measurement}, {"change"})
```
The washer entity reports in **Wh** while everything else is **kWh**. Without the units parameter, the washer's contribution is 1000x too high.

### row["start"] type varies by HA version
```python
# WRONG — fails if start is already a datetime object
hour_dt = datetime.fromtimestamp(row["start"], tz=timezone.utc)

# CORRECT — handle both
start = row["start"]
if isinstance(start, datetime):
    hour_dt = start
else:
    hour_dt = datetime.fromtimestamp(start, tz=timezone.utc)
```

## Service Registration

If you add a service handler in `action.py`, you must ALSO:
1. Register it in `__init__.py`: `hass.services.register(DOMAIN, "service_name", handler)`
2. Define it in `services.yaml` with name, description, target, and fields

Missing either of these means the service silently doesn't exist.

## Error Handling

Wrap all recorder API calls in try/except. The reset flow must not abort if clearing fails — the backfill should still proceed. Device consumption queries should fall back to empty dict `{}` (even distribution) on any error.

## Config Entry

- Current version: `VERSION = 2`
- Migration from v1 adds `known_device_entities: []`
- If you add new config fields, bump the version and add migration logic in `async_migrate_entry()`

## Known Device Entities

Currently configured:
- `sensor.bathroom_washer_energy_this_month` — **Wh** (not kWh!)
- `sensor.smart_plug_servers_energy` — kWh
- `sensor.smart_plug_vacuum_energy` — kWh

Always account for mixed units via the `units` parameter in statistics queries.

## Testing

There is no way to view HA error logs via MCP. If a service call returns 500, you are debugging blind. Add `exc_info=True` to all `LOGGER.warning()` calls so the user can check logs in HA UI at Settings > System > Logs.

Unit tests are in `tests/test_device_aware_fitter.py`. Run with pytest. These test the algorithm only — not HA integration.

## Known Issues

- Submitting a reading with the same timestamp as the last one raises an unhandled `ValueError`. No dedup or overwrite logic exists yet.
- The `date` field format is `YYYY-mm-dd HH` (space-separated, hour only, no minutes). The automation appends ` 00` for midnight.
