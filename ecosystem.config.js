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
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      name: "psa-mgm-mqtt",
      cwd: __dirname,
      script: "pnpm",
      args: "run mqtt",
      env: {
        NODE_ENV: "production",
        ...envMgm,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
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
    },
    {
      name: "psa-cmc-mqtt",
      cwd: __dirname,
      script: "pnpm",
      args: "run mqtt",
      env: {
        NODE_ENV: "production",
        ...envCmc,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
