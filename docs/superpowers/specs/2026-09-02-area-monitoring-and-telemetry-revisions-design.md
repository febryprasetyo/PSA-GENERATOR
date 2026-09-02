# Area Monitoring and Telemetry Revisions Design

**Date:** 2026-09-02
**Status:** Approved in chat; awaiting written-spec review
**Branch:** `feat/area-monitoring-revisions`

## 1. Objective

Extend the existing PSA Generator application without replacing the current Rumah Sakit master. The change adds dynamic Area management, Area-based dashboard filtering, corrected purity classification and engineering units, 10-minute historical persistence, and 30-minute averaged CSV exports with a conditional serial-number column.

## 2. Scope

### Included

- Preserve the existing Rumah Sakit master and make its create flow reliable.
- Add Area master data and hospital membership management.
- Allow one Area to contain many hospitals while enforcing that one hospital belongs to at most one Area.
- Make every machine inherit its Area through its parent hospital.
- Add an Area filter to the dashboard.
- Change purity classification to two levels at the agreed boundary.
- Correct dashboard engineering-unit labels.
- Persist averaged historical readings every 10 minutes.
- Export averages in aligned 30-minute intervals.
- Hide or show the CSV serial-number column based on the exported hospitals' machine counts.

### Excluded

- Renaming or replacing the Rumah Sakit master with a generic institution master.
- Assigning machines individually to Areas.
- Allowing a hospital to belong to multiple Areas.
- Changing the real-time latest-reading update frequency.
- Adding geographic polygons, maps, provinces, or automatic geographic assignment.
- Changing pressure thresholds or offline detection rules.

## 3. Existing-System Findings

- The Rumah Sakit create UI and `POST /api/clients` endpoint already exist. This work will retain them, add explicit validation and test coverage, and correct any integration failure found during implementation.
- Historical MQTT samples are currently buffered in Redis and flushed as hourly averages into `machine_readings`.
- Latest readings are updated separately in Redis and `machine_latest_readings`, so historical aggregation can change without degrading the real-time dashboard.
- Purity currently supports normal, warning, and critical thresholds. The new requirement has only Optimal and Kritis states for purity.
- CSV export currently emits one row per stored historical record and always includes Serial Number.

## 4. Data Model

### 4.1 Areas

Add an `areas` table:

| Column | Type | Constraint |
|---|---|---|
| `id` | text/UUID | primary key |
| `name` | varchar(150) | required, unique after trimming/case normalization |
| `description` | text | optional |
| `created_at` | timestamp | required, default now |
| `updated_at` | timestamp | required, default now |

Area names are trimmed. Blank names are rejected. Duplicate names that differ only by case or surrounding whitespace are rejected at the API layer and protected by a unique database index on `lower(name)`.

### 4.2 Hospital Membership

Add an `area_hospitals` junction table:

| Column | Type | Constraint |
|---|---|---|
| `area_id` | text/UUID | foreign key to `areas.id`, cascade on Area deletion |
| `hospital_id` | text/UUID | foreign key to `master_hospitals.id`, cascade on hospital deletion |
| `created_at` | timestamp | required, default now |
| `updated_at` | timestamp | required, default now |

The table has a composite primary key or unique constraint on `(area_id, hospital_id)` and, critically, a unique constraint on `hospital_id`. The second constraint enforces the business rule that one hospital can belong to no more than one Area even though membership uses a junction table.

No Area foreign key is added to `machines`. Area is resolved through `machines.client_id -> master_hospitals.id -> area_hospitals.hospital_id`. A hospital move therefore moves all of its machines atomically from the dashboard's perspective.

Existing hospitals remain valid without membership and appear as `Belum Memiliki Area`.

## 5. Authorization

