# Compliance Gate Operation Instructions

> Network configuration: read `rpcUrl`, `chainId`, and `explorerUrl` from
> `assets/networks.json` (`pharos-testnet`).
>
> Private key: pass explicitly via `--private-key $PRIVATE_KEY` on every write.
> Foundry does **not** read `$PRIVATE_KEY` from the environment automatically.

This reference teaches an agent how to read and write compliance attestations on
Pharos Testnet via `AttestationRegistry.sol`, then evaluate a subject against a
policy. The TypeScript skill layer (`@workspace/compliance-gate`) exposes the
same logic as MCP tools: `verify_compliance`, `check_compliance_policy`,
`gate_transfer`, and `get_attestations`.

---

## Attestation type enum

| `attType` | Meaning        | Example `value`   |
| --------- | -------------- | ----------------- |
| `0`       | KYC            | `"true"`          |
| `1`       | AML risk band  | `"low"`           |
| `2`       | Accreditation  | `"true"`          |
| `3`       | Jurisdiction   | `"SG"`            |
| `4`       | Age            | `"34"`            |

`expiresAt = 0` means the attestation never expires.

---

## Deploy AttestationRegistry

### Overview

Deploy the on-chain registry that stores compliance attestations. The deployer is
the first authorized issuer.

### Command Template (workspace script)

```bash
export DEPLOYER_PRIVATE_KEY=0x...
export PHAROS_RPC_URL=https://testnet.dplabs-internal.com
pnpm --filter @workspace/compliance-gate run deploy
```

### Output Parsing

| Field            | Description                                      |
| ---------------- | ------------------------------------------------ |
| `Deployed at:`   | Registry contract address — save as `$REGISTRY`  |
| `Explorer:`      | PharosScan link for the deployment transaction   |

### Error Handling

| Error                 | Cause                    | Fix                                      |
| --------------------- | ------------------------ | ---------------------------------------- |
| `Set DEPLOYER_PRIVATE_KEY` | Env var missing     | Export a funded testnet key              |
| `insufficient funds`  | Not enough PHRS for gas  | Use the Pharos faucet                    |
| `connection refused`  | RPC unreachable          | Pass `PHAROS_RPC_URL` explicitly         |

> **Agent Guidelines:**
> 1. Complete Write Operation Pre-checks (see `SKILL.md`)
> 2. Confirm deployer balance: `cast balance $DEPLOYER --rpc-url $RPC --ether`
> 3. Run the deploy script and record `$REGISTRY`
> 4. Show explorer link: `$EXPLORER/address/$REGISTRY`

---

## Read attestation count

### Command Template

```bash
cast call $REGISTRY "getAttestationCount(address)(uint256)" $SUBJECT --rpc-url $RPC
```

### Parameters

| Parameter   | Type    | Required | Description                          |
| ----------- | ------- | -------- | ------------------------------------ |
| `$REGISTRY` | address | Yes      | Deployed `AttestationRegistry`       |
| `$SUBJECT`  | address | Yes      | Wallet or agent address to inspect   |
| `$RPC`      | string  | Yes      | From `assets/networks.json`          |

### Output Parsing

Returns the number of attestations stored for `$SUBJECT`.

---

## Read all attestations

### Command Template

```bash
cast call $REGISTRY \
  "getAttestations(address)((uint8,address,string,uint64,uint64,bool)[])" \
  $SUBJECT \
  --rpc-url $RPC
```

### Output Parsing

Each tuple is `(attType, issuer, value, issuedAt, expiresAt, revoked)`.

| Field        | Description                                           |
| ------------ | ----------------------------------------------------- |
| `attType`    | See enum table above                                  |
| `issuer`     | Authorized issuer that recorded the fact              |
| `value`      | Attested value (string)                               |
| `issuedAt`   | Unix timestamp                                        |
| `expiresAt`  | `0` = never expires; otherwise expiry unix time       |
| `revoked`    | `true` if issuer or owner revoked this attestation    |

### Error Handling

| Error              | Cause                         | Fix                               |
| ------------------ | ----------------------------- | --------------------------------- |
| Empty return value | No contract at `$REGISTRY`    | Confirm address and network       |
| RPC error          | Node unreachable              | Retry with explicit `--rpc-url`   |

> **Agent Guidelines:** Treat revoked or expired attestations as invalid unless
> the caller policy sets `allowExpired: true`.

---

## Issue an attestation (issuer only)

### Command Template

```bash
cast send $REGISTRY \
  "attest(address,uint8,string,uint64)(uint256)" \
  $SUBJECT $ATT_TYPE "$VALUE" $EXPIRES_AT \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

### Parameters

| Parameter     | Type    | Required | Description                                |
| ------------- | ------- | -------- | ------------------------------------------ |
| `$SUBJECT`    | address | Yes      | Wallet receiving the attestation           |
| `$ATT_TYPE`   | uint8   | Yes      | `0`–`4` per enum table                     |
| `$VALUE`      | string  | Yes      | Attested value                             |
| `$EXPIRES_AT` | uint64  | Yes      | Unix expiry; `0` = never                   |

### Error Handling

| Error                  | Cause              | Fix                                |
| ---------------------- | ------------------ | ---------------------------------- |
| `not issuer`           | Key not authorized | Use an issuer key or `setIssuer`   |
| `bad type`             | Invalid `attType`  | Use `0`–`4` only                   |

---

## Revoke an attestation

### Command Template

```bash
cast send $REGISTRY \
  "revoke(address,uint256)" \
  $SUBJECT $INDEX \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC
```

Callable by the attestation's issuer or the registry owner.

---

## MCP tool response shapes (agent layer)

When using `@workspace/compliance-gate` skills instead of raw `cast` calls, agents
receive JSON shaped like:

### `verify_compliance`

```json
{
  "subject": "0x...",
  "kyc": true,
  "accredited": false,
  "amlRisk": "low",
  "jurisdiction": "SG",
  "age": 34,
  "attestationCount": 5,
  "hasExpired": false
}
```

### `check_compliance_policy`

```json
{
  "subject": "0x...",
  "allowed": false,
  "reasons": ["No valid KYC attestation"],
  "checks": [
    { "name": "kyc", "passed": false, "detail": "No valid KYC attestation" }
  ],
  "evaluatedAt": 1718745600
}
```

### `gate_transfer`

Same as `check_compliance_policy`, plus:

```json
{
  "to": "0x...",
  "amount": "1000",
  "token": "USDC",
  "recommendedAction": "block"
}
```

### `get_attestations`

```json
{
  "subject": "0x...",
  "attestations": [
    {
      "subject": "0x...",
      "type": "kyc",
      "issuer": "0x...",
      "value": "true",
      "issuedAt": 1718742000,
      "expiresAt": 0,
      "revoked": false
    }
  ]
}
```