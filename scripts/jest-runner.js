/**
 * Jest launcher.
 *
 * Some dependencies (sanitize-html 2.18 and its htmlparser2) ship ES
 * modules. Node loads them through `require(esm)`, which the plain Node
 * runtime supports from 22.12 onwards, but the Jest CommonJS runtime needs
 * the VM modules flag to do the same. The flag is set here so the test
 * command is identical on Windows, macOS and Linux.
 */
const { spawn } = require('child_process');

const jestBin = require.resolve('jest/bin/jest');

const nodeOptions = [process.env.NODE_OPTIONS, '--experimental-vm-modules']
  .filter(Boolean)
  .join(' ');

const child = spawn(process.execPath, [jestBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
