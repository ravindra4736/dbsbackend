module.exports = {
  apps: [
    {
      name: "dbsbackend",
      cwd: __dirname,
      script: "dist/main.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        APP_ENV: "production"
      },
      env_staging: {
        APP_ENV: "staging"
      },
      env_local: {
        APP_ENV: "local"
      }
    }
  ]
};