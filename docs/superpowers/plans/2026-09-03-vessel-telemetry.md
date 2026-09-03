# Vessel Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nullable Vessel 1 and Vessel 2 telemetry from Schneider MQTT payloads through latest storage, 10-minute history, Dashboard, Datalogger, preview, and 30-minute CSV export.

**Architecture:** Add direct nullable decimal columns to both reading tables and carry two optional values through the existing typed MQTT and aggregation pipeline. Redis remains the realtime source, PostgreSQL remains latest fallback and historical source, and every presentation layer preserves `null` as unavailable rather than converting it to zero.

**Tech Stack:** Next.js 15 App Router, TypeScript, PostgreSQL/TimescaleDB, Drizzle ORM, Redis/ioredis, MQTT, React, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-vessel-telemetry-design.md`

## Global Constraints

- MQTT keys are exactly `Schneider_PLC_VESSEL1` and `Schneider_PLC_VESSEL2`.
- Display unit is exactly `MPa`; no numeric conversion is performed.
- Database values are nullable decimals; missing or invalid input stays `NULL` and displays as `-`.
- Numeric zero is valid and must not be rendered as missing.
- Vessel values do not affect health, status, purity, pressure, or utilization calculations.
- Historical storage remains an aligned 10-minute average; CSV remains an aligned 30-minute average.
- Implement and migrate only `psa_generator_dev`; do not migrate or restart production.
- Preserve existing uncommitted user changes in `src/frontend/components/dashboard/oxygen-quality-panel.tsx` and `src/frontend/components/dashboard/stations-table.tsx`; edit the latter surgically without overwriting unrelated lines.

---

### Task 1: Add Nullable Vessel Columns to the Reading Schema

**Files:**
- Modify: `src/backend/db/schema.ts`
- Modify: `src/backend/__tests__/areaSchema.test.ts`

**Interfaces:**
- Produces: Drizzle fields `machineReadings.vessel1`, `machineReadings.vessel2`, `machineLatestReadings.vessel1`, and `machineLatestReadings.vessel2`, each mapping to nullable `decimal(10,2)` columns.

- [ ] **Step 1: Write the failing schema tests**

Extend the schema test to inspect both tables and assert these literal database names:

```ts
const historical = getTableConfig(machineReadings);
const latest = getTableConfig(machineLatestReadings);

for (const config of [historical, latest]) {
  expect(config.columns.find((column) => column.name === "vessel_1")?.notNull).toBe(false);
  expect(config.columns.find((column) => column.name === "vessel_2")?.notNull).toBe(false);
}
```

- [ ] **Step 2: Run the schema test and verify RED**

Run: `pnpm vitest run src/backend/__tests__/areaSchema.test.ts`

Expected: FAIL because neither table contains `vessel_1` or `vessel_2`.

- [ ] **Step 3: Add the schema fields**

Add after `tankPressure` in each table:

```ts
vessel1: decimal('vessel_1', { precision: 10, scale: 2 }),
vessel2: decimal('vessel_2', { precision: 10, scale: 2 }),
```

- [ ] **Step 4: Verify schema tests and types**

Run: `pnpm vitest run src/backend/__tests__/areaSchema.test.ts && pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit the schema contract**

```bash
git add src/backend/db/schema.ts src/backend/__tests__/areaSchema.test.ts
git commit -m "feat: add nullable Vessel reading columns"
```

---

### Task 2: Migrate and Verify the Development Database

**Files:**
- Read: `.env.development.local`
- Read: `drizzle.config.ts`

**Interfaces:**
- Consumes: the four Drizzle columns from Task 1.
- Produces: four nullable columns in `psa_generator_dev`; no production mutation.

- [ ] **Step 1: Capture pre-migration development row counts**

Run a read-only query against the development URL derived from the MGM base profile:

```sql
SELECT
  (SELECT count(*) FROM machine_readings) AS historical_count,
  (SELECT count(*) FROM machine_latest_readings) AS latest_count;
```

Record the two counts in the execution notes.

- [ ] **Step 2: Apply the additive schema push to development**

Load `/root/apps/PSA-GENERATOR/.env.mgm`, load `.env.development.local`, replace only the database name with `DEV_DATABASE_NAME`, then run:

```bash
pnpm db:push
```

Expected: four columns added; no table recreation or column deletion.

- [ ] **Step 3: Verify columns and preservation**

Run:

