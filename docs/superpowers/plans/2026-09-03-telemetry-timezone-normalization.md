# Telemetry Timezone Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve valid PLC event clocks exactly in each hospital's original Indonesian timezone and show that same local clock consistently without converting it to WIB or adding timezone text to CSV.

**Architecture:** Introduce one pure timezone module that resolves hospital provinces, parses PLC wall-clock timestamps into absolute instants, formats instants in hospital-local time, and builds row-local date boundaries. MQTT ingestion, APIs, aggregation, and the development correction script consume that module; heartbeat continues using server receipt time.

**Tech Stack:** Next.js 15 App Router, TypeScript, PostgreSQL/TimescaleDB, Drizzle ORM, Node `Intl`, MQTT, Redis, Vitest, PM2.

**Spec:** `docs/superpowers/specs/2026-09-03-telemetry-timezone-normalization-design.md`

## Global Constraints

- Server, Node, PostgreSQL development, and PM2 currently resolve to `Asia/Jakarta`; correctness must not depend on that global setting.
- `Asia/Jakarta` at OS/database level is administrative context only; it must not convert WITA/WIT machine clocks to WIB for presentation.
- Valid `_terminalTime` is the event source; missing/invalid input falls back to receipt time.
- Explicit `Z`/numeric offsets are preserved as absolute instants.
- Offset-free PLC timestamps are interpreted from the hospital province as `Asia/Jakarta`, `Asia/Makassar`, or `Asia/Jayapura`.
- Drift over 15 minutes logs a warning but does not replace valid machine time.
- Heartbeat/connectivity remains based on `receivedAt`/`updatedAt`.
- UI and CSV use `DD/MM/YYYY HH:mm:ss` without `WIB`, `WITA`, `WIT`, or a timezone column.
- CSV header stays `Timestamp`; multi-machine identity stays `Nama Mesin`; aggregation stays 30 minutes.
- Correct and run only `psa_generator_dev`; do not mutate or restart production.
- Preserve the existing uncommitted user changes in `oxygen-quality-panel.tsx` and `stations-table.tsx`.

---

### Task 1: Add the Pure Indonesian Timezone Contract

**Files:**
- Create: `src/backend/telemetry/timezone.ts`
- Create: `src/backend/__tests__/telemetryTimezone.test.ts`

**Interfaces:**
- Produces `type IndonesianTimeZone = "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura"`.
- Produces `resolveHospitalTimeZone(province: string | null | undefined): { timeZone: IndonesianTimeZone; usedFallback: boolean }`.
- Produces `parseMachineTimestamp(value, timeZone, receivedAt): { date: Date; source: "machine" | "received"; driftMs: number | null }`.
- Produces `formatHospitalTimestamp(value, timeZone): string`.
- Produces `getLocalDateParts(value, timeZone)` for bucket/date filtering consumers.

- [ ] **Step 1: Write failing resolver and parser tests**

Test literal provinces currently present in development and representative zones:

```ts
expect(resolveHospitalTimeZone("Jawa Tengah").timeZone).toBe("Asia/Jakarta");
expect(resolveHospitalTimeZone("Sulawesi Selatan").timeZone).toBe("Asia/Makassar");
expect(resolveHospitalTimeZone("Papua Selatan").timeZone).toBe("Asia/Jayapura");
expect(resolveHospitalTimeZone("  dki JAKARTA ").timeZone).toBe("Asia/Jakarta");
expect(resolveHospitalTimeZone("Unknown")).toEqual({ timeZone: "Asia/Jakarta", usedFallback: true });

const receipt = new Date("2026-09-03T03:07:00.000Z");
expect(parseMachineTimestamp("2026-09-03 10:07:00.000", "Asia/Jakarta", receipt).date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
const wita = parseMachineTimestamp("2026-09-03 11:07:00.000", "Asia/Makassar", receipt).date;
expect(wita.toISOString()).toBe("2026-09-03T03:07:00.000Z");
expect(formatHospitalTimestamp(wita, "Asia/Makassar")).toBe("03/09/2026 11:07:00");
const wit = parseMachineTimestamp("2026-09-03 12:07:00.000", "Asia/Jayapura", receipt).date;
expect(wit.toISOString()).toBe("2026-09-03T03:07:00.000Z");
expect(formatHospitalTimestamp(wit, "Asia/Jayapura")).toBe("03/09/2026 12:07:00");
expect(parseMachineTimestamp("2026-09-03T03:07:00Z", "Asia/Jayapura", receipt).date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
expect(parseMachineTimestamp("invalid", "Asia/Jakarta", receipt)).toMatchObject({ date: receipt, source: "received", driftMs: null });
```

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm vitest run src/backend/__tests__/telemetryTimezone.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement resolver, parser, and formatter**

