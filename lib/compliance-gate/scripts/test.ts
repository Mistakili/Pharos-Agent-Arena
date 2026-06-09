/**
 * Adversarial assertions proving the Compliance Gate stays fail-closed.
 *
 * Run: pnpm --filter @workspace/compliance-gate run test
 */
import assert from "node:assert/strict";
import {
  ComplianceGate,
  InMemoryAttestationRegistry,
  type Attestation,
  type CompliancePolicy,
} from "../src/index";

const NOW = 1_000_000;
const SUBJECT = "0x1111111111111111111111111111111111111111";
const ISSUER = "0x00000000000000000000000000000000000000Ab";

function att(partial: Partial<Attestation>): Attestation {
  return {
    subject: SUBJECT,
    type: "kyc",
    issuer: ISSUER,
    value: "true",
    issuedAt: NOW - 100,
    expiresAt: 0,
    revoked: false,
    ...partial,
  };
}

function gateWith(seed: Attestation[]): ComplianceGate {
  return new ComplianceGate(new InMemoryAttestationRegistry(seed), {
    now: () => NOW,
  });
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const KYC_POLICY: CompliancePolicy = { requireKyc: true };

async function main() {
  await check("empty profile is denied (default-deny)", async () => {
    const d = await gateWith([]).check(SUBJECT, KYC_POLICY);
    assert.equal(d.allowed, false);
  });

  await check("malformed KYC values never count as compliant", async () => {
    for (const value of ["false", "FALSE", "0", "yes", "TRUE ", "", "1"]) {
      const d = await gateWith([att({ value })]).check(SUBJECT, KYC_POLICY);
      const expected = value.trim().toLowerCase() === "true";
      assert.equal(
        d.allowed,
        expected,
        `value "${value}" should ${expected ? "pass" : "fail"}`,
      );
    }
  });

  await check("exact normalized 'true' passes", async () => {
    const d = await gateWith([att({ value: "  True  " })]).check(SUBJECT, KYC_POLICY);
    assert.equal(d.allowed, true);
  });

  await check("revoked KYC is ignored", async () => {
    const d = await gateWith([att({ revoked: true })]).check(SUBJECT, KYC_POLICY);
    assert.equal(d.allowed, false);
  });

  await check("expired KYC is denied; allowExpired re-enables it", async () => {
    const expired = [att({ expiresAt: NOW - 1 })];
    assert.equal((await gateWith(expired).check(SUBJECT, KYC_POLICY)).allowed, false);
    assert.equal(
      (await gateWith(expired).check(SUBJECT, { ...KYC_POLICY, allowExpired: true })).allowed,
      true,
    );
  });

  await check("AML ceiling is enforced", async () => {
    const policy: CompliancePolicy = { maxAmlRisk: "medium" };
    assert.equal(
      (await gateWith([att({ type: "aml", value: "low" })]).check(SUBJECT, policy)).allowed,
      true,
    );
    assert.equal(
      (await gateWith([att({ type: "aml", value: "severe" })]).check(SUBJECT, policy)).allowed,
      false,
    );
    assert.equal(
      (await gateWith([]).check(SUBJECT, policy)).allowed,
      false,
      "missing AML attestation must deny",
    );
  });

  await check("jurisdiction allow/block lists work and default-deny on unknown", async () => {
    const allow: CompliancePolicy = { allowedJurisdictions: ["US", "SG"] };
    assert.equal(
      (await gateWith([att({ type: "jurisdiction", value: "SG" })]).check(SUBJECT, allow)).allowed,
      true,
    );
    assert.equal(
      (await gateWith([att({ type: "jurisdiction", value: "FR" })]).check(SUBJECT, allow)).allowed,
      false,
    );
    const block: CompliancePolicy = { blockedJurisdictions: ["KP", "IR"] };
    assert.equal(
      (await gateWith([att({ type: "jurisdiction", value: "KP" })]).check(SUBJECT, block)).allowed,
      false,
    );
    assert.equal(
      (await gateWith([]).check(SUBJECT, block)).allowed,
      false,
      "unknown jurisdiction with a blocklist must deny",
    );
  });

  await check("minAge is enforced", async () => {
    const policy: CompliancePolicy = { minAge: 18 };
    assert.equal(
      (await gateWith([att({ type: "age", value: "17" })]).check(SUBJECT, policy)).allowed,
      false,
    );
    assert.equal(
      (await gateWith([att({ type: "age", value: "21" })]).check(SUBJECT, policy)).allowed,
      true,
    );
  });

  await check("gate() runs the action only when allowed", async () => {
    let ran = 0;
    const compliant = [att({ value: "true" })];
    await gateWith(compliant).gate(SUBJECT, KYC_POLICY, async () => (ran += 1));
    assert.equal(ran, 1);
    await gateWith([]).gate(SUBJECT, KYC_POLICY, async () => (ran += 1));
    assert.equal(ran, 1, "action must not run when denied");
  });

  console.log(`\nAll ${passed} checks passed.`);
}

main().catch((err) => {
  console.error("\n✗ TEST FAILED");
  console.error(err);
  process.exit(1);
});
