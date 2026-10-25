const voterOneDescriptor = Array.from({ length: 128 }, (_, index) =>
  Number(Math.sin(1 + index * 0.17).toFixed(6)),
);

const liveElection = {
  id: 'election-student-council',
  title: '2026 Student Council Election',
  status: 'live',
  candidateCount: 2,
  voterCount: 1248,
  startAt: '2026-09-23T10:00:00.000Z',
  endAt: '2026-09-24T10:00:00.000Z',
  contractAddress: '0x0000000000000000000000000000000000000001',
};

type WalletMode = 'success' | 'connect-rejected' | 'sign-cancelled';

type LocalChainInfo = {
  rpcUrl: string;
  wsUrl: string;
  contractAddress: string;
  voterAccount: string;
};

type BallotInspection = {
  receipt: {
    status: number | null;
    from: string | null;
    to: string | null;
    blockNumber: number;
  } | null;
  voteCount: number;
  hasVoted: boolean;
};

function installTestWallet(win: Window, mode: WalletMode) {
  const account = '0x00000000000000000000000000000000000000a1';
  const transactionHash = `0x${'11'.repeat(32)}`;
  const blockHash = `0x${'22'.repeat(32)}`;
  let hasVoted = false;
  const votedKey = `matsetu-test-voted-${account.toLowerCase()}`;

  Object.defineProperty(win, '__MATSETU_TEST_MODE__', { configurable: true, value: true });
  Object.defineProperty(win, '__MATSETU_TEST_DESCRIPTOR__', {
    configurable: true,
    value: voterOneDescriptor,
  });
  Object.defineProperty(win, 'ethereum', {
    configurable: true,
    value: {
      isMetaMask: true,
      request: ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts') {
          if (mode === 'connect-rejected') {
            return Promise.reject({ code: 4001, message: 'User rejected the request' });
          }
          return Promise.resolve([account]);
        }
        if (method === 'eth_accounts') return Promise.resolve([account]);
        if (method === 'eth_chainId') return Promise.resolve('0x7a69');
        if (method === 'net_version') return Promise.resolve('31337');
        if (method === 'eth_blockNumber') return Promise.resolve('0x2');
        if (method === 'eth_getBlockByNumber') {
          return Promise.resolve({
            number: '0x2',
            hash: blockHash,
            timestamp: '0x1',
            baseFeePerGas: '0x1',
            gasLimit: '0x989680',
            gasUsed: '0x5208',
          });
        }
        if (method === 'eth_estimateGas') return Promise.resolve('0x5208');
        if (method === 'eth_getCode') return Promise.resolve('0x' + '60'.repeat(4));
        if (method === 'eth_sendTransaction') {
          if (mode === 'sign-cancelled') {
            return Promise.reject({ code: 4001, message: 'User rejected the transaction' });
          }
          if (hasVoted || win.localStorage.getItem(votedKey) === 'true') {
            return Promise.reject(new Error('execution reverted: voter already cast a ballot'));
          }
          hasVoted = true;
          win.localStorage.setItem(votedKey, 'true');
          return Promise.resolve(transactionHash);
        }
        if (method === 'eth_getTransactionReceipt') {
          return Promise.resolve({
            transactionHash,
            blockHash,
            blockNumber: '0x2',
            from: account,
            to: liveElection.contractAddress,
            cumulativeGasUsed: '0x5208',
            gasUsed: '0x5208',
            logs: [],
            logsBloom: `0x${'00'.repeat(256)}`,
            status: '0x1',
            type: '0x2',
            transactionIndex: '0x0',
            effectiveGasPrice: '0x1',
          });
        }
        if (method === 'eth_getTransactionByHash') {
          return Promise.resolve({
            hash: transactionHash,
            transactionIndex: '0x0',
            type: '0x2',
            accessList: [],
            r: `0x${'11'.repeat(32)}`,
            s: `0x${'22'.repeat(32)}`,
            yParity: '0x0',
            blockHash,
            blockNumber: '0x2',
            from: account,
            to: liveElection.contractAddress,
            input: '0x',
            value: '0x0',
            nonce: '0x0',
            gas: '0x989680',
            gasPrice: '0x1',
            chainId: '0x7a69',
          });
        }
        if (method === 'eth_getTransactionCount') return Promise.resolve('0x1');
        return Promise.reject(new Error(`Unsupported wallet method: ${method}`));
      },
    },
  });
}

