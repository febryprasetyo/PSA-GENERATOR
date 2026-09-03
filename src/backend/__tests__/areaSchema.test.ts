import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { areaHospitals, areas, machineLatestReadings, machineReadings } from "@/backend/db/schema";

describe("Area schema", () => {
  it("defines the Area tables", () => {
    expect(getTableConfig(areas).name).toBe("areas");
    expect(getTableConfig(areaHospitals).name).toBe("area_hospitals");
  });

  it("enforces one Area membership per hospital", () => {
    const config = getTableConfig(areaHospitals);
    expect(config.uniqueConstraints.map((constraint) => constraint.name)).toContain(
      "area_hospitals_hospital_id_unique",
    );
  });

  it("makes ten-minute history inserts idempotent per machine and interval", () => {
    const config = getTableConfig(machineReadings);
    expect(config.uniqueConstraints.map((constraint) => constraint.name)).toContain(
      "machine_readings_machine_terminal_unique",
    );
  });

  it("defines nullable Vessel columns for historical and latest readings", () => {
    const historical = getTableConfig(machineReadings);
    const latest = getTableConfig(machineLatestReadings);

    for (const config of [historical, latest]) {
      expect(config.columns.find((column) => column.name === "vessel_1")?.notNull).toBe(false);
      expect(config.columns.find((column) => column.name === "vessel_2")?.notNull).toBe(false);
    }
  });
});
