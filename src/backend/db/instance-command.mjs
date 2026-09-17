import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

const [envFile, command, ...args] = process.argv.slice(2);
try {
  if (!envFile || !command) throw new Error("Usage: db:instance <env-file> <command> [args...]");
  const instanceEnv = parse(readFileSync(envFile));
  if (!instanceEnv.DATABASE_URL) throw new Error(`${envFile}: DATABASE_URL is required`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...instanceEnv },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
