import { BrowserProvider, Contract, isAddress } from 'ethers';

const ELECTION_ABI = ['function castVote(uint256 candidateId) external'];

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

export const castBallot = async (
  contractAddress: string,
  candidateId: number,
  expectedAccount: string,
) => {
  if (!isAddress(contractAddress)) {
    throw new WalletFailure(
      'unavailable',
      'This election is not connected to a deployed ballot contract yet.',
    );
  }

  try {
    const provider = new BrowserProvider(injectedProvider() as never);
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
