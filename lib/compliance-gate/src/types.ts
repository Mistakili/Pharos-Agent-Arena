import { z } from "zod";

/** A 0x-prefixed, 20-byte EVM address. */
export const EvmAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a 0x-prefixed 20-byte EVM address");
export type EvmAddress = z.infer<typeof EvmAddress>;

/**
 * The kinds of compliance claims an issuer can attest to about a subject.
 * These map 1:1 to the on-chain `AttType` enum in AttestationRegistry.sol.
 */
export const AttestationType = z.enum([
  "kyc",
  "aml",
  "accreditation",
  "jurisdiction",
  "age",
]);
export type AttestationType = z.infer<typeof AttestationType>;

/** On-chain enum ordering — index must match AttestationRegistry.sol. */
export const ATTESTATION_TYPE_ORDER: AttestationType[] = [
  "kyc",
  "aml",
  "accreditation",
  "jurisdiction",
  "age",
];

/** AML risk bands, ordered from least to most risky. */
export const RiskLevel = z.enum(["low", "medium", "high", "severe"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

/** Numeric ordering used to compare AML risk against a policy ceiling. */
export const RISK_ORDER: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  severe: 3,
};

/**
 * A single compliance attestation about a subject wallet.
 *
 * `value` semantics depend on `type`:
 *  - kyc / accreditation: "true" | "false"
 *  - aml:                 a RiskLevel ("low" | "medium" | "high" | "severe")
 *  - jurisdiction:        an ISO-3166 country code (e.g. "US", "SG")
 *  - age:                 a non-negative integer rendered as a string ("21")
 */
export const Attestation = z.object({
  subject: EvmAddress,
  type: AttestationType,
  issuer: EvmAddress,
  value: z.string(),
  /** Unix seconds. */
  issuedAt: z.number().int().nonnegative(),
  /** Unix seconds; `0` means it never expires. */
  expiresAt: z.number().int().nonnegative().default(0),
  revoked: z.boolean().default(false),
  /** Optional reference to an off-chain ZK proof / schema UID. */
  schemaUid: z.string().optional(),
});
export type Attestation = z.infer<typeof Attestation>;

/**
 * A compliance requirement an agent enforces before acting. Every field is
 * optional; only the fields you set are checked.
 */
export const CompliancePolicy = z.object({
  requireKyc: z.boolean().optional(),
  requireAccreditation: z.boolean().optional(),
  maxAmlRisk: RiskLevel.optional(),
  allowedJurisdictions: z.array(z.string()).optional(),
  blockedJurisdictions: z.array(z.string()).optional(),
  minAge: z.number().int().positive().optional(),
  /** If true, expired attestations are still treated as valid. Default false. */
  allowExpired: z.boolean().optional(),
});
export type CompliancePolicy = z.infer<typeof CompliancePolicy>;

/** The aggregated, evaluated compliance state of a subject. */
export interface ComplianceProfile {
  subject: string;
  attestations: Attestation[];
  kyc: boolean;
  accredited: boolean;
  amlRisk?: RiskLevel;
  jurisdiction?: string;
  age?: number;
  /** True if the subject has at least one expired attestation. */
  hasExpired: boolean;
}

/** A single line item explaining one policy check. */
export interface ComplianceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/** The result of evaluating a policy against a subject. */
export interface GateDecision {
  subject: string;
  allowed: boolean;
  reasons: string[];
  checks: ComplianceCheck[];
  /** Unix seconds at which the decision was made. */
  evaluatedAt: number;
}
