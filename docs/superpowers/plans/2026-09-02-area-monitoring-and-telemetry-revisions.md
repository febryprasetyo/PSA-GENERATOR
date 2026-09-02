# Area Monitoring and Telemetry Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic Area membership and dashboard filtering while revising purity, units, 10-minute telemetry persistence, and 30-minute CSV export behavior.

**Architecture:** Keep Rumah Sakit as the parent entity and model Area membership through `areas` plus `area_hospitals`, with a unique hospital constraint. Keep realtime latest telemetry unchanged, extract testable interval aggregation helpers for aligned 10-minute history, and perform 30-minute export grouping in PostgreSQL before streaming CSV.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL/TimescaleDB, Redis/ioredis, MQTT, Vitest, Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-02-area-monitoring-and-telemetry-revisions-design.md`

## Global Constraints

- Preserve the existing Rumah Sakit master; do not rename it or introduce an institution type.
- One Area may contain many hospitals, but one hospital may belong to at most one Area.
- Admin manages Area metadata; admin and operator manage hospital membership.
- Machines inherit Area only through their parent hospital.
- Purity is green Optimal at `>= 90` and yellow Kritis below `90`.
- MC/day and MC/bulan display `Nm³`; both flows and Total Flow display `Nm³/h`.
- Realtime latest readings continue updating on every valid MQTT message.
- Historical persistence uses aligned 10-minute averages and retry-safe buffer handling.
- CSV export uses aligned 30-minute averages per hospital and machine.
- SN is included for all CSV rows only when at least one represented hospital owns more than one non-deleted machine.
- Existing auth scope, soft deletes, 90-day export range, and old historical rows remain compatible.

---

## File Map

- `src/backend/db/schema.ts`: Area tables, relations, and interval idempotency constraint.
- `src/backend/areas/membership.ts`: transactional membership replacement service.
- `src/app/api/areas/route.ts`: Area list and admin create endpoint.
- `src/app/api/areas/[id]/route.ts`: admin update/delete endpoint.
- `src/app/api/areas/[id]/hospitals/route.ts`: admin/operator membership replacement endpoint.
- `src/backend/__tests__/areasApi.test.ts`: authorization, validation, CRUD, and membership API tests.
- `src/app/areas/page.tsx`: App Router entrypoint.
- `src/frontend/components/pages/areas-page.tsx`: Area management screen.
- `src/frontend/components/modals/area-modal.tsx`: admin Area metadata form.
- `src/frontend/components/modals/area-members-modal.tsx`: searchable membership editor.
- `src/frontend/lib/routes.ts` and `src/frontend/components/layout/sidebar.tsx`: navigation.
- `src/backend/status/purityLevel.ts` and frontend metric/presentation files: two-level purity behavior.
- `src/backend/mqtt/intervalAggregation.ts`: pure average/bucket helpers.
- `src/backend/mqtt/listener.ts`: aligned scheduler and retry-safe Redis processing.
- `src/app/api/history/export/export-query.ts`: 30-minute query and SN-column decision helpers.
- `src/app/api/history/export/route.ts`: streaming CSV orchestration.
- Existing and new test files under `src/backend/__tests__` and `src/frontend/__tests__`: regression coverage.

---

### Task 1: Add Area Schema and Database Constraints

**Files:**
- Modify: `src/backend/db/schema.ts`
- Modify: `src/backend/db/setup_timescale.ts`
- Create: `src/backend/__tests__/areaSchema.test.ts`

**Interfaces:**
- Produces: Drizzle tables `areas` and `areaHospitals`.
- Produces: `areaHospitals.hospitalId` unique membership invariant.
- Produces: `(machineReadings.machineId, machineReadings.terminalTime)` idempotency invariant.

- [ ] **Step 1: Write a failing schema metadata test**

```ts
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { areas, areaHospitals } from "@/backend/db/schema";