Use normalized province sets covering all 38 Indonesian provinces. Parse only `YYYY-MM-DD[ T]HH:mm:ss(.SSS)?` as offset-free machine time. Convert fixed Indonesian offsets explicitly (`420`, `480`, `540` minutes), so server timezone cannot influence the result. For aware input, require `Z` or `[+-]HH:mm` and use `new Date(value)`. Format with `Intl.DateTimeFormat("en-GB", { timeZone, day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23" })`, then assemble `DD/MM/YYYY HH:mm:ss` from `formatToParts`.

- [ ] **Step 4: Verify GREEN and mutation cases**

Run: `pnpm vitest run src/backend/__tests__/telemetryTimezone.test.ts && pnpm exec tsc --noEmit`

Expected: PASS; changing any of the three offsets or treating invalid input as machine time must fail a literal assertion.

- [ ] **Step 5: Commit**

```bash
git add src/backend/telemetry/timezone.ts src/backend/__tests__/telemetryTimezone.test.ts
git commit -m "feat: normalize Indonesian machine timestamps"
```

---

### Task 2: Use Hospital Timezone During MQTT Ingestion

**Files:**
- Modify: `src/backend/mqtt/transformPayload.ts`
- Modify: `src/backend/mqtt/listener.ts`
- Modify: `src/backend/__tests__/vesselPayload.test.ts`
- Create: `src/backend/__tests__/machineTimestampIngestion.test.ts`

**Interfaces:**
- Extends `transformMqttPayload(topic, payload, context?)` with `context?: { province?: string | null; receivedAt?: Date }`.
- Listener selects `masterHospitals.province`, resolves its timezone, and calls the shared parser.

- [ ] **Step 1: Write failing transform tests**

```ts
const receivedAt = new Date("2026-09-03T03:07:00Z");
expect(transformMqttPayload(topic, { _terminalTime: "2026-09-03 11:07:00" }, { province: "Sulawesi Selatan", receivedAt }).terminalTime.toISOString()).toBe("2026-09-03T03:07:00.000Z");
expect(transformMqttPayload(topic, {}, { province: "Sulawesi Selatan", receivedAt }).terminalTime).toEqual(receivedAt);
```

Add a drift case at `2026-09-03 11:37:01` and assert the returned machine time remains `2026-09-03T03:37:01.000Z` rather than receipt time.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm vitest run src/backend/__tests__/machineTimestampIngestion.test.ts src/backend/__tests__/vesselPayload.test.ts`

Expected: FAIL because transform ignores context and uses process-local parsing.

- [ ] **Step 3: Implement shared parsing in transform and listener**

Join `masterHospitals` when resolving an existing machine, capture `receivedAt = new Date()` once per message, and pass province/time to `parseMachineTimestamp`. Store that `receivedAt` consistently in latest Redis/upsert. Log fallback province and drift over `15 * 60 * 1000` with serial number, but never log credentials or the full database URL.

- [ ] **Step 4: Verify ingestion and legacy compatibility**

Run: `pnpm vitest run src/backend/__tests__/machineTimestampIngestion.test.ts src/backend/__tests__/vesselPayload.test.ts src/backend/__tests__/listenerAggregation.test.ts && pnpm exec tsc --noEmit`

Expected: PASS; payloads without `_terminalTime` and existing Vessel cases remain green.

- [ ] **Step 5: Commit**

```bash
git add src/backend/mqtt/transformPayload.ts src/backend/mqtt/listener.ts src/backend/__tests__/machineTimestampIngestion.test.ts src/backend/__tests__/vesselPayload.test.ts
git commit -m "feat: ingest machine time in hospital timezone"
```

---

### Task 3: Preserve Local Wall-Clock Bucket Boundaries

**Files:**
- Modify: `src/backend/mqtt/intervalAggregation.ts`
- Modify: `src/backend/mqtt/listener.ts`
- Modify: `src/backend/__tests__/intervalAggregation.test.ts`
- Modify: `src/backend/__tests__/exportAggregation.test.ts`

**Interfaces:**
- Changes `getTenMinuteBucketStart(date, timeZone)` and `getThirtyMinuteBucketStart(date, timeZone)` to align the hospital-local wall clock and return the corresponding absolute instant.
- Extends `BufferedSample` with `timeZone: IndonesianTimeZone`.

- [ ] **Step 1: Write failing WITA/WIT boundary tests**

```ts
expect(getTenMinuteBucketStart(new Date("2026-09-03T03:19:59Z"), "Asia/Makassar").toISOString()).toBe("2026-09-03T03:10:00.000Z");
expect(getThirtyMinuteBucketStart(new Date("2026-09-03T15:45:00Z"), "Asia/Jayapura").toISOString()).toBe("2026-09-03T15:30:00.000Z");
```

Assert buffered samples persist their timezone and legacy samples default to `Asia/Jakarta`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/exportAggregation.test.ts`

