/**
 * Demo engine for the Compliance Gate live demo.
 *
 * This is the systems layer the UI calls. It runs the REAL
 * `@workspace/compliance-gate` library entirely in the browser — the same
 * code an AI agent would run server-side before transacting on Pharos. The
 * UI never re-implements compliance logic; it only renders what this engine
 * returns.
 */
import {
  buildProfile,
  evaluatePolicy,
  ComplianceGate,
  InMemoryAttestationRegistry,
  createComplianceSkills,
  toMcpTools,
  callMcpTool,
  type Attestation,
  type AttestationType,
  type CompliancePolicy,
  type ComplianceProfile,
  type GateDecision,
  type RiskLevel,
  type McpTool,
} from "@workspace/compliance-gate";

export type {
  Attestation,
  AttestationType,
  CompliancePolicy,
  ComplianceProfile,
  GateDecision,
  RiskLevel,
  McpTool,
};

/** The counterparty wallet the demo agent is evaluating ("Bob"). */
export const SUBJECT = "0x1111111111111111111111111111111111111111";
/** A trusted KYC issuer wallet. */
export const ISSUER = "0x00000000000000000000000000000000000000Ab";

/** Pharos testnet metadata, shown in the UI to ground the demo on-chain. */
export const PHAROS = {
  name: "Pharos Testnet",
  chainId: 688688,
  symbol: "PHRS",
  rpcUrl: "https://testnet.dplabs-internal.com",
  explorer: "https://testnet.pharosscan.xyz",
} as const;

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "severe"];

/**
 * UI-friendly editable model of a single attestation. The engine converts
 * these into canonical on-chain {@link Attestation} records before evaluating.
 */
export interface AttestationDraft {
  id: string;
  type: AttestationType;
  value: string;
  /** Days until expiry from now; `null` / `0` means never expires. */
  expiresInDays: number | null;
  revoked: boolean;
}

