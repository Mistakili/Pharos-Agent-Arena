/**
 * Compliance Gate — end-to-end demo (no chain or gas required).
 *
 * Tells the story you can record for the hackathon video:
 *   1. An agent is asked to send a tokenized RWA to a counterparty.
 *   2. The Gate BLOCKS it — the counterparty has no compliance attestations.
 *   3. A KYC issuer attests KYC + low AML risk + jurisdiction + age.
 *   4. The Gate now ALLOWS the transfer, which executes.
 *   5. The issuer revokes KYC — the Gate BLOCKS again, live.
 *
 * Run: pnpm --filter @workspace/compliance-gate run demo
 */
import {
  ComplianceGate,
  InMemoryAttestationRegistry,
  createComplianceSkills,
  callMcpTool,
  toMcpTools,
  type CompliancePolicy,
} from "../src/index";

const BOB = "0x1111111111111111111111111111111111111111";
const ISSUER = "0x00000000000000000000000000000000000000Ab";

const policy: CompliancePolicy = {
  requireKyc: true,
  maxAmlRisk: "medium",
  allowedJurisdictions: ["US", "SG", "GB"],
  minAge: 18,
};

function banner(title: string) {
  console.log("\n" + "─".repeat(64));
  console.log(title);
  console.log("─".repeat(64));
}

function printDecision(label: string, decision: { allowed: boolean; checks: { name: string; passed: boolean; detail: string }[]; reasons: string[] }) {
  console.log(`${label}: ${decision.allowed ? "✅ ALLOWED" : "⛔ BLOCKED"}`);
  for (const c of decision.checks) {
    console.log(`   ${c.passed ? "✓" : "✗"} ${c.name.padEnd(22)} ${c.detail}`);
  }
  if (!decision.allowed) {
    console.log(`   reasons: ${decision.reasons.join("; ")}`);
  }
}

async function main() {
  const registry = new InMemoryAttestationRegistry();
  const gate = new ComplianceGate(registry);

  banner("Policy the agent enforces before sending 1,000 tokenized USD to Bob");
  console.log(JSON.stringify(policy, null, 2));

  banner("Step 1 — Bob has no attestations yet");
  let result = await gate.gate(BOB, policy, async () => {
    console.log("   >> transfer() executed");
    return "0xTXHASH";
  });
  printDecision("Gate", result.decision);
  console.log(`   transfer ran: ${result.result ? "yes" : "no"}`);

  banner("Step 2 — A KYC issuer attests Bob's compliance on-chain");
  await registry.issueAttestation({ subject: BOB, type: "kyc", value: "true", issuer: ISSUER });
  await registry.issueAttestation({ subject: BOB, type: "aml", value: "low", issuer: ISSUER });
  await registry.issueAttestation({ subject: BOB, type: "jurisdiction", value: "SG", issuer: ISSUER });
  await registry.issueAttestation({ subject: BOB, type: "age", value: "27", issuer: ISSUER });
  console.log("   issued: kyc=true, aml=low, jurisdiction=SG, age=27");

  banner("Step 3 — Re-run the gate");
  result = await gate.gate(BOB, policy, async () => {
    console.log("   >> transfer() executed — funds sent to a compliant counterparty");
    return "0xTXHASH";
  });
  printDecision("Gate", result.decision);
  console.log(`   transfer ran: ${result.result ? "yes" : "no"}`);

  banner("Step 4 — Issuer revokes Bob's KYC; the gate reacts immediately");
  await registry.revokeAttestation(BOB, 0);
  const decision = await gate.check(BOB, policy);
  printDecision("Gate", decision);

  banner("Same logic, exposed as MCP tools any agent can discover");
  const skills = createComplianceSkills(gate);
  console.log("   tools/list:", toMcpTools(skills).map((t) => t.name).join(", "));
  const profile = await callMcpTool(skills, "verify_compliance", { subject: BOB });
  console.log("   verify_compliance ->", JSON.stringify(profile));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
