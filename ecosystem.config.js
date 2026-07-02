module.exports = {
  apps: [
    {
      name: "psa-dashboard",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
    {
      name: "psa-mqtt",
      script: "pnpm",
      args: "run mqtt",
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
