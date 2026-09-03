# Vessel Telemetry Design

**Date:** 2026-09-03
**Status:** Approved in chat; awaiting written-spec review
**Branch:** `feat/area-monitoring-revisions`

## 1. Objective

Prepare the PSA Generator data pipeline for two new Schneider PLC metrics before the PLC update starts transmitting them. Once present in MQTT payloads, Vessel 1 and Vessel 2 must be captured automatically, persisted in realtime and historical storage, averaged with the existing intervals, and displayed in Dashboard, Datalogger, preview, and CSV export.

## 2. Metric Contract

| Application field | MQTT key | Type | Unit | Missing value |
|---|---|---|---|---|
| `vessel1` / `vessel_1` | `Schneider_PLC_VESSEL1` | decimal | `MPa` | `NULL`, displayed as `-` |
| `vessel2` / `vessel_2` | `Schneider_PLC_VESSEL2` | decimal | `MPa` | `NULL`, displayed as `-` |

Incoming values are stored without conversion. Empty strings, absent fields, `null`, and non-finite numeric values are treated as unavailable rather than zero. A real numeric zero remains valid data and must display as `0`.

Vessel values do not participate in machine status, purity classification, pressure classification, utilization, or health-score calculation.

## 3. Selected Data Model

The selected approach is direct nullable columns. Add these columns to both reading tables:

- `machine_readings.vessel_1 decimal(10,2) NULL`
- `machine_readings.vessel_2 decimal(10,2) NULL`
- `machine_latest_readings.vessel_1 decimal(10,2) NULL`
- `machine_latest_readings.vessel_2 decimal(10,2) NULL`

This approach is preferred over storing the metrics only in `raw_payload`, because direct columns support typed queries, database averaging, stable API contracts, and efficient export. A generic metric-value table is rejected for now because two known metrics do not justify the additional joins and ingestion complexity.

The migration is additive. No existing columns or data are renamed, rewritten, or deleted. Existing records receive `NULL` for both Vessel columns.

## 4. MQTT Ingestion and Realtime State

The MQTT listener recognizes `Schneider_PLC_VESSEL1` and `Schneider_PLC_VESSEL2` in the same message used by the existing Schneider metrics.

For every valid registered and hospital-assigned machine:

1. Parse each Vessel value independently.
2. Preserve missing values as `null`.
3. Include both values in the latest Redis reading.
4. Upsert both values into `machine_latest_readings`.
5. Include both values in the 10-minute sample buffer.

Payloads that do not contain Vessel fields continue through the normal ingestion flow. Missing Vessel data must never reject or delay oxygen, pressure, flow, runtime, heartbeat, or status updates.

The standalone MQTT payload transformer and the active listener use the same field contract so test and runtime behavior cannot diverge.

## 5. Ten-Minute Historical Aggregation

Vessel 1 and Vessel 2 join the existing aligned 10-minute average calculation.

- Average only finite, non-null values for each field.
- If an interval has Vessel 1 samples but no Vessel 2 samples, store the Vessel 1 average and `NULL` for Vessel 2.
- If all samples for a Vessel field are absent, store `NULL`.
- A numeric zero participates in the average.
- Other metrics and buffer retry/idempotency behavior remain unchanged.

The resulting averages are written to the new `machine_readings` columns.

## 6. Dashboard

The Dashboard API exposes `vessel1` and `vessel2` per machine. Realtime Redis values take priority, with `machine_latest_readings` as fallback, matching the existing metric strategy.

The station table adds:

- `Vessel 1 (MPa)`
- `Vessel 2 (MPa)`

Unavailable values display as `-`; numeric zero displays as `0`. The new columns are informational only and do not alter filters, status, or health.

Existing internal Area visibility and client hospital scoping remain unchanged.

## 7. Datalogger and Preview

The history API returns `vessel1` and `vessel2` from `machine_readings`. The Database Logger table and export preview add corresponding `Vessel 1 (MPa)` and `Vessel 2 (MPa)` columns.

Historical `NULL` values display as `-`. The frontend types preserve `number | null` so missing values are not accidentally converted to zero.

## 8. Thirty-Minute CSV Export

The existing aligned 30-minute export averages include Vessel 1 and Vessel 2 using PostgreSQL `avg`, which naturally excludes `NULL` values.

CSV columns are added as:

- `Vessel 1 (MPa)`
- `Vessel 2 (MPa)`

An unavailable 30-minute average is exported as an empty cell, not `0.00`. The existing conditional Serial Number rule, client hospital scope, date range, cache behavior, and all other columns remain unchanged. The export cache format version is incremented so an older cached CSV cannot omit the new columns.

## 9. Deployment and Migration

Implementation and verification occur first against `psa_generator_dev` in the isolated worktree.

Deployment order for production is:

1. Back up the production database.
2. Apply the additive Vessel-column migration.
3. Verify the four columns exist and existing row counts are unchanged.
4. Deploy the application and MQTT listener together.
5. Verify an old payload without Vessel fields still persists normally.
6. When the PLC update is ready, verify a payload containing Vessel values appears in latest storage, the 10-minute historical bucket, Dashboard, Datalogger, and 30-minute export.

This design does not authorize applying the migration to the currently running production database during development. Production migration remains a separate deployment action.

## 10. Error Handling and Compatibility

- Invalid Vessel values are logged as unavailable and do not fail the entire MQTT message.
- Existing Schneider and Siemens payloads remain compatible.
- Siemens payloads have `NULL` Vessel values unless equivalent MQTT keys are specified in a future change.
- Older database rows remain readable.
- Dashboard and Datalogger render missing values safely.
- No placeholder `0` is introduced for data that has not arrived.

## 11. Testing Strategy

Tests cover:

- Schema presence, decimal type, and nullable behavior for all four columns.
- MQTT parsing with both fields, one missing field, both missing fields, zero, and invalid values.
- Latest-reading upsert and Redis payload propagation.
- Independent nullable 10-minute averages.
- Dashboard Redis-first and database-fallback mapping.
- History API serialization preserving `null`.
- Dashboard, Datalogger, and preview display of values, zero, and `-`.
- Thirty-minute SQL aggregation and CSV headers/cells.
- Regression coverage proving health and machine status do not change because of Vessel values.
- Existing legacy payloads and existing full test suite.

## 12. Acceptance Criteria

- The application operates normally before PLC Vessel fields are available.
- As soon as valid Vessel fields arrive, no manual registration or schema change is required.
- Latest Vessel values appear on Dashboard.
- Ten-minute Vessel averages are persisted in historical readings.
- Datalogger displays the stored values.
- CSV exports 30-minute Vessel averages.
- Missing data consistently remains `NULL`, displays as `-`, and exports as an empty cell.
- Vessel metrics do not affect health or connectivity status.
- Existing production data is preserved by an additive migration.
