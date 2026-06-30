module.exports = {
  apps: [
    {
      name: 'ruthko-connect',
      script: 'server.js',
      cwd: '/var/www/ruthko-connect',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
