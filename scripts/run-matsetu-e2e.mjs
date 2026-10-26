import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1';
const webUrl = new URL('/', baseUrl).toString();
const apiHealthUrl = new URL('/api/healthz', baseUrl).toString();
const ownedProcesses = new Map();
let cypressProcess;
let cleanupPromise;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function isReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

function launch(name, args, extraEnv = {}) {
  const child = spawn('pnpm', args, {
    cwd: rootDirectory,
    env: { ...process.env, ...extraEnv },
    detached: process.platform !== 'win32',
    stdio: 'inherit',
  });
  ownedProcesses.set(name, child);
  return child;
}

async function waitUntilReady(name, url, child, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let spawnError;
  child.once('error', (error) => {
    spawnError = error;
  });

  while (Date.now() < deadline) {
    if (spawnError) {
      throw new Error(`Could not start ${name}: ${spawnError.message}`);
    }
    if (child.exitCode !== null) {
      throw new Error(`${name} exited before becoming ready (code ${child.exitCode}).`);
    }
    if (await isReady(url)) {
      console.log(`${name} is ready at ${url}`);
      return;
    }
    await sleep(500);
  }

  throw new Error(`${name} did not become ready within ${timeoutMs / 1000} seconds: ${url}`);
}

async function ensureServices() {
  const [webReady, apiReady] = await Promise.all([
    isReady(webUrl),
    isReady(apiHealthUrl),
  ]);

  if (webReady) {
    console.log(`Reusing the running MatSetu web service at ${webUrl}`);
  } else {
    console.log('Starting the MatSetu web service for this test run.');
    const web = launch('MatSetu web', [
      '--filter',
      '@workspace/matsetu',
      'run',
      'dev',
    ], {
      PORT: '21946',
      BASE_PATH: '/',
    });
    await waitUntilReady('MatSetu web', webUrl, web);
  }

  if (apiReady) {
    console.log(`Reusing the running MatSetu API service at ${apiHealthUrl}`);
  } else {
    console.log('Starting the MatSetu API service for this test run.');
    const api = launch('MatSetu API', [
      '--filter',
      '@workspace/api-server',
      'run',
      'dev',
    ], {
      PORT: '8080',
      NODE_ENV: 'development',
    });
    await waitUntilReady('MatSetu API', apiHealthUrl, api);
  }
}

function stopProcessGroup(child, signal) {
  if (!child?.pid || child.exitCode !== null) return;
  try {
    if (process.platform !== 'win32') {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    child.kill(signal);
  }
}

async function cleanupOwnedProcesses() {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async () => {
    const children = [...ownedProcesses.values()].filter(
      (child) => child.pid && child.exitCode === null,
    );
    for (const child of children) stopProcessGroup(child, 'SIGTERM');

    await Promise.all(children.map(async (child) => {
      if (child.exitCode !== null) return;
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        sleep(5_000),
      ]);
      if (child.exitCode === null) stopProcessGroup(child, 'SIGKILL');
    }));
    ownedProcesses.clear();
  })();
  return cleanupPromise;
}

async function runCypress() {
  const child = spawn('pnpm', ['exec', 'cypress', 'run'], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      CYPRESS_BASE_URL: baseUrl,
    },
    stdio: 'inherit',
  });
  cypressProcess = child;
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      cypressProcess = undefined;
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    stopProcessGroup(cypressProcess, signal);
    void cleanupOwnedProcesses().finally(() => {
      process.exitCode = signal === 'SIGINT' ? 130 : 143;
    });
  });
}

try {
  await ensureServices();
  process.exitCode = await runCypress();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await cleanupOwnedProcesses();
}