- [ ] **Step 3: Implement zone-explicit bucket helpers**

Use `getLocalDateParts`, floor local minutes to 10/30, and convert the local fields back through the fixed zone offset. Do not call local `Date#setMinutes`.

- [ ] **Step 4: Verify aggregation regressions**

Run: `pnpm vitest run src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/listenerAggregation.test.ts src/backend/__tests__/exportAggregation.test.ts && pnpm exec tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/backend/mqtt/intervalAggregation.ts src/backend/mqtt/listener.ts src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/exportAggregation.test.ts
git commit -m "feat: align telemetry buckets to hospital time"
```

---

### Task 4: Return Machine Event Time From Dashboard and History

**Files:**
- Modify: `src/app/api/dashboard/route.ts`
- Modify: `src/app/api/history/route.ts`
- Modify: `src/frontend/lib/types.ts`
- Modify: `src/frontend/components/dashboard/stations-table.tsx`
- Create: `src/backend/__tests__/telemetryTimeApi.test.ts`

**Interfaces:**
- Dashboard keeps `lastUpdate` as heartbeat ISO and adds `eventTimestamp: string` formatted in hospital-local time.
- History selects `terminalTime` and province, returning `timestamp` formatted through `formatHospitalTimestamp`.

- [ ] **Step 1: Write failing API mapping tests**

Extract/export focused mapping helpers and assert:

```ts
expect(formatDashboardEventTimestamp(new Date("2026-09-03T03:07:00Z"), "Papua Selatan")).toBe("03/09/2026 12:07:00");
expect(formatHistoryEventTimestamp(new Date("2026-09-03T03:07:00Z"), "Jawa Tengah")).toBe("03/09/2026 10:07:00");
```