describe("Area schema", () => {
  it("exposes Area and one-hospital membership tables", () => {
    expect(getTableConfig(areas).name).toBe("areas");
    expect(getTableConfig(areaHospitals).name).toBe("area_hospitals");
    expect(getTableConfig(areaHospitals).uniqueConstraints.map((item) => item.name))
      .toContain("area_hospitals_hospital_id_unique");
  });
});
```

- [ ] **Step 2: Run the test and verify missing exports fail**

Run: `pnpm vitest run src/backend/__tests__/areaSchema.test.ts`  
Expected: FAIL because `areas` and `areaHospitals` are not exported.

- [ ] **Step 3: Define additive tables and constraints**

Add `uniqueIndex`, `unique`, and `primaryKey` imports as required, then define:

```ts
export const areas = pgTable("areas", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("areas_name_lower_unique").on(sql`lower(${table.name})`)]);

export const areaHospitals = pgTable("area_hospitals", {
  areaId: text("area_id").notNull().references(() => areas.id, { onDelete: "cascade" }),
  hospitalId: text("hospital_id").notNull().references(() => masterHospitals.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: "area_hospitals_pk", columns: [table.areaId, table.hospitalId] }),
  unique("area_hospitals_hospital_id_unique").on(table.hospitalId),
]);
```

Add an idempotency constraint that includes the Timescale partition timestamp:

```ts
unique("machine_readings_machine_terminal_unique").on(table.machineId, table.terminalTime)
```

Update Timescale setup SQL so production initialization preserves the same unique constraint and creates new additive tables through the established schema deployment path.

- [ ] **Step 4: Run focused test and typecheck schema usage**

Run: `pnpm vitest run src/backend/__tests__/areaSchema.test.ts && pnpm exec tsc --noEmit`  
Expected: PASS.

- [ ] **Step 5: Commit schema changes**

```bash
git add src/backend/db/schema.ts src/backend/db/setup_timescale.ts src/backend/__tests__/areaSchema.test.ts
git commit -m "feat: add area membership schema"
```

---

### Task 2: Implement Area CRUD and Membership APIs

**Files:**
- Create: `src/backend/areas/membership.ts`
- Create: `src/app/api/areas/route.ts`
- Create: `src/app/api/areas/[id]/route.ts`
- Create: `src/app/api/areas/[id]/hospitals/route.ts`
- Create: `src/backend/__tests__/areasApi.test.ts`

**Interfaces:**
- Produces: `normalizeAreaInput(body): { name: string; description: string | null }`.
- Produces: `replaceAreaHospitals(areaId: string, hospitalIds: string[]): Promise<void>`.
- Produces: GET/POST `/api/areas`, PUT/DELETE `/api/areas/:id`, PUT `/api/areas/:id/hospitals`.

- [ ] **Step 1: Write failing authorization and validation tests**

Cover these exact cases with mocked `requireAuth` and DB chains:

```ts
it.each(["client", "viewer"])("rejects %s membership edits", async (role) => {
  mockAuth(role);
  const response = await PUT_MEMBERS(requestWith({ hospitalIds: ["h-1"] }), params("a-1"));
  expect(response.status).toBe(403);
});

it("allows operator membership edits but rejects Area creation", async () => {
  mockAuth("operator");
  expect((await POST_AREA(requestWith({ name: "Area 1" }))).status).toBe(403);
  expect((await PUT_MEMBERS(requestWith({ hospitalIds: ["h-1"] }), params("a-1"))).status).toBe(200);
});

