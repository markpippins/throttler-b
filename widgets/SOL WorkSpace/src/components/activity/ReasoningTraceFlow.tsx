import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  Database, 
  Layers, 
  GitMerge, 
  Sliders, 
  Play, 
  Pause, 
  RotateCcw, 
  Info, 
  Filter, 
  ChevronRight, 
  Flame, 
  ShieldCheck, 
  ShieldAlert, 
  Table as TableIcon, 
  GitBranch, 
  Search,
  ExternalLink,
  Code2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { 
  Disposition, 
  Severity, 
  RuleType, 
  EvaluationResult, 
  Proposition, 
  Entity, 
  Concept, 
  Rule, 
  Fact,
  FrameContext,
  ProvenanceType
} from '../../types/sol';

export type FlowViewMode = 'dag' | 'stepper' | 'matrix';
export type FlowFilterMode = 'all' | 'violations' | 'passed' | 'facts';

interface FactNodeData {
  id: string;
  name: string;
  value: any;
  kind: 'attribute' | 'eav' | 'fact' | 'frame';
  dataType: string;
  source: string;
  provenance: ProvenanceType;
  status: 'valid' | 'invalid' | 'warning' | 'neutral';
  targetRules: string[];
}

interface ConstraintNodeData {
  id: string;
  name: string;
  type: 'rule' | 'pattern';
  ruleType?: RuleType;
  severity: Severity;
  passed: boolean;
  reason: string;
  inputs: Record<string, any>;
  expressionTrace?: string;
  priority?: number;
  inputFactKeys: string[];
}

interface InferenceNodeData {
  step: number;
  rule: string;
  premises: string[];
  conclusion: string;
  confidence: number;
}