| Action | Admin | Operator | Client | Viewer |
|---|---:|---:|---:|---:|
| List/view Areas | Yes | Yes | No | No |
| Create Area | Yes | No | No | No |
| Rename/edit Area | Yes | No | No | No |
| Delete Area | Yes | No | No | No |
| Assign/move/remove hospital membership | Yes | Yes | No | No |
| Use dashboard Area filter | Yes | Yes | Within existing dashboard access | Within existing dashboard access |

Clients remain constrained to their assigned hospital by the existing access scope. They must never gain visibility into another hospital through an Area filter. Viewer behavior remains consistent with the current route and dashboard authorization.

## 6. Area API and Membership Behavior

Provide authenticated endpoints following existing Next.js App Router patterns:

- `GET /api/areas`: list Areas with member counts and current hospital membership for management UI.
- `POST /api/areas`: admin-only creation.
- `PUT /api/areas/[id]`: admin-only name/description update.
- `DELETE /api/areas/[id]`: admin-only deletion.
- `PUT /api/areas/[id]/hospitals`: admin/operator replacement of the selected hospital membership set.

Membership replacement runs in a database transaction:

1. Validate that the Area exists.
2. Validate all hospital IDs exist.
3. Remove selected hospitals from any previous Area.
4. Replace the target Area's membership with the submitted unique hospital IDs.
5. Commit all changes together.

This makes moving a hospital deterministic and prevents an intermediate multi-Area state. Duplicate submitted IDs are normalized. Invalid IDs produce a 400 response; missing Area produces 404; authorization failures produce 403.

Deleting an Area deletes only Area membership rows through cascade. It does not delete hospitals, users, machines, latest readings, or historical readings.

## 7. Area Management UI

Add an `Area` entry under the sidebar Management section for admin and operator.

The Area page shows:

- Area name and optional description.
- Count and names of member hospitals.
- Searchable multi-select of existing hospitals.
- A visible `Belum Memiliki Area` state for available hospitals.
- Create/edit/delete actions only for admin.
- Membership edit action for admin and operator.

When an operator selects a hospital already assigned elsewhere, the UI warns that saving will move it from the current Area. The server remains authoritative and performs the move transactionally.

Destructive Area deletion requires confirmation stating that hospitals and machines will remain intact and only become unassigned.

## 8. Dashboard Area Filtering

Extend the dashboard API response with `areaId` and `areaName` for every station/hospital row. Add an Area query parameter to the dashboard API with these semantics:

- Missing or `all`: no Area restriction.
- A valid Area ID: include only hospitals belonging to that Area.
- `unassigned`: include only hospitals without an `area_hospitals` row.
- Unknown Area ID: return HTTP 400 with `Area tidak valid`.

The dashboard UI fetches the Area list and adds a filter with:

- `Semua Area` as default.
- One option per configured Area.
- `Belum Memiliki Area`.

Changing Area resets table pagination to page 1. The Area filter composes with search, status, purity, pressure, sorting, and rows-per-page filters. A client user remains restricted to their own hospital regardless of a supplied Area parameter.

## 9. Purity Classification

Purity uses exactly two visual levels:

- `oxygenPurity >= 90`: `Optimal`, green.
- `oxygenPurity < 90`: `Kritis`, yellow/amber.

The exact value `90` is Optimal. Tests cover values below, equal to, and above the boundary.

The existing shared `Level` type may remain three-valued because pressure and other metrics still use warning/critical states. Purity-specific mapping must no longer produce an intermediate warning band. Existing database threshold columns are retained for backward compatibility, but purity evaluation uses the agreed 90-percent boundary consistently across backend derivation, frontend analytics, badges, filters, legends, and quality summaries.

Machine connectivity status remains `online`, `warning`, or `offline`. A sub-90 purity reading can continue to make the aggregate machine status `warning`; the requested yellow presentation applies to the purity badge/classification rather than introducing a new machine-status enum.

## 10. Dashboard Units

Change visible labels without converting stored numeric values:

