# Compliance Gate — a reusable Skill for compliant on-chain agents

> **Live demo:** https://pharos-agent-arena.replit.app/ · **Source:** https://github.com/Mistakili/Pharos-Agent-Arena
>
> Built for the Pharos **Skill-to-Agent Dual Cascade Hackathon**.
> A composable Skill module that lets **any** AI agent verify a counterparty's
> on-chain compliance (KYC / AML / jurisdiction / age) and **gate its actions**
> before it transacts on Pharos.

## The gap this fills

Pharos enforces compliance at the **protocol layer** (native ZK-KYC / AML), and
the Pharos Agent Kit ships DeFi actions (transfer, swap, vaults). But there is
**no Skill that lets an agent *consume* compliance before it acts.** An agent
today will happily send a tokenized RWA to a sanctioned, un-KYC'd, or
wrong-jurisdiction wallet.

**Compliance Gate is the missing trust layer between Pharos' protocol-level
compliance and the agents that need to use it.** It is the primitive every other
agent and Skill in the ecosystem can call — which is exactly what "reusable,
composable Skill" is meant to mean.

## What it does

```ts
import {
  ComplianceGate,
  createOnChainRegistry,
  createComplianceSkills,
} from "@workspace/compliance-gate";

// Point at the deployed AttestationRegistry on Pharos testnet
const registry = createOnChainRegistry({ contractAddress: "0x..." });
const gate = new ComplianceGate(registry);

// Gate any action behind a policy
const { decision, result } = await gate.gate(
  recipient,
  { requireKyc: true, maxAmlRisk: "medium", allowedJurisdictions: ["US", "SG"], minAge: 18 },
  async () => agentKit.transfer(recipient, amount), // runs ONLY if compliant
);

if (!decision.allowed) console.log("Blocked:", decision.reasons);
```

## Four composable skills (drop into any agent)

| Skill | Purpose |
| --- | --- |
| `verify_compliance` | Read a wallet's KYC / accreditation / AML risk / jurisdiction / age profile |
| `check_compliance_policy` | Evaluate a wallet against a policy → explainable allow/deny |
| `gate_transfer` | Compliance pre-flight before sending funds/assets to a counterparty |
| `get_attestations` | Raw on-chain attestations for a wallet |

### Works with every major agent framework

```ts
import { createComplianceSkills, toVercelAiTools, toMcpTools, toLangChainTools } from "@workspace/compliance-gate/skills";

const skills = createComplianceSkills(gate);

const vercel = toVercelAiTools(skills);                 // Vercel AI SDK
const mcp    = toMcpTools(skills);                      // MCP tools/list
import { DynamicStructuredTool } from "@langchain/core/tools";
const lc     = toLangChainTools(skills, { DynamicStructuredTool }); // LangChain
```

All inputs are validated with **Zod**, matching Pharos Agent Kit conventions, so
the skills are portable across OpenAI, LangChain, Vercel AI SDK, and any
MCP-compatible runtime.

## On-chain component

`contracts/AttestationRegistry.sol` is a minimal, gas-cheap attestation registry
(authorized issuers attest facts about subjects; anyone reads them trustlessly).
It deliberately mirrors the data Pharos exposes via its native ZK-KYC/AML
modules — **when Pharos publishes that protocol interface, only the registry
adapter changes; the Skill, policy engine, and agent code stay identical.**

## Try it

```bash
# End-to-end story, no chain or gas required
pnpm --filter @workspace/compliance-gate run demo

# Deploy the registry to Pharos testnet (needs a funded key)
DEPLOYER_PRIVATE_KEY=0x... pnpm --filter @workspace/compliance-gate run deploy
```

Pharos Testnet: chainId `688688` · RPC `https://testnet.dplabs-internal.com` ·
explorer `https://testnet.pharosscan.xyz` · faucet `https://www.gas.zip/faucet/pharos`.

## How it scores against the judging criteria

- **Pharos integration** — built on Pharos' flagship differentiator (protocol-level compliance); not portable to a generic chain.
- **Skill reusability** — a primitive every other agent/Skill can call; grows the marketplace instead of competing with it.
- **Real agent use case** — compliant autonomous agents that can legally move RWAs, the exact institutional narrative Pharos sells.
- **Originality** — the field will ship swap/transfer clones; this ships the trust layer.
- **Technical quality** — typed, Zod-validated, framework-agnostic core with thin adapters and a deployable contract.

## Design

```
AttestationRegistry (on-chain / in-memory)
        │  getAttestations(subject)
        ▼
   policy engine  →  buildProfile() + evaluatePolicy()
        │  GateDecision { allowed, reasons, checks }
        ▼
   ComplianceGate  →  verify / check / gate(action)
        │
        ▼
   Skills  →  LangChain · Vercel AI SDK · MCP adapters
```
