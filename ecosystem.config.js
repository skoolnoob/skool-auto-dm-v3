module.exports = {
  apps: [{
    name: 'skool-auto-dm',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: ['app', 'lib', 'utils'],
    ignore_watch: ['node_modules', 'logs'],
    max_memory_restart: '1G',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}; 