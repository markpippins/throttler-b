import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Terminal, 
  ShieldAlert, 
  Sparkles, 
  Flame, 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw, 
  ArrowRight,
  GitMerge,
  Send,
  HelpCircle,
  Clock,
  Play,
  Maximize2,
  Minimize2,
  GitBranch
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Disposition, Severity, FieldTypeCode } from '../../types/sol';
import { ReasoningTraceFlow } from './ReasoningTraceFlow';

export const ActivityPanel: React.FC = () => {
  const {
    activeActivityTab,
    setActiveActivityTab,
    activeEvaluation,
    runEvaluation,
    selectById,
    sendToRepl,
    isActivityCollapsed,
    setIsActivityCollapsed,
    frameContext
  } = useWorkbench();

  // Activity panel height state (normal vs expanded)
  const [isExpandedHeight, setIsExpandedHeight] = useState(false);

  // Shrapnel Encoder state
  const [encodeJson, setEncodeJson] = useState(`{
  "cores": 16,
  "uptime_s": 84200.0,
  "healthy": true,
  "telemetry_meta": { "env": "prod", "gpu": false }
}`);
  const [encodeResult, setEncodeResult] = useState<any>(null);

  // Gateway tester state
  const [gwEndpoint, setGwEndpoint] = useState('/health');
  const [gwResult, setGwResult] = useState<any>(null);

  const handleEncodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(encodeJson);
      const res = solEngine.encodeShrapnelObject({ values: parsed });
      setEncodeResult(res);
    } catch (err: any) {
      setEncodeResult({ error: err.message });
    }
  };

  const handleGwTest = () => {
    if (gwEndpoint === '/health') {
      setGwResult({
        status: "ok",
        database: "sol",
        schemas: ["semantics", "resolution", "shrapnel"],
        timestamp: new Date().toISOString()
      });
    } else if (gwEndpoint === '/api/schemas') {
      setGwResult({
        schemas: {
          resolution: ["assertion_evaluation", "assessment", "concept", "rule", "proposition", "frame_dimension"],
          semantics: ["evidence_item", "evidence_type", "snapshot", "representation"],
          shrapnel: ["field", "field_type", "object_attribute_value", "object_instance", "value", "value_long", "value_string", "value_double", "value_boolean", "value_timestamptz", "value_jsonb", "value_uuid"]
        },
        tableCount: 77
      });
    } else if (gwEndpoint.includes('field-types')) {
      setGwResult({ field_types: solEngine.fieldTypes });
    } else {
      setGwResult({
        schema: "resolution",
        table: "concept",
        page: 1,
        per_page: 50,
        total: Object.keys(solEngine.concepts).length,
        items: Object.values(solEngine.concepts).map(c => ({ id: c.id, name: c.name, description: c.description }))
      });
    }
  };

  if (isActivityCollapsed) {
    return (
      <div
        id="activity-panel-collapsed"
        className="h-7 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 flex items-center justify-between text-xs font-mono select-none cursor-pointer hover:bg-[var(--bg-tertiary)] shrink-0 transition-colors"
        onClick={() => setIsActivityCollapsed(false)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold uppercase text-[11px] text-[var(--text-secondary)]">
            Activity & Reasoning Traces ({activeEvaluation ? `Last: ${activeEvaluation.title}` : 'Ready'})
          </span>
        </div>
        <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </div>
    );
  }

  // Active Violations list in current engine state
  const faultyEntities = solEngine.entities.filter(e => e.id.includes('faulty') || e.id.includes('TEMPVIOLATION'));
  const disputedProps = solEngine.propositions.filter(p => p.disposition === Disposition.Disputed || p.disposition === Disposition.Rejected);

  return (
    <div
      id="workbench-activity-panel"
      className={`${
        isExpandedHeight ? 'h-[440px]' : 'h-72'
      } border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col shrink-0 select-none font-mono text-xs overflow-hidden transition-all duration-200`}
    >
      {/* Activity Panel Tabs Header */}
      <div className="h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/70 px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            id="act-tab-evaluator"
            onClick={() => setActiveActivityTab('evaluator')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeActivityTab === 'evaluator'
                ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-sky-400" />
            <span>Reasoning Trace & Debugger</span>
          </button>

          <button
            id="act-tab-violations"
            onClick={() => setActiveActivityTab('violations')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeActivityTab === 'violations'
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : 'text-[var(--text-muted)] hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Violations Queue</span>
            <span className="px-1 rounded bg-rose-900 text-white text-[9px] font-bold">
              {faultyEntities.length + disputedProps.length}
            </span>
          </button>

          <button
            id="act-tab-pre-llm"
            onClick={() => setActiveActivityTab('pre_llm_patterns')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeActivityTab === 'pre_llm_patterns'
                ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Pre-LLM Patterns (10)</span>
          </button>

          <button
            id="act-tab-inference"
            onClick={() => setActiveActivityTab('inference_trace')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeActivityTab === 'inference_trace'
                ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Inference Trace</span>
          </button>

          <button
            id="act-tab-shrapnel-eav"
            onClick={() => setActiveActivityTab('shrapnel_eav')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              activeActivityTab === 'shrapnel_eav'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'text-[var(--text-muted)] hover:text-amber-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Shrapnel EAV Encoder</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="activity-expand-height-btn"
            onClick={() => setIsExpandedHeight(!isExpandedHeight)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
            title={isExpandedHeight ? "Compact Panel" : "Expand Panel Height"}
          >
            {isExpandedHeight ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            id="activity-collapse-btn"
            onClick={() => setIsActivityCollapsed(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
            title="Minimize Panel"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activity Panel Body */}
      <div className="flex-1 overflow-hidden flex flex-col font-mono text-xs">
        
        {/* ========================================================= */}
        {/* TAB 1: INTERACTIVE REASONING TRACE VISUAL FLOW */}
        {/* ========================================================= */}
        {activeActivityTab === 'evaluator' && (
          <ReasoningTraceFlow 
            isExpanded={isExpandedHeight} 
            onToggleExpand={() => setIsExpandedHeight(!isExpandedHeight)} 
          />
        )}

        {/* ========================================================= */}
        {/* TAB 2: VIOLATIONS QUEUE */}
        {/* ========================================================= */}
        {activeActivityTab === 'violations' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] text-[var(--text-muted)]">
              Active Invariant Violations and Disputed Assertions requiring ontologist / operator review:
            </div>
            <div className="space-y-1.5">
              {faultyEntities.map(e => (
                <div key={e.id} className="p-2 rounded bg-rose-950/40 border border-rose-800/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold text-rose-200">{e.external_id}</span>
                      <span className="text-[10px] text-[var(--text-muted)] ml-2">Concept: {e.concept_name}</span>
                      <div className="text-[10px] text-rose-300">
                        {e.id.includes('faulty') ? 'Invariant Violation: Negative uptime_s (-3.5s) violates "Uptime Non-Negative"' : 'Temporal Monotonicity Failure: due_date < created_at'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => selectById('entity', e.id)}
                    className="px-2 py-1 rounded bg-rose-900/60 text-white font-bold hover:bg-rose-800 transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              ))}

              {disputedProps.map(p => (
                <div key={p.id} className="p-2 rounded bg-amber-950/40 border border-amber-800/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-200">{p.title}</span>
                      <div className="text-[10px] text-amber-300">Disposition: {p.disposition} (confidence: {(p.confidence * 100).toFixed(0)}%)</div>
                    </div>
                  </div>
                  <button
                    onClick={() => selectById('proposition', p.id)}
                    className="px-2 py-1 rounded bg-amber-900/60 text-white font-bold hover:bg-amber-800 transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PRE-LLM PATTERNS */}
        {/* ========================================================= */}
        {activeActivityTab === 'pre_llm_patterns' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] text-[var(--text-muted)]">
              SOLScript executes 10 deterministic reasoning patterns with prioritized confidence thresholds prior to any LLM fallback:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { name: 'temporal_consistency', prio: 100, conf: '0.95', desc: 'Ensures date/time fields obey chronological sequence.' },
                { name: 'enum_validation', prio: 90, conf: '1.00', desc: 'Validates state and status attributes against bounded vocabulary sets.' },
                { name: 'consistency_constraints', prio: 95, conf: '0.98', desc: 'Cross-attribute consistency validation (e.g. status vs health).' },
                { name: 'state_machine', prio: 95, conf: '1.00', desc: 'Validates state transitions against defined FSM transitions graph.' },
                { name: 'foreign_key_validation', prio: 85, conf: '1.00', desc: 'Validates FK references resolve to existing entities & EAV rows.' },
                { name: 'range_validation', prio: 85, conf: '0.98', desc: 'Numeric boundary validation (cores > 0, uptime >= 0, etc.).' },
                { name: 'business_rules', prio: 90, conf: '0.90', desc: 'Domain-specific deterministic production rules.' },
                { name: 'derived_attributes', prio: 80, conf: '0.95', desc: 'Calculates derived telemetry and bandwidth attributes.' },
                { name: 'text_pattern_matching', prio: 70, conf: '0.85', desc: 'Regex-based text attribute and UUID validation.' },
                { name: 'statistical_imputation', prio: 60, conf: '0.75', desc: 'Statistical baseline filling for missing non-critical metrics.' },
              ].map(pat => (
                <div key={pat.name} className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-sky-300 font-code">{pat.name}</span>
                    <div className="text-[10px] text-[var(--text-muted)]">{pat.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] px-1 rounded bg-sky-950 text-sky-300 border border-sky-800">
                      Prio: {pat.prio}
                    </span>
                    <div className="text-[9px] text-[var(--text-muted)]">conf: {pat.conf}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: INFERENCE TRACE */}
        {/* ========================================================= */}
        {activeActivityTab === 'inference_trace' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] text-[var(--text-muted)]">
              Forward/Backward Chaining Inference Graph Execution:
            </div>
            <div className="p-3 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <GitMerge className="w-4 h-4 text-indigo-400" />
                <span>Chaining Deduction Step 1: Pre-LLM Pattern Evaluation</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Premise: Entity `host-prod-alpha-01` attributes loaded with cores=32, uptime_s=1428500.5.
                Conclusion: Invariants "Cores Must Be Positive" and "Uptime Non-Negative" evaluated TRUE.
              </p>
              <div className="text-[10px] text-emerald-400 font-bold">Confidence: 1.0 (Deterministic verification)</div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SHRAPNEL EAV ENCODER PLAYGROUND */}
        {/* ========================================================= */}
        {activeActivityTab === 'shrapnel_eav' && (
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <form onSubmit={handleEncodeSubmit} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">POST /api/shrapnel/encode Payload</span>
                  <span className="text-[10px] text-[var(--text-muted)]">JSON (Polymorphic Types)</span>
                </div>
                <textarea
                  value={encodeJson}
                  onChange={e => setEncodeJson(e.target.value)}
                  rows={5}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded p-2 text-[11px] font-code text-amber-200 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Encode to EAV Substrate</span>
                </button>
              </form>

              <div className="space-y-2">
                <span className="font-bold text-[var(--text-secondary)]">Encode Response:</span>
                <pre className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] font-code text-emerald-300 overflow-x-auto max-h-40">
                  {encodeResult ? JSON.stringify(encodeResult, null, 2) : '// Response from Shrapnel polymorphic store will appear here...'}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
