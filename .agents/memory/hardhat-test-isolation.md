---
name: Hardhat test isolation
description: TypeScript compiler settings for the standalone Hardhat package in this workspace.
---

The `blockchain` package is outside the pnpm workspace and must use a local TypeScript configuration with CommonJS module output for Hardhat 2 tests. The workspace-wide `module: esnext` and `moduleResolution: bundler` settings cause the Hardhat test loader to treat imports as ESM and fail to load named runtime extensions such as `ethers`.

**Why:** Hardhat 2's test runner uses ts-node/CommonJS loading, while the main workspace targets Vite's ESM/bundler pipeline.

**How to apply:** Keep Hardhat's config and tests on a package-local tsconfig; don't inherit the root tsconfig base unless the runner is deliberately migrated.
