# Compliance Gate

A reusable, composable AI-agent **Skill** for the Pharos network: it lets any agent verify a counterparty's on-chain compliance attestations (KYC / AML / jurisdiction / age) and **gate** an action behind a policy before transacting. Built for the Pharos Skill-to-Agent Dual Cascade Hackathon.

## Run & Operate

- `pnpm --filter @workspace/compliance-gate run demo` — in-memory narrative: block → attest → allow → revoke
- `pnpm --filter @workspace/compliance-gate run test` — adversarial fail-closed assertions
- `pnpm --filter @workspace/compliance-gate run deploy` — compile + deploy `AttestationRegistry.sol` to Pharos testnet (needs `DEPLOYER_PRIVATE_KEY`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build/typecheck composite libs only

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- On-chain: viem + Solidity (`AttestationRegistry.sol`, EAS-style)
- Validation: Zod
- Agent adapters: LangChain, Vercel AI SDK, MCP (mirrors `pharos-agent-kit` conventions)

## Where things live

- `lib/compliance-gate/src/` — core: `types`, `policy` (profile builder), `registry` (in-memory + on-chain adapters), `gate` (`ComplianceGate`), `chain` (Pharos testnet), `abi`
- `lib/compliance-gate/src/skills/` — framework-agnostic `definitions` + `langchain` / `vercel-ai` / `mcp` adapters + hand-rolled zod→`jsonschema`
- `lib/compliance-gate/contracts/AttestationRegistry.sol` — deployable registry
- `lib/compliance-gate/scripts/` — `demo`, `test`, `deploy`
- `lib/compliance-gate/README.md` — judging-criteria-framed overview

## Architecture decisions

- **Default-deny, fail-closed everywhere.** Missing/expired/revoked/malformed attestations all deny. Boolean claims count as compliant only for an exact normalized `"true"`; unknown on-chain attestation-type enum indices are dropped, never coerced.
- **Registry is an interface, not a hardcoded backend.** Pharos has no public agent-callable ZK-KYC contract yet (protocol-layer only), so we ship a working EAS-style registry; only the registry adapter changes when Pharos ships its native interface.
- **Skills are framework-agnostic at the core**, with thin per-framework adapters, so the same logic is reusable across LangChain / Vercel AI SDK / MCP.

## Product

An agent declares a `CompliancePolicy` (requireKyc, maxAmlRisk, allow/blocked jurisdictions, minAge, allowExpired) and calls `gate(subject, policy, action)`. The action runs only if the counterparty's on-chain attestations satisfy the policy. Exposed as discoverable tools: `verify_compliance`, `check_compliance_policy`, `gate_transfer`, `get_attestations`.

## Pharos testnet

- chainId 688688 · RPC `https://testnet.dplabs-internal.com` · symbol PHRS
- explorer `https://testnet.pharosscan.xyz` · faucet `https://www.gas.zip/faucet/pharos`

## Gotchas

- `minimumReleaseAge` (1 day) is set in `pnpm-workspace.yaml` — pick package versions >1 day old.
- Libs are composite/`emitDeclarationOnly`; use extensionless imports. Run `pnpm run typecheck:libs` after lib changes before leaf typechecks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