let draftCounter = 0;
export function newDraftId(): string {
  draftCounter += 1;
  return `att_${draftCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeDraft(
  type: AttestationType,
  value: string,
  opts: { expiresInDays?: number | null; revoked?: boolean } = {},
): AttestationDraft {
  return {
    id: newDraftId(),
    type,
    value,
    expiresInDays: opts.expiresInDays ?? null,
    revoked: opts.revoked ?? false,
  };
}

/** Convert an editable draft into a canonical on-chain attestation record. */
export function draftToAttestation(
  draft: AttestationDraft,
  now: number = nowSeconds(),
): Attestation {
  const expiresAt =
    draft.expiresInDays && draft.expiresInDays !== 0
      ? now + Math.round(draft.expiresInDays * 86_400)
      : 0;
  return {
    subject: SUBJECT,
    type: draft.type,
    issuer: ISSUER,
    value: draft.value,
    issuedAt: now - 3_600,
    expiresAt,
    revoked: draft.revoked,
  };
}

export function draftsToAttestations(
  drafts: AttestationDraft[],
  now: number = nowSeconds(),
): Attestation[] {
  return drafts.map((d) => draftToAttestation(d, now));
}

/**
 * Synchronously evaluate a policy against a set of drafts. Mirrors exactly
 * what `ComplianceGate.check()` does, but without async so the UI can recompute
 * on every keystroke/toggle.
 */
export function evaluate(
  drafts: AttestationDraft[],
  policy: CompliancePolicy,
  now: number = nowSeconds(),
): { decision: GateDecision; profile: ComplianceProfile } {
  const attestations = draftsToAttestations(drafts, now);
  const profile = buildProfile(
    SUBJECT,
    attestations,
    now,
    policy.allowExpired ?? false,
  );
  const decision = evaluatePolicy(profile, policy, now);
  return { decision, profile };
}

/** Human-readable label for each attestation type. */
export const ATTESTATION_LABELS: Record<AttestationType, string> = {
  kyc: "KYC",
  aml: "AML Risk",
  accreditation: "Accredited Investor",
  jurisdiction: "Jurisdiction",
  age: "Age",
};

/** Plain-language explanation of what the `value` field means per type. */
export const ATTESTATION_VALUE_HINTS: Record<AttestationType, string> = {
  kyc: '"true" or "false"',
  aml: 'risk band: low | medium | high | severe',
  accreditation: '"true" or "false"',
  jurisdiction: 'ISO country code, e.g. "US", "SG"',
  age: 'whole number, e.g. "27"',
};

/** A ready-made compliance policy an agent might enforce. */
export interface PolicyPreset {
  id: string;
  name: string;
  description: string;
  policy: CompliancePolicy;
}

export const POLICY_PRESETS: PolicyPreset[] = [
  {
    id: "rwa-transfer",
    name: "Tokenized RWA transfer",
    description:
      "Sending tokenized real-world assets: full KYC, low AML risk, allowlisted jurisdictions, adult.",
    policy: {
      requireKyc: true,
      maxAmlRisk: "medium",
      allowedJurisdictions: ["US", "SG", "GB"],
      minAge: 18,
    },
  },
  {
    id: "accredited-only",
    name: "Accredited investors only",
    description:
      "A private offering restricted to KYC'd, accredited investors with low AML risk.",
    policy: {
      requireKyc: true,
      requireAccreditation: true,
      maxAmlRisk: "low",
    },
  },
  {
    id: "sanctions-screen",
    name: "Sanctions screen",
    description:
      "Lightweight gate: block sanctioned jurisdictions and high AML risk.",
    policy: {
      blockedJurisdictions: ["KP", "IR", "RU", "SY"],
      maxAmlRisk: "high",
    },
  },
];

/** A ready-made counterparty profile (set of attestations). */
export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  drafts: AttestationDraft[];
}

export function buildScenarios(): ScenarioPreset[] {
  return [
    {
      id: "unverified",
      name: "Unverified wallet",
      description: "A brand-new wallet with no attestations at all.",
      drafts: [],
    },
    {
      id: "clean-sg",
      name: "Verified Singapore investor",
      description:
        "KYC'd, low AML risk, jurisdiction SG, accredited, age 34.",
      drafts: [
        makeDraft("kyc", "true"),
        makeDraft("aml", "low"),
        makeDraft("jurisdiction", "SG"),
        makeDraft("accreditation", "true"),
        makeDraft("age", "34"),
      ],
    },
    {
      id: "expired-kyc",
      name: "Lapsed KYC",
      description:
        "Everything checks out, but the KYC attestation expired yesterday.",
      drafts: [
        makeDraft("kyc", "true", { expiresInDays: -1 }),
        makeDraft("aml", "low"),
        makeDraft("jurisdiction", "US"),
        makeDraft("age", "41"),
      ],
    },
    {
      id: "sanctioned",
      name: "Sanctioned region",
      description:
        "KYC'd but located in a blocked jurisdiction with high AML risk.",
      drafts: [
        makeDraft("kyc", "true"),
        makeDraft("aml", "high"),
        makeDraft("jurisdiction", "KP"),
        makeDraft("age", "29"),
      ],
    },
    {
      id: "underage",
      name: "Underage holder",
      description: "Fully verified, low risk — but only 16 years old.",
      drafts: [
        makeDraft("kyc", "true"),
        makeDraft("aml", "low"),
        makeDraft("jurisdiction", "GB"),
        makeDraft("age", "16"),
      ],
    },
  ];
}

// --- Agent tool layer (proves the same logic is callable by an AI agent) ---

/**
 * Build a ComplianceGate over a fresh in-memory registry seeded with the given
 * drafts, plus the framework-agnostic skill set bound to it. The same skills
 * power the LangChain, Vercel AI SDK, and MCP adapters in the library.
 */
function gateFor(drafts: AttestationDraft[], now: number) {
  const registry = new InMemoryAttestationRegistry(
    draftsToAttestations(drafts, now),
  );
  const gate = new ComplianceGate(registry, { now: () => now });
  return { gate, skills: createComplianceSkills(gate) };
}

/** The agent-facing tools, as an MCP `tools/list` response would return them. */
export function listAgentTools(): McpTool[] {
  const { skills } = gateFor([], nowSeconds());
  return toMcpTools(skills);
}

/** A record of one simulated agent tool call: the request and the response. */
export interface ToolCallRecord {
  tool: string;
  request: Record<string, unknown>;
  response: unknown;
}

/**
 * Simulate the AI agent calling a tool against the current counterparty state.
 * Returns the exact request/response JSON to render in the "agent tools" view.
 */
export async function callAgentTool(
  drafts: AttestationDraft[],
  name: string,
  args: Record<string, unknown>,
  now: number = nowSeconds(),
): Promise<ToolCallRecord> {
  const { skills } = gateFor(drafts, now);
  const response = await callMcpTool(skills, name, args);
  return { tool: name, request: args, response };
}
