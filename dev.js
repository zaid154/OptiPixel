const { spawn } = require('child_process');

console.log('Starting OptiPixel dev servers (Client + Server)...');

const server = spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const client = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

function cleanExit() {
  console.log('\nShutting down OptiPixel servers...');
  server.kill();
  client.kill();
  process.exit();
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
