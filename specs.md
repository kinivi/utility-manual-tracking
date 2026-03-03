# Utility Manual Tracking — Specs & Reference

Fork: `github.com/kinivi/utility-manual-tracking`

---

## Part 1: Device-Aware Smoothing (Backend)

### Overview

Custom HACS integration for Home Assistant that tracks utility meters (electricity, gas, water) via manual readings. Instead of relying on smart meters, users submit physical meter readings through the HA UI, and the component generates hourly statistics by interpolating between readings.

The key addition is the **device-aware algorithm** — instead of pure linear interpolation (spreading consumption evenly), it uses real consumption data from individually-measured devices (smart plugs, energy monitors) to create realistic hourly distributions.

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

### Device-Aware Algorithm

Core logic in `device_aware_fitter.py:DeviceAwareInterpolate.guesstimate()`.

1. Calculate `delta_v` = new_reading - previous_reading
2. Query HA recorder for hourly `change` statistics from configured device entities
3. For each hour, look up known device consumption `K[h]`
4. Sum total known: `K = sum(K[h] for all hours)`
5. Residual base load: `residual = max(0, delta_v - K)`, `base_per_hour = residual / num_hours`
6. Each hour: `consumption[h] = K[h] + base_per_hour`

Edge case: when K > delta_v (measurement error), residual = 0, only device data used.

### Services

| Service | Purpose | Target |
|---------|---------|--------|
| `utility_manual_tracking.update_meter_value` | Submit new reading | sensor entity_id |
| `utility_manual_tracking.reset_meter_statistics` | Clear + recalculate all stats | sensor entity_id |

`update_meter_value` fields: `value` (float, required), `date` (string `YYYY-mm-dd HH`, optional).

### Config Entry

- **Version:** 2
- Migration v1→v2 adds `known_device_entities: []`
- Options flow for adding/removing device entities post-setup

---

## Part 2: Utility Dashboard (Frontend Panel)

### Overview

Full-page React dashboard panel appearing in the HA sidebar as "Utilities". Provides cost tracking, forecasting, anomaly detection, water meter visualization, and device-level electricity breakdown.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Charts | Apache ECharts 5.5 |
| Styling | Tailwind CSS 3.4 |
| Bundler | Vite 6 (IIFE output, single file) |
| Web Component | `<utility-dashboard-panel>` with Shadow DOM |

### Project Structure

```
frontend/
├── package.json
├── vite.config.ts           # IIFE build → utility-dashboard-panel.js
├── tsconfig.json
├── tailwind.config.js       # ha-* colors mapped to HA CSS vars
├── postcss.config.js
└── src/
    ├── main.tsx             # Web component shell (Shadow DOM + throttled renders)
    ├── App.tsx              # Tab navigation (Overview / Electricity / Water / Settings)
    ├── types.ts             # All TS types + DEFAULT_SETTINGS
    ├── index.css            # Tailwind directives + base styles
    ├── vite-env.d.ts        # Vite ?inline CSS type declaration
    │
    ├── hooks/
    │   ├── useHass.ts       # HassContext (React context for hass object)
    │   ├── useStatistics.ts # Electricity stats via recorder/statistics_during_period
    │   ├── useWaterMeters.ts # Water meter entity states from hass.states
    │   ├── useDevices.ts    # Device consumption stats (washer/servers/vacuum)
    │   └── useSettings.ts   # localStorage-backed dashboard settings
    │
    ├── pages/
    │   ├── SituationRoom.tsx    # Overview: KPIs, budget progress, anomaly, 30d chart
    │   ├── ElectricityDetail.tsx # Consumption bars, device pie, cost, forecast, heatmap
    │   ├── WaterDetail.tsx      # Per-meter gauges, hot/cold ratio, reading history
    │   └── Settings.tsx         # Rate/budget/anomaly config
    │
    ├── components/
    │   ├── KPICard.tsx          # Metric card with icon + value + unit
    │   ├── ConsumptionBar.tsx   # Daily bar chart (ECharts)
    │   ├── DevicePie.tsx        # Device breakdown pie chart
    │   ├── CostSummary.tsx      # Cost breakdown (daily/monthly/annual)
    │   ├── ForecastLine.tsx     # Trend line with projection
    │   ├── RangeGauge.tsx       # Normal/warning range indicator
    │   ├── AnomalyAlert.tsx     # Z-score anomaly banner
    │   ├── HeatmapGrid.tsx      # Hour × day-of-week heatmap
    │   ├── ReadingTimeline.tsx   # Reading history with deltas
    │   └── WaterBreakdown.tsx   # Stacked hot/cold bar chart
    │
    └── utils/
        ├── statistics.ts    # statsToDaily, statsToHourlyHeatmap, currentMonthTotal
        ├── forecast.ts      # Linear regression, trend detection
        ├── anomaly.ts       # Z-score anomaly detection
        └── cost.ts          # dailyCost, monthlyCost, budgetProgress, formatCurrency
```

### HA Entity IDs

#### Electricity
| Entity | Notes |
|--------|-------|
| `sensor.utility_manual_tracking_electricity_meter_energy` | Main meter sensor |
| Stat ID: `utility_manual_tracking:utility_manual_tracking_electricity_meter_energy_statistics_device_aware` | For `recorder/statistics_during_period` |

#### Known Device Entities
| Entity | Device | Unit |
|--------|--------|------|
| `sensor.bathroom_washer_energy_this_month` | Washer | **Wh** (not kWh!) |
| `sensor.smart_plug_servers_energy` | Servers | kWh |
| `sensor.smart_plug_vacuum_energy` | Vacuum | kWh |