export const ReasoningTraceFlow: React.FC<{
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}> = ({ isExpanded = false, onToggleExpand }) => {
  const {
    activeEvaluation,
    runEvaluation,
    selectById,
    sendToRepl,
    frameContext,
    updateFrameContext
  } = useWorkbench();

  const [selectedPropId, setSelectedPropId] = useState<string>(() => 
    activeEvaluation?.proposition_id || solEngine.propositions[0]?.id || 'prop-host01-prod-compute'
  );

  const [viewMode, setViewMode] = useState<FlowViewMode>('dag');
  const [filterMode, setFilterMode] = useState<FlowFilterMode>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<'fact' | 'constraint' | 'inference' | 'outcome' | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Stepper state
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Live Frame context overrides in flow
  const [simEnv, setSimEnv] = useState<string>(frameContext.environment || 'prod');
  const [simJur, setSimJur] = useState<string>(frameContext.jurisdiction || 'US');
  const [simSec, setSimSec] = useState<string>(frameContext.security_tier || 'high');

  // Keep selected prop synced if activeEvaluation changes externally
  useEffect(() => {
    if (activeEvaluation && activeEvaluation.proposition_id !== selectedPropId) {
      setSelectedPropId(activeEvaluation.proposition_id);
    }
  }, [activeEvaluation]);

  // Retrieve current Proposition, Subject Entity, Target Concept, Rules & Facts
  const currentProp: Proposition | undefined = useMemo(() => {
    return solEngine.propositions.find(p => p.id === selectedPropId);
  }, [selectedPropId]);

  const subjectEntity: Entity | undefined = useMemo(() => {
    if (!currentProp) return undefined;
    return solEngine.entities.find(e => e.id === currentProp.subject_entity_id);
  }, [currentProp]);

  const targetConcept: Concept | undefined = useMemo(() => {
    if (!currentProp) return undefined;
    return solEngine.concepts[currentProp.asset_concept_id];
  }, [currentProp]);

  // Current Evaluation for selected proposition
  const evalResult: EvaluationResult = useMemo(() => {
    if (activeEvaluation && activeEvaluation.proposition_id === selectedPropId) {
      return activeEvaluation;
    }
    try {
      return solEngine.evaluateProposition(selectedPropId, {
        environment: simEnv as any,
        jurisdiction: simJur as any,
        security_tier: simSec as any
      });
    } catch {
      return {
        proposition_id: selectedPropId,
        title: currentProp?.title || 'Unknown Proposition',
        disposition: Disposition.Pending,
        all_passed: false,
        context_status: 'scoped',
        evaluation_time_ms: 0,
        database_eval_status: 'resolution_scan',
        rules_evaluated: [],
        pre_llm_patterns: [],
        inference_required: false,
        fallback_to_llm: false,
        confidence_score: 0,
        provenance: 'evaluated'
      };
    }
  }, [selectedPropId, activeEvaluation, simEnv, simJur, simSec, currentProp]);

  // 1. Build Ingested Fact Nodes (Input Stage)
  const factNodes: FactNodeData[] = useMemo(() => {
    if (!subjectEntity) return [];

    const nodes: FactNodeData[] = [];
    const entityAttrs = subjectEntity.attributes || {};

    // Map attributes that are used in rules or relevant
    Object.entries(entityAttrs).forEach(([key, val]) => {
      let status: FactNodeData['status'] = 'valid';
      if (typeof val === 'number' && val < 0 && key.includes('uptime')) {
        status = 'invalid';
      } else if (key === 'status' && (val === 'DEGRADED' || val === 'FAILED')) {
        status = 'warning';
      }

      // Check which rules target this attribute
      const targetRules: string[] = [];
      evalResult.rules_evaluated.forEach(r => {
        if (r.inputs && key in r.inputs) {
          targetRules.push(r.rule_id);
        }
      });

      nodes.push({
        id: `fact-attr-${key}`,
        name: key,
        value: val,
        kind: 'attribute',
        dataType: typeof val === 'number' ? (Number.isInteger(val) ? 'Integer' : 'Float') : typeof val === 'boolean' ? 'Boolean' : 'String',
        source: `Entity[${subjectEntity.external_id}]`,
        provenance: 'concrete',
        status,
        targetRules
      });
    });

    // Add EAV attributes if present
    if (subjectEntity.eav_attributes) {
      Object.entries(subjectEntity.eav_attributes).forEach(([key, val]) => {
        nodes.push({
          id: `fact-eav-${key}`,
          name: key,
          value: val,
          kind: 'eav',
          dataType: typeof val === 'number' ? 'Double' : 'String/JSONB',
          source: `Shrapnel EAV [Object:${subjectEntity.shrapnel_object_id || 41}]`,
          provenance: 'eav',
          status: key.includes('error') ? 'invalid' : 'neutral',
          targetRules: []
        });
      });
    }

    // Add Relational Facts for this entity
    const relFacts = solEngine.facts.filter(f => f.entity_id === subjectEntity.id);
    relFacts.forEach(f => {
      nodes.push({
        id: `fact-rel-${f.id}`,
        name: f.predicate,
        value: f.target_id_or_value,
        kind: 'fact',
        dataType: 'Relationship/Fact',
        source: f.source,
        provenance: f.provenance,
        status: 'valid',
        targetRules: []
      });
    });

    // Add Frame Context Dimensions
    nodes.push({
      id: 'fact-frame-env',
      name: 'frame.environment',
      value: simEnv,
      kind: 'frame',
      dataType: 'Dimension',
      source: 'Frame Context Scope',
      provenance: 'semantic',
      status: 'neutral',
      targetRules: []
    });

    nodes.push({
      id: 'fact-frame-jur',
      name: 'frame.jurisdiction',
      value: simJur,
      kind: 'frame',
      dataType: 'Dimension',
      source: 'Regulatory Jurisdiction',
      provenance: 'semantic',
      status: 'neutral',
      targetRules: []
    });

    return nodes;
  }, [subjectEntity, evalResult, simEnv, simJur]);

  // 2. Build Constraint & Pattern Nodes (Gating / Evaluation Stage)
  const constraintNodes: ConstraintNodeData[] = useMemo(() => {
    const list: ConstraintNodeData[] = [];

    // Pre-LLM Deterministic Pattern Guards
    (evalResult.pre_llm_patterns || []).forEach(p => {
      // Find relevant fact keys
      const inputFactKeys: string[] = [];
      if (p.pattern_id === 'range_validation' || p.pattern_id === 'consistency_constraints') {
        inputFactKeys.push('fact-attr-cores', 'fact-attr-uptime_s');
      } else if (p.pattern_id === 'temporal_consistency') {
        inputFactKeys.push('fact-attr-due_date', 'fact-attr-created_at');
      } else if (p.pattern_id === 'enum_validation') {
        inputFactKeys.push('fact-attr-status', 'fact-attr-classification');
      }

      list.push({
        id: `pattern-${p.pattern_id}`,
        name: p.pattern_name,
        type: 'pattern',
        severity: Severity.HARD,
        passed: p.passed,
        reason: p.details,
        inputs: p.findings || {},
        priority: p.priority,
        inputFactKeys
      });
    });

    // Invariant and Assertion Rules
    (evalResult.rules_evaluated || []).forEach(r => {
      const inputFactKeys = Object.keys(r.inputs || {}).map(k => `fact-attr-${k}`);
      list.push({
        id: r.rule_id,
        name: r.rule_name,
        type: 'rule',
        ruleType: r.rule_type,
        severity: r.severity,
        passed: r.passed,
        reason: r.reason,
        inputs: r.inputs || {},
        expressionTrace: r.expression_trace || (r.passed ? 'ASSERTION_TRUE' : 'ASSERTION_VIOLATED'),
        inputFactKeys
      });
    });

    return list;
  }, [evalResult]);

  // 3. Build Inference Chaining Nodes (Deduction Stage)
  const inferenceNodes: InferenceNodeData[] = useMemo(() => {
    if (evalResult.inference_chain && evalResult.inference_chain.length > 0) {
      return evalResult.inference_chain;
    }

    if (subjectEntity) {
      const reasonData = solEngine.reasonEntity(subjectEntity.id, {
        environment: simEnv as any,
        jurisdiction: simJur as any
      });
      return reasonData.inferences.map((inf, idx) => ({
        step: idx + 1,
        rule: inf.predicate,
        premises: [`${subjectEntity.external_id} attributes evaluated`],
        conclusion: `${inf.predicate} -> ${JSON.stringify(inf.value)}`,
        confidence: inf.confidence
      }));
    }

    return [
      {
        step: 1,
        rule: 'Deterministic Resolution Matrix',
        premises: ['Facts ingested from concrete store & frame dimensions'],
        conclusion: evalResult.all_passed ? 'All invariants satisfied' : 'Violation detected in constraint checks',
        confidence: evalResult.confidence_score
      }
    ];
  }, [evalResult, subjectEntity, simEnv, simJur]);

  // Stepper automated playback
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep(prev => {
          if (prev >= 4) {
            setIsPlaying(false);
            return 4;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Handle re-evaluating with custom frame context
  const handleReevaluate = (newEnv = simEnv, newJur = simJur, newSec = simSec) => {
    setSimEnv(newEnv);
    setSimJur(newJur);
    setSimSec(newSec);
    updateFrameContext({
      environment: newEnv as any,
      jurisdiction: newJur as any,
      security_tier: newSec as any
    });
    runEvaluation(selectedPropId, {
      environment: newEnv as any,
      jurisdiction: newJur as any,
      security_tier: newSec as any
    });
  };

  // Filtered nodes
  const visibleFacts = useMemo(() => {
    if (filterMode === 'violations') return factNodes.filter(f => f.status === 'invalid' || f.status === 'warning');
    if (filterMode === 'passed') return factNodes.filter(f => f.status === 'valid');
    return factNodes;
  }, [factNodes, filterMode]);

  const visibleConstraints = useMemo(() => {
    if (filterMode === 'violations') return constraintNodes.filter(c => !c.passed);
    if (filterMode === 'passed') return constraintNodes.filter(c => c.passed);
    if (filterMode === 'facts') return [];
    return constraintNodes;
  }, [constraintNodes, filterMode]);

  // Helper to check if a fact and constraint are linked
  const isLinked = (factId: string, constraintId: string) => {
    const constraint = constraintNodes.find(c => c.id === constraintId);
    if (!constraint) return false;
    return constraint.inputFactKeys.includes(factId);
  };

  const isFactHighlighted = (factId: string) => {
    if (hoveredNodeId === factId) return true;
    if (selectedNodeId === factId) return true;
    if (hoveredNodeId) {
      return isLinked(factId, hoveredNodeId);
    }
    if (selectedNodeId) {
      return isLinked(factId, selectedNodeId);
    }
    return false;
  };

  const isConstraintHighlighted = (constraintId: string) => {
    if (hoveredNodeId === constraintId) return true;
    if (selectedNodeId === constraintId) return true;
    if (hoveredNodeId) {
      return isLinked(hoveredNodeId, constraintId);
    }
    if (selectedNodeId) {
      return isLinked(selectedNodeId, constraintId);
    }
    return false;
  };

  // Selected item detail payload
  const selectedFact = factNodes.find(f => f.id === selectedNodeId);
  const selectedConstraint = constraintNodes.find(c => c.id === selectedNodeId);
  const selectedInference = inferenceNodes.find((_, idx) => `inf-${idx}` === selectedNodeId);

  return (
    <div
      id="reasoning-trace-flow-container"
      className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)] font-mono text-xs select-none"
    >
      {/* 1. Reasoning Trace Control Toolbar */}
      <div className="h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 flex items-center justify-between shrink-0 gap-2 flex-wrap">
        
        {/* Left: Proposition Quick-Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold">
            <Activity className="w-4 h-4 shrink-0" />
            <span className="text-[11px] uppercase tracking-wider hidden sm:inline">Reasoning Trace:</span>
          </div>

          <select
            id="flow-prop-selector"
            value={selectedPropId}
            onChange={e => {
              const newId = e.target.value;
              setSelectedPropId(newId);
              runEvaluation(newId, {
                environment: simEnv as any,
                jurisdiction: simJur as any,
                security_tier: simSec as any
              });
            }}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-primary)] font-bold focus:outline-hidden max-w-[280px] truncate"
          >
            {solEngine.propositions.map(p => (
              <option key={p.id} value={p.id}>
                {p.disposition === Disposition.Asserted ? '🟢' : p.disposition === Disposition.Rejected ? '🔴' : '🟡'} {p.title}
              </option>
            ))}
          </select>

          {currentProp && (
            <ProvenanceBadge provenance={currentProp.provenance} size="sm" />
          )}
        </div>

        {/* Center: View Modes & Filters */}
        <div className="flex items-center gap-1.5">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-[var(--bg-tertiary)] p-0.5 rounded border border-[var(--border-subtle)]">
            <button
              id="flow-view-dag-btn"
              onClick={() => setViewMode('dag')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'dag'
                  ? 'bg-[var(--bg-elevated)] text-sky-400 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="Interactive DAG Wire Flow"
            >
              <GitBranch className="w-3 h-3" />
              <span>DAG Flow</span>
            </button>

            <button
              id="flow-view-stepper-btn"
              onClick={() => setViewMode('stepper')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'stepper'
                  ? 'bg-[var(--bg-elevated)] text-sky-400 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="Chronological Step Playback"
            >
              <Layers className="w-3 h-3" />
              <span>Stepper</span>
            </button>

            <button
              id="flow-view-matrix-btn"
              onClick={() => setViewMode('matrix')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'matrix'
                  ? 'bg-[var(--bg-elevated)] text-sky-400 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
              title="Truth & Constraint Matrix"
            >
              <TableIcon className="w-3 h-3" />
              <span>Truth Matrix</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-[var(--bg-tertiary)] p-0.5 rounded border border-[var(--border-subtle)]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                filterMode === 'all' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('violations')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                filterMode === 'violations' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800' : 'text-[var(--text-muted)]'
              }`}
            >
              Violations
            </button>
            <button
              onClick={() => setFilterMode('passed')}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                filterMode === 'passed' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-[var(--text-muted)]'
              }`}
            >
              Passed
            </button>
          </div>
        </div>

        {/* Right: Live Frame Simulator Toggles & Expand */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border-subtle)] text-[10px]">
            <Sliders className="w-3 h-3 text-sky-400" />
            <span className="text-[var(--text-muted)]">Env:</span>
            <select
              value={simEnv}
              onChange={e => handleReevaluate(e.target.value, simJur, simSec)}
              className="bg-transparent text-sky-300 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="prod" className="bg-[var(--bg-primary)]">prod</option>
              <option value="staging" className="bg-[var(--bg-primary)]">staging</option>
              <option value="dev" className="bg-[var(--bg-primary)]">dev</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded border border-[var(--border-subtle)] text-[10px]">
            <span className="text-[var(--text-muted)]">Jur:</span>
            <select
              value={simJur}
              onChange={e => handleReevaluate(simEnv, e.target.value, simSec)}
              className="bg-transparent text-indigo-300 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="US" className="bg-[var(--bg-primary)]">US</option>
              <option value="EU" className="bg-[var(--bg-primary)]">EU</option>
              <option value="GLOBAL" className="bg-[var(--bg-primary)]">GLOBAL</option>
            </select>
          </div>

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              title={isExpanded ? 'Collapse Height' : 'Expand Flow View'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Visual Canvas Body */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* VIEW MODE A: INTERACTIVE DAG WIRE FLOW */}
        {viewMode === 'dag' && (
          <div className="flex-1 flex flex-col overflow-x-auto overflow-y-auto p-4 relative graph-grid-pattern">
            
            {/* Flow Stage Headers */}
            <div className="grid grid-cols-4 gap-4 min-w-[900px] mb-3">
              <div className="flex items-center justify-between pb-1 border-b border-indigo-500/30 text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1. Facts & Premises ({visibleFacts.length})</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">Inputs</span>
              </div>

              <div className="flex items-center justify-between pb-1 border-b border-sky-500/30 text-sky-300 font-bold text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>2. Constraints & Rules ({visibleConstraints.length})</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">Evaluation Gate</span>
              </div>

              <div className="flex items-center justify-between pb-1 border-b border-amber-500/30 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. Deductions & Inferences ({inferenceNodes.length})</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">Chaining</span>
              </div>

              <div className="flex items-center justify-between pb-1 border-b border-emerald-500/30 text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. Final Disposition</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">Outcome</span>
              </div>
            </div>

            {/* Visual Node Columns */}
            <div className="grid grid-cols-4 gap-4 min-w-[900px] flex-1 items-start">
              
              {/* COLUMN 1: FACTS & PREMISES */}
              <div className="space-y-2">
                {visibleFacts.map(fact => {
                  const isHighlighted = isFactHighlighted(fact.id);
                  const isSelected = selectedNodeId === fact.id;

                  return (
                    <div
                      key={fact.id}
                      id={`node-${fact.id}`}
                      onMouseEnter={() => setHoveredNodeId(fact.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => {
                        setSelectedNodeId(fact.id);
                        setSelectedNodeType('fact');
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-[var(--bg-elevated)] border-sky-400 ring-1 ring-sky-400/40 shadow-lg'
                          : isHighlighted
                          ? 'bg-[var(--bg-elevated)] border-indigo-400/80 shadow-md'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {fact.kind === 'attribute' && <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
                          {fact.kind === 'eav' && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                          {fact.kind === 'fact' && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                          {fact.kind === 'frame' && <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />}
                          <span className="font-bold text-[var(--text-primary)] text-[11px] truncate">
                            {fact.name}
                          </span>
                        </div>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-muted)] uppercase shrink-0">
                          {fact.kind}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-code">
                        <span className="text-sky-300 font-semibold truncate">
                          {typeof fact.value === 'object' ? JSON.stringify(fact.value) : String(fact.value)}
                        </span>
                        {fact.status === 'invalid' && (
                          <span className="text-rose-400 font-bold text-[9px] px-1 bg-rose-950/80 border border-rose-800 rounded">
                            VIOLATION
                          </span>
                        )}
                        {fact.status === 'warning' && (
                          <span className="text-amber-400 font-bold text-[9px] px-1 bg-amber-950/80 border border-amber-800 rounded">
                            DEGRADED
                          </span>
                        )}
                      </div>

                      <div className="text-[9px] text-[var(--text-muted)] mt-1 flex items-center justify-between">
                        <span className="truncate">{fact.source}</span>
                        <span>{fact.dataType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COLUMN 2: CONSTRAINTS & RULES */}
              <div className="space-y-2">
                {visibleConstraints.map(constraint => {
                  const isHighlighted = isConstraintHighlighted(constraint.id);
                  const isSelected = selectedNodeId === constraint.id;

                  return (
                    <div
                      key={constraint.id}
                      id={`node-${constraint.id}`}
                      onMouseEnter={() => setHoveredNodeId(constraint.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => {
                        setSelectedNodeId(constraint.id);
                        setSelectedNodeType('constraint');
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-150 relative ${
                        isSelected
                          ? 'bg-[var(--bg-elevated)] border-sky-400 ring-1 ring-sky-400/40 shadow-lg'
                          : isHighlighted
                          ? 'bg-[var(--bg-elevated)] border-sky-400/80 shadow-md'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-[var(--text-primary)] text-[11px] truncate">
                          {constraint.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {constraint.passed ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              PASS
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" />
                              FAIL
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mb-1">
                        {constraint.reason}
                      </div>

                      {constraint.inputs && Object.keys(constraint.inputs).length > 0 && (
                        <div className="text-[9px] text-[var(--text-muted)] font-code bg-[var(--bg-primary)] p-1 rounded border border-[var(--border-subtle)] truncate">
                          inputs: {JSON.stringify(constraint.inputs)}
                        </div>
                      )}

                      <div className="mt-1 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                        <span className="uppercase">{constraint.type === 'rule' ? `Rule (${constraint.severity})` : `Pre-LLM (Prio ${constraint.priority})`}</span>
                        <span className="text-sky-400 hover:underline">Inspect AST →</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COLUMN 3: DEDUCTIONS & INFERENCE STEPS */}
              <div className="space-y-2">
                {inferenceNodes.map((inf, idx) => {
                  const infId = `inf-${idx}`;
                  const isSelected = selectedNodeId === infId;

                  return (
                    <div
                      key={infId}
                      id={`node-${infId}`}
                      onClick={() => {
                        setSelectedNodeId(infId);
                        setSelectedNodeType('inference');
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-[var(--bg-elevated)] border-amber-400 ring-1 ring-amber-400/40 shadow-lg'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 mb-1">
                        <div className="flex items-center gap-1.5">
                          <GitMerge className="w-3.5 h-3.5 text-amber-400" />
                          <span>Step {inf.step}: {inf.rule}</span>
                        </div>
                        <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                          {(inf.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="text-[10px] text-[var(--text-secondary)] space-y-1">
                        <div className="text-[9px] text-[var(--text-muted)]">
                          Premises: {inf.premises.join('; ')}
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          ↳ {inf.conclusion}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COLUMN 4: FINAL DISPOSITION OUTCOME */}
              <div className="space-y-2">
                <div
                  id="node-outcome"
                  onClick={() => {
                    setSelectedNodeId('outcome');
                    setSelectedNodeType('outcome');
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    evalResult.disposition === Disposition.Asserted
                      ? 'bg-emerald-950/30 border-emerald-600/70 shadow-lg shadow-emerald-950/20'
                      : evalResult.disposition === Disposition.Rejected
                      ? 'bg-rose-950/30 border-rose-600/70 shadow-lg shadow-rose-950/20'
                      : 'bg-amber-950/30 border-amber-600/70 shadow-lg shadow-amber-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Evaluated Proposition
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                      evalResult.disposition === Disposition.Asserted
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : evalResult.disposition === Disposition.Rejected
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {evalResult.disposition}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-[var(--text-primary)] mb-2">
                    {evalResult.title}
                  </div>

                  <div className="space-y-1.5 text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Confidence:</span>
                      <span className="font-bold text-emerald-400">{(evalResult.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Latency:</span>
                      <span className="text-[var(--text-primary)]">{evalResult.evaluation_time_ms} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Database Eval:</span>
                      <span className="text-sky-300 font-bold">{evalResult.database_eval_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">LLM Fallback:</span>
                      <span className="text-[var(--text-primary)]">{evalResult.fallback_to_llm ? 'Triggered' : 'None (Deterministic)'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (subjectEntity) selectById('entity', subjectEntity.id);
                      }}
                      className="px-2 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] text-[10px] text-sky-300 border border-[var(--border-subtle)] flex items-center gap-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Inspect Entity</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendToRepl(`evaluate("${selectedPropId}", ${JSON.stringify({ environment: simEnv, jurisdiction: simJur })})`, true);
                      }}
                      className="px-2 py-1 rounded bg-sky-950 hover:bg-sky-900 text-[10px] text-sky-300 border border-sky-800 flex items-center gap-1 font-bold"
                    >
                      <Code2 className="w-2.5 h-2.5" />
                      <span>REPL Eval</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW MODE B: CHRONOLOGICAL STEPPER PLAYBACK */}
        {viewMode === 'stepper' && (
          <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
            {/* Playback Controls */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Trace'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveStep(0);
                  }}
                  className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  title="Reset to Step 1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 ml-2">
                  {[0, 1, 2, 3, 4].map(st => (
                    <button
                      key={st}
                      onClick={() => setActiveStep(st)}
                      className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                        activeStep === st
                          ? 'bg-sky-500 text-white shadow-xs'
                          : activeStep > st
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                      }`}
                    >
                      {st + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-muted)]">
                Step {activeStep + 1} of 5: {
                  activeStep === 0 ? 'Ingest Concrete & EAV Facts' :
                  activeStep === 1 ? 'Execute Pre-LLM Deterministic Pattern Guards' :
                  activeStep === 2 ? 'Evaluate Invariant Rules & Assertions' :
                  activeStep === 3 ? 'Inference Chaining & Derived Traits' :
                  'Resolution of Final Disposition'
                }
              </div>
            </div>

            {/* Stepper Active Stage Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-3">
              {activeStep === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Stage 1: Ingested Premises and Frame Dimensions</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {factNodes.map(f => (
                      <div key={f.id} className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[11px]">
                        <div className="text-[var(--text-muted)] text-[9px] uppercase">{f.name} ({f.kind})</div>
                        <div className="font-bold text-sky-300 font-code">{String(f.value)}</div>
                        <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">{f.source}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>Stage 2: Deterministic Pre-LLM Pattern Verification (10 Priority Patterns)</span>
                  </div>
                  <div className="space-y-2">
                    {(evalResult.pre_llm_patterns || []).map(p => (
                      <div key={p.pattern_id} className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-[var(--text-primary)] font-code">{p.pattern_name}</span>
                          <div className="text-[10px] text-[var(--text-secondary)]">{p.details}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          p.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {p.passed ? 'PASSED' : 'VIOLATION'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-sky-400" />
                    <span>Stage 3: Invariant & Assertion Rule Evaluation</span>
                  </div>
                  <div className="space-y-2">
                    {(evalResult.rules_evaluated || []).map(r => (
                      <div key={r.rule_id} className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--text-primary)]">{r.rule_name}</span>
                          <span className={r.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {r.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{r.reason}</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-code bg-[var(--bg-secondary)] p-1 rounded">
                          AST inputs: {JSON.stringify(r.inputs)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <GitMerge className="w-4 h-4 text-amber-400" />
                    <span>Stage 4: Forward Chaining Deductions</span>
                  </div>
                  <div className="space-y-2">
                    {inferenceNodes.map((inf, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[11px] space-y-1">
                        <div className="font-bold text-amber-300">Step {inf.step}: {inf.rule}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">Premise: {inf.premises.join(', ')}</div>
                        <div className="text-[10px] font-semibold text-emerald-300">Conclusion: {inf.conclusion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Stage 5: Final Resolution Disposition</span>
                  </div>
                  <div className="p-4 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-center space-y-2">
                    <div className="text-xl font-bold text-[var(--text-primary)]">{evalResult.title}</div>
                    <span className={`inline-block px-4 py-1 rounded text-sm font-bold uppercase border ${
                      evalResult.disposition === Disposition.Asserted ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                      evalResult.disposition === Disposition.Rejected ? 'bg-rose-950 text-rose-300 border-rose-700' :
                      'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {evalResult.disposition}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                      Concluded with {(evalResult.confidence_score * 100).toFixed(0)}% confidence in {evalResult.evaluation_time_ms}ms via {evalResult.database_eval_status}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW MODE C: TRUTH MATRIX TABLE */}
        {viewMode === 'matrix' && (
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-secondary)]">
                  <th className="p-2 font-bold uppercase">Constraint / Pattern</th>
                  <th className="p-2 font-bold uppercase">Type</th>
                  <th className="p-2 font-bold uppercase">Severity / Prio</th>
                  <th className="p-2 font-bold uppercase">Bound Fact Inputs</th>
                  <th className="p-2 font-bold uppercase">Verdict</th>
                  <th className="p-2 font-bold uppercase">Explanation / Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {constraintNodes.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="p-2 font-bold text-[var(--text-primary)]">{c.name}</td>
                    <td className="p-2 text-[var(--text-secondary)] uppercase">{c.type}</td>
                    <td className="p-2 text-[var(--text-muted)]">{c.type === 'rule' ? c.severity : `Prio ${c.priority}`}</td>
                    <td className="p-2 text-sky-300 font-code truncate max-w-xs">{JSON.stringify(c.inputs)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {c.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="p-2 text-[var(--text-secondary)] text-[10px]">{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Right Node Inspector Detail Panel */}
        {selectedNodeId && (
          <div className="w-72 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 flex flex-col justify-between shrink-0 overflow-y-auto text-xs font-mono animate-in fade-in slide-in-from-right-3 duration-150">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-sky-400">Node Inspector</span>
                <button
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedNodeType(null);
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              {selectedFact && (
                <div className="space-y-2">
                  <div className="font-bold text-sm text-[var(--text-primary)]">{selectedFact.name}</div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] inline-block text-indigo-300 border border-[var(--border-subtle)] uppercase">
                    {selectedFact.kind} Fact
                  </div>

                  <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                    <div className="text-[10px] text-[var(--text-muted)]">Raw Value:</div>
                    <div className="font-bold text-sky-300 font-code break-all">
                      {typeof selectedFact.value === 'object' ? JSON.stringify(selectedFact.value, null, 2) : String(selectedFact.value)}
                    </div>
                  </div>

                  <div className="text-[10px] space-y-1 text-[var(--text-secondary)]">
                    <div>Source: <span className="text-[var(--text-primary)]">{selectedFact.source}</span></div>
                    <div>Type: <span className="text-[var(--text-primary)]">{selectedFact.dataType}</span></div>
                    <div>Provenance: <ProvenanceBadge provenance={selectedFact.provenance} size="sm" /></div>
                  </div>
                </div>
              )}

              {selectedConstraint && (
                <div className="space-y-2">
                  <div className="font-bold text-sm text-[var(--text-primary)]">{selectedConstraint.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      selectedConstraint.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {selectedConstraint.passed ? 'VERDICT: PASS' : 'VERDICT: FAIL'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                      {selectedConstraint.severity}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                    <div className="text-[10px] text-[var(--text-muted)]">Reason:</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{selectedConstraint.reason}</div>
                  </div>

                  {selectedConstraint.inputs && (
                    <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                      <div className="text-[10px] text-[var(--text-muted)]">Bound Inputs:</div>
                      <pre className="text-[10px] text-sky-300 font-code overflow-x-auto">
                        {JSON.stringify(selectedConstraint.inputs, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedConstraint.expressionTrace && (
                    <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
                      <div className="text-[10px] text-[var(--text-muted)]">AST Expression Trace:</div>
                      <code className="text-[10px] text-indigo-300 font-code block">
                        {selectedConstraint.expressionTrace}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {selectedInference && (
                <div className="space-y-2">
                  <div className="font-bold text-sm text-amber-300">Step {selectedInference.step}: {selectedInference.rule}</div>
                  <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1 text-[11px]">
                    <div className="text-[10px] text-[var(--text-muted)]">Premises:</div>
                    <div className="text-[var(--text-secondary)]">{selectedInference.premises.join(', ')}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-2">Deduction:</div>
                    <div className="font-bold text-emerald-300">{selectedInference.conclusion}</div>
                  </div>
                </div>
              )}

              {selectedNodeType === 'outcome' && (
                <div className="space-y-2">
                  <div className="font-bold text-sm text-[var(--text-primary)]">{evalResult.title}</div>
                  <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1 text-[11px]">
                    <div>Disposition: <span className="font-bold text-emerald-400">{evalResult.disposition}</span></div>
                    <div>Confidence: <span className="font-bold">{(evalResult.confidence_score * 100).toFixed(0)}%</span></div>
                    <div>Duration: <span>{evalResult.evaluation_time_ms} ms</span></div>
                    <div>Context Status: <span>{evalResult.context_status}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => {
                  sendToRepl(`inspect("${selectedNodeId}")`);
                }}
                className="w-full py-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] text-sky-300 border border-[var(--border-subtle)] font-bold text-center flex items-center justify-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Send to REPL</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
