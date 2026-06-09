import { buildProfile, evaluatePolicy } from "./policy";
import type { AttestationRegistry } from "./registry";
import type {
  Attestation,
  CompliancePolicy,
  ComplianceProfile,
  GateDecision,
} from "./types";

export interface ComplianceGateOptions {
  /** Override the clock (unix seconds). Useful for tests and deterministic demos. */
  now?: () => number;
}

/**
 * The core, framework-agnostic Compliance Gate.
 *
 * Wraps any {@link AttestationRegistry} and turns raw attestations into
 * explainable allow/deny decisions an AI agent can act on before transacting.
 */
export class ComplianceGate {
  constructor(
    private readonly registry: AttestationRegistry,
    private readonly options: ComplianceGateOptions = {},
  ) {}

  private now(): number {
    return this.options.now
      ? this.options.now()
      : Math.floor(Date.now() / 1000);
  }

  /** Raw attestations for a subject, straight from the registry. */
  async getAttestations(subject: string): Promise<Attestation[]> {
    return this.registry.getAttestations(subject);
  }

  /** Aggregated, evaluated compliance profile for a subject. */
  async getProfile(
    subject: string,
    allowExpired = false,
  ): Promise<ComplianceProfile> {
    const attestations = await this.registry.getAttestations(subject);
    return buildProfile(subject, attestations, this.now(), allowExpired);
  }

  /** Evaluate a policy against a subject and return an explainable decision. */
  async check(
    subject: string,
    policy: CompliancePolicy,
  ): Promise<GateDecision> {
    const profile = await this.getProfile(subject, policy.allowExpired ?? false);
    return evaluatePolicy(profile, policy, this.now());
  }

  /**
   * Run `action` only if `subject` satisfies `policy`. Returns the decision
   * either way; `result` is present only when the action ran.
   */
  async gate<T>(
    subject: string,
    policy: CompliancePolicy,
    action: () => Promise<T>,
  ): Promise<{ decision: GateDecision; result?: T }> {
    const decision = await this.check(subject, policy);
    if (!decision.allowed) return { decision };
    return { decision, result: await action() };
  }
}