```sql
SELECT table_name, column_name, data_type, numeric_precision, numeric_scale, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('machine_readings', 'machine_latest_readings')
  AND column_name IN ('vessel_1', 'vessel_2')
ORDER BY table_name, column_name;
```

Expected: four rows, `numeric(10,2)`, `is_nullable = YES`. Re-run the counts from Step 1 and require exact equality.

- [ ] **Step 4: Confirm production was not changed**

Use the production connection read-only to query `information_schema.columns`; record its state but do not run `db:push` or DDL against production.

No code commit is required for this environment-only task.

---

### Task 3: Parse and Aggregate Optional Vessel Metrics

**Files:**
- Modify: `src/backend/mqtt/transformPayload.ts`
- Modify: `src/backend/mqtt/intervalAggregation.ts`
- Modify: `src/backend/mqtt/listener.ts`
- Modify: `src/backend/__tests__/intervalAggregation.test.ts`
- Create: `src/backend/__tests__/vesselPayload.test.ts`

**Interfaces:**
- Produces: `vessel1: number | null` and `vessel2: number | null` from `transformMqttPayload`.
- Extends: `BufferedSample` with `vessel1?: string | null` and `vessel2?: string | null`.
- Produces: nullable two-decimal Vessel averages from `averageSamples`.

- [ ] **Step 1: Write failing MQTT parsing tests**

```ts
expect(transformMqttPayload("data/psa/O2generatorMGM/SN1", {
  Schneider_PLC_VESSEL1: "1.25",
  Schneider_PLC_VESSEL2: "0",
})).toMatchObject({ vessel1: 1.25, vessel2: 0 });

expect(transformMqttPayload("data/psa/O2generatorMGM/SN1", {
  Schneider_PLC_VESSEL1: "invalid",
})).toMatchObject({ vessel1: null, vessel2: null });
```

- [ ] **Step 2: Write failing nullable aggregation tests**

Add samples with Vessel 1 values `1.00`, `2.00`, an absent Vessel 2, and a real Vessel 2 zero. Assert:

```ts
expect(reading).toMatchObject({ vessel1: "1.50", vessel2: "0.00" });
```

Add a second case where both fields are absent and assert both results are `null`.

- [ ] **Step 3: Run tests and verify RED**

Run: `pnpm vitest run src/backend/__tests__/vesselPayload.test.ts src/backend/__tests__/intervalAggregation.test.ts`

Expected: FAIL because Vessel fields are not parsed or included in aggregation.

- [ ] **Step 4: Implement parsing and aggregation**

Add to `transformMqttPayload`:

```ts
vessel1: getVal(['Schneider_PLC_VESSEL1']),
vessel2: getVal(['Schneider_PLC_VESSEL2']),
```

Add both optional fields to `BufferedSample` and append `"vessel1"` and `"vessel2"` to `metricKeys`.

In the listener's string-valued `readingData`, add:

```ts
vessel1: getVal(['Schneider_PLC_VESSEL1']),
vessel2: getVal(['Schneider_PLC_VESSEL2']),
```

Copy the fields into `sampleData`. Because `latestDataForUpsert` spreads `readingData`, this also propagates them to latest Redis and the latest-reading upsert.

- [ ] **Step 5: Verify legacy and Vessel ingestion**

Run: `pnpm vitest run src/backend/__tests__/vesselPayload.test.ts src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/listenerAggregation.test.ts`

Expected: PASS, including legacy samples without Vessel fields.

- [ ] **Step 6: Commit ingestion**

```bash
git add src/backend/mqtt/transformPayload.ts src/backend/mqtt/intervalAggregation.ts src/backend/mqtt/listener.ts src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/vesselPayload.test.ts
git commit -m "feat: ingest and aggregate Vessel telemetry"
```

---

### Task 4: Expose Vessel Values Through Dashboard and History APIs

**Files:**
- Create: `src/backend/telemetry/vessel.ts`
- Modify: `src/app/api/dashboard/route.ts`
- Modify: `src/app/api/history/route.ts`
- Modify: `src/frontend/lib/types.ts`
- Create: `src/backend/__tests__/vesselFormatting.test.ts`

**Interfaces:**
- Dashboard station output: `vessel1: number | null`, `vessel2: number | null`.
- History entry output: `vessel1: number | null`, `vessel2: number | null`.
- Frontend `Station` and `LoggerEntry` gain the same nullable fields.

- [ ] **Step 1: Write a failing null-preserving formatter test**

Define the expected public contract for a small formatter in `src/backend/telemetry/vessel.ts`:

```ts
export function parseNullableMetric(value: string | number | null | undefined): number | null;
```

Test literal behavior:

```ts
expect(parseNullableMetric(null)).toBeNull();
expect(parseNullableMetric(undefined)).toBeNull();
expect(parseNullableMetric("0")).toBe(0);
expect(parseNullableMetric("1.25")).toBe(1.25);
expect(parseNullableMetric("invalid")).toBeNull();
```

- [ ] **Step 2: Run the formatter test and verify RED**

Run: `pnpm vitest run src/backend/__tests__/vesselFormatting.test.ts`

Expected: FAIL because `parseNullableMetric` does not exist.

- [ ] **Step 3: Implement the formatter and API mappings**

Implement `parseNullableMetric` using an explicit null/empty guard followed by `Number.isFinite`.

Select `vessel1` and `vessel2` from `machineLatestReadings` in Dashboard. Extend `LatestData` and map Redis-first values with database fallback through `parseNullableMetric`.

Select the two historical fields in `/api/history` and return them with `parseNullableMetric`; do not use truthiness checks because zero is valid.

Extend frontend types:

```ts
vessel1: number | null;
vessel2: number | null;
```

- [ ] **Step 4: Verify API types and regressions**

Run: `pnpm vitest run src/backend/__tests__/vesselFormatting.test.ts src/frontend/__tests__/metrics.test.ts && pnpm exec tsc --noEmit`

Expected: PASS. Existing health tests must remain unchanged and green.

- [ ] **Step 5: Commit API contracts**

```bash
git add src/backend/telemetry/vessel.ts src/backend/__tests__/vesselFormatting.test.ts src/app/api/dashboard/route.ts src/app/api/history/route.ts src/frontend/lib/types.ts
git commit -m "feat: expose nullable Vessel telemetry APIs"
```

---

### Task 5: Display Vessel Metrics on Dashboard and Datalogger

**Files:**
- Modify: `src/frontend/components/dashboard/stations-table.tsx`
- Modify: `src/frontend/components/pages/database-page.tsx`
- Create: `src/frontend/components/ui/nullable-metric.tsx`
- Create: `src/frontend/__tests__/nullable-vessel-ui.test.tsx`

**Interfaces:**
- Produces reusable `NullableMetric({ value, digits, suffix })` presentation.
- Consumes nullable API values from Task 4.

- [ ] **Step 1: Write failing presentation tests**

```tsx
expect(renderMetric(null)).toHaveTextContent("-");
expect(renderMetric(0)).toHaveTextContent("0.00 MPa");
expect(renderMetric(1.256)).toHaveTextContent("1.26 MPa");
```

Render `NullableMetric` as a real component; do not mock it.

- [ ] **Step 2: Run UI test and verify RED**

Run: `pnpm vitest run src/frontend/__tests__/nullable-vessel-ui.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the reusable rendering rule**

```tsx
export function NullableMetric({ value, digits = 2, suffix = "" }: Props) {
  if (value === null || value === undefined || !Number.isFinite(value)) return <>-</>;
  return <>{formatNumber(value, digits)}{suffix ? ` ${suffix}` : ""}</>;
}
```

- [ ] **Step 4: Add Dashboard and Datalogger columns**

Add `Vessel 1 (MPa)` and `Vessel 2 (MPa)` after the tank-pressure column in both tables. Use `<NullableMetric value={...} suffix="MPa" />` for cells. Increase `colSpan` values for loading and empty states by two.

Preserve the existing uncommitted layout edits in `stations-table.tsx`; apply only the header, row-cell, width, and span changes required for Vessel.

- [ ] **Step 5: Verify UI and types**

Run: `pnpm vitest run src/frontend/__tests__/nullable-vessel-ui.test.tsx && pnpm exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit UI display**

Stage only the Vessel hunks from `stations-table.tsx` if unrelated user changes remain, then commit:

```bash
git add src/frontend/components/pages/database-page.tsx src/frontend/components/ui/nullable-metric.tsx src/frontend/__tests__/nullable-vessel-ui.test.tsx
git add -p src/frontend/components/dashboard/stations-table.tsx
git commit -m "feat: display Vessel metrics in monitoring tables"
```

---

### Task 6: Add Vessel Metrics to Preview and 30-Minute CSV Export