#### Water Meters
| Meter Entity | Daily Entity | Location | Temp |
|-------------|-------------|----------|------|
| `sensor.water_kitchen_cold_meter` | `sensor.water_kitchen_cold_daily` | Kitchen | Cold |
| `sensor.water_kitchen_hot_meter` | `sensor.water_kitchen_hot_daily` | Kitchen | Hot |
| `sensor.water_bathroom_cold_meter` | `sensor.water_bathroom_cold_daily` | Bathroom | Cold |
| `sensor.water_bathroom_hot_meter` | `sensor.water_bathroom_hot_daily` | Bathroom | Hot |
| — | `sensor.water_total_daily` | All | All |

Water meter attributes: `previous_reading`, `last_reading_date`, `unit_of_measurement`.

### Dashboard Settings (localStorage)

| Setting | Default | Unit |
|---------|---------|------|
| `electricityRate` | 0.35 | €/kWh |
| `waterRate` | 4.8 | €/m³ |
| `monthlyElectricityBudget` | 300 | kWh |
| `monthlyWaterBudget` | 10 | m³ |
| `anomalySensitivity` | 2 | σ |
| `currency` | € | symbol |

### Pages

**Situation Room** (default): KPI cards, month-to-date progress bars, range gauge, anomaly banner, 30-day bar chart.

**Electricity Detail**: Consumption bars with 30/90/365d selector, device pie, cost summary, forecast line, hourly heatmap.

**Water Detail**: Total + cost KPIs, per-meter gauge cards, stacked breakdown, hot/cold ratio, reading history.

**Settings**: Rates, budgets, anomaly sensitivity, currency selector.

### Algorithms

**Forecasting** (`forecast.ts`): Linear regression on daily data. Returns dailyRate, monthly/annual forecast, R² confidence, trend direction/percent.

**Anomaly Detection** (`anomaly.ts`): Z-score on 30-day sliding window. `|z| > sensitivity` = anomaly, `|z| > 3` = critical.

**Statistics** (`statistics.ts`): Aggregation helpers handling both string ISO dates and numeric timestamps from HA.

---

## Infrastructure

### Proxmox Host (`smarthomenkise`)
- **IP:** `192.168.178.20`
- **PVE:** 8.3.4, Intel N100, 12GB RAM
- **Credentials:** `root@pam` / `proxmox#Nik28Ita76`
- **Web UI:** `https://192.168.178.20:8006`
- **SSH:** `sshpass -p 'proxmox#Nik28Ita76' ssh root@192.168.178.20`

### HAOS VM (VM 100)
- **IP:** `192.168.178.48` (DHCP)
- **OS:** Home Assistant OS 17.0, HA 2026.2.0
- **SSH:** port 22, password `haos_ssh_2026`
- **SSH command:** `sshpass -p 'haos_ssh_2026' ssh root@192.168.178.48`
- **Config path:** `/config/custom_components/utility_manual_tracking/`
- **Frontend path:** `/config/custom_components/utility_manual_tracking/frontend/`
- **QEMU guest agent:** enabled (but only supports simple exec, no command args via REST API)

### GitHub
- **Repo:** `https://github.com/kinivi/utility-manual-tracking`
- **Branch:** `main`

### Build & Deploy

```bash
# Build
cd frontend && npm run build

# Deploy (direct SCP — fastest for development)
sshpass -p 'haos_ssh_2026' scp \
  custom_components/utility_manual_tracking/frontend/utility-dashboard-panel.js \
  root@192.168.178.48:/config/custom_components/utility_manual_tracking/frontend/

# Also deploy __init__.py if changed
sshpass -p 'haos_ssh_2026' scp \
  custom_components/utility_manual_tracking/__init__.py \
  root@192.168.178.48:/config/custom_components/utility_manual_tracking/

# Clear Python cache + restart
sshpass -p 'haos_ssh_2026' ssh root@192.168.178.48 \
  "rm -rf /config/custom_components/utility_manual_tracking/__pycache__; ha core restart"
```

---

## Bugs Found and Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Unit mismatch (washer 1000x inflated) | Washer reports Wh, others kWh, no unit normalization | Pass `units: { energy: "kWh" }` to all statistics queries |
| `clear_statistics` TypeError | Takes `(instance, [ids])` not `(hass, id)` | Use `get_instance(hass)` + wrap in list |
| Panel not appearing | `async_register_panel` doesn't exist | Use `async_register_built_in_panel` with `js_url` (not `module_url`) |
| Services RuntimeError | `hass.services.register` from async context | Use `hass.services.async_register` |
| `n.date.startsWith` crash | HA statistics `start` field is numeric timestamp, not string | Added `toISODate()` + `String()` guards |
| CSS not applying | Styles in `document.head` don't reach HA's Shadow DOM | Inject CSS inside web component's own Shadow DOM |
| Browser serving old JS | `cache_headers=True` sets 31-day max-age | Set `cache_headers=False`, renamed JS file to bust cache |
| Python not picking up changes | `__pycache__` bytecode cache | Always `rm -rf __pycache__` before restart |
| `row["start"]` type varies | HA version dependent: datetime or timestamp | Type guard: `isinstance(start, datetime)` check |

## Known Issues

- Submitting a reading with same timestamp as last raises unhandled `ValueError`
- The `date` field format is `YYYY-mm-dd HH` (space-separated, hour only, no minutes)
- Water meters are read-only in dashboard — no submission/editing yet
