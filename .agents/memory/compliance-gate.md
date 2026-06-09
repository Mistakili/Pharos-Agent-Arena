---
name: Compliance Gate
description: Durable decisions for the lib/compliance-gate Skill (Pharos hackathon) — security posture, registry abstraction, and Pharos KYC status.
---

# Compliance Gate

A reusable AI-agent Skill (`@workspace/compliance-gate`) that gates agent actions behind on-chain KYC/AML/jurisdiction/age attestations before transacting on Pharos.

## Fail-closed is the core invariant
Every ambiguous condition must DENY. Missing, expired, revoked, or malformed attestations all deny. Boolean claims count as compliant only for an exact normalized `"true"` (trim+lowercase) — never `!== "false"`. Unknown on-chain attestation-type enum indices are dropped, never coerced to a default type.
**Why:** A compliance gate that fails open silently authorizes non-compliant transfers — the single worst failure mode and the first thing judges/reviewers probe. An architect review caught two fail-open bugs here (permissive boolean parse, `?? "kyc"` coercion).
**How to apply:** Any new check or registry adapter must default-deny. Add adversarial assertions (see `scripts/test.ts`) before trusting a new code path.

## The registry is an interface, not a hardcoded backend
`AttestationRegistry` is an interface with an InMemory adapter and a viem on-chain adapter; viem types stay internal, public API uses our own types.
**Why:** As of June 2026 Pharos exposes ZK-KYC/AML only at the protocol layer — there is NO public agent-callable KYC contract/API. We ship a working EAS-style registry so the Skill is usable today; only the adapter changes when Pharos ships its native interface. This gap is also the originality angle for the submission.
**How to apply:** Keep all Pharos-specific calls behind the registry adapter. Don't leak viem types into the public Skill surface.

## Pharos testnet params
chainId 688688 · RPC https://testnet.dplabs-internal.com · symbol PHRS · explorer https://testnet.pharosscan.xyz · faucet https://www.gas.zip/faucet/pharos
