# Compliance Gate — On-Chain & Skill Reference

Pharos testnet · chainId `688688` · RPC `https://testnet.dplabs-internal.com` · explorer `https://testnet.pharosscan.xyz`

Set env vars before running any command:

```bash
export RPC=https://testnet.dplabs-internal.com
export REGISTRY=<deployed_AttestationRegistry_address>
export SUBJECT=<counterparty_wallet_address>
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY   # write operations only
export DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
```

---

## AttestationRegistry Contract

### Attestation Struct

| Field | Type | Description |
|-------|------|-------------|
| `attType` | `uint8` | `0`=KYC · `1`=AML · `2`=ACCREDITATION · `3`=JURISDICTION · `4`=AGE |
| `issuer` | `address` | Authorized issuer that created this attestation |
| `value` | `string` | Attestation value (see table below) |
| `issuedAt` | `uint64` | Unix timestamp of issuance |
| `expiresAt` | `uint64` | Unix timestamp of expiry; `0` = never expires |
| `revoked` | `bool` | Whether this attestation has been revoked |

### Attestation Values

| `attType` | Meaning | Valid `value` strings |
|-----------|---------|----------------------|
| `0` — KYC | KYC completed | `"true"` |
| `1` — AML | AML risk level | `"low"` · `"medium"` · `"high"` · `"critical"` |
| `2` — ACCREDITATION | Accredited investor | `"true"` |
| `3` — JURISDICTION | Registered jurisdiction | ISO 3166-1 alpha-2 (e.g. `"US"`, `"SG"`, `"GB"`) |
| `4` — AGE | Age in years | Decimal integer string (e.g. `"25"`) |

---

## On-Chain Reads

### Read all attestations for a subject

```bash
cast call $REGISTRY \
  "getAttestations(address)((uint8,address,string,uint64,uint64,bool)[])" \
  $SUBJECT \
  --rpc-url $RPC
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `$REGISTRY` | Deployed `AttestationRegistry` contract address |
| `$SUBJECT` | Wallet address to query |

**Output parsing:**
- Returns an array of `Attestation` tuples `(attType, issuer, value, issuedAt, expiresAt, revoked)`.
- Ignore entries where `revoked == true`.
- Ignore entries where `expiresAt != 0 && expiresAt < block.timestamp` (expired).
- Pass compliance only for `attType=0` (KYC) with `value == "true"` (exact match, case-sensitive).
- AML: lower is better — `"low"` < `"medium"` < `"high"` < `"critical"`.

**Error handling:**

| Condition | Interpretation |
|-----------|----------------|
| Empty array `[]` | No attestations — **fail closed, deny** |
| RPC timeout / error | Network issue — **fail closed, deny** |
| All entries revoked or expired | **Fail closed, deny** |

---

### Check if an address is an authorized issuer

```bash
cast call $REGISTRY \
  "isIssuer(address)(bool)" \
  $ISSUER_ADDRESS \
  --rpc-url $RPC
```

**Output:** `true` or `false`

---

### Read registry owner

```bash
cast call $REGISTRY \
  "owner()(address)" \
  --rpc-url $RPC
