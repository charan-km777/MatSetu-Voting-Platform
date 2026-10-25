---
name: MatSetu local-chain browser tests
description: Browser-to-Hardhat transport and process-isolation constraints for real ballot tests.
---

For browser tests that send real transactions, bridge the injected EIP-1193 wallet over WebSocket to a disposable Hardhat node bound only to `127.0.0.1`. Hardhat 2's local HTTP JSON-RPC server allows CORS `GET` but not browser `POST`, so direct browser `fetch` cannot serve as the wallet transport. Use only unlocked accounts from that local node; never load production keys.

**Why:** The test needs a real receipt and contract state while staying isolated from public networks, and the local RPC's browser CORS policy rules out ordinary HTTP JSON-RPC from the app.

**How to apply:** Start the node on a free port, deploy through an in-process Ethers provider using the compiled artifact, assert deployed code/receipt/counts, and stop the child process after Cypress finishes. In this Replit Cypress runtime, a spawned Hardhat `run` deployment command exited successfully without submitting a transaction, so verify chain state rather than trusting its exit code.