| Metric | Display unit |
|---|---|
| MC/day | `Nm³` |
| MC/bulan | `Nm³` |
| Flow Meter 1 | `Nm³/h` |
| Flow Meter 2 | `Nm³/h` |
| Total Flow | `Nm³/h` |

The implementation must use the superscript-three character consistently in desktop and responsive dashboard presentations. This work assumes incoming values already represent these units; no numeric conversion is requested.

## 11. Ten-Minute Historical Persistence

Incoming MQTT messages continue to update the latest Redis record and `machine_latest_readings` on every valid message.

Historical persistence changes from hourly to 10-minute averaged buckets:

- Buffer raw valid samples per machine in Redis.
- Flush on aligned 10-minute boundaries (`:00`, `:10`, `:20`, `:30`, `:40`, `:50`) rather than ten minutes after process startup.
- Calculate arithmetic means for oxygen purity, tank pressure, central flow, booster flow, total flow, and running time using only finite non-null values.
- Use the most recent sample for identifiers, MQTT topic, group name, and raw payload metadata.
- Store one `machine_readings` row per machine per non-empty interval, using the aligned bucket start as `terminal_time` and the successful insert time as `received_at`.
- Continue ignoring historical insertion for machines not assigned to a hospital, matching current behavior.

Redis keys and exported function names are renamed from `hourly` terminology to `ten-minute`/interval terminology.

To avoid sample loss, flushing must not permanently delete a buffer before the corresponding database insert succeeds. The implementation will use an atomic rotate/drain strategy: move or rename the active buffer to an interval-specific processing key, process it, delete it only after success, and preserve/requeue it after failure. A database unique constraint on `(machine_id, terminal_time)` and conflict-safe insert prevent duplicate rows after retries.

Graceful shutdown attempts to flush completed samples without mixing them into an incorrect interval. Empty intervals create no row.

## 12. Thirty-Minute CSV Export

The export endpoint keeps existing authentication, hospital/machine filtering, soft-delete filtering, date validation, 90-day maximum range, streaming response, and short-lived Redis cache.

Rows are filtered and grouped using `machine_readings.terminal_time`, then grouped by:

- Hospital.
- Machine.
- Aligned 30-minute calendar bucket based on the historical reading timestamp.

Examples are `10:00:00–10:29:59.999` and `10:30:00–10:59:59.999`. PostgreSQL performs the grouping so pagination never splits or corrupts a bucket.

For each machine and bucket, calculate the arithmetic average of:

- Oxygen purity.
- Tank pressure.
- Flow Meter 1.
- Flow Meter 2.
- Total Flow.
- Running time.

Null inputs are excluded from averages. A bucket is emitted when it contains at least one eligible stored 10-minute row. Timestamp output identifies the bucket start and should be labeled clearly as an interval/bucket time.

### Conditional Serial Number Column

Before streaming headers, the endpoint determines machine counts for every hospital represented in the filtered export result:

- If every represented hospital has exactly one non-deleted machine in the master data, omit the `Serial Number` header and every corresponding cell.
- If at least one represented hospital has more than one non-deleted machine in the master data, include `Serial Number` for every exported row.

Only hospitals represented by the effective export filters and access scope are inspected. Once a hospital is represented, its full non-deleted machine count is used even when the export is narrowed to one selected machine. This preserves the agreed rule that a multi-machine hospital is identified with SN.

The export cache key gains a format/version marker plus all effective filters so cached legacy CSV data cannot be served. Empty results still return a valid CSV with the appropriate header decision.

## 13. Rumah Sakit Create Reliability

The existing `Tambah Rumah Sakit` action and `/api/clients` naming are retained to avoid a broad rename. Implementation adds or verifies:

- Trimmed, non-empty `hospitalName` validation.
- A clear 400 response for invalid input.
- Admin and operator creation permission, matching the current policy.
- UI surfacing of server errors without closing the modal.
- Refresh of the master table after successful creation.
- API and UI-focused regression tests.

