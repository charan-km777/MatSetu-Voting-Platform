# MatSetu Voting

MatSetu is an institutional voting operations workspace for election readiness, biometric voter verification, and local blockchain auditability.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/matsetu run dev` — run the React client
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `docker compose up --build` — run the web client, API, MongoDB, and Hardhat services together
- `pnpm --filter @workspace/api-server run typecheck` — check backend changes
- `pnpm --filter @workspace/matsetu run typecheck` — check frontend changes

## Stack

- pnpm workspaces, Node.js 22-compatible container runtime, TypeScript 5.9
- API: Express 5 with generated Zod validation
- Frontend: React + Vite + TanStack Query
- Ledger: Hardhat 2.22-compatible local EVM configuration and Solidity 0.8.20 contract
- Container suite: Docker Compose with MongoDB volume, API, web client, and Hardhat node
- API codegen: Orval from the OpenAPI spec
- Build: esbuild (API bundle) and Vite (client)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for dashboard, elections, voter, ledger, and activity contracts
- `artifacts/api-server/src/routes/matsetu.ts` — API endpoints and biometric distance gate
- `artifacts/api-server/src/matsetu-store.ts` — deterministic Phase 1 preview records and descriptor fixtures
- `artifacts/matsetu/src/App.tsx` — operator-facing routes and UI flows
- `contracts/Election.sol` — candidate, voter, and vote-counting contract logic
- `docker-compose.yml` — `voting_net` service topology and persistent `mongo_data` volume

## Architecture decisions

- The initial preview keeps deterministic records in the API process so the Replit preview works without a local MongoDB daemon; Docker Compose provisions the MongoDB volume for the containerized path.
- Biometric registration accepts exactly 128 values and blocks a closest Euclidean match below `0.45`, while never returning stored descriptors to clients.
- The ledger status is exposed as a separate API surface so a future Hardhat RPC health check can replace the Phase 1 local status without changing the UI contract.
- Contract and wallet casting are intentionally kept separate from identity records so voter-facing authorization can evolve without exposing biometric data on-chain.

## Product

Operators can review election readiness, inspect the voter registry, register and verify 128-dimensional descriptors, create draft elections, inspect local Hardhat status, and review recent audit activity. The supplied Compose stack adds the MongoDB persistence volume and Hardhat node required for a containerized deployment path.

## User preferences

No additional user preferences recorded.

## Gotchas

- Run API codegen after every OpenAPI change before using generated hooks or Zod schemas.
- The web artifact requires workflow-provided `PORT` and `BASE_PATH`; use the managed workflow instead of running Vite directly without them.
- The preview store resets when the API process restarts; use `docker compose up --build` when testing the containerized MongoDB persistence path.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `docker-compose.yml` for the containerized Phase 1 topology