**Files:**
- Modify: `src/app/api/history/export/route.ts`
- Modify: `src/app/api/history/export/export-query.ts`
- Modify: `src/backend/__tests__/exportAggregation.test.ts`
- Modify: `src/backend/__tests__/exportApi.test.ts`
- Modify: `src/frontend/components/modals/export-modal.tsx`
- Create: `src/frontend/__tests__/vessel-export-preview.test.tsx`

**Interfaces:**
- CSV headers add `Vessel 1 (MPa)` and `Vessel 2 (MPa)`.
- Preview entries consume nullable `vessel1` and `vessel2`.

- [ ] **Step 1: Write failing CSV contract tests**

Update the literal expected header to include:

```ts
"Tank Pressure (bar)",
"Vessel 1 (MPa)",
"Vessel 2 (MPa)",
```

Add formatter coverage proving `null` produces `""` while `0` produces `"0.00"`. Extract and test:

```ts
export function formatNullableCsvMetric(value: string | number | null | undefined): string;
```

- [ ] **Step 2: Run export tests and verify RED**

Run: `pnpm vitest run src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts`

Expected: FAIL because headers, query results, and row serialization omit Vessel.

- [ ] **Step 3: Extend the 30-minute query and CSV**

Select:

```ts
vessel1: avg(machineReadings.vessel1),
vessel2: avg(machineReadings.vessel2),
```

Insert both formatted values after tank pressure in every CSV row. Change the cache marker from `export:v2:30m` to `export:v3:30m`.

- [ ] **Step 4: Add preview fields and columns**

Extend `PreviewEntry` with `vessel1: number | null` and `vessel2: number | null`. Add both preview headers and render through `NullableMetric`, preserving zero and showing `-` for unavailable data.

- [ ] **Step 5: Verify export and preview**

Run: `pnpm vitest run src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts src/frontend/__tests__/vessel-export-preview.test.tsx && pnpm exec tsc --noEmit`

Expected: PASS with conditional SN behavior unchanged.

- [ ] **Step 6: Commit export support**

```bash
git add src/app/api/history/export/route.ts src/app/api/history/export/export-query.ts src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts src/frontend/components/modals/export-modal.tsx src/frontend/__tests__/vessel-export-preview.test.tsx
git commit -m "feat: export Vessel averages in CSV"
```

---

### Task 7: End-to-End Development Verification

**Files:**
- Modify only if a verified defect requires a focused fix and regression test.

**Interfaces:**
- Consumes the complete pipeline from Tasks 1–6.
- Produces evidence that legacy and future PLC payloads behave correctly in development.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm eslint src/backend/db/schema.ts src/backend/mqtt/transformPayload.ts src/backend/mqtt/intervalAggregation.ts src/backend/mqtt/listener.ts src/backend/telemetry/vessel.ts src/app/api/dashboard/route.ts src/app/api/history/route.ts src/app/api/history/export/route.ts src/app/api/history/export/export-query.ts src/frontend/lib/types.ts src/frontend/components/dashboard/stations-table.tsx src/frontend/components/pages/database-page.tsx src/frontend/components/modals/export-modal.tsx src/frontend/components/ui/nullable-metric.tsx
git diff --check
```

Expected: all commands exit 0. The intentional simulated database error log in the listener retry test is acceptable only when that test still passes.

- [ ] **Step 2: Verify a legacy payload**

Publish or transform a fixture without Vessel fields. Verify latest and historical Vessel values remain `NULL`, the existing metrics persist, and Dashboard/Datalogger show `-`.

- [ ] **Step 3: Verify a future PLC payload**

Use a development-only test payload for an assigned development machine:

```json
{
  "Schneider_PLC_VESSEL1": "1.25",
  "Schneider_PLC_VESSEL2": "0.80"
}
```

Verify the latest Redis JSON, `machine_latest_readings`, Dashboard response, 10-minute historical row, history response, preview, and 30-minute CSV all preserve the expected values/averages.

- [ ] **Step 4: Verify client scoping**

Login as `cepoko`. Confirm Dashboard, Datalogger, preview, and CSV contain only the two RS Cepoko machines and that Vessel columns do not expose another hospital.

- [ ] **Step 5: Review worktree integrity**

Run `git status --short` and `git diff`. Confirm the production worktree and production database were not modified, and confirm pre-existing user changes remain unstaged unless explicitly included by the user.

- [ ] **Step 6: Commit any verification-only regression fix**

Only if Step 2–5 exposed a defect, add its failing test and focused fix, rerun Step 1, and commit with a message describing that specific defect. Otherwise, do not create an empty commit.