No new institution type is introduced, and existing optional province, city, address, owner, and class fields remain unchanged.

## 14. Migration and Compatibility

The database change is additive: create `areas` and `area_hospitals` plus indexes/constraints. No existing table or column is renamed or dropped. Existing hospitals start unassigned.

Deployment order:

1. Apply the additive database migration/schema push.
2. Deploy the application and MQTT listener together so interval key naming and behavior remain consistent.
3. Allow admins/operators to create Areas and assign existing hospitals.

Old hourly `machine_readings` remain queryable. The 30-minute export groups both old and new rows by timestamp; it does not rewrite historical data. Old Redis hourly buffer keys should receive a one-time compatibility drain or be documented/handled during listener rollout so pending samples are not silently abandoned.

## 15. Error Handling and Observability

- Area API returns structured JSON errors and logs unexpected database failures without leaking credentials or SQL internals.
- Membership transactions roll back fully on any validation or database error.
- MQTT aggregation logs interval start, machine serial, sample count, and save/retry outcome.
- Malformed MQTT messages remain ignored with a warning.
- Export query/stream failures are logged and terminate the stream cleanly.
- UI mutation buttons disable during requests to prevent duplicate submissions.

## 16. Testing Strategy

### Unit tests

- Purity values `89.99`, `90`, and `90.01` map to yellow Kritis, green Optimal, and green Optimal.
- Ten-minute averaging ignores null/non-finite values and uses the latest metadata.
- Failed interval persistence preserves samples for retry.
- Thirty-minute bucket boundaries assign timestamps at `:00`, `:29:59`, `:30`, and `:59:59` correctly.
- Conditional SN-header logic covers all-single-machine and mixed/multi-machine export scopes.

### API/integration tests

- Admin can CRUD Areas; operator cannot CRUD Area metadata.
- Admin and operator can replace membership.
- Client/viewer cannot manage membership.
- Moving a hospital removes its previous membership in one transaction.
- Unique hospital membership is enforced under concurrent or duplicate requests.
- Deleting an Area leaves hospitals and machines untouched.
- Dashboard Area filter returns only eligible hospitals and respects client scope.
- Rumah Sakit create accepts valid admin/operator requests and rejects blank names/unauthorized roles.
- Export averages eligible readings by machine and 30-minute bucket.
- Export includes or omits SN according to effective result scope.

### UI tests

- Sidebar visibility follows roles.
- Admin actions and operator membership-only actions render correctly.
- Area selection/move warnings and server errors remain visible.
- Dashboard Area filter composes with existing filters and resets pagination.
- Dashboard headers show `Nm³` and `Nm³/h`.
- Purity legend, filter labels, and badge colors match the two-level rule.

### Verification

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- Manual smoke test of Area CRUD/membership, dashboard filtering, MQTT interval persistence, and representative CSV downloads.

## 17. Acceptance Criteria

1. Existing Rumah Sakit records and management behavior remain intact, and valid admin/operator create requests succeed reliably.
2. Admin can manage Area metadata; admin and operator can manage hospital membership.
3. A hospital cannot belong to more than one Area at a time.
4. Every machine follows the Area of its parent hospital without a machine-level Area assignment.
5. Dashboard can show all stations, one Area, or unassigned hospitals while preserving access scope.
6. Purity is green Optimal at 90 percent or higher and yellow Kritis below 90 percent everywhere it appears.
7. Dashboard labels use the agreed `Nm³` and `Nm³/h` units.
8. Historical rows are persisted as per-machine averages on aligned 10-minute intervals without losing samples on transient write failure.
9. CSV rows are per-machine averages on aligned 30-minute intervals.
10. CSV omits SN when every represented hospital has one machine in scope and includes SN for all rows when any represented hospital has multiple machines in scope.
11. Existing authorization, real-time latest values, date limits, soft-delete filters, and historical data remain compatible.