function installLocalChainWallet(win: Window, chain: LocalChainInfo) {
  let nextRequestId = 1;
  let socket: WebSocket | undefined;
  let connection: Promise<WebSocket> | undefined;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  const getSocket = () => {
    if (socket?.readyState === WebSocket.OPEN) return Promise.resolve(socket);
    if (connection) return connection;

    connection = new Promise<WebSocket>((resolve, reject) => {
      socket = new WebSocket(chain.wsUrl);
      socket.onopen = () => resolve(socket!);
      socket.onerror = () => reject(new Error('Could not connect to the disposable Hardhat wallet.'));
      socket.onmessage = (event) => {
        const response = JSON.parse(String(event.data)) as {
          id: number;
          result?: unknown;
          error?: { code?: number; message?: string; data?: unknown };
        };
        const request = pending.get(response.id);
        if (!request) return;
        pending.delete(response.id);
        if (response.error) {
          request.reject(
            Object.assign(new Error(response.error.message ?? 'Local wallet request failed.'), {
              code: response.error.code,
              data: response.error.data,
            }),
          );
        } else {
          request.resolve(response.result);
        }
      };
      socket.onclose = () => {
        connection = undefined;
        socket = undefined;
        for (const request of pending.values()) {
          request.reject(new Error('The disposable Hardhat wallet connection closed.'));
        }
        pending.clear();
      };
    });
    return connection;
  };

  Object.defineProperty(win, '__MATSETU_TEST_MODE__', { configurable: true, value: true });
  Object.defineProperty(win, '__MATSETU_TEST_DESCRIPTOR__', {
    configurable: true,
    value: voterOneDescriptor,
  });
  Object.defineProperty(win, 'ethereum', {
    configurable: true,
    value: {
      isMetaMask: true,
      request: async ({ method, params = [] }: { method: string; params?: unknown[] }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          return [chain.voterAccount];
        }

        const id = nextRequestId++;
        const activeSocket = await getSocket();
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          activeSocket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
        });
      },
    },
  });
}

function visitWithWallet(mode: WalletMode) {
  cy.intercept('GET', '/api/elections/election-student-council', liveElection).as('election');
  cy.visit('/elections/election-student-council', {
    onBeforeLoad: (win) => installTestWallet(win, mode),
  });
  cy.wait('@election');
  cy.get('[data-testid="ballot-panel"]').should('be.visible');
}

function verifyBallotIdentity() {
  cy.get('[data-testid="select-ballot-voter"]').select('voter-001');
  cy.get('[data-testid="button-use-test-face-verification"]').click();
  cy.get('[data-testid="button-verify-ballot-identity"]').click();
  cy.get('[data-testid="ballot-identity-verified"]').should('be.visible');
}

