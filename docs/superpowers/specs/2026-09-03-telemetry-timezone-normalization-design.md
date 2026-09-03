# Telemetry Timezone Normalization Design

**Date:** 2026-09-03
**Status:** Approved in chat; awaiting written-spec review
**Branch:** `feat/area-monitoring-revisions`

## 1. Objective

Correct telemetry timestamps that currently shift because PLC `_terminalTime` values have no timezone offset. Preserve the machine-provided wall-clock time when it is valid, normalize storage to an absolute UTC instant, and display/export the timestamp in each hospital's local Indonesian timezone without adding repeated timezone text to CSV rows.

## 2. Timestamp Contract

- `_terminalTime` remains the preferred event time when present and valid.
- Offset-aware ISO timestamps are treated as absolute instants and are not reinterpreted.
- Offset-free machine timestamps are interpreted in the hospital's local timezone.
- PostgreSQL `timestamp with time zone` columns continue storing absolute instants.
- `received_at` remains server receipt time. It is used for heartbeat/connectivity, validation, and fallback, never as a replacement for a valid machine event time.
- Invalid or missing machine time falls back to `received_at`.
- Ten-minute history and thirty-minute CSV buckets use normalized machine event time.

## 3. Hospital Timezone Resolution

A single backend resolver maps normalized hospital province names to one of these IANA zones:

- Western Indonesia: `Asia/Jakarta`.
- Central Indonesia: `Asia/Makassar`.
- Eastern Indonesia: `Asia/Jayapura`.

The final implementation mapping must cover all Indonesian provinces currently supported by hospital records. Province matching is case-insensitive and whitespace-normalized. An unknown or empty province uses `Asia/Jakarta` and emits a warning with hospital and machine identifiers so the metadata can be corrected.

Timezone resolution belongs on the machine/hospital context, not in generic date formatting. The resolved zone is not added to reading rows or CSV output.

## 4. Ingestion

The MQTT listener obtains the machine's hospital timezone before parsing an offset-free `_terminalTime`.

Parsing rules:

1. If `_terminalTime` contains `Z` or an explicit numeric offset, parse it as an absolute instant.
2. If it is a supported offset-free PLC format, interpret its date and clock fields in the resolved hospital timezone and convert to a JavaScript `Date`/UTC instant.
3. If it is missing or invalid, use receipt time.
4. Compare the normalized event instant with receipt time. If the absolute difference exceeds a configurable-safe fixed threshold selected in implementation, log a warning but retain the valid machine time.

The same parser is used by `transformMqttPayload` and the live listener to avoid divergent behavior.

## 5. Historical Aggregation

Ten-minute buckets remain aligned to absolute instants derived from normalized machine time. Samples from one machine therefore aggregate consistently even when the server runs in UTC.

The interval stored in `terminal_time` is the bucket's absolute start. Presentation converts it to the hospital's local time. `received_at` continues representing when the aggregate was persisted.

## 6. API and Presentation

Dashboard latest-event display, History/Datalogger, export preview, and CSV all use `terminal_time` as their displayed event timestamp. Heartbeat and online/offline calculations continue using receipt/update timestamps so a misconfigured PLC clock cannot mark a machine online or offline incorrectly.

Presentation uses each row's hospital timezone and the Indonesian date/time format:

```text
DD/MM/YYYY HH:mm:ss
```

No per-row `WIB`, `WITA`, or `WIT` suffix is rendered. The user is expected to know the hospital's local timezone.

## 7. CSV Contract

- The column name remains exactly `Timestamp`.
- No timezone column is added.
- No timezone suffix is appended to cells.
- Multi-machine exports continue using `Nama Mesin` rather than serial number.
- CSV aggregation remains thirty minutes.
- Cache format version is incremented so an older timestamp representation is never returned.

## 8. Filters and Date Inputs

Date-only filters entered by a user are interpreted as the beginning/end of the selected hospital's local day. For an export spanning multiple hospitals, each hospital's rows are evaluated against the same requested wall-clock date range in its own local zone.

Machine-specific and hospital-specific filters use that machine/hospital zone directly. Role and client scope remain unchanged.

## 9. Development Data Correction

Development migration is performed before production deployment:

1. Back up or capture affected development timestamps.
2. For latest and historical rows with a valid offset-free `raw_payload._terminalTime`, resolve the hospital timezone and recompute `terminal_time`.
3. Preserve `received_at` unchanged.
4. Recompute or explicitly handle interval rows whose raw payload represents an aggregate sample so unique `(machine_id, terminal_time)` constraints are not violated.
5. Verify row counts remain unchanged and compare representative rows from WIB, WITA, and WIT hospitals.

The migration must be idempotent or carry an explicit marker/version so it cannot shift corrected timestamps twice. Production data is not modified during development.

## 10. Error Handling and Compatibility

- Legacy payloads without `_terminalTime` continue to persist using receipt time.
- Explicitly offset timestamps continue to work.
- Invalid timestamps do not fail the MQTT message.
- Unknown province metadata does not fail ingestion; it uses the documented fallback and logs a warning.
- Machine time drift produces a warning but preserves valid machine time.
- Vessel telemetry, health scoring, utilization, and client scoping are unchanged.

## 11. Testing Strategy

Tests cover:

- Offset-aware timestamps remain the same instant.
- Offset-free WIB, WITA, and WIT timestamps normalize to the correct UTC instants.
- Missing/invalid timestamps fall back to receipt time.
- Machine time is retained when drift exceeds the warning threshold.
- Unknown province fallback.
- Listener and transformation code use the same parser.
- Ten-minute and thirty-minute bucket alignment after normalization.
- History returns machine event time rather than receipt time.
- Dashboard heartbeat still uses receipt/update time.
- UI and CSV format local hospital time without a timezone suffix or extra column.
- Date filtering around midnight for all three zones.
- Development data correction preserves row counts and is idempotent.
- Existing Vessel, health, scope, and legacy tests remain green.

## 12. Acceptance Criteria

- A valid machine timestamp is never replaced by receipt time.
- Offset-free PLC time is interpreted in the hospital's local timezone.
- Stored timestamps represent correct absolute instants.
- Dashboard, Datalogger, preview, and CSV show local hospital time as `DD/MM/YYYY HH:mm:ss`.
- CSV contains `Timestamp` and no zone column/suffix.
- Multi-machine CSV contains `Nama Mesin`.
- Heartbeat status remains based on server receipt/update time.
- Development legacy data is corrected without changing row counts.
- Production application and database remain untouched until a separate deployment approval.
