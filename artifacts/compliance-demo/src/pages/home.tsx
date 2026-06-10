import { useState, useRef, useEffect } from "react";
import { useCompliance } from "@/hooks/use-compliance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  callAgentTool, 
  listAgentTools, 
  SUBJECT, 
  PHAROS,
  ATTESTATION_LABELS,
  ATTESTATION_VALUE_HINTS,
  type AttestationType,
  type RiskLevel,
} from "@/engine/compliance";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Trash2, Plus, ArrowRightLeft, TerminalSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const {
    scenarios,
    activeScenarioId,
    setScenario,
    drafts,
    addDraft,
    updateDraft,
    removeDraft,
    policyPresets,
    activePolicyId,
    setPolicy,
    policy,
    updatePolicyField,
    evaluation
  } = useCompliance();
  
  const { decision, profile } = evaluation;

  const [toolResult, setToolResult] = useState<any>(null);
  const [loadingTool, setLoadingTool] = useState(false);
  
  const handleToolCall = async (toolName: string) => {
    setLoadingTool(true);
    setToolResult(null);
    try {
      let args: any;
      if (toolName === "gate_transfer") {
        args = { to: SUBJECT, amount: "1000", token: "USDC", ...policy };
      } else if (toolName === "check_compliance_policy") {
        args = { subject: SUBJECT, ...policy };
      } else {
        args = { subject: SUBJECT };
      }
      const res = await callAgentTool(drafts, toolName, args);
      setToolResult(res);
    } catch (err) {
      setToolResult({
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingTool(false);
    }
  };

  const isAllowed = decision.allowed;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Network Header */}
      <div className="bg-zinc-950 border-b border-zinc-900 py-2 px-6 flex justify-between items-center text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {PHAROS.name}
          </div>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-500 hidden sm:inline">Chain ID: {PHAROS.chainId}</span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-500 hidden sm:inline">RPC: {PHAROS.rpcUrl}</span>
        </div>
        <div className="text-zinc-500 flex items-center gap-2">
          <span>SUBJECT:</span>
          <span className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded">{SUBJECT.slice(0,6)}...{SUBJECT.slice(-4)}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Title */}
        <header className="py-6 sm:py-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Text side */}
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">Compliance Gate</h1>
            <p className="text-lg text-zinc-400 max-w-2xl">
              A reusable, drop-in compliance skill for AI agents. Declare a policy once, call the skill, and get an explainable allow/deny decision — KYC, AML, jurisdiction, and age, all in one.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-zinc-500">
              <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">LangChain</span>
              <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">Vercel AI SDK</span>
              <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">MCP</span>
              <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-emerald-500/80">Pharos Testnet</span>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:gap-4 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">1</span>
                <span className="text-zinc-400"><span className="text-zinc-200 font-medium">Configure the skill's policy</span> — left, top</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">2</span>
                <span className="text-zinc-400"><span className="text-zinc-200 font-medium">Choose a test subject</span> — left, bottom</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">3</span>
                <span className="text-zinc-400"><span className="text-zinc-200 font-medium">See what the skill returns</span> — right, live</span>
              </div>
            </div>
          </div>
          {/* Hero image */}
          <div className="shrink-0 hidden lg:block w-72 xl:w-80">
            <img
              src="/hero.png"
              alt="Compliance Gate — networked shield visualization"
              className="w-full rounded-2xl opacity-90 shadow-[0_0_60px_-10px_rgba(16,185,129,0.35)]"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Config */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* POLICY */}
            <Card className="bg-zinc-950/50 border-zinc-800/50 shadow-2xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400">Step 1</Badge>
                </div>
                <CardTitle className="text-xl text-white">Agent Policy</CardTitle>
                <CardDescription className="text-zinc-400">The skill's policy — an agent declares this once at deployment. Toggle constraints to see how the skill adapts its decision in real time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Select value={activePolicyId} onValueChange={setPolicy}>
                  <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-800 text-white">
                    <SelectValue placeholder="Select Policy" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {policyPresets.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between group">
                    <Label className="text-zinc-300 group-hover:text-white transition-colors">Require KYC</Label>
                    <Switch 
                      checked={!!policy.requireKyc} 
                      onCheckedChange={(v) => updatePolicyField("requireKyc", v)} 
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between group">
                    <Label className="text-zinc-300 group-hover:text-white transition-colors">Require Accreditation</Label>
                    <Switch 
                      checked={!!policy.requireAccreditation} 
                      onCheckedChange={(v) => updatePolicyField("requireAccreditation", v)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Max AML Risk</Label>
                    <Select 
                      value={policy.maxAmlRisk || "severe"} 
                      onValueChange={(v) => updatePolicyField("maxAmlRisk", v as RiskLevel)}
                    >
                      <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-800 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {["low", "medium", "high", "severe"].map(r => (
                          <SelectItem key={r} value={r} className="capitalize text-zinc-300">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Blocked Jurisdictions (comma separated)</Label>
                    <Input 
                      value={(policy.blockedJurisdictions || []).join(", ")}
                      onChange={(e) => updatePolicyField("blockedJurisdictions", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. KP, IR, SY"
                      className="bg-zinc-900/50 border-zinc-800 font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ATTESTATIONS */}
            <Card className="bg-zinc-950/50 border-zinc-800/50 shadow-2xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400">Step 2</Badge>
                </div>
                <CardTitle className="text-xl text-white">Counterparty Profile</CardTitle>
                <CardDescription className="text-zinc-400">The test subject — credentials this wallet holds on-chain. Swap scenarios to prove the skill correctly gates each case.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Select value={activeScenarioId} onValueChange={setScenario}>
                  <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-800 text-white">
                    <SelectValue placeholder="Select Scenario" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {scenarios.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-zinc-200 focus:bg-zinc-800 focus:text-white">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-3 pt-2">
                  <AnimatePresence initial={false}>
                    {drafts.map(d => (
                      <motion.div 
                        key={d.id}
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 group overflow-hidden"
                      >
                        <div className="w-1/3 font-mono text-xs text-zinc-400 truncate">
                          {ATTESTATION_LABELS[d.type]}
                        </div>
                        <div className="w-1/3">
                          <Input 
                            value={d.value}
                            onChange={(e) => updateDraft(d.id, { value: e.target.value })}
                            className="h-8 bg-zinc-950/50 border-zinc-800 text-xs font-mono text-emerald-400 focus-visible:ring-emerald-500/30"
                          />
                        </div>
                        <div className="w-1/3 flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1.5" title="Expired?">
                            <Switch 
                              checked={d.expiresInDays === -1}
                              onCheckedChange={(v) => updateDraft(d.id, { expiresInDays: v ? -1 : null })}
                              className="scale-75 data-[state=checked]:bg-amber-500"
                            />
                            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">EXP</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeDraft(d.id)}
                            className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-2">
                    <Select onValueChange={(v) => addDraft(v as AttestationType, "true")}>
                      <SelectTrigger className="w-full bg-zinc-900/30 border-zinc-800 border-dashed text-zinc-400 hover:text-zinc-300">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Attestation
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {Object.entries(ATTESTATION_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-zinc-300">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Verdict & Tooling */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            
            {/* VERDICT CARD */}
            <motion.div 
              layout
              className={`flex-1 rounded-xl border p-6 sm:p-10 flex flex-col justify-center relative overflow-hidden transition-colors duration-700 ${
                isAllowed 
                  ? 'bg-emerald-950/10 border-emerald-900/30 shadow-[0_0_80px_-20px_rgba(16,185,129,0.15)]' 
                  : 'bg-red-950/10 border-red-900/30 shadow-[0_0_80px_-20px_rgba(239,68,68,0.15)]'
              }`}
            >
              {/* Background ambient glow */}
              <div className={`absolute inset-0 opacity-20 transition-colors duration-700 ${
                isAllowed ? 'bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.4)_0%,transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.4)_0%,transparent_70%)]'
              }`} />

              <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center justify-between h-full">
                
                {/* BIG VERDICT */}
                <div className="text-center lg:text-left flex-1 flex flex-col items-center lg:items-start justify-center">
                  <div className="text-sm font-mono text-zinc-500 mb-2 tracking-widest uppercase">SKILL DECISION</div>
                  <div className="text-xs text-zinc-500 mb-6 max-w-xs">What the skill returns to the calling agent. <span className="text-emerald-500/80">ALLOW</span> = all policy checks passed, <span className="text-red-500/80">BLOCK</span> = at least one failed.</div>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={isAllowed ? 'allow' : 'block'}
                      initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
                      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                      exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-none ${
                        isAllowed ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {isAllowed ? 'ALLOW' : 'BLOCK'}
                    </motion.div>
                  </AnimatePresence>
                  
                  <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm font-mono">
                    <div className="px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400">
                      Transfer 1000 USDC
                    </div>
                    <ArrowRightLeft className={`w-4 h-4 ${isAllowed ? 'text-emerald-500' : 'text-red-500'}`} />
                    <div className="px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400">
                      {SUBJECT.slice(0,6)}...{SUBJECT.slice(-4)}
                    </div>
                  </div>
                </div>

                {/* DETAILED CHECKS */}
                <div className="w-full lg:w-[320px] shrink-0 bg-black/40 border border-zinc-800/50 rounded-lg p-5 backdrop-blur-md">
                  <div className="text-xs font-mono text-zinc-500 mb-1 tracking-wider">POLICY CHECKS</div>
                  <div className="text-[11px] text-zinc-600 mb-4 leading-tight">Each rule, checked one by one. ✓ = met, ✗ = missing.</div>
                  <div className="space-y-3">
                    {decision.checks.map((check, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="mt-0.5 shrink-0">
                          {check.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-zinc-200 leading-none">{check.name}</div>
                          <div className="text-xs text-zinc-500 leading-tight">{check.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isAllowed && decision.reasons.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-red-900/30">
                      <div className="text-xs font-mono text-red-400/70 mb-2 tracking-wider">FAILURE REASONS</div>
                      <ul className="space-y-1.5">
                        {decision.reasons.map((r, i) => (
                          <li key={i} className="text-xs text-red-400 flex items-start gap-2">
                            <span className="text-red-500/50 mt-0.5">-</span>
                            <span className="leading-tight">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* AGENT TOOL SIMULATION */}
            <Card className="bg-[#0f0f0f] border-zinc-800/50 shadow-xl mt-auto">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="w-5 h-5 text-zinc-400" />
                  <CardTitle className="text-lg text-white">Agent MCP Tools</CardTitle>
                </div>
                <CardDescription className="text-zinc-400">
                  The skill's real interface. These are the exact tools any agent calls — in LangChain, Vercel AI SDK, or MCP. Click one to run it live against the current inputs and see exactly what the agent receives back.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap mb-6">
                  {listAgentTools().map(t => (
                    <Button 
                      key={t.name}
                      variant="outline"
                      size="sm"
                      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-300 font-mono text-xs transition-all h-8"
                      onClick={() => handleToolCall(t.name)}
                      disabled={loadingTool}
                    >
                      <span className="text-emerald-500 mr-1">λ</span> {t.name}
                    </Button>
                  ))}
                </div>
                
                <div className="bg-black border border-zinc-800/80 rounded-lg overflow-hidden flex flex-col min-h-[250px]">
                  <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800/80 flex justify-between items-center text-xs font-mono text-zinc-500">
                    <span>Terminal Output</span>
                    {loadingTool && <span className="animate-pulse text-emerald-500">Executing...</span>}
                  </div>
                  <div className="p-4 overflow-auto text-xs font-mono max-h-[400px]">
                    <AnimatePresence mode="wait">
                      {toolResult ? (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <div>
                            <span className="text-emerald-500">→</span> <span className="text-zinc-400">Call Tool:</span> <span className="text-blue-400">{toolResult.tool}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Request:</span>
                            <pre className="mt-1 text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-900">
                              {JSON.stringify(toolResult.request, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-zinc-500">Response:</span>
                            <pre className="mt-1 text-emerald-400/90 bg-zinc-950 p-3 rounded border border-zinc-900 whitespace-pre-wrap">
                              {JSON.stringify(toolResult.response, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-zinc-600 h-full flex items-center justify-center py-12 italic"
                        >
                          Select a tool above to execute
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
