import { BrowserProvider, Contract, isAddress } from 'ethers';

const ELECTION_ABI = [
  'function castVote(uint256 candidateId) external',
  'function candidateCount() view returns (uint256)',
  'function candidates(uint256 candidateId) view returns (uint256 id, string name, uint256 voteCount)',
  'function votingOpen() view returns (bool)',
];

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type WalletFailureKind = 'rejected' | 'cancelled' | 'duplicate' | 'contract' | 'unavailable';

export class WalletFailure extends Error {
  constructor(
    readonly kind: WalletFailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'WalletFailure';
  }
}

const injectedProvider = (): Eip1193Provider => {
  const provider = window.ethereum;
  if (!provider) {
    throw new WalletFailure(
      'unavailable',
      'MetaMask is not available. Install or unlock a compatible wallet to continue.',
    );
  }
  return provider;
};

const errorText = (cause: unknown) => {
  if (!cause || typeof cause !== 'object') return String(cause ?? '');
  const error = cause as {
    code?: number | string;
    message?: string;
    shortMessage?: string;
    reason?: string;
    info?: { error?: { message?: string } };
  };
  return [
    error.message,
    error.shortMessage,
    error.reason,
    error.info?.error?.message,
    error.code,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const isUserRejected = (cause: unknown) => {
  const error = cause as { code?: number | string };
  return error?.code === 4001 || error?.code === 'ACTION_REJECTED' || errorText(cause).includes('user rejected');
};

export const walletError = (cause: unknown, operation: 'connect' | 'sign') => {
  const text = errorText(cause);
  if (isUserRejected(cause)) {
    return new WalletFailure(
      operation === 'connect' ? 'rejected' : 'cancelled',
      operation === 'connect'
        ? 'Wallet connection was rejected. Connect a wallet to authorize this ballot.'
        : 'Ballot signing was cancelled. No ballot was submitted.',
    );
  }
  if (text.includes('already cast') || text.includes('already voted') || text.includes('voter already')) {
    return new WalletFailure(
      'duplicate',
      'This wallet has already cast a ballot in this election. The contract rejected a second vote.',
    );
  }
  if (text.includes('voting is closed') || text.includes('voting closed')) {
    return new WalletFailure('contract', 'This election is not accepting ballots right now.');
  }
  if (text.includes('candidate not found')) {
    return new WalletFailure('contract', 'That candidate is not available on the election contract.');
  }
  return new WalletFailure(
    'contract',
    operation === 'connect'
      ? 'The wallet could not be connected. Check MetaMask and try again.'
      : 'The ballot transaction was rejected by the wallet or election contract.',
  );
};

export const connectWallet = async () => {
  const provider = injectedProvider();
  try {
    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    const account = accounts[0];
    if (!account) throw new Error('No wallet account was returned.');
    return account;
  } catch (cause) {
    if (cause instanceof WalletFailure) throw cause;
    throw walletError(cause, 'connect');
  }
};

export const loadBallotCandidates = async (
  contractAddress: string,
  expectedChainId: number,
  expectedCandidateCount: number,
) => {
  if (!isAddress(contractAddress) || !Number.isSafeInteger(expectedChainId) || expectedChainId < 1) {
    throw new WalletFailure('unavailable', 'This election is not connected to a deployed ballot contract yet.');
  }

  const provider = new BrowserProvider(injectedProvider() as never);
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(expectedChainId)) {
    throw new WalletFailure(
      'unavailable',
      `Switch MetaMask to the configured election network (chain ID ${expectedChainId}) to view its candidates.`,
    );
  }
  if ((await provider.getCode(contractAddress)) === '0x') {
    throw new WalletFailure('unavailable', 'No ballot contract is deployed at this address on the selected network.');
  }

  const contract = new Contract(contractAddress, ELECTION_ABI, provider);
  const count = Number(await (contract.candidateCount() as Promise<bigint>));
  if (count !== expectedCandidateCount) {
    throw new WalletFailure(
      'contract',
      'The configured candidate count does not match the deployed election contract.',
    );
  }
  return Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const candidate = (await contract.candidates(index + 1)) as {
        name?: string;
        [key: number]: unknown;
      };
      const name = String(candidate.name ?? candidate[1] ?? '').trim();
      if (!name) {
        throw new WalletFailure('contract', `Candidate ${index + 1} has no name on the election contract.`);
      }
      return name;
    }),
  );
};

export const castBallot = async (
  contractAddress: string,
  candidateId: number,
  expectedAccount: string,
  expectedChainId: number,
  expectedNetwork: string,
  expectedCandidates: string[],
) => {
  if (
    !isAddress(contractAddress) ||
    !Number.isSafeInteger(expectedChainId) ||
    expectedChainId < 1 ||
    expectedCandidates.length < 1
  ) {
    throw new WalletFailure(
      'unavailable',
      'This election is not connected to a deployed ballot contract yet.',
    );
  }

  try {
    const provider = new BrowserProvider(injectedProvider() as never);
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(expectedChainId)) {
      throw new WalletFailure(
        'unavailable',
        `Switch MetaMask to ${expectedNetwork} (chain ID ${expectedChainId}) before casting this ballot.`,
      );
    }
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new WalletFailure(
        'unavailable',
        'No ballot contract is deployed at this address on the selected network.',
      );
    }
    const readContract = new Contract(contractAddress, ELECTION_ABI, provider);
    const [candidateCount, votingOpen] = await Promise.all([
      readContract.candidateCount() as Promise<bigint>,
      readContract.votingOpen() as Promise<boolean>,
    ]);
    if (Number(candidateCount) !== expectedCandidates.length) {
      throw new WalletFailure(
        'contract',
        'The configured candidate count does not match the deployed election contract.',
      );
    }
    for (let index = 0; index < expectedCandidates.length; index += 1) {
      const candidate = (await readContract.candidates(index + 1)) as {
        name?: string;
        [key: number]: unknown;
      };
      const onChainName = String(candidate.name ?? candidate[1] ?? '').trim();
      if (onChainName !== expectedCandidates[index]) {
        throw new WalletFailure(
          'contract',
          'The election candidate list changed. Refresh this page before casting a ballot.',
        );
      }
    }
    if (!votingOpen) {
      throw new WalletFailure('contract', 'This election is not accepting ballots right now.');
    }
    if (candidateId < 1 || candidateId > Number(candidateCount)) {
      throw new WalletFailure('contract', 'That candidate is not available on the election contract.');
    }

    const signer = await provider.getSigner();
    const activeAccount = await signer.getAddress();
    if (activeAccount.toLowerCase() !== expectedAccount.toLowerCase()) {
      throw new WalletFailure(
        'unavailable',
        'The active MetaMask account changed. Reconnect the wallet that passed identity verification.',
      );
    }
    const contract = new Contract(contractAddress, ELECTION_ABI, signer);
    const transaction = await contract.castVote(candidateId);
    const receipt = await transaction.wait(1, 120_000);
    if (!receipt || receipt.status === 0) {
      throw new Error('The election contract did not confirm the ballot.');
    }
    return {
      hash: transaction.hash as string,
      account: await signer.getAddress(),
    };
  } catch (cause) {
    if (cause instanceof WalletFailure) throw cause;
    throw walletError(cause, 'sign');
  }
};
