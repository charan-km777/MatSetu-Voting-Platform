import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';
import { defineConfig } from 'cypress';

const execFileAsync = promisify(execFile);
const rootDirectory = process.cwd();
const blockchainDirectory = path.join(rootDirectory, 'blockchain');
const blockchainRequire = createRequire(path.join(blockchainDirectory, 'package.json'));
const { Contract, ContractFactory, JsonRpcProvider } = blockchainRequire('ethers');

type LocalChain = {
  rpcUrl: string;
  wsUrl: string;
  contractAddress: string;
  voterAccount: string;
};

type InspectBallotInput = {
  transactionHash: string;
  candidateId: number;
  voterAccount: string;
};

let chainProcess: ChildProcess | undefined;
let localChain: LocalChain | undefined;

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findAvailablePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error('Could not reserve a local port for the Hardhat test chain.');
  }

  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function rpcRequest<T>(rpcUrl: string, method: string, params: unknown[] = []) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) {
    throw new Error(`Local Hardhat RPC returned HTTP ${response.status}.`);
  }

  const result = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };
  if (result.error) {
    throw new Error(result.error.message ?? `Local Hardhat RPC failed for ${method}.`);
  }
  return result.result as T;
}

async function startLocalChain() {
  if (localChain) return localChain;

  const port = await findAvailablePort();
  const rpcUrl = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}`;
  chainProcess = spawn(
    'pnpm',
    ['exec', 'hardhat', 'node', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: blockchainDirectory,
      env: {
        ...process.env,
        HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
      },
      detached: true,
      stdio: 'ignore',
    },
  );

  try {
    const startupDeadline = Date.now() + 30_000;
    let ready = false;
    while (Date.now() < startupDeadline) {
      if (chainProcess.exitCode !== null) {
        throw new Error(`The local Hardhat node exited with code ${chainProcess.exitCode}.`);
      }
      try {
        const chainId = await rpcRequest<string>(rpcUrl, 'eth_chainId');
        if (chainId === '0x7a69') {
          ready = true;
          break;
        }
      } catch {
        await sleep(100);
      }
    }
    if (!ready) throw new Error('The local Hardhat node did not become ready within 30 seconds.');

    const accounts = await rpcRequest<string[]>(rpcUrl, 'eth_accounts');
    const voterAccount = accounts[1];
    if (!voterAccount) {
      throw new Error('The local Hardhat node did not provide its isolated test wallet.');
    }

    const administrator = accounts[0];
    if (!administrator) {
      throw new Error('The local Hardhat node did not provide its administrator account.');
    }
    await execFileAsync('pnpm', ['run', 'compile'], {
      cwd: blockchainDirectory,
      env: {
        ...process.env,
        HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true',
      },
      maxBuffer: 1024 * 1024,
    });
    const artifact = JSON.parse(
      await readFile(
        path.join(blockchainDirectory, 'artifacts/contracts/Election.sol/Election.json'),
        'utf8',
      ),
    ) as { abi: unknown[]; bytecode: string };
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = await provider.getSigner(administrator);
    const electionFactory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
    const election = await electionFactory.deploy('MatSetu isolated browser test election');
    await election.waitForDeployment();
    await (await election.addCandidate('Candidate 1')).wait();
    await (await election.addCandidate('Candidate 2')).wait();
    await (await election.setVotingOpen(true)).wait();
    const contractAddress = await election.getAddress();
    const deployedCode = await rpcRequest<string>(rpcUrl, 'eth_getCode', [
      contractAddress,
      'latest',
    ]);
    await provider.destroy();
    if (deployedCode === '0x') {
      throw new Error(`The local election deployment did not create code at ${contractAddress}.`);
    }

    localChain = {
      rpcUrl,
      wsUrl,
      contractAddress,
      voterAccount,
    };
    return localChain;
  } catch (error) {
    await stopLocalChain();
    throw error;
  }
}

async function stopLocalChain() {
  localChain = undefined;
  if (!chainProcess?.pid) {
    chainProcess = undefined;
    return;
  }

  const child = chainProcess;
  chainProcess = undefined;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  await Promise.race([
    new Promise<void>((resolve) => child.once('exit', () => resolve())),
    sleep(3_000),
  ]);
  if (child.exitCode === null) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://127.0.0.1',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    video: false,
    setupNodeEvents(on) {
      on('before:run', async () => {
        await startLocalChain();
      });
      on('after:run', async () => {
        await stopLocalChain();
      });
      on('task', {
        localChainInfo: async () => {
          if (!localChain) throw new Error('The disposable local Hardhat chain is not running.');
          return localChain;
        },
        inspectBallot: async ({ transactionHash, candidateId, voterAccount }: InspectBallotInput) => {
          if (!localChain) throw new Error('The disposable local Hardhat chain is not running.');
          const provider = new JsonRpcProvider(localChain.rpcUrl);
          const election = new Contract(
            localChain.contractAddress,
            [
              'function candidates(uint256) view returns (uint256 id, string name, uint256 voteCount)',
              'function hasVoted(address) view returns (bool)',
            ],
            provider,
          );
          const [receipt, candidate, hasVoted] = await Promise.all([
            provider.getTransactionReceipt(transactionHash),
            election.candidates(candidateId),
            election.hasVoted(voterAccount),
          ]);
          await provider.destroy();
          return {
            receipt: receipt
              ? {
                  status: receipt.status,
                  from: receipt.from,
                  to: receipt.to,
                  blockNumber: receipt.blockNumber,
                }
              : null,
            voteCount: Number(candidate.voteCount),
            hasVoted,
          };
        },
      });
    },
  },
});