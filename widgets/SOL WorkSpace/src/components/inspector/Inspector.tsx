import React from 'react';
import { 
  SidebarClose, 
  SidebarOpen, 
  Boxes, 
  Database, 
  ShieldAlert, 
  Sparkles, 
  Flame, 
  Terminal, 
  Play, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Info,
  Layers,
  Globe,
  Sliders,
  Code
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Concept, Entity, Rule, Proposition, Disposition, FrameDimension, ShrapnelObjectInstance } from '../../types/sol';

export const Inspector: React.FC = () => {
  const {
    selectedItem,
    selectById,
    sendToRepl,
    runEvaluation,
    isInspectorCollapsed,
    setIsInspectorCollapsed,
    setActiveActivityTab
  } = useWorkbench();

  if (isInspectorCollapsed) {
    return (
      <div
        id="inspector-collapsed"
        className="w-8 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col items-center py-2 shrink-0 select-none cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
        onClick={() => setIsInspectorCollapsed(false)}
        title="Expand Inspector"
      >
        <Layers className="w-4 h-4 text-sky-400 mb-4" />
        <div className="-rotate-90 text-[10px] font-mono tracking-widest text-[var(--text-muted)] whitespace-nowrap mt-6 uppercase">
          INSPECTOR
        </div>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <aside
        id="workbench-inspector"
        className="w-72 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col h-full shrink-0 select-none font-mono text-xs overflow-hidden"
      >
        <div className="p-2 border-b border-[var(--border-subtle)] flex items-center justify-between text-[var(--text-secondary)]">
          <span className="font-bold text-[11px] uppercase tracking-wider">Object Inspector</span>
          <button onClick={() => setIsInspectorCollapsed(true)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">›</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)] space-y-2">
          <Info className="w-6 h-6 text-sky-400 opacity-40" />
          <div className="text-[11px]">Select any concept, entity, rule, or proposition to inspect representation & provenance status.</div>
        </div>
      </aside>
    );
  }

  const { type, id, data, provenance } = selectedItem;

  return (
    <aside
      id="workbench-inspector"
      className="w-72 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col h-full shrink-0 select-none font-mono text-xs overflow-hidden"
    >
      {/* Inspector Header */}
      <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          {type === 'concept' && <Boxes className="w-3.5 h-3.5 text-indigo-400" />}
          {type === 'entity' && <Database className="w-3.5 h-3.5 text-emerald-400" />}
          {type === 'rule' && <ShieldAlert className="w-3.5 h-3.5 text-indigo-300" />}
          {type === 'proposition' && <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
          {type === 'shrapnel_object' && <Flame className="w-3.5 h-3.5 text-amber-400" />}
          {type === 'frame' && <Sliders className="w-3.5 h-3.5 text-sky-400" />}
          
          <span className="font-bold uppercase tracking-wider text-[11px] text-[var(--text-primary)] truncate">
            {type}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <ProvenanceBadge provenance={provenance} size="xs" showDetails />
          <button
            id="inspector-collapse-btn"
            onClick={() => setIsInspectorCollapsed(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-1 rounded"
            title="Collapse Inspector"
          >
            ›
          </button>
        </div>
      </div>

      {/* Main Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* Title & Identity Card with Provenance Status Badge */}
        <div className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Identity & Handle:</span>
            <ProvenanceBadge provenance={provenance} size="2xs" />
          </div>
          <div className="font-bold text-sm text-[var(--text-primary)] break-all">
            {data?.name || data?.external_id || data?.title || id}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] break-all">ID: {String(id)}</div>
          {data?.description && (
            <p className="text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)] font-sans">
              {data.description}
            </p>
          )}
        </div>

        {/* ========================================================= */}
        {/* Concept Inspector */}
        {/* ========================================================= */}
        {type === 'concept' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
                <span>Attributes ({Object.keys(data?.attributes || {}).length})</span>
                <ProvenanceBadge provenance="semantic" size="2xs" />
              </div>
              <div className="space-y-1">
                {Object.values((data as Concept)?.attributes || {}).map(attr => (
                  <div key={attr.id} className="p-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 truncate mr-1">
                      <span className="font-bold text-indigo-300 truncate">{attr.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">:{attr.value_type}</span>
                    </div>
                    <ProvenanceBadge provenance="semantic" size="2xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* Invariant Rules */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
                <span>Invariants ({data?.invariants?.length || 0})</span>
                <ProvenanceBadge provenance="asserted" size="2xs" />
              </div>
              {(data as Concept)?.invariants?.map(inv => (
                <div key={inv.id} className="p-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-200 truncate mr-1">{inv.name}</span>
                    <ProvenanceBadge provenance={inv.provenance || 'asserted'} size="2xs" />
                  </div>
                  <div className="text-[var(--text-muted)] font-code text-[9.5px] truncate">{inv.expression?.raw_code}</div>
                </div>
              ))}
            </div>

            {/* Concrete Instances Link */}
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-800/40 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-emerald-300 font-bold">
                <span>Instantiated Instances:</span>
                <ProvenanceBadge provenance="concrete" size="2xs" />
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {solEngine.entities.filter(e => e.concept_id === id).length} live entities in concrete facts layer
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Entity Inspector */}
        {/* ========================================================= */}
        {type === 'entity' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
                <span>Concrete Attributes</span>
                <ProvenanceBadge provenance="concrete" size="2xs" />
              </div>
              <div className="space-y-1">
                {Object.entries((data as Entity)?.attributes || {}).map(([k, v]) => (
                  <div key={k} className="p-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">{k}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[var(--text-primary)]">{String(v)}</span>
                      <ProvenanceBadge provenance="concrete" size="2xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shrapnel EAV Values */}
            {(data as Entity)?.eav_attributes && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-amber-400 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" /> EAV Slots (Polymorphic)
                  </span>
                  <ProvenanceBadge provenance="eav" size="2xs" />
                </div>
                <div className="space-y-1">
                  {Object.entries((data as Entity)?.eav_attributes || {}).map(([k, v]) => (
                    <div key={k} className="p-1.5 rounded bg-amber-950/20 border border-amber-900/50 flex items-center justify-between text-[11px]">
                      <span className="text-amber-300">{k}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[var(--text-primary)] truncate max-w-[100px]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        <ProvenanceBadge provenance="eav" size="2xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context Scope */}
            {(data as Entity)?.context_tags && (
              <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1 text-[11px]">
                <div className="text-[10px] uppercase text-[var(--text-muted)] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-sky-400" /> Frame Context
                  </span>
                  <ProvenanceBadge provenance="asserted" size="2xs" />
                </div>
                <div className="space-y-1 pt-1">
                  {Object.entries((data as Entity).context_tags || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">{k}:</span>
                      <span className="text-[var(--text-secondary)] font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invariant Check Action */}
            <button
              id="inspector-check-entity-btn"
              onClick={() => sendToRepl(`check("${(data as Entity)?.id}")`, true)}
              className="w-full py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verify Invariants</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* Proposition Inspector */}
        {/* ========================================================= */}
        {type === 'proposition' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-[var(--text-muted)]">Disposition:</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  (data as Proposition)?.disposition === Disposition.Asserted ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                  (data as Proposition)?.disposition === Disposition.Rejected ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                  'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {(data as Proposition)?.disposition}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Provenance Tier:</span>
                <ProvenanceBadge provenance={(data as Proposition)?.provenance || 'inferred'} size="xs" showDetails />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Confidence:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {(((data as Proposition)?.confidence || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <button
              id="inspector-evaluate-prop-btn"
              onClick={() => {
                runEvaluation(id as string);
                setActiveActivityTab('evaluator');
              }}
              className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Resolution Evaluation</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* Rule Inspector */}
        {/* ========================================================= */}
        {type === 'rule' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-[var(--text-muted)]">Rule Status:</span>
                <ProvenanceBadge provenance={(data as Rule)?.provenance || 'asserted'} size="xs" showDetails />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Severity:</span>
                <span className="px-1.5 py-0.5 rounded font-bold uppercase text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-700">
                  {(data as Rule)?.severity}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Type:</span>
                <span className="text-[var(--text-primary)]">{(data as Rule)?.rule_type}</span>
              </div>
            </div>

            <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-1">
              <div className="text-[10px] uppercase text-[var(--text-muted)]">Expression Syntax:</div>
              <pre className="text-[10px] font-code text-indigo-300 whitespace-pre-wrap">
                {(data as Rule)?.expression?.raw_code}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Frame Dimension Inspector */}
        {/* ========================================================= */}
        {type === 'frame' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-[var(--text-muted)]">Dimension Key:</span>
                <span className="text-sky-300 font-bold">{(data as FrameDimension)?.dimension_key}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Default Value:</span>
                <span className="text-[var(--text-primary)]">{(data as FrameDimension)?.default_value}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Provenance:</span>
                <ProvenanceBadge provenance={(data as FrameDimension)?.provenance || 'semantic'} size="xs" showDetails />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Allowed Dimension Values</div>
              <div className="flex flex-wrap gap-1">
                {(data as FrameDimension)?.allowed_values?.map(val => (
                  <span key={val} className="px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/60 text-[10px] text-sky-300">
                    {val}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Shrapnel Object Inspector */}
        {/* ========================================================= */}
        {type === 'shrapnel_object' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-[var(--text-muted)]">Substrate Object:</span>
                <ProvenanceBadge provenance="eav" size="xs" showDetails />
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                Created: {(data as ShrapnelObjectInstance)?.created_at}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase text-amber-400 tracking-wider">
                <span>Polymorphic Typed Slots</span>
                <ProvenanceBadge provenance="eav" size="2xs" />
              </div>
              <div className="space-y-1">
                {Object.entries((data as ShrapnelObjectInstance)?.values || {}).map(([k, v]) => (
                  <div key={k} className="p-1.5 rounded bg-amber-950/20 border border-amber-900/50 flex items-center justify-between text-[11px]">
                    <span className="text-amber-300 font-bold">{k}:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[var(--text-primary)] truncate max-w-[120px]">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                      <ProvenanceBadge provenance="eav" size="2xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Inspector Quick REPL Bridge */}
      <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center justify-between shrink-0 text-[10px]">
        <button
          onClick={() => sendToRepl(`inspect($selected)`)}
          className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
        >
          <Terminal className="w-3 h-3" />
          <span>Address in REPL ($selected)</span>
        </button>
      </div>
    </aside>
  );
};

