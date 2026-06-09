/**
 * Compile and deploy AttestationRegistry.sol to Pharos Testnet.
 *
 * Requires a funded deployer key:
 *   DEPLOYER_PRIVATE_KEY=0x...   (get test PHRS from https://www.gas.zip/faucet/pharos)
 *
 * Run: pnpm --filter @workspace/compliance-gate run deploy
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { pharosTestnet, PHAROS_TESTNET_RPC_URL } from "../src/chain";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function compile(): { abi: Abi; bytecode: Hex } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const solc = require("solc");
  const source = readFileSync(
    join(__dirname, "..", "contracts", "AttestationRegistry.sol"),
    "utf8",
  );
  const input = {
    language: "Solidity",
    sources: { "AttestationRegistry.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors) {
    const fatal = out.errors.filter((e: { severity: string }) => e.severity === "error");
    for (const e of out.errors) console.error(e.formattedMessage);
    if (fatal.length) throw new Error("Solidity compilation failed");
  }
  const c = out.contracts["AttestationRegistry.sol"].AttestationRegistry;
  return { abi: c.abi as Abi, bytecode: `0x${c.evm.bytecode.object}` as Hex };
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("Set DEPLOYER_PRIVATE_KEY (0x-prefixed) in the environment.");

  const { abi, bytecode } = compile();
  const account = privateKeyToAccount(pk as Hex);
  const rpcUrl = process.env.PHAROS_RPC_URL ?? PHAROS_TESTNET_RPC_URL;

  const wallet = createWalletClient({ account, chain: pharosTestnet, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: pharosTestnet, transport: http(rpcUrl) });

  console.log(`Deploying AttestationRegistry from ${account.address} ...`);
  const hash = await wallet.deployContract({ abi, bytecode, account, chain: pharosTestnet });
  console.log(`tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ Deployed at: ${receipt.contractAddress}`);
  console.log(`   Explorer: https://testnet.pharosscan.xyz/address/${receipt.contractAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