it("rejects a blank trimmed Area name", async () => {
  mockAuth("admin");
  expect((await POST_AREA(requestWith({ name: "   " }))).status).toBe(400);
});
```

Also test admin CRUD, 404 Area, invalid hospital ID, duplicate submitted IDs, and case-insensitive duplicate name response.

- [ ] **Step 2: Run API tests and verify route imports fail**

Run: `pnpm vitest run src/backend/__tests__/areasApi.test.ts`  
Expected: FAIL because Area routes do not exist.

- [ ] **Step 3: Implement input normalization and Area list/create**

Use a shared function with explicit output:

```ts
export function normalizeAreaInput(body: unknown) {
  const parsed = z.object({ name: z.string(), description: z.string().optional().nullable() }).safeParse(body);
  if (!parsed.success || !parsed.data.name.trim()) throw new AreaValidationError("Nama Area wajib diisi");
  return { name: parsed.data.name.trim(), description: parsed.data.description?.trim() || null };
}
```

`GET` selects Area metadata plus ordered memberships. `POST` permits admin only and maps duplicate-name database error to HTTP 409 with `Nama Area sudah digunakan`.

- [ ] **Step 4: Implement update/delete and transactional membership replacement**

The service validates and deduplicates IDs, then executes:

```ts
await db.transaction(async (tx) => {
  const [area] = await tx.select({ id: areas.id }).from(areas).where(eq(areas.id, areaId)).limit(1);
  if (!area) throw new AreaNotFoundError();
  const found = hospitalIds.length
    ? await tx.select({ id: masterHospitals.id }).from(masterHospitals).where(inArray(masterHospitals.id, hospitalIds))
    : [];
  if (found.length !== hospitalIds.length) throw new AreaValidationError("Rumah Sakit tidak valid");
  if (hospitalIds.length) await tx.delete(areaHospitals).where(inArray(areaHospitals.hospitalId, hospitalIds));
  await tx.delete(areaHospitals).where(eq(areaHospitals.areaId, areaId));
  if (hospitalIds.length) await tx.insert(areaHospitals).values(hospitalIds.map((hospitalId) => ({ areaId, hospitalId })));
});
```

PUT membership permits `admin` and `operator`; metadata mutation and deletion permit only `admin`.

- [ ] **Step 5: Run Area API tests and full backend suite**

Run: `pnpm vitest run src/backend/__tests__/areasApi.test.ts src/backend/__tests__/auth.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit API slice**

```bash
git add src/backend/areas src/app/api/areas src/backend/__tests__/areasApi.test.ts
git commit -m "feat: add area management APIs"
```

---

### Task 3: Build Area Management UI and Navigation

**Files:**
- Create: `src/app/areas/page.tsx`
- Create: `src/frontend/components/pages/areas-page.tsx`
- Create: `src/frontend/components/modals/area-modal.tsx`
- Create: `src/frontend/components/modals/area-members-modal.tsx`
- Modify: `src/frontend/components/layout/sidebar.tsx`
- Modify: `src/frontend/lib/routes.ts`
- Create: `src/frontend/__tests__/areas-page.test.tsx`

**Interfaces:**
- Consumes: Area API endpoints from Task 2.
- Produces: `appRoutes.areas = "/areas"` and Area management UI.

- [ ] **Step 1: Write failing role/render tests**

```tsx
it("shows create controls to admin", async () => {
  mockUseAuth({ role: "admin" });
  render(<AreasPage />);
  expect(await screen.findByRole("button", { name: /tambah area/i })).toBeVisible();
});

it("lets operator edit members without Area metadata actions", async () => {
  mockUseAuth({ role: "operator" });
  render(<AreasPage />);
  expect(await screen.findByRole("button", { name: /atur anggota/i })).toBeVisible();
  expect(screen.queryByRole("button", { name: /tambah area/i })).not.toBeInTheDocument();
});
```

Also verify member names, unassigned hospitals, move warning, loading/error state, and disabled submit during mutation.

- [ ] **Step 2: Run UI test and verify component import fails**

Run: `pnpm vitest run src/frontend/__tests__/areas-page.test.tsx`  
Expected: FAIL because `AreasPage` does not exist.

- [ ] **Step 3: Add route and sidebar entry**

Add `areas: "/areas"` to `appRoutes`, and add this management item:

```ts
{ label: "Area", href: appRoutes.areas, icon: MapPin, roles: ["admin", "operator"] }
```

The page entrypoint returns `<AreasPage />` following existing client/device page wrappers.

- [ ] **Step 4: Implement metadata modal and page list**

Use controlled `name` and `description` fields. Preserve server errors in the open modal. Admin-only buttons invoke POST/PUT/DELETE and refresh the Area list only after success.

- [ ] **Step 5: Implement searchable membership editor**

Fetch Areas and `/api/clients?limit=1000`. Render checkboxes/search results, show the source Area next to already assigned hospitals, and show `RS ini akan dipindahkan dari {areaName}` before saving changed selections. Submit `{ hospitalIds: string[] }` to the membership endpoint.

- [ ] **Step 6: Run UI tests and lint touched files**

Run: `pnpm vitest run src/frontend/__tests__/areas-page.test.tsx && pnpm eslint src/app/areas src/frontend/components/pages/areas-page.tsx src/frontend/components/modals/area-modal.tsx src/frontend/components/modals/area-members-modal.tsx src/frontend/components/layout/sidebar.tsx src/frontend/lib/routes.ts`  
Expected: PASS.

