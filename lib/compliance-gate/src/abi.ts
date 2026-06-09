/**
 * ABI for AttestationRegistry.sol. Kept as a `const` so viem can infer precise
 * argument and return types at the call sites.
 */
export const ATTESTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "getAttestations",
    stateMutability: "view",
    inputs: [{ name: "subject", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "attType", type: "uint8" },
          { name: "issuer", type: "address" },
          { name: "value", type: "string" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "revoked", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getAttestationCount",
    stateMutability: "view",
    inputs: [{ name: "subject", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "subject", type: "address" },
      { name: "attType", type: "uint8" },
      { name: "value", type: "string" },
      { name: "expiresAt", type: "uint64" },
    ],
    outputs: [{ name: "index", type: "uint256" }],
  },
  {
    type: "function",
    name: "revoke",
    stateMutability: "nonpayable",
    inputs: [
      { name: "subject", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setIssuer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "issuer", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isIssuer",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