Keep the existing heartbeat status tests unchanged.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm vitest run src/backend/__tests__/telemetryTimeApi.test.ts src/backend/__tests__/telemetryState.test.ts`

- [ ] **Step 3: Implement API and UI mapping**

Dashboard selects province and terminal time from Redis/database, formats `eventTimestamp`, and continues passing receipt/update ISO as `lastUpdate`. History filters/orders/selects `machineReadings.terminalTime`, selects province, and formats it locally. Update `Station.eventTimestamp`. In `stations-table.tsx`, change only the existing Sync value to `station.eventTimestamp`; stage only timezone hunks so the user's unrelated `<br/>` layout change stays unstaged.

- [ ] **Step 4: Verify API/UI types and health isolation**

Run: `pnpm vitest run src/backend/__tests__/telemetryTimeApi.test.ts src/backend/__tests__/telemetryState.test.ts src/frontend/__tests__/metrics.test.ts && pnpm exec tsc --noEmit`

- [ ] **Step 5: Commit without user layout hunks**

```bash
git add src/app/api/dashboard/route.ts src/app/api/history/route.ts src/frontend/lib/types.ts src/backend/__tests__/telemetryTimeApi.test.ts
git add -p src/frontend/components/dashboard/stations-table.tsx
git commit -m "feat: show hospital-local machine event time"
```

---

### Task 5: Apply Row-Local Time to CSV, Preview, and Date Filters

**Files:**
- Modify: `src/app/api/history/export/route.ts`
- Modify: `src/app/api/history/export/export-query.ts`
- Modify: `src/backend/__tests__/exportAggregation.test.ts`
- Modify: `src/backend/__tests__/exportApi.test.ts`
- Modify: `src/frontend/components/modals/export-modal.tsx`
- Modify: `src/frontend/components/pages/database-page.tsx`

**Interfaces:**
- Produces `formatExportTimestamp(value, province): string`.
- Produces a Drizzle SQL province-zone expression used to compare local `terminal_time` against requested local date/time.
- Cache marker becomes `export:v5:30m`.

- [ ] **Step 1: Write failing CSV/local filter tests**

```ts
expect(formatExportTimestamp(new Date("2026-09-03T03:07:00Z"), "Jawa Tengah")).toBe("03/09/2026 10:07:00");
expect(formatExportTimestamp(new Date("2026-09-03T03:07:00Z"), "Papua Selatan")).toBe("03/09/2026 12:07:00");
expect(buildCsvHeader(true)).toContain("Timestamp");
expect(buildCsvHeader(true).some((cell) => /WIB|WITA|WIT|Zona/.test(cell))).toBe(false);
```

Update the cached-export test to require `export:v5:30m`. Add boundary fixtures proving `2026-09-03 00:15` local is included for WIB/WITA/WIT when the requested date is `2026-09-03`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts src/frontend/__tests__/vessel-export-preview.test.tsx`

- [ ] **Step 3: Implement row-local export and filters**

Select province in export aggregation and format each bucket with `formatHospitalTimestamp`. Replace the SQL UTC `date_bin` with local-zone binning that converts `terminal_time` to hospital local wall time, bins 30 minutes, then converts back to an instant. Apply date filters to row-local `terminal_time` rather than `received_at`. Keep header `Timestamp`, no zone column/suffix, and keep `Nama Mesin` conditional behavior.

- [ ] **Step 4: Verify preview, CSV, and client scope**

Run: `pnpm vitest run src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts src/frontend/__tests__/vessel-export-preview.test.tsx src/frontend/__tests__/client-database-access.test.ts && pnpm exec tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/history/export/route.ts src/app/api/history/export/export-query.ts src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts src/frontend/components/modals/export-modal.tsx src/frontend/components/pages/database-page.tsx
git commit -m "feat: export hospital-local telemetry timestamps"
```

---

### Task 6: Correct Existing Development Timestamps Idempotently

**Files:**
- Create: `scripts/migrate-development-telemetry-timezones.ts`
- Create: `src/backend/__tests__/telemetryTimezoneMigration.test.ts`

**Interfaces:**
- Script defaults to dry-run; mutation requires `--apply`.
- Script refuses any database whose pathname is not exactly `psa_generator_dev`.
- Recomputes desired time from immutable `raw_payload._terminalTime`, making repeated runs idempotent.

- [ ] **Step 1: Write failing migration transformation tests**

Test pure row planning with WIB/WITA/WIT, invalid/missing raw payload, 10-minute historical flooring, and a second pass returning the same desired instant. Assert `receivedAt` is never part of the update set.

- [ ] **Step 2: Run test and verify RED**

Run: `pnpm vitest run src/backend/__tests__/telemetryTimezoneMigration.test.ts`

- [ ] **Step 3: Implement guarded dry-run/apply script**

The script consumes `DATABASE_URL`; validate its URL pathname before opening the database connection. Query row ID, machine ID, raw terminal time, current terminal time, received time, and province. Compute desired latest event time or historical 10-minute bucket. Before updates, detect duplicate desired `(machine_id, terminal_time)` values and abort. Apply in a transaction, verify row counts inside the transaction, and rollback on any mismatch.

- [ ] **Step 4: Stop only development ingestion and run dry-run**

