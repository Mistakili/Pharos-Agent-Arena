import { useState, useMemo } from "react";
import {
  evaluate,
  buildScenarios,
  POLICY_PRESETS,
  nowSeconds,
  makeDraft,
  type AttestationDraft,
  type CompliancePolicy,
  type AttestationType,
} from "@/engine/compliance";

export function useCompliance() {
  const [scenarios] = useState(buildScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id);
  const [drafts, setDrafts] = useState<AttestationDraft[]>(scenarios[0].drafts);
  
  const [activePolicyId, setActivePolicyId] = useState(POLICY_PRESETS[0].id);
  const [policyOverrides, setPolicyOverrides] = useState<Partial<CompliancePolicy>>({});
  
  const basePolicy = useMemo(() => {
    return POLICY_PRESETS.find((p) => p.id === activePolicyId)?.policy || POLICY_PRESETS[0].policy;
  }, [activePolicyId]);
  
  const policy: CompliancePolicy = useMemo(() => {
    return { ...basePolicy, ...policyOverrides };
  }, [basePolicy, policyOverrides]);
  
  const evaluation = useMemo(() => {
    return evaluate(drafts, policy, nowSeconds());
  }, [drafts, policy]);

  const setScenario = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    if (s) {
      setActiveScenarioId(id);
      setDrafts(s.drafts);
    }
  };

  const setPolicy = (id: string) => {
    setActivePolicyId(id);
    setPolicyOverrides({});
  };
  
  const updatePolicyField = <K extends keyof CompliancePolicy>(field: K, value: CompliancePolicy[K]) => {
    setPolicyOverrides(prev => ({ ...prev, [field]: value }));
  };

  const addDraft = (type: AttestationType, value: string) => {
    setDrafts(prev => [...prev, makeDraft(type, value)]);
  };

  const updateDraft = (id: string, updates: Partial<AttestationDraft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const removeDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  return {
    scenarios,
    activeScenarioId,
    setScenario,
    drafts,
    setDrafts,
    addDraft,
    updateDraft,
    removeDraft,
    policyPresets: POLICY_PRESETS,
    activePolicyId,
    setPolicy,
    policy,
    updatePolicyField,
    evaluation,
  };
}
