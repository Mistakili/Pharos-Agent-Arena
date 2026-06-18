# Compliance Gate

**A reusable, drop-in compliance Skill for AI agents on Pharos.**

Declare a KYC / AML / jurisdiction / age policy once; the skill gates every transfer automatically — returning an explainable allow/deny decision with per-rule detail. Built for the [Pharos Skill-to-Agent Dual Cascade Hackathon](https://dorahacks.io/hackathon/pharos-phase1/detail).

| | |
| --- | --- |
| **Live demo** | https://pharos-agent-arena.replit.app/ |
| **Package** | `@workspace/compliance-gate` (workspace; future npm name: `@compliance-gate/core`) |
| **Network** | Pharos Testnet · chainId `688688` |

## What's in the repo

- **`lib/compliance-gate/`** — TypeScript skill package, `AttestationRegistry.sol`, Pharos Skill Engine `SKILL.md`
- **`artifacts/compliance-demo/`** — Interactive live demo (policy toggles, scenarios, MCP tool playground)
- **Four agent tools** — `verify_compliance`, `check_compliance_policy`, `gate_transfer`, `get_attestations`
- **Framework adapters** — LangChain, Vercel AI SDK, MCP

## Quick start

```bash
pnpm install
pnpm --filter @workspace/compliance-gate run demo
```

Deploy the on-chain registry:

```bash
DEPLOYER_PRIVATE_KEY=0x... pnpm --filter @workspace/compliance-gate run deploy
```

See [`lib/compliance-gate/README.md`](lib/compliance-gate/README.md) and [`lib/compliance-gate/SKILL.md`](lib/compliance-gate/SKILL.md) for full docs.

## Hackathon submission

- **GitHub:** https://github.com/Mistakili/Pharos-Agent-Arena
- **Demo:** https://pharos-agent-arena.replit.app/