describe('MatSetu operator and voter journeys', () => {
  it('shows operator readiness signals', () => {
    cy.visit('/', {
      onBeforeLoad: (win) => {
        Object.defineProperty(win, '__MATSETU_TEST_MODE__', { configurable: true, value: true });
      },
    });
    cy.get('[data-testid="metric-active-voters"]').should(($metric) => {
      expect(Number($metric.text())).to.be.at.least(3);
    });
    cy.get('[data-testid="metric-active-elections"]').should(($metric) => {
      expect(Number($metric.text())).to.be.at.least(2);
    });
    cy.contains('Systems operational').should('be.visible');
  });

  it('verifies a voter from the registry without exposing the descriptor', () => {
    cy.visit('/voters', {
      onBeforeLoad: (win) => installTestWallet(win, 'success'),
    });
    cy.get('[data-testid="button-verify-voter-voter-001"]').click();
    cy.get('[data-testid="button-use-test-face-verification"]').click();
    cy.get('[data-testid="button-submit-verification"]').click();
    cy.get('[data-testid="button-close-verification-result"]').should('be.visible');
    cy.contains('Identity verified').should('be.visible');
    cy.get('body').should('not.contain', voterOneDescriptor.join(','));
  });

  it('creates an election and returns it to the operator list', () => {
    cy.visit('/elections');
    cy.get('[data-testid="button-create-election"]').click();
    cy.get('[data-testid="input-election-title"]').type('Cypress Journey Election');
    cy.get('[data-testid="input-election-start"]').type('2026-10-01T09:00');
    cy.get('[data-testid="input-election-end"]').type('2026-10-01T17:00');
    cy.get('[data-testid="button-submit-election"]').click();
    cy.contains('Cypress Journey Election').should('be.visible');
  });

  it('connects MetaMask and confirms one signed ballot', () => {
    visitWithWallet('success');
    cy.get('[data-testid="button-connect-wallet"]').should('be.disabled');
    verifyBallotIdentity();
    cy.get('[data-testid="button-connect-wallet"]').click();
    cy.get('[data-testid="text-wallet-account"]').should('contain', '0x00000000000000000000000000000000000000a1');
    cy.get('[data-testid="button-sign-ballot"]').click();
    cy.get('[data-testid="ballot-confirmed"]', { timeout: 15000 }).should('contain', 'Ballot confirmed on the ledger');
  });

  it('shows clear rejected and cancelled wallet states', () => {
    visitWithWallet('connect-rejected');
    verifyBallotIdentity();
    cy.get('[data-testid="button-connect-wallet"]').click();
    cy.get('[data-testid="wallet-rejected"]').should('contain', 'Wallet connection was rejected');

    visitWithWallet('sign-cancelled');
    verifyBallotIdentity();
    cy.get('[data-testid="button-connect-wallet"]').click();
    cy.get('[data-testid="button-sign-ballot"]').click();
    cy.get('[data-testid="ballot-cancelled"]').should('contain', 'Ballot signing was cancelled');
  });

  it('submits a real ballot to a disposable Hardhat chain and rejects a duplicate', () => {
    cy.task<LocalChainInfo>('localChainInfo').then((chain) => {
      const visitLocalElection = () => {
        cy.intercept('GET', '/api/elections/election-student-council', (request) => {
          delete request.headers['if-none-match'];
          delete request.headers['if-modified-since'];
          request.headers['cache-control'] = 'no-cache';
          request.continue((response) => {
            response.send({
              ...response.body,
              candidateCount: 2,
              contractAddress: chain.contractAddress,
              status: 'live',
            });
          });
        }).as('localElection');
        cy.visit('/elections/election-student-council', {
          onBeforeLoad: (win) => installLocalChainWallet(win, chain),
        });
        cy.wait('@localElection').its('response.statusCode').should('eq', 200);
        cy.get('[data-testid="ballot-panel"]').should('be.visible');
      };

      visitLocalElection();
      verifyBallotIdentity();
      cy.get('[data-testid="button-connect-wallet"]').click();
      cy.get('[data-testid="text-wallet-account"]').should('contain', chain.voterAccount);
      cy.get('[data-testid="button-sign-ballot"]').click();
      cy.get('[data-testid="ballot-confirmed"]', { timeout: 15000 }).should('be.visible');

      let firstTransactionHash = '';
      cy.get('[data-testid="ballot-confirmed"] code')
        .invoke('text')
        .then((transactionHash) => {
          firstTransactionHash = transactionHash.trim();
          cy.task<BallotInspection>('inspectBallot', {
            transactionHash: firstTransactionHash,
            candidateId: 1,
            voterAccount: chain.voterAccount,
          }).then((inspection) => {
            expect(inspection.receipt).not.to.equal(null);
            expect(inspection.receipt?.status).to.equal(1);
            expect(inspection.receipt?.from?.toLowerCase()).to.equal(chain.voterAccount.toLowerCase());
            expect(inspection.receipt?.to?.toLowerCase()).to.equal(chain.contractAddress.toLowerCase());
            expect(inspection.voteCount).to.equal(1);
            expect(inspection.hasVoted).to.equal(true);
          });
        });

      visitLocalElection();
      verifyBallotIdentity();
      cy.get('[data-testid="button-connect-wallet"]').click();
      cy.get('[data-testid="button-sign-ballot"]').click();
      cy.get('[data-testid="ballot-rejected"]', { timeout: 15000 })
        .should('contain', 'already cast a ballot')
        .then(() =>
          cy.task<BallotInspection>('inspectBallot', {
            transactionHash: firstTransactionHash,
            candidateId: 1,
            voterAccount: chain.voterAccount,
          }),
        )
        .then((inspection) => {
          expect(inspection.receipt?.status).to.equal(1);
          expect(inspection.voteCount).to.equal(1);
          expect(inspection.hasVoted).to.equal(true);
        });
    });
  });
});