- [ ] **Step 7: Commit UI slice**

```bash
git add src/app/areas src/frontend/components/pages/areas-page.tsx src/frontend/components/modals/area-modal.tsx src/frontend/components/modals/area-members-modal.tsx src/frontend/components/layout/sidebar.tsx src/frontend/lib/routes.ts src/frontend/__tests__/areas-page.test.tsx
git commit -m "feat: add area management interface"
```

---

### Task 4: Add Dashboard Area Data and Filtering

**Files:**
- Modify: `src/app/api/dashboard/route.ts`
- Modify: `src/frontend/components/dashboard.tsx`
- Modify: `src/frontend/components/dashboard/stations-table.tsx`
- Modify: `src/frontend/lib/types.ts`
- Modify: `src/frontend/lib/dashboard-types.ts`
- Modify: `src/frontend/lib/dashboard-analytics.ts`
- Create: `src/backend/__tests__/dashboardAreaFilter.test.ts`
- Modify: `src/frontend/__tests__/dashboard-analytics.test.ts`

**Interfaces:**
- Consumes: `areas`, `areaHospitals` from Task 1.
- Produces: dashboard machine fields `areaId: string | null`, `areaName: string | null`.
- Produces: `AreaFilter = "all" | "unassigned" | string` in frontend filter state.

- [ ] **Step 1: Write failing API access/filter tests**

Test `GET(new Request(".../api/dashboard?areaId=a-1"))` adds Area membership constraints, `unassigned` uses a null membership check, unknown IDs return 400, and a client query remains constrained by `clientId` even if another Area is supplied.

- [ ] **Step 2: Write failing analytics composition test**

```ts
expect(getFilteredStations(stations, {
  query: "", areaFilter: "a-1", statusFilter: "all", purityFilter: "all",
  pressureFilter: "all", sortKey: "hospitalName", sortDirection: "asc",
})).toEqual([expect.objectContaining({ areaId: "a-1" })]);
```

- [ ] **Step 3: Run tests and verify failures**

Run: `pnpm vitest run src/backend/__tests__/dashboardAreaFilter.test.ts src/frontend/__tests__/dashboard-analytics.test.ts`  
Expected: FAIL because Area fields/filter are absent.

- [ ] **Step 4: Extend dashboard API**

Change the handler signature to `GET(request: Request)`, left join membership and Area, select `areaId`/`areaName`, validate provided IDs, and compose Area, client-scope, and soft-delete conditions with `and(...)`.

- [ ] **Step 5: Add Area state and selector to dashboard**

Fetch `/api/areas`, store `areaFilter`, pass it to dashboard API and table filters, and reset page on change. Add options `Semua Area`, configured names, and `Belum Memiliki Area`. Include `areaName` in the station subtitle.

- [ ] **Step 6: Run focused tests**

