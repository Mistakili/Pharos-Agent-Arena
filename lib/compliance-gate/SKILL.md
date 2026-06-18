# Compliance Gate — Pharos Skill Engine Entry Point

> v0.1.0 · Pharos Atlantic Testnet (chainId 688688)

Read this file first. It maps every compliance intent to the correct capability and
reference section. All commands use `cast` (Foundry) for on-chain reads/writes and
the TypeScript SDK for agent-level calls.

## What This Skill Does

Compliance Gate is a reusable trust-layer skill for AI agents on Pharos. It reads
on-chain compliance attestations from `AttestationRegistry.sol` and gates agent
actions (transfers, swaps, approvals) behind a declarative policy — KYC, AML risk
level, jurisdiction allow/block lists, and minimum age — before the agent transacts.

**An agent using this skill cannot accidentally send to a sanctioned, un-KYC'd, or
wrong-jurisdiction wallet.**

## Prerequisites

| Tool | Check | Install if missing |
|------|-------|--------------------|
| `cast` (Foundry) | `which cast` | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| `node` ≥ 20 | `node --version` | Install via nvm |
| `pnpm` | `which pnpm` | `npm i -g pnpm` |
| Repo installed | `ls dist/` in `lib/compliance-gate/` | `pnpm install` in repo root |

## Network Configuration

| Parameter | Value |
|-----------|-------|
| Network | Pharos Atlantic Testnet |
| Chain ID | `688688` |
| RPC URL | `https://testnet.dplabs-internal.com` |
| Native token | PHRS |
| Explorer | `https://testnet.pharosscan.xyz` |
| Faucet | `https://www.gas.zip/faucet/pharos` |

Set these env vars before running any command:

```bash
export RPC=https://testnet.dplabs-internal.com
export REGISTRY=<deployed_AttestationRegistry_address>
export SUBJECT=<counterparty_wallet_address>
```

## Capability Index

| Intent | Skill / Command | Reference |
|--------|----------------|-----------|
| Read all attestations for a wallet | `get_attestations` / `cast call getAttestations` | [references/compliance.md#on-chain-reads](references/compliance.md#on-chain-reads) |
| Verify a wallet meets KYC / AML / jurisdiction / age | `verify_compliance` | [references/compliance.md#verify-compliance](references/compliance.md#verify-compliance) |
| Evaluate a wallet against a declared policy | `check_compliance_policy` | [references/compliance.md#check-compliance-policy](references/compliance.md#check-compliance-policy) |
| Gate a transfer behind compliance | `gate_transfer` | [references/compliance.md#gate-transfer](references/compliance.md#gate-transfer) |
| Issue a KYC attestation on-chain | `cast send attest()` | [references/compliance.md#write-attestations](references/compliance.md#write-attestations) |
| Issue an AML attestation on-chain | `cast send attest()` | [references/compliance.md#attest-aml-risk-level](references/compliance.md#attest-aml-risk-level) |
| Issue a jurisdiction attestation | `cast send attest()` | [references/compliance.md#attest-jurisdiction](references/compliance.md#attest-jurisdiction) |
| Revoke an attestation | `cast send revoke()` | [references/compliance.md#revoke-an-attestation](references/compliance.md#revoke-an-attestation) |
| Deploy `AttestationRegistry` to testnet | `pnpm run deploy` | [references/compliance.md#deploy](references/compliance.md#deploy) |
| Check if an address is an authorized issuer | `cast call isIssuer()` | [references/compliance.md#on-chain-reads](references/compliance.md#on-chain-reads) |

## Quick Start (TypeScript SDK)

```typescript
import { ComplianceGate, createOnChainRegistry } from "@compliance-gate/core";
import { createComplianceSkills }                from "@compliance-gate/core/skills";

// Point at the deployed registry on Pharos testnet
const registry = createOnChainRegistry({ contractAddress: process.env.REGISTRY! });
const gate     = new ComplianceGate(registry);

// Declare your policy once at agent startup
const policy = {
  requireKyc:             true,
  maxAmlRisk:             "medium",
  allowedJurisdictions:   ["US", "SG", "GB"],
  minAge:                 18,
};

// Gate any action — runs ONLY if the counterparty is compliant
const { decision } = await gate.gate(
  counterpartyAddress,
  policy,
  () => agentKit.transfer(recipient, amount),
);

if (!decision.allowed) {
  console.log("Blocked:", decision.reasons);
  // reasons: ["No valid KYC attestation", "AML risk too high", ...]
}
```

## Framework Adapters

```typescript
import { createComplianceSkills, toVercelAiTools, toMcpTools, toLangChainTools }
  from "@compliance-gate/core/skills";
import { DynamicStructuredTool } from "@langchain/core/tools";

const skills = createComplianceSkills(gate);

const vercelTools = toVercelAiTools(skills);                         // Vercel AI SDK
const mcpTools    = toMcpTools(skills);                              // MCP tools/list
const lcTools     = toLangChainTools(skills, { DynamicStructuredTool }); // LangChain
```

## General Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Empty attestation array | Subject has no on-chain attestations | **Fail closed — deny.** Issue attestations via `cast send`. |
| `attestation expired` | `expiresAt` is in the past | Re-attest with a future `expiresAt`. |
| `attestation revoked` | `revoked == true` | Re-attest if appropriate. |
| `not issuer` on write | Caller is not an authorized issuer | Call `setIssuer(caller, true)` as registry owner. |
| RPC connection error | `testnet.dplabs-internal.com` unreachable | Fail closed. Use `InMemoryRegistry` for dev only. |
| Unknown `attType` index | New enum value not in this version | Drop the attestation — never coerce to a known type. |

## Security Reminders

- **Never pass `PRIVATE_KEY` in application code.** Use env vars; pass explicitly to `cast` via `--private-key $PRIVATE_KEY`.
- **All policy checks are fail-closed.** Missing, expired, revoked, or malformed attestations always deny. No benefit of the doubt.
- **Verify the `REGISTRY` address** before reading — a wrong address silently returns empty results, which fail closed.
- **Boolean claims** count as compliant only for the exact normalized string `"true"`. `"True"`, `"TRUE"`, `"1"` all deny.

## Write Operation Pre-checks

Every `cast send` must pass these four checks before executing:

1. `$PRIVATE_KEY` env var is set and non-empty
2. Derived address is an authorized issuer (`isIssuer` returns `true`)
3. Chain ID is `688688` — run `cast chain-id --rpc-url $RPC` to confirm
4. Caller has PHRS balance for gas — run `cast balance $DEPLOYER --rpc-url $RPC --ether`
