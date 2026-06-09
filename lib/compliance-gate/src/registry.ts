import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ATTESTATION_REGISTRY_ABI } from "./abi";
import { pharosTestnet, PHAROS_TESTNET_RPC_URL } from "./chain";
import {
  type Attestation,
  type AttestationType,
  ATTESTATION_TYPE_ORDER,
} from "./types";

/**
 * The source of compliance attestations. Read methods are required; write
 * methods are optional so read-only deployments can omit a signer.
 */
export interface AttestationRegistry {
  getAttestations(subject: string): Promise<Attestation[]>;
  issueAttestation?(
    input: Omit<Attestation, "issuer" | "issuedAt" | "revoked"> & {
      issuer?: string;
    },
  ): Promise<void>;
  revokeAttestation?(subject: string, index: number): Promise<void>;
}

/**
 * In-memory registry for local development, tests, and demos. Behaves like the
 * on-chain registry but keeps everything in a Map — no RPC or gas required.
 */
export class InMemoryAttestationRegistry implements AttestationRegistry {
  private store = new Map<string, Attestation[]>();

  constructor(seed: Attestation[] = []) {
    for (const a of seed) this.add(a);
  }

  private key(subject: string): string {
    return subject.toLowerCase();
  }

  private add(a: Attestation): void {
    const list = this.store.get(this.key(a.subject)) ?? [];
    list.push(a);
    this.store.set(this.key(a.subject), list);
  }

  async getAttestations(subject: string): Promise<Attestation[]> {
    return [...(this.store.get(this.key(subject)) ?? [])];
  }

  async issueAttestation(
    input: Omit<Attestation, "issuer" | "issuedAt" | "revoked"> & {
      issuer?: string;
    },
  ): Promise<void> {
    this.add({
      subject: input.subject,
      type: input.type,
      value: input.value,
      issuer:
        input.issuer ?? "0x0000000000000000000000000000000000000000",
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: input.expiresAt ?? 0,
      revoked: false,
      schemaUid: input.schemaUid,
    });
  }

  async revokeAttestation(subject: string, index: number): Promise<void> {
    const list = this.store.get(this.key(subject));
    if (list && list[index]) list[index].revoked = true;
  }
}

export interface OnChainRegistryConfig {
  /** Deployed AttestationRegistry contract address. */
  contractAddress: string;
  /** RPC endpoint. Defaults to the public Pharos testnet RPC. */
  rpcUrl?: string;
  /**
   * Issuer private key (0x-prefixed). Only required to call issue/revoke;
   * read-only usage can omit it.
   */
  privateKey?: string;
}

/**
 * Registry backed by an on-chain AttestationRegistry contract on Pharos.
 *
 * This is the production path: attestations live on-chain and any agent can
 * read them trustlessly. When Pharos exposes its native protocol-level ZK-KYC
 * attestation interface, only this adapter needs to change — the Skill, policy
 * engine, and agent code stay identical.
 */
export function createOnChainRegistry(
  config: OnChainRegistryConfig,
): AttestationRegistry {
  const transport = http(config.rpcUrl ?? PHAROS_TESTNET_RPC_URL);
  const publicClient = createPublicClient({
    chain: pharosTestnet,
    transport,
  });
  const address = config.contractAddress as Address;

  const walletClient = config.privateKey
    ? createWalletClient({
        chain: pharosTestnet,
        transport,
        account: privateKeyToAccount(config.privateKey as `0x${string}`),
      })
    : undefined;

  const typeIndex = (type: AttestationType): number =>
    ATTESTATION_TYPE_ORDER.indexOf(type);

  return {
    async getAttestations(subject: string): Promise<Attestation[]> {
      const rows = await publicClient.readContract({
        address,
        abi: ATTESTATION_REGISTRY_ABI,
        functionName: "getAttestations",
        args: [subject as Address],
      });
      // Fail-closed: drop attestations whose on-chain enum index does not map
      // to a known type rather than silently coercing them to "kyc".
      return rows.flatMap((r) => {
        const type = ATTESTATION_TYPE_ORDER[r.attType];
        if (!type) return [];
        return [
          {
            subject,
            type,
            issuer: r.issuer,
            value: r.value,
            issuedAt: Number(r.issuedAt),
            expiresAt: Number(r.expiresAt),
            revoked: r.revoked,
          },
        ];
      });
    },

    async issueAttestation(input): Promise<void> {
      if (!walletClient || !walletClient.account) {
        throw new Error(
          "issueAttestation requires a privateKey in OnChainRegistryConfig",
        );
      }
      await walletClient.writeContract({
        address,
        abi: ATTESTATION_REGISTRY_ABI,
        functionName: "attest",
        args: [
          input.subject as Address,
          typeIndex(input.type),
          input.value,
          BigInt(input.expiresAt ?? 0),
        ],
        account: walletClient.account,
        chain: pharosTestnet,
      });
    },

    async revokeAttestation(subject: string, index: number): Promise<void> {
      if (!walletClient || !walletClient.account) {
        throw new Error(
          "revokeAttestation requires a privateKey in OnChainRegistryConfig",
        );
      }
      await walletClient.writeContract({
        address,
        abi: ATTESTATION_REGISTRY_ABI,
        functionName: "revoke",
        args: [subject as Address, BigInt(index)],
        account: walletClient.account,
        chain: pharosTestnet,
      });
    },
  };
}