Run: `pnpm vitest run src/backend/__tests__/dashboardAreaFilter.test.ts src/frontend/__tests__/dashboard-analytics.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit dashboard Area slice**

```bash
git add src/app/api/dashboard/route.ts src/frontend/components/dashboard.tsx src/frontend/components/dashboard/stations-table.tsx src/frontend/lib/types.ts src/frontend/lib/dashboard-types.ts src/frontend/lib/dashboard-analytics.ts src/backend/__tests__/dashboardAreaFilter.test.ts src/frontend/__tests__/dashboard-analytics.test.ts
git commit -m "feat: filter dashboard by area"
```

---

### Task 5: Apply Purity Boundary and Unit Labels

**Files:**
- Modify: `src/backend/status/purityLevel.ts`
- Modify: `src/backend/__tests__/deriveMachineStatus.test.ts`
- Create: `src/backend/__tests__/purityLevel.test.ts`
- Modify: `src/frontend/lib/metrics.ts`
- Modify: `src/frontend/components/dashboard/stations-table.tsx`
- Modify: `src/frontend/components/dashboard/oxygen-quality-panel.tsx`
- Modify: `src/frontend/components/dashboard/production-summary-panel.tsx`
- Modify: `src/frontend/__tests__/dashboard-analytics.test.ts`

**Interfaces:**
- Produces: `getPurityLevel(purity, thresholds)` returning `"normal"` for `>=90`, `"critical"` for `<90`, never `"warning"`.

- [ ] **Step 1: Add failing boundary tests**

```ts
it.each([
  [89.99, "critical"],
  [90, "normal"],
  [90.01, "normal"],
])("maps %s to %s", (purity, expected) => {
  expect(getPurityLevel(purity, thresholds)).toBe(expected);
});
```

Remove the mocked old three-band purity implementation from `deriveMachineStatus.test.ts` so it exercises the real helper.

- [ ] **Step 2: Run purity tests and verify 90 currently fails**

Run: `pnpm vitest run src/backend/__tests__/purityLevel.test.ts src/backend/__tests__/deriveMachineStatus.test.ts`  
Expected: FAIL for values between the old warning and normal thresholds.

- [ ] **Step 3: Implement the two-level rule across calculations**

```ts
export function getPurityLevel(purity: number, _thresholds: Thresholds): Level {
  return purity < 90 ? "critical" : "normal";
}
```

Make frontend enrichment use the same `90` boundary, map normal to `Optimal`, critical to `Kritis`, and remove purity warning options/counts from presentation while retaining three-level pressure support.

- [ ] **Step 4: Correct dashboard units and legend**

Use labels `MC/day (Nm³)`, `MC/bulan (Nm³)`, `Flow Meter 1 (Nm³/h)`, `Flow Meter 2 (Nm³/h)`, and `Total Flow (Nm³/h)`. Replace the old three-band legend with `≥90% Optimal` in green and `<90% Kritis` in amber/yellow.

- [ ] **Step 5: Run purity/frontend tests**

Run: `pnpm vitest run src/backend/__tests__/purityLevel.test.ts src/backend/__tests__/deriveMachineStatus.test.ts src/frontend/__tests__/dashboard-analytics.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit classification and units**

```bash
git add src/backend/status/purityLevel.ts src/backend/__tests__/purityLevel.test.ts src/backend/__tests__/deriveMachineStatus.test.ts src/frontend/lib/metrics.ts src/frontend/components/dashboard src/frontend/__tests__/dashboard-analytics.test.ts
git commit -m "feat: revise purity threshold and dashboard units"
```

---

### Task 6: Replace Hourly Persistence with Retry-Safe Ten-Minute Aggregation

**Files:**
- Create: `src/backend/mqtt/intervalAggregation.ts`
- Modify: `src/backend/mqtt/listener.ts`
- Replace: `src/backend/__tests__/listenerAggregation.test.ts`
- Create: `src/backend/__tests__/intervalAggregation.test.ts`

**Interfaces:**
- Produces: `getTenMinuteBucketStart(date: Date): Date`.
- Produces: `averageSamples(samples: BufferedSample[], bucketStart: Date): AggregatedReading`.
- Produces: `flushTenMinuteReadings(bucketStart?: Date): Promise<void>`.

- [ ] **Step 1: Write failing pure-helper tests**

```ts
expect(getTenMinuteBucketStart(new Date("2026-09-02T10:19:59.999Z")).toISOString())
  .toBe("2026-09-02T10:10:00.000Z");
expect(averageSamples(samples, new Date("2026-09-02T10:10:00Z"))).toMatchObject({
  terminalTime: new Date("2026-09-02T10:10:00Z"), oxygenPurity: "95.00", totalFlow: "105.00",
});
```

Include null, empty string, `NaN`, and latest-metadata cases.

- [ ] **Step 2: Write failing retry/idempotency listener tests**

Mock Redis rename/processing keys and DB insert. Verify a successful insert deletes the processing key, a failed insert retains it, and conflict-safe insert does not duplicate `(machineId, terminalTime)`.

- [ ] **Step 3: Run aggregation tests and verify failures**

Run: `pnpm vitest run src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/listenerAggregation.test.ts`  
Expected: FAIL because ten-minute helpers do not exist.

- [ ] **Step 4: Implement pure aggregation helpers**

Define typed `BufferedSample` and `AggregatedReading`; filter values with `Number.isFinite`, average to two decimals, and take metadata from the sample with the latest terminal time.

- [ ] **Step 5: Rename Redis buffers and implement atomic processing**

Use keys:

```ts
machine:ten_minute_samples:${serialNumber}
machine:ten_minute_processing:${serialNumber}:${bucketStart.toISOString()}
machine:ten_minute_active_serials
```

