module.exports = {
  apps: [
    {
      name: "meal-tracker",
      script: "npm",
      args: "start",
      cwd: __dirname + "/..",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
