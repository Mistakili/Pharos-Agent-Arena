---
name: compliance-gate
description: >
  Reusable compliance Skill for AI agents on Pharos. Verify a counterparty's
  on-chain KYC, AML risk, jurisdiction, accreditation, and age attestations;
  evaluate them against a declared policy; and gate transfers or other actions
  with explainable allow/deny decisions. Works with LangChain, Vercel AI SDK,
  and MCP via @workspace/compliance-gate. Includes AttestationRegistry.sol for
  Pharos testnet deployment and cast command templates for on-chain reads/writes.
---

# Compliance Gate — Pharos Skill

> v0.1.0 · Pharos Testnet (chainId `688688`)

A composable Skill module that lets any AI agent consume Pharos compliance data
**before** it transacts. Declare a policy once, call the skill, receive an
explainable allow/deny decision with per-rule detail.

**Live demo:** https://pharos-agent-arena.replit.app/
**Docs (no video needed):** https://pharos-agent-arena.replit.app/docs
**Source:** https://github.com/Mistakili/Pharos-Agent-Arena

---

## Prerequisites

1. **Foundry** (for on-chain reads/writes via `cast`)

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.zshenv && foundryup
cast --version
```

2. **Node.js 20+** and **pnpm** (for the TypeScript skill package and deploy script)

3. **Wallet** funded on Pharos Testnet (for deploy / attest writes)

```bash
export PRIVATE_KEY=0x...
export RPC=https://testnet.dplabs-internal.com
export DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
```

4. **Network config** — read `assets/networks.json` for RPC, chain ID, explorer.

---

## Quick Start (TypeScript / agent frameworks)

```bash
pnpm install
pnpm --filter @workspace/compliance-gate run demo
```

```ts
import {
  ComplianceGate,
  createOnChainRegistry,
  createComplianceSkills,
} from "@workspace/compliance-gate";

const registry = createOnChainRegistry({ contractAddress: "0xYourRegistry" });
const gate = new ComplianceGate(registry);

const { decision } = await gate.gate(
  recipient,
  { requireKyc: true, maxAmlRisk: "medium", allowedJurisdictions: ["US", "SG"], minAge: 18 },
  async () => executeTransfer(recipient, amount),
);

if (!decision.allowed) console.log("Blocked:", decision.reasons);
```

### Framework adapters

```ts
import {
  createComplianceSkills,
  toLangChainTools,
  toVercelAiTools,
  toMcpTools,
} from "@workspace/compliance-gate/skills";

const skills = createComplianceSkills(gate);
// LangChain: toLangChainTools(skills, { DynamicStructuredTool })
// Vercel AI SDK: toVercelAiTools(skills)
// MCP: toMcpTools(skills)
```

---

## Capability Index

| User need | Capability | Detailed instructions |
| --- | --- | --- |
| Deploy compliance attestation registry on Pharos | `pnpm run deploy` / viem deploy | → `references/compliance.md#deploy-attestationregistry` |
| Read attestation count for a wallet | `cast call getAttestationCount()` | → `references/compliance.md#read-attestation-count` |
| Read all attestations for a wallet | `cast call getAttestations()` | → `references/compliance.md#read-all-attestations` |
| Issue KYC / AML / jurisdiction attestation | `cast send attest()` | → `references/compliance.md#issue-an-attestation-issuer-only` |
| Revoke an attestation | `cast send revoke()` | → `references/compliance.md#revoke-an-attestation` |
| Check wallet compliance profile | `verify_compliance` skill | → `references/compliance.md#mcp-tool-response-shapes-agent-layer` |
| Evaluate wallet against policy | `check_compliance_policy` skill | → `references/compliance.md#mcp-tool-response-shapes-agent-layer` |
| Pre-flight a transfer to a counterparty | `gate_transfer` skill | → `references/compliance.md#mcp-tool-response-shapes-agent-layer` |
| List raw on-chain attestations | `get_attestations` skill | → `references/compliance.md#mcp-tool-response-shapes-agent-layer` |

---

## Write Operation Pre-checks

Every write (`attest`, `revoke`, deploy) must pass these checks before running:

1. `which cast` — Foundry installed
2. `cast wallet address --private-key $PRIVATE_KEY` — confirm deployer/issuer
3. Read `assets/networks.json` — correct `$RPC` and chain ID `688688`
4. `cast balance $DEPLOYER --rpc-url $RPC --ether` — sufficient PHRS for gas

Always pass `--private-key $PRIVATE_KEY` and `--rpc-url $RPC` explicitly.

---

## Security Reminders

- Never hardcode or commit private keys
- Only authorized issuers can call `attest()` — protect issuer keys
- Treat expired and revoked attestations as invalid unless policy says otherwise
- `gate_transfer` returns `recommendedAction: "block"` — agents must not proceed on block

---

## Error Handling

| Error / signature | Cause | Suggested action |
| --- | --- | --- |
| `not issuer` | Caller is not an authorized attestation issuer | Use issuer key or ask owner to `setIssuer` |
| `not authorized` | Non-issuer attempting `revoke` | Use the original issuer or registry owner |
| `bad type` | Invalid attestation type enum | Use `0`–`4` only |
| `invalid address` | Malformed EVM address | Confirm `0x` + 40 hex chars |
| `connection refused` | Missing `--rpc-url` | Pass RPC from `assets/networks.json` |
| `insufficient funds` | Low PHRS balance | Fund wallet via Pharos faucet |
| Empty `cast call` result | Wrong registry address or network | Confirm `$REGISTRY` on Pharos testnet |

---

## File structure

```
lib/compliance-gate/
├── SKILL.md                         ← this file (agent entry point)
├── assets/
│   └── networks.json                ← Pharos testnet RPC / explorer
├── references/
│   └── compliance.md                ← cast command specs + tool shapes
├── contracts/
│   └── AttestationRegistry.sol      ← on-chain attestation store
└── src/                             ← TypeScript skill + framework adapters
```