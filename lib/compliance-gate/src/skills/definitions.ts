import { z } from "zod";
import type { ComplianceGate } from "../gate";
import { RiskLevel } from "../types";

/**
 * A framework-agnostic Skill definition: a name, an LLM-facing description, a
 * Zod input schema, and an async executor. Adapters in this folder convert
 * these into LangChain tools, Vercel AI SDK tools, or MCP tools.
 */
export interface SkillDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}

const subjectField = z
  .string()
  .describe("The 0x EVM address (wallet or agent) to evaluate.");

/** The policy fields, flattened so they map cleanly to a tool's JSON schema. */
const policyShape = {
  requireKyc: z
    .boolean()
    .optional()
    .describe("Require a valid KYC attestation."),
  requireAccreditation: z
    .boolean()
    .optional()
    .describe("Require an accredited-investor attestation."),
  maxAmlRisk: RiskLevel.optional().describe(
    "Maximum acceptable AML risk band: low | medium | high | severe.",
  ),
  allowedJurisdictions: z
    .array(z.string())
    .optional()
    .describe("ISO country codes the subject is allowed to be in, e.g. [\"US\",\"SG\"]."),
  blockedJurisdictions: z
    .array(z.string())
    .optional()
    .describe("ISO country codes that are blocked, e.g. [\"KP\",\"IR\"]."),
  minAge: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Minimum required age in years."),
  allowExpired: z
    .boolean()
    .optional()
    .describe("Treat expired attestations as valid. Defaults to false."),
};

/**
 * Build the Compliance Gate skill set bound to a specific gate instance.
 * Returns four composable skills any agent can call.
 */
export function createComplianceSkills(
  gate: ComplianceGate,
): SkillDefinition[] {
  const verifyCompliance: SkillDefinition = {
    name: "verify_compliance",
    description:
      "Look up the on-chain compliance profile of an EVM address: KYC status, " +
      "accreditation, AML risk band, jurisdiction, age, and whether any " +
      "attestation has expired. Use this to understand a counterparty before acting.",
    schema: z.object({ subject: subjectField }),
    execute: async (input) => {
      const { subject } = input as { subject: string };
      const p = await gate.getProfile(subject);
      return {
        subject: p.subject,
        kyc: p.kyc,
        accredited: p.accredited,
        amlRisk: p.amlRisk ?? null,
        jurisdiction: p.jurisdiction ?? null,
        age: p.age ?? null,
        attestationCount: p.attestations.length,
        hasExpired: p.hasExpired,
      };
    },
  };

  const checkPolicy: SkillDefinition = {
    name: "check_compliance_policy",
    description:
      "Evaluate an EVM address against a compliance policy and return an " +
      "explainable allow/deny decision with per-check reasons. Use this to " +
      "decide whether an action involving this address is permitted.",
    schema: z.object({ subject: subjectField, ...policyShape }),
    execute: async (input) => {
      const { subject, ...policy } = input as {
        subject: string;
        [k: string]: unknown;
      };
      return gate.check(subject, policy);
    },
  };

  const gateTransfer: SkillDefinition = {
    name: "gate_transfer",
    description:
      "Compliance pre-flight for a value transfer. Given a recipient and a " +
      "policy, returns whether the transfer should proceed and why. Always " +
      "call this BEFORE transferring funds or assets to an unknown counterparty.",
    schema: z.object({
      to: z.string().describe("Recipient 0x EVM address."),
      amount: z
        .string()
        .optional()
        .describe("Human-readable amount, for logging/context (e.g. \"1000\")."),
      token: z
        .string()
        .optional()
        .describe("Token symbol or address, for context."),
      ...policyShape,
    }),
    execute: async (input) => {
      const { to, amount, token, ...policy } = input as {
        to: string;
        amount?: string;
        token?: string;
        [k: string]: unknown;
      };
      const decision = await gate.check(to, policy);
      return {
        ...decision,
        to,
        amount: amount ?? null,
        token: token ?? null,
        recommendedAction: decision.allowed ? "proceed" : "block",
      };
    },
  };

  const getAttestations: SkillDefinition = {
    name: "get_attestations",
    description:
      "Return the raw list of on-chain compliance attestations for an EVM " +
      "address, including issuer, value, issued/expiry timestamps, and revocation status.",
    schema: z.object({ subject: subjectField }),
    execute: async (input) => {
      const { subject } = input as { subject: string };
      const attestations = await gate.getAttestations(subject);
      return { subject, attestations };
    },
  };

  return [verifyCompliance, checkPolicy, gateTransfer, getAttestations];
}