Atomically rename an active list to its processing key only when the active key exists. Insert with `onConflictDoNothing({ target: [machineReadings.machineId, machineReadings.terminalTime] })`. Delete the processing key and remove the active set member only after success; keep processing data after failure for the next retry.

- [ ] **Step 6: Schedule aligned boundaries and compatibility drain**

Calculate delay as `TEN_MINUTES_MS - (Date.now() % TEN_MINUTES_MS)`, run the first flush at that boundary, then use a ten-minute interval. On startup, detect legacy `machine:hourly_active_serials` buffers and drain them once through the same aggregation path before using only new keys.

- [ ] **Step 7: Run aggregation tests**

Run: `pnpm vitest run src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/listenerAggregation.test.ts`  
Expected: PASS.

- [ ] **Step 8: Commit logger change**

```bash
git add src/backend/mqtt/intervalAggregation.ts src/backend/mqtt/listener.ts src/backend/__tests__/intervalAggregation.test.ts src/backend/__tests__/listenerAggregation.test.ts
git commit -m "feat: persist ten minute telemetry averages"
```

---

### Task 7: Implement Thirty-Minute Export and Dynamic SN Column

**Files:**
- Create: `src/app/api/history/export/export-query.ts`
- Modify: `src/app/api/history/export/route.ts`
- Modify: `src/backend/__tests__/exportApi.test.ts`
- Create: `src/backend/__tests__/exportAggregation.test.ts`

**Interfaces:**
- Produces: `getThirtyMinuteBucketStart(date: Date): Date` for unit verification/fallback formatting.
- Produces: `shouldIncludeSerialNumber(machineCounts: number[]): boolean`.
- Produces: `buildCsvHeader(includeSerialNumber: boolean): string[]`.
- Consumes: grouped rows `{ hospitalName, serialNumber, bucketStart, averages... }`.

- [ ] **Step 1: Write failing helper and boundary tests**

```ts
expect(getThirtyMinuteBucketStart(new Date("2026-09-02T10:29:59Z")).toISOString())
  .toBe("2026-09-02T10:00:00.000Z");
expect(getThirtyMinuteBucketStart(new Date("2026-09-02T10:30:00Z")).toISOString())
  .toBe("2026-09-02T10:30:00.000Z");
expect(shouldIncludeSerialNumber([1, 1])).toBe(false);
expect(shouldIncludeSerialNumber([1, 2])).toBe(true);
expect(buildCsvHeader(false)).not.toContain("Serial Number");
expect(buildCsvHeader(true)).toContain("Serial Number");
```

- [ ] **Step 2: Extend route tests for SQL aggregation and CSV layouts**

Mock a represented single-machine hospital and assert no SN header/cells; mock mixed hospitals and assert SN exists in every row. Assert three stored ten-minute points produce one averaged 30-minute row and remain separated by machine.

- [ ] **Step 3: Run export tests and verify failures**

Run: `pnpm vitest run src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts`  
Expected: FAIL because helpers and grouped query are absent.

- [ ] **Step 4: Implement grouped PostgreSQL query**

Use a half-hour bucket expression based on terminal time:

```ts
const bucketStart = sql<Date>`date_bin('30 minutes', ${machineReadings.terminalTime}, TIMESTAMPTZ '1970-01-01 00:00:00+00')`;
```

Select hospital, serial number, bucket start, and `avg(...)` for each numeric metric; group by hospital ID/name, machine ID/SN, and bucket expression. Apply date conditions to `terminalTime`, not `receivedAt`.

- [ ] **Step 5: Determine SN visibility before streaming**

Select distinct represented hospital IDs from the effective filtered dataset, then count all non-deleted machines owned by those hospitals. Include SN if any count exceeds one. Do this before sending the CSV header.

- [ ] **Step 6: Stream grouped rows and version cache keys**

Use header label `Interval Mulai (30 Menit)`, add `export:v2:30m` to the Redis key, preserve BOM, 90-day validation, role scope, soft-delete conditions, and streaming chunks. Build rows from the same `includeSerialNumber` boolean used for the header.

- [ ] **Step 7: Run export tests**

Run: `pnpm vitest run src/backend/__tests__/exportAggregation.test.ts src/backend/__tests__/exportApi.test.ts`  
Expected: PASS.

