---
name: MatSetu infrastructure seams
description: Durable architectural boundaries for the MatSetu voting platform.
---

Keep biometric descriptors inside the identity service and keep ballot authorization/ledger state behind a separate contract-facing API. The local preview may use deterministic records, but the containerized path should make MongoDB persistence and the Hardhat RPC explicit.

**Why:** The synopsis requires ballot secrecy, one-person-one-vote deduplication, persistent records, and a local EVM ledger without placing biometric data on-chain.

**How to apply:** Preserve the generated API shapes when replacing preview storage with MongoDB or replacing the local ledger status with live Hardhat RPC health checks.