```

---

### Verify chain connection

```bash
cast chain-id --rpc-url $RPC
# Expected output: 688688
```

---

## Write Attestations

> **Run all four pre-checks before any `cast send`:**
> 1. `$PRIVATE_KEY` is set — `echo ${#PRIVATE_KEY}` (should be 66 chars for 0x-prefixed)
> 2. Caller is authorized issuer — `cast call $REGISTRY "isIssuer(address)(bool)" $DEPLOYER --rpc-url $RPC` → `true`
> 3. Chain ID is correct — `cast chain-id --rpc-url $RPC` → `688688`
> 4. Caller has PHRS for gas — `cast balance $DEPLOYER --rpc-url $RPC --ether`

---

### Attest — KYC passed

```bash
cast send $REGISTRY \
  "attest(address,uint8,string,uint64)" \
  $SUBJECT \
  0 \
  "true" \
  $(($(date +%s) + 31536000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

*`attType=0` (KYC) · value `"true"` · expiresAt = now + 1 year*

**Output parsing:** Check for `status: 1` (success) in the receipt. Log the tx hash and link to `https://testnet.pharosscan.xyz/tx/<hash>`.

---

### Attest — AML risk level

```bash
# Replace "low" with: "low" | "medium" | "high" | "critical"
cast send $REGISTRY \
  "attest(address,uint8,string,uint64)" \
  $SUBJECT \
  1 \
  "low" \
  $(($(date +%s) + 31536000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

*`attType=1` (AML) · value is risk level string*

---

### Attest — Jurisdiction

```bash
# Replace "US" with the ISO 3166-1 alpha-2 country code
cast send $REGISTRY \
  "attest(address,uint8,string,uint64)" \
  $SUBJECT \
  3 \
  "US" \
  $(($(date +%s) + 31536000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

*`attType=3` (JURISDICTION) · value is ISO country code*

---

### Attest — Age

```bash
# Replace "25" with the actual age as a decimal string
cast send $REGISTRY \
  "attest(address,uint8,string,uint64)" \
  $SUBJECT \
  4 \
  "25" \
  $(($(date +%s) + 31536000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

*`attType=4` (AGE) · value is age as a decimal integer string*

---

### Attest — Accreditation

```bash
cast send $REGISTRY \
  "attest(address,uint8,string,uint64)" \
  $SUBJECT \
  2 \
  "true" \
  $(($(date +%s) + 31536000)) \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

*`attType=2` (ACCREDITATION) · value `"true"`*

---

### Revoke an attestation

```bash
# $INDEX is the 0-based position in the subject's attestation array
cast send $REGISTRY \
  "revoke(address,uint256)" \
  $SUBJECT \
  $INDEX \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

**Output parsing:** Check for `status: 1`. Verify with `getAttestations` — the entry's `revoked` field should now be `true`.

---

### Authorize a new issuer (owner only)

```bash
cast send $REGISTRY \
  "setIssuer(address,bool)" \
  $NEW_ISSUER \
  true \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

---

## Deploy

Deploy a fresh `AttestationRegistry` to Pharos testnet:

```bash
export PRIVATE_KEY=0xYOUR_PRIVATE_KEY
export RPC=https://testnet.dplabs-internal.com

# Check prerequisites
cast chain-id --rpc-url $RPC          # must be 688688
cast balance $DEPLOYER --rpc-url $RPC --ether  # must be > 0

# Deploy
pnpm --filter @workspace/compliance-gate run deploy
```

This compiles `contracts/AttestationRegistry.sol` via viem and deploys it. The deployed address is printed to stdout — set it as `$REGISTRY`.

**Verify on explorer:**
```
https://testnet.pharosscan.xyz/address/<deployed_address>
```

---

## Skill Tool Reference (SDK / MCP)

### verify-compliance

Read a wallet's full compliance profile from on-chain attestations.

**MCP call:**
```json
{
  "name": "verify_compliance",
  "arguments": { "subject": "0xCounterpartyAddress" }
}
```

**Response shape:**
```json
{
  "subject": "0x...",
  "profile": {
    "kyc": { "attested": true, "value": "true", "expiresAt": 1780000000 },
    "aml": { "attested": true, "value": "low" },
    "jurisdiction": { "attested": true, "value": "US" },
    "age": { "attested": true, "value": "25" }
  },
  "summary": "KYC verified · AML risk: low · Jurisdiction: US · Age: 25"
}
```

---

### check-compliance-policy

Evaluate a wallet against a declared policy.

**MCP call:**
```json
{
  "name": "check_compliance_policy",
  "arguments": {
    "subject": "0xCounterpartyAddress",
    "requireKyc": true,
    "maxAmlRisk": "medium",
    "allowedJurisdictions": ["US", "SG"],
    "minAge": 18
  }
}
```

**Response shape:**
```json
{
  "allowed": true,
  "reasons": [],
  "checks": [
    { "name": "kyc", "passed": true, "detail": "KYC verified" },
    { "name": "aml", "passed": true, "detail": "AML risk \"low\" ≤ max \"medium\"" },
    { "name": "jurisdiction_allowlist", "passed": true, "detail": "Jurisdiction US is allowed" },
    { "name": "age", "passed": true, "detail": "Age 25 ≥ minimum 18" }
  ]
}
```

---

### gate-transfer

Compliance pre-flight before sending. The action executes only if all checks pass.

**MCP call:**
```json
{
  "name": "gate_transfer",
  "arguments": {
    "to": "0xRecipientAddress",
    "amount": "1000",
    "token": "USDC",
    "requireKyc": true,
    "maxAmlRisk": "medium",
    "allowedJurisdictions": ["US", "SG"]
  }
}
```

**Response shape (blocked):**
```json
{
  "allowed": false,
  "decision": {
    "allowed": false,
    "reasons": ["No valid KYC attestation"],
    "checks": [{ "name": "kyc", "passed": false, "detail": "No valid KYC attestation" }]
  }
}
```
