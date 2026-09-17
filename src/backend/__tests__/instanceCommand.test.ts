// @vitest-environment node
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

function run(contents: string, command = "console.log(process.env.DATABASE_URL)") {
  const dir = mkdtempSync(join(tmpdir(), "psa-instance-"));
  directories.push(dir);
  const envFile = join(dir, ".env.cmc");
  writeFileSync(envFile, contents);
  return spawnSync(process.execPath, [resolve("src/backend/db/instance-command.mjs"), envFile, process.execPath, "-e", command], {
    encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgres://localhost/mgm" },
  });
}

it("runs database commands with the selected CMC database instead of inherited MGM configuration", () => {
  const result = run("DATABASE_URL=postgres://localhost/cmc\n");
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("postgres://localhost/cmc");
});

it("refuses to fall back to MGM when the selected instance has no database configured", () => {
  const result = run("BRAND_NAME=CMC\n", "console.log('COMMAND_EXECUTED')");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("DATABASE_URL");
  expect(result.stdout).not.toContain("COMMAND_EXECUTED");
});

it("propagates failed database commands so deployment stops before reload", () => {
  const result = run("DATABASE_URL=postgres://localhost/cmc\n", "process.exit(7)");
  expect(result.status).toBe(7);
});
