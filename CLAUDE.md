# CLAUDE.md — Agent Instructions for utility-manual-tracking

## Project

HACS custom integration for Home Assistant. Fork of `kinivi/utility-manual-tracking`. Two parts:
1. **Backend:** Device-aware smart smoothing for electricity meter statistics
2. **Frontend:** React dashboard panel ("Utilities" in HA sidebar) with cost tracking, forecasting, anomaly detection, water visualization

Full specs in `specs.md`.

---

## Deployment

### Fast Path (SCP — use during development)
```bash
# Build frontend
cd frontend && npm run build

# Deploy JS
sshpass -p 'haos_ssh_2026' scp \
  custom_components/utility_manual_tracking/frontend/utility-dashboard-panel.js \
  root@192.168.178.48:/config/custom_components/utility_manual_tracking/frontend/

# Deploy Python (if changed)
sshpass -p 'haos_ssh_2026' scp \
  custom_components/utility_manual_tracking/__init__.py \
  root@192.168.178.48:/config/custom_components/utility_manual_tracking/

# ALWAYS clear pycache + restart
sshpass -p 'haos_ssh_2026' ssh root@192.168.178.48 \
  "rm -rf /config/custom_components/utility_manual_tracking/__pycache__; ha core restart"
```

### Production Path (HACS)
1. Push to `github.com/kinivi/utility-manual-tracking` (main branch)
2. User redownloads in HACS
3. User restarts HA

### SSH Access
- **HAOS VM:** `sshpass -p 'haos_ssh_2026' ssh root@192.168.178.48`
- **Proxmox host:** `sshpass -p 'proxmox#Nik28Ita76' ssh root@192.168.178.20`
- **HA config path:** `/config/custom_components/utility_manual_tracking/`

---

## Critical Pitfalls (all caused real bugs)

### 1. Always delete `__pycache__` before restarting HA
Python bytecode caching means HA will keep running old `.pyc` files even after you overwrite `.py` files. Every deploy must include:
```bash
rm -rf /config/custom_components/utility_manual_tracking/__pycache__
```

### 2. Panel registration: `async_register_built_in_panel` only
```python
# WRONG — these do not exist
hass.components.frontend.async_register_panel(...)
ha_frontend.async_register_panel(hass, ...)

# CORRECT
from homeassistant.components.frontend import async_register_built_in_panel
async_register_built_in_panel(hass, component_name="custom", ...)
```
Config must use `js_url` (not `module_url`). The custom element name in `_panel_custom.name` must match the `customElements.define()` call.

### 3. Services must use `async_register` from async context
```python
# WRONG — RuntimeError: Cannot be called from within the event loop
hass.services.register(DOMAIN, "service_name", handler)

# CORRECT
hass.services.async_register(DOMAIN, "service_name", handler)
```

### 4. HA statistics `start` field type varies
The `recorder/statistics_during_period` WebSocket API returns `start` as a **numeric timestamp (seconds)**, NOT an ISO string. The Python recorder API returns it as either `datetime` or numeric depending on HA version.

```typescript
// Frontend: always handle both
function toISODate(start: string | number): string {
  if (typeof start === "string") return start;
  return new Date(start * 1000).toISOString();
}
```

```python
# Backend: always handle both
start = row["start"]
if isinstance(start, datetime):
    hour_dt = start
else:
    hour_dt = datetime.fromtimestamp(start, tz=timezone.utc)
```

### 5. `clear_statistics` API signature
```python
# WRONG — causes TypeError
clear_statistics(hass, statistic_id)

# CORRECT — requires Recorder instance and a list
from homeassistant.components.recorder import get_instance
instance = get_instance(hass)
clear_statistics(instance, [statistic_id])
```

### 6. Unit normalization in statistics queries
The washer reports in **Wh**, everything else in **kWh**. Always pass units:
```python
statistics_during_period(hass, start, end, entity_ids, "hour",
    {"energy": "kWh"}, {"change"})
```
```typescript
hass.connection.sendMessagePromise({
  type: "recorder/statistics_during_period",
  // ... other params
  units: { energy: "kWh" },  // REQUIRED
});
```

