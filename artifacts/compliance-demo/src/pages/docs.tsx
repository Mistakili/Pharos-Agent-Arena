import type { ReactNode } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { PHAROS } from "@/engine/compliance";
import { ArrowLeft, ExternalLink } from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "live-demo", label: "Live demo walkthrough" },
  { id: "tools", label: "Four agent tools" },
  { id: "policy", label: "Policy fields" },
  { id: "attestations", label: "Attestation types" },
  { id: "install", label: "Install & CLI" },
  { id: "integrate", label: "Agent integration" },
  { id: "onchain", label: "On-chain deploy" },
  { id: "files", label: "Repo layout" },
] as const;

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-zinc-800">{title}</h2>
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="text-xs font-mono text-zinc-300 bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed">
      {children}
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-900/80 text-left text-zinc-500">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-mono font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-zinc-800/80 text-zinc-300">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Docs() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/30">
      <SiteHeader active="docs" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to live demo
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Compliance Gate — Docs
          </h1>
          <p className="text-zinc-500 max-w-2xl">
            Manual for judges, integrators, and builders. No video required — follow the live demo
            steps or copy the integration snippets below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
          <nav className="hidden lg:block sticky top-20 self-start">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-3">On this page</p>
            <ul className="space-y-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block py-1 text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12 min-w-0">
            <DocSection id="overview" title="Overview">
              <p>
                <strong className="text-zinc-200">Compliance Gate</strong> is a reusable Pharos Skill.
                Any AI agent can verify a counterparty&apos;s compliance attestations (KYC, AML, jurisdiction,
                accreditation, age) against a declared policy <em>before</em> executing transfers or other
                on-chain actions.
              </p>
              <p>
                The live demo at{" "}
                <Link href="/" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-2">
                  /
                </Link>{" "}
                runs the real <code className="text-zinc-300 bg-zinc-900 px-1 rounded">@workspace/compliance-gate</code>{" "}
                package in your browser — same logic an agent calls server-side. No wallet needed for the
                policy engine and tool playground.
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                <li>
                  <strong className="text-zinc-300">Package:</strong>{" "}
                  <code className="text-zinc-400">lib/compliance-gate</code>
                </li>
                <li>
                  <strong className="text-zinc-300">Network:</strong> Pharos Testnet · chainId{" "}
                  <code className="text-zinc-400">{PHAROS.chainId}</code>
                </li>
                <li>
                  <strong className="text-zinc-300">Frameworks:</strong> MCP, LangChain, Vercel AI SDK
                </li>
                <li>
                  <strong className="text-zinc-300">On-chain:</strong>{" "}
                  <code className="text-zinc-400">AttestationRegistry.sol</code>
                </li>
              </ul>
            </DocSection>

            <DocSection id="live-demo" title="Live demo walkthrough">
              <p>Open the demo and follow these three steps — the UI labels them as Step 1, 2, and 3.</p>

              <h3 className="text-sm font-semibold text-zinc-200 pt-2">Step 1 — Agent Policy (left, top)</h3>
              <p>Pick a policy preset or toggle individual rules:</p>
              <Table
                headers={["Preset", "Use case"]}
                rows={[
                  ["Tokenized RWA transfer", "KYC + medium AML max + US/SG/GB + age 18+"],
                  ["Accredited investors only", "KYC + accreditation + low AML max"],
                  ["Sanctions screen", "Block KP/IR/RU/SY + high AML max"],
                ]}
              />
              <p>
                Toggle <strong className="text-zinc-300">Require KYC</strong>,{" "}
                <strong className="text-zinc-300">Require Accreditation</strong>,{" "}
                <strong className="text-zinc-300">Max AML Risk</strong>, or edit{" "}
                <strong className="text-zinc-300">Blocked Jurisdictions</strong>. The verdict updates live.
              </p>

              <h3 className="text-sm font-semibold text-zinc-200 pt-2">Step 2 — Counterparty Profile (left, bottom)</h3>
              <p>Select a test scenario to simulate on-chain attestations for the demo subject wallet:</p>
              <Table
                headers={["Scenario", "What it tests"]}
                rows={[
                  ["Unverified wallet", "No attestations → should block when KYC required"],
                  ["Verified Singapore investor", "Clean profile → should allow under RWA policy"],
                  ["Lapsed KYC", "Expired KYC attestation → should block"],
                  ["Sanctioned region", "KP jurisdiction + high AML → should block"],
                  ["Underage holder", "Age 16 → should block when minAge is 18"],
                ]}
              />
              <p>
                You can edit attestation values, mark one as expired (EXP toggle), add new attestations, or
                delete rows to test edge cases.
              </p>

              <h3 className="text-sm font-semibold text-zinc-200 pt-2">Step 3 — Verdict &amp; tools (right)</h3>
              <p>
                The large card shows <strong className="text-emerald-400">ALLOW</strong> or{" "}
                <strong className="text-red-400">BLOCK</strong> with per-rule pass/fail detail. Scroll down to
                the <strong className="text-zinc-300">MCP Tool Playground</strong> and click any tool button to
                see the JSON an agent would receive:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <code className="text-emerald-400/90">verify_compliance</code> — read profile only
                </li>
                <li>
                  <code className="text-emerald-400/90">check_compliance_policy</code> — evaluate against current policy
                </li>
                <li>
                  <code className="text-emerald-400/90">gate_transfer</code> — pre-flight a transfer (uses demo subject + policy)
                </li>
                <li>
                  <code className="text-emerald-400/90">get_attestations</code> — raw attestation list
                </li>
              </ul>
              <p className="text-zinc-500">
                <strong className="text-zinc-400">Suggested judge flow:</strong> RWA policy + Verified Singapore → ALLOW.
                Switch to Sanctioned region → BLOCK. Switch to Lapsed KYC → BLOCK. Run{" "}
                <code className="text-zinc-400">gate_transfer</code> in the playground to see{" "}
                <code className="text-zinc-400">recommendedAction: &quot;block&quot;</code>.
              </p>
            </DocSection>

            <DocSection id="tools" title="Four agent tools">
              <Table
                headers={["Tool", "Purpose", "When to call"]}
                rows={[
                  [
                    "verify_compliance",
                    "Read KYC, AML, jurisdiction, age, accreditation",
                    "Before any action — understand the counterparty",
                  ],
                  [
                    "check_compliance_policy",
                    "Evaluate subject vs policy → allow/deny + reasons",
                    "Policy check without executing a transfer",
                  ],
                  [
                    "gate_transfer",
                    "Pre-flight transfer to a counterparty",
                    "Immediately before send — agent must respect block",
                  ],
                  [
                    "get_attestations",
                    "Raw on-chain attestation tuples",
                    "Audit / debugging / custom policy logic",
                  ],
                ]}
              />
              <p>
                When <code className="text-zinc-400">gate_transfer</code> returns{" "}
                <code className="text-zinc-400">recommendedAction: &quot;block&quot;</code>, the agent must not
                proceed with the transfer.
              </p>
            </DocSection>

            <DocSection id="policy" title="Policy fields">
              <Table
                headers={["Field", "Type", "Description"]}
                rows={[
                  ["requireKyc", "boolean", "Subject must have valid KYC attestation"],
                  ["requireAccreditation", "boolean", "Subject must be accredited investor"],
                  ["maxAmlRisk", "low | medium | high | severe", "Maximum acceptable AML risk band"],
                  ["allowedJurisdictions", "string[]", 'ISO codes e.g. ["US","SG"] — allowlist'],
                  ["blockedJurisdictions", "string[]", 'ISO codes e.g. ["KP","IR"] — blocklist'],
                  ["minAge", "number", "Minimum age in years"],
                  ["allowExpired", "boolean", "Treat expired attestations as valid (default false)"],
                ]}
              />
            </DocSection>

            <DocSection id="attestations" title="Attestation types">
              <p>On-chain <code className="text-zinc-400">AttestationRegistry</code> uses these enum values:</p>
              <Table
                headers={["Type", "Enum", "Example value"]}
                rows={[
                  ["KYC", "0", '"true"'],
                  ["AML risk", "1", '"low" | "medium" | "high" | "severe"'],
                  ["Accreditation", "2", '"true"'],
                  ["Jurisdiction", "3", '"SG" | "US"'],
                  ["Age", "4", '"34"'],
                ]}
              />
              <p>
                <code className="text-zinc-400">expiresAt = 0</code> means never expires. Revoked attestations are
                treated as invalid unless your policy says otherwise.
              </p>
            </DocSection>

            <DocSection id="install" title="Install & CLI">
              <Code>{`git clone https://github.com/Mistakili/Pharos-Agent-Arena
cd Pharos-Agent-Arena
pnpm install

# Run the CLI story (no chain or gas required)
pnpm --filter @workspace/compliance-gate run demo

# Run the web demo locally
pnpm --filter compliance-demo run dev`}</Code>
              <p>
                Pharos Testnet: RPC <code className="text-zinc-400">{PHAROS.rpcUrl}</code> · Explorer{" "}
                <a
                  href={PHAROS.explorer}
                  className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  {PHAROS.explorer}
                  <ExternalLink className="w-3 h-3" />
                </a>{" "}
                · Faucet{" "}
                <a
                  href="https://www.gas.zip/faucet/pharos"
                  className="text-emerald-500 hover:text-emerald-400"
                  target="_blank"
                  rel="noreferrer"
                >
                  gas.zip/faucet/pharos
                </a>
              </p>
            </DocSection>

            <DocSection id="integrate" title="Agent integration">
              <h3 className="text-sm font-semibold text-zinc-200">Core TypeScript</h3>
              <Code>{`import {
  ComplianceGate,
  createOnChainRegistry,
} from "@workspace/compliance-gate";

const registry = createOnChainRegistry({ contractAddress: "0xYourRegistry" });
const gate = new ComplianceGate(registry);

const { decision, result } = await gate.gate(
  recipient,
  {
    requireKyc: true,
    maxAmlRisk: "medium",
    allowedJurisdictions: ["US", "SG"],
    minAge: 18,
  },
  async () => agentKit.transfer(recipient, amount),
);

if (!decision.allowed) console.log("Blocked:", decision.reasons);`}</Code>

              <h3 className="text-sm font-semibold text-zinc-200 pt-2">MCP tools</h3>
              <Code>{`import { createComplianceSkills } from "@workspace/compliance-gate/skills";
import { toMcpTools, callMcpTool } from "@workspace/compliance-gate/skills/mcp";

const skills = createComplianceSkills(gate);
// Expose toMcpTools(skills) via your MCP server's tools/list handler
// Route calls through callMcpTool(skills, name, args)`}</Code>

              <h3 className="text-sm font-semibold text-zinc-200 pt-2">LangChain &amp; Vercel AI SDK</h3>
              <Code>{`import { createComplianceSkills, toLangChainTools, toVercelAiTools } from "@workspace/compliance-gate/skills";

const skills = createComplianceSkills(gate);
const langchainTools = toLangChainTools(skills, { DynamicStructuredTool });
const vercelTools    = toVercelAiTools(skills);`}</Code>
              <p>
                Full adapter examples are on the demo homepage under the integration tabs. Agent entry point:{" "}
                <code className="text-zinc-400">lib/compliance-gate/SKILL.md</code>
              </p>
            </DocSection>

            <DocSection id="onchain" title="On-chain deploy">
              <p>Deploy the attestation registry to Pharos Testnet (requires a funded wallet):</p>
              <Code>{`export DEPLOYER_PRIVATE_KEY=0x...
export PHAROS_RPC_URL=https://testnet.dplabs-internal.com
pnpm --filter @workspace/compliance-gate run deploy`}</Code>
              <p>Read attestations with Foundry cast:</p>
              <Code>{`export RPC=https://testnet.dplabs-internal.com
export REGISTRY=0xYourDeployedRegistry
export SUBJECT=0xCounterpartyAddress

cast call $REGISTRY "getAttestationCount(address)(uint256)" $SUBJECT --rpc-url $RPC

cast call $REGISTRY \\
  "getAttestations(address)((uint8,address,string,uint64,uint64,bool)[])" \\
  $SUBJECT --rpc-url $RPC`}</Code>
              <p>
                Complete cast templates, issue/revoke flows, and error handling:{" "}
                <code className="text-zinc-400">lib/compliance-gate/references/compliance.md</code>
              </p>
            </DocSection>

            <DocSection id="files" title="Repo layout">
              <Code>{`lib/compliance-gate/
├── SKILL.md              ← Pharos Skill entry (agents read this)
├── README.md             ← Human developer docs
├── assets/networks.json  ← RPC, chainId, explorer
├── references/compliance.md
├── contracts/AttestationRegistry.sol
└── src/                  ← Gate, policy engine, framework adapters

artifacts/compliance-demo/  ← This live UI + /docs
`}</Code>
              <p className="flex flex-wrap gap-4 pt-2">
                <a
                  href="https://github.com/Mistakili/Pharos-Agent-Arena"
                  className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub repository
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link href="/" className="text-emerald-500 hover:text-emerald-400">
                  Live demo →
                </Link>
                <a
                  href="https://github.com/Mistakili/Pharos-Agent-Arena/blob/master/lib/compliance-gate/SKILL.md"
                  className="text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  SKILL.md
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </p>
            </DocSection>

            <p className="text-center text-xs text-zinc-600 font-mono pt-4 border-t border-zinc-900">
              Compliance Gate · Pharos Skill-to-Agent Dual Cascade Hackathon 2026 · Built by Mistakili
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}