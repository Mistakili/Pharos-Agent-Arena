import { defineChain, type Chain } from "viem";

/**
 * Pharos Testnet (Atlantic) network definition for viem.
 *
 * These values are the public Pharos testnet parameters. Override the RPC URL
 * via `createOnChainRegistry({ rpcUrl })` if you use a private/alternate node.
 */
export const pharosTestnet: Chain = defineChain({
  id: 688688,
  name: "Pharos Testnet",
  nativeCurrency: { name: "Pharos", symbol: "PHRS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.dplabs-internal.com"] },
  },
  blockExplorers: {
    default: { name: "PharosScan", url: "https://testnet.pharosscan.xyz" },
  },
  testnet: true,
});

export const PHAROS_TESTNET_RPC_URL = "https://testnet.dplabs-internal.com";