### 7. Frontend CSS must use Shadow DOM
HA panels live inside Shadow DOM. Styles in `document.head` don't reach panel content.
- CSS is imported via Vite `?inline` (`import cssText from "./index.css?inline"`)
- Injected as `<style>` inside the web component's own shadow root
- NEVER use `document.head.appendChild(style)` — it won't work

### 8. Browser caching
- Static paths use `cache_headers=False` to prevent stale JS
- If you rename the JS file, update both `vite.config.ts` (fileName) and `__init__.py` (js_url)
- Current filename: `utility-dashboard-panel.js`

### 9. Throttle hass updates
HA sets the `hass` property on custom panels on **every entity state change** (multiple times per second). Without throttling, the entire React tree re-renders constantly.
- The web component uses `requestAnimationFrame` to batch updates
- Only renders at most once per animation frame

---

## Scope

- **Backend:** Only electricity meters. Do not touch water, gas, or other meter types.
- **Frontend:** Covers both electricity and water visualization. Water data comes from entity states (read-only), not the tracking component.

---

## Service Registration

If you add a service handler in `action.py`, you must ALSO:
1. Register it in `__init__.py`: `hass.services.async_register(DOMAIN, "service_name", handler)`
2. Define it in `services.yaml` with name, description, target, and fields

Missing either = service silently doesn't exist.

---

## Error Handling

- Wrap all recorder API calls in try/except
- Reset flow must not abort if clearing fails — backfill should still proceed
- Device consumption queries fall back to `{}` (even distribution) on error
- Add `exc_info=True` to all `LOGGER.warning()` calls for debugging

---

## Config Entry

- **Version:** 2
- Migration from v1 adds `known_device_entities: []`
- Bump version + add migration in `async_migrate_entry()` if adding new fields

---

## Frontend Build

```bash
cd frontend
npm install    # First time only
npm run build  # Outputs: ../custom_components/.../frontend/utility-dashboard-panel.js
```

The build produces a single IIFE JS file (~810KB, ~265KB gzip) containing React, ECharts, Tailwind CSS, and all application code.

**Key config files:**
- `vite.config.ts` — IIFE lib build, output filename
- `tailwind.config.js` — `ha-*` color classes mapped to HA CSS variables
- `postcss.config.js` — Tailwind + autoprefixer
- `tsconfig.json` — Strict TypeScript

---

## Entity Reference

### Electricity
- Sensor: `sensor.utility_manual_tracking_electricity_meter_energy`
- Stat ID: `utility_manual_tracking:utility_manual_tracking_electricity_meter_energy_statistics_device_aware`

### Known Devices
- `sensor.bathroom_washer_energy_this_month` — **Wh** (not kWh!)
- `sensor.smart_plug_servers_energy` — kWh
- `sensor.smart_plug_vacuum_energy` — kWh

### Water Meters
- `sensor.water_{kitchen,bathroom}_{cold,hot}_meter` — reading (m³)
- `sensor.water_{kitchen,bathroom}_{cold,hot}_daily` — daily usage (L/day)
- `sensor.water_total_daily` — total daily (L/day)
- Attributes: `previous_reading`, `last_reading_date`

---

## Testing

- Unit tests: `tests/test_device_aware_fitter.py` (run with pytest)
- No way to view HA error logs remotely. User checks Settings > System > Logs.
- To verify frontend: SCP + restart, then hard-refresh browser (Cmd+Shift+R)

---

## Known Issues

- Submitting a reading with same timestamp as last raises unhandled `ValueError`
- Date format: `YYYY-mm-dd HH` (space-separated, hour only). Automation appends ` 00` for midnight.
- Water meters are read-only in dashboard (no submission/editing)

---

## Proxmox / VM Access

Only needed for low-level debugging. Prefer SSH to HAOS directly.

- **PVE host:** `192.168.178.20:8006`, `root@pam` / `proxmox#Nik28Ita76`
- **HAOS VM:** ID 100, IP `192.168.178.48`, guest agent enabled
- **PVE guest exec** (`qm guest exec 100 -- cmd`): works for simple commands, but does NOT support command arguments via REST API. Use SSH instead.
- **HA supervisor token** (from inside HA container): `docker exec homeassistant bash -c 'echo $SUPERVISOR_TOKEN'`