```bash
pm2 stop psa-vessel-dev-mqtt
set -a
. /root/apps/PSA-GENERATOR/.env.mgm
. ./.env.development.local
set +a
export DATABASE_URL=$(node -e 'const u=new URL(process.env.DATABASE_URL); u.pathname=`/${process.env.DEV_DATABASE_NAME}`; process.stdout.write(u.toString())')
pnpm tsx scripts/migrate-development-telemetry-timezones.ts
```

Expected: reports planned latest/history changes, zero collisions, database name `psa_generator_dev`, and performs zero updates.

- [ ] **Step 5: Apply and verify development preservation**

```bash
pnpm tsx scripts/migrate-development-telemetry-timezones.ts --apply
```

Verify four representative rows with raw time, stored instant, locally formatted time, and unchanged `received_at`; require historical/latest counts to equal the captured pre-migration counts. Run dry-run again and require zero planned changes.

- [ ] **Step 6: Restart development listener and commit**

```bash
pm2 restart psa-vessel-dev-mqtt --update-env
pm2 save
git add scripts/migrate-development-telemetry-timezones.ts src/backend/__tests__/telemetryTimezoneMigration.test.ts
git commit -m "chore: correct development telemetry timestamps"
```

Do not execute the script against production.

---

### Task 7: Rebuild and Monitor the Development Worktree

**Files:**
- Modify only if verification exposes a focused defect with a failing regression test.

**Interfaces:**
- Keeps PM2 processes `psa-vessel-dev-dashboard` and `psa-vessel-dev-mqtt` on `psa_generator_dev`, Redis prefix `psa:dev:`, dashboard port `3399`.

- [ ] **Step 1: Run complete verification**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm eslint src/backend/telemetry/timezone.ts src/backend/mqtt/transformPayload.ts src/backend/mqtt/intervalAggregation.ts src/backend/mqtt/listener.ts src/app/api/dashboard/route.ts src/app/api/history/route.ts src/app/api/history/export/route.ts src/app/api/history/export/export-query.ts src/frontend/components/dashboard/stations-table.tsx src/frontend/components/pages/database-page.tsx src/frontend/components/modals/export-modal.tsx scripts/migrate-development-telemetry-timezones.ts
git diff --check
```

- [ ] **Step 2: Build and restart only development PM2 processes**

Run these commands from the feature worktree; do not restart `psa-mgm-*` or `psa-cmc-*`:

```bash
set -a
. /root/apps/PSA-GENERATOR/.env.mgm
. ./.env.development.local
set +a
export DATABASE_URL=$(node -e 'const u=new URL(process.env.DATABASE_URL); u.pathname=`/${process.env.DEV_DATABASE_NAME}`; process.stdout.write(u.toString())')
export NODE_ENV=production PORT=3399 HOSTNAME=0.0.0.0
pnpm build
standalone_root="$PWD/.next/standalone/.worktrees/area-monitoring-revisions"
mkdir -p "$standalone_root/.next/static" "$standalone_root/public"
cp -a .next/static/. "$standalone_root/.next/static/"
cp -a public/. "$standalone_root/public/"
pm2 restart psa-vessel-dev-dashboard --update-env
pm2 restart psa-vessel-dev-mqtt --update-env
pm2 save
```

- [ ] **Step 3: Verify runtime timezone and health**

Require OS, Node, PostgreSQL, and development PM2 to report/inherit `Asia/Jakarta`; require HTTP `/login` and one static asset to return 200; require both development processes online with no unexpected restart loop.

- [ ] **Step 4: Verify real scoped outputs**

Login as `cepoko`. Require Dashboard and History to contain only its two RS Cepoko machines. Compare a latest raw `_terminalTime`, stored UTC instant, Dashboard event timestamp, History timestamp, preview, and CSV; the displayed clock must equal the machine-provided local clock for its hospital. Confirm CSV contains `Timestamp` and `Nama Mesin`, with no zone column/suffix.

- [ ] **Step 5: Audit isolation**

Verify production has not been migrated or restarted, development row counts are preserved, main worktree is clean, and the two pre-existing user changes remain unstaged in the feature worktree.

- [ ] **Step 6: Commit only a verified regression fix**

If Steps 1-5 expose a defect, write a failing regression test, implement the focused fix, rerun Step 1, and commit it. Otherwise do not create an empty commit.