- [ ] **Step 8: Commit export slice**

```bash
git add src/app/api/history/export src/backend/__tests__/exportApi.test.ts src/backend/__tests__/exportAggregation.test.ts
git commit -m "feat: export thirty minute telemetry averages"
```

---

### Task 8: Harden Rumah Sakit Creation

**Files:**
- Modify: `src/app/api/clients/route.ts`
- Modify: `src/frontend/components/modals/client-modal.tsx`
- Modify: `src/frontend/components/pages/clients-page.tsx`
- Create: `src/backend/__tests__/clientsApi.test.ts`
- Create: `src/frontend/__tests__/client-modal.test.tsx`

**Interfaces:**
- Preserves: POST `/api/clients` payload and `ClientModal` callback contract.
- Produces: trimmed non-empty `hospitalName` and persistent modal error on failure.

- [ ] **Step 1: Write failing API validation and permission tests**

Test admin/operator valid creation, client/viewer 403, `"   "` name 400, and database failure 500. Assert the inserted name is trimmed.

- [ ] **Step 2: Write failing modal behavior tests**

```tsx
it("keeps the modal open and displays the server error", async () => {
  const onSave = vi.fn().mockRejectedValue(new Error("Nama Rumah Sakit wajib diisi"));
  render(<ClientModal isOpen onClose={vi.fn()} onSave={onSave} client={null} />);
  await user.type(screen.getByLabelText(/nama rumah sakit/i), "RS Test");
  await user.click(screen.getByRole("button", { name: "Simpan" }));
  expect(await screen.findByText("Nama Rumah Sakit wajib diisi")).toBeVisible();
});
```

- [ ] **Step 3: Run tests and verify blank-name/API behavior fails**

Run: `pnpm vitest run src/backend/__tests__/clientsApi.test.ts src/frontend/__tests__/client-modal.test.tsx`  
Expected: FAIL on trimmed blank validation or missing test labels.

- [ ] **Step 4: Implement minimal hardening**

Normalize `hospitalName` with `typeof hospitalName === "string" ? hospitalName.trim() : ""`; reject blank; insert the normalized name. Add `htmlFor`/`id` labels and ensure only the successful parent save path closes the modal once.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm vitest run src/backend/__tests__/clientsApi.test.ts src/frontend/__tests__/client-modal.test.tsx`  
Expected: PASS.

```bash
git add src/app/api/clients/route.ts src/frontend/components/modals/client-modal.tsx src/frontend/components/pages/clients-page.tsx src/backend/__tests__/clientsApi.test.ts src/frontend/__tests__/client-modal.test.tsx
git commit -m "fix: harden hospital creation flow"
```

---

### Task 9: Integration Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.env.example` only if a configurable interval is introduced; otherwise leave unchanged.

**Interfaces:**
- Documents: Area permissions, schema deployment, 10-minute persistence, 30-minute export, and verification steps.

- [ ] **Step 1: Update operational documentation**

Document `pnpm run db:push` before application rollout, Area assignment behavior, the listener's aligned 10-minute persistence, CSV 30-minute averaging, and legacy buffer compatibility drain.

- [ ] **Step 2: Run the complete automated suite**

Run: `pnpm test`  
Expected: all test files pass with zero failures.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`  
Expected: exit 0 with no errors.

- [ ] **Step 4: Run production build**

Run: `pnpm build`  
Expected: exit 0 and all Area/API pages compile.

- [ ] **Step 5: Inspect worktree and migration diff**

Run: `git status --short && git diff master...HEAD --check && git diff master...HEAD --stat`  
Expected: only intended files, no whitespace errors, no `.env`, build output, or dependency directory tracked.

- [ ] **Step 6: Perform manual smoke verification against a non-production database**

Verify: create Area as admin; operator cannot create Area; operator moves a hospital; two machines follow the hospital in the dashboard Area filter; unassigned filter works; purity 90 is green; units render correctly; logger creates one row per machine per 10-minute boundary; single-machine CSV omits SN; multi-machine hospital CSV includes SN and 30-minute averages.

- [ ] **Step 7: Commit documentation**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document area and telemetry revisions"
```

- [ ] **Step 8: Record final verification evidence**

Run: `git log --oneline master..HEAD && git status --short --branch`  
Expected: task commits are present and the feature worktree is clean.

