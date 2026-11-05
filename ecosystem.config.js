const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function loadEnvFile(file) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    return dotenv.parse(fs.readFileSync(filePath));
  }
  return {};
}

const envMgm = loadEnvFile(".env.mgm");
const envCmc = loadEnvFile(".env.cmc");

module.exports = {
  apps: [
    // --- MGM INSTANCE ---
    {
      name: "psa-mgm-dashboard",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3300",
      env: {
        NODE_ENV: "production",
        PORT: 3300,
        ...envMgm,
        CMC_DATABASE_URL: envMgm.CMC_DATABASE_URL || envCmc.DATABASE_URL,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      autorestart: true,
      max_memory_restart: "1G",
      exp_backoff_restart_delay: 100,
    },
    {
      name: "psa-mgm-mqtt",
      cwd: __dirname,
      script: "node_modules/tsx/dist/cli.mjs",
      args: "src/backend/mqtt/listener.ts",
      env: {
        NODE_ENV: "production",
        ...envMgm,
        CMC_DATABASE_URL: envMgm.CMC_DATABASE_URL || envCmc.DATABASE_URL,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      autorestart: true,
      max_memory_restart: "800M",
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
    },

    // --- CMC INSTANCE ---
    {
      name: "psa-cmc-dashboard",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3301",
      env: {
        NODE_ENV: "production",
        PORT: 3301,
        ...envCmc,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      autorestart: true,
      max_memory_restart: "1G",
      exp_backoff_restart_delay: 100,
    },
    {
      name: "psa-cmc-mqtt",
      cwd: __dirname,
      script: "node_modules/tsx/dist/cli.mjs",
      args: "src/backend/mqtt/listener.ts",
      env: {
        NODE_ENV: "production",
        ...envCmc,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      autorestart: true,
      max_memory_restart: "800M",
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
    },
  ],
};
