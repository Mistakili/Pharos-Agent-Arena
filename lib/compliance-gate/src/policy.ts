import {
  type Attestation,
  type ComplianceCheck,
  type CompliancePolicy,
  type ComplianceProfile,
  type GateDecision,
  type RiskLevel,
  RISK_ORDER,
  RiskLevel as RiskLevelSchema,
} from "./types";

/**
 * Reduce a raw list of attestations into an evaluated compliance profile.
 * Revoked attestations are ignored. Expired attestations are ignored unless
 * `allowExpired` is set.
 */
export function buildProfile(
  subject: string,
  attestations: Attestation[],
  now: number,
  allowExpired = false,
): ComplianceProfile {
  const active = attestations.filter((a) => !a.revoked);
  const isExpired = (a: Attestation) =>
    !allowExpired && a.expiresAt !== 0 && a.expiresAt <= now;

  const latest = (type: Attestation["type"]): Attestation | undefined =>
    active
      .filter((a) => a.type === type && !isExpired(a))
      .sort((x, y) => y.issuedAt - x.issuedAt)[0];

  const kycA = latest("kyc");
  const accA = latest("accreditation");
  const amlA = latest("aml");
  const jurA = latest("jurisdiction");
  const ageA = latest("age");

  let amlRisk: RiskLevel | undefined;
  if (amlA) {
    const parsed = RiskLevelSchema.safeParse(amlA.value);
    if (parsed.success) amlRisk = parsed.data;
  }

  let age: number | undefined;
  if (ageA) {
    const n = Number(ageA.value);
    if (Number.isFinite(n)) age = n;
  }

  // Fail-closed: a boolean claim counts as true ONLY for an exact, normalized
  // "true". Anything else (`"false"`, `"FALSE"`, `"0"`, `"yes"`, junk) is
  // treated as not-compliant so malformed data can never allow-by-accident.
  const isTrue = (v: string): boolean => v.trim().toLowerCase() === "true";

  return {
    subject,
    attestations,
    kyc: !!kycA && isTrue(kycA.value),
    accredited: !!accA && isTrue(accA.value),
    amlRisk,
    jurisdiction: jurA?.value,
    age,
    hasExpired: active.some(
      (a) => a.expiresAt !== 0 && a.expiresAt <= now,
    ),
  };
}

/**
 * Evaluate a policy against an already-built profile, producing an explainable
 * allow/deny decision. A decision is `allowed` only if every requested check
 * passes (default-deny on missing attestations).
 */
export function evaluatePolicy(
  profile: ComplianceProfile,
  policy: CompliancePolicy,
  now: number,
): GateDecision {
  const checks: ComplianceCheck[] = [];
  const add = (name: string, passed: boolean, detail: string) =>
    checks.push({ name, passed, detail });

  if (policy.requireKyc) {
    add(
      "kyc",
      profile.kyc,
      profile.kyc ? "KYC verified" : "No valid KYC attestation",
    );
  }

  if (policy.requireAccreditation) {
    add(
      "accreditation",
      profile.accredited,
      profile.accredited ? "Accredited investor" : "Not an accredited investor",
    );
  }

  if (policy.maxAmlRisk) {
    const ok =
      profile.amlRisk !== undefined &&
      RISK_ORDER[profile.amlRisk] <= RISK_ORDER[policy.maxAmlRisk];
    add(
      "aml",
      ok,
      profile.amlRisk === undefined
        ? "No AML risk attestation"
        : `AML risk "${profile.amlRisk}" (max allowed "${policy.maxAmlRisk}")`,
    );
  }

  if (policy.allowedJurisdictions && policy.allowedJurisdictions.length > 0) {
    const j = profile.jurisdiction;
    const allow = policy.allowedJurisdictions.map((s) => s.toUpperCase());
    const ok = !!j && allow.includes(j.toUpperCase());
    add(
      "jurisdiction_allowlist",
      ok,
      j
        ? `Jurisdiction "${j}" ${ok ? "is" : "is not"} in allowlist`
        : "No jurisdiction attestation",
    );
  }

  if (policy.blockedJurisdictions && policy.blockedJurisdictions.length > 0) {
    const j = profile.jurisdiction;
    const block = policy.blockedJurisdictions.map((s) => s.toUpperCase());
    const ok = !!j && !block.includes(j.toUpperCase());
    add(
      "jurisdiction_blocklist",
      ok,
      j
        ? `Jurisdiction "${j}" ${block.includes(j.toUpperCase()) ? "is blocked" : "is allowed"}`
        : "No jurisdiction attestation (cannot confirm subject is not in a blocked region)",
    );
  }

  if (policy.minAge !== undefined) {
    const ok = profile.age !== undefined && profile.age >= policy.minAge;
    add(
      "age",
      ok,
      profile.age !== undefined
        ? `Age ${profile.age} (min ${policy.minAge})`
        : "No age attestation",
    );
  }

  const allowed = checks.every((c) => c.passed);
  const reasons = checks.filter((c) => !c.passed).map((c) => c.detail);

  return { subject: profile.subject, allowed, reasons, checks, evaluatedAt: now };
}
