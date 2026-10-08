import React, { useState } from 'react';
import { 
  Layers, 
  Boxes, 
  Database, 
  ShieldAlert, 
  Sparkles, 
  Flame, 
  Code, 
  Plus, 
  Save, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  FileCode,
  Tag,
  ArrowRight,
  GitBranch,
  Globe
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Concept, Entity, Rule, Proposition, RuleType, Severity, Disposition } from '../../types/sol';

export const StructuredEditor: React.FC = () => {
  const { 
    selectedItem, 
    selectById, 
    sendToRepl, 
    runEvaluation,
    refreshEngine,
    openGroundingModal
  } = useWorkbench();

  const [activeTab, setActiveTab] = useState<'attributes' | 'invariants' | 'state_fsm' | 'eav_facts' | 'ast'>('attributes');
  const [saveNotification, setSaveNotification] = useState(false);

  if (!selectedItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-primary)]">
        <Layers className="w-8 h-8 text-sky-400 mb-2 opacity-50" />
        <div className="font-bold text-sm text-[var(--text-secondary)]">No Schema or Entity Selected</div>
        <div>Select an item from the Navigator or Graph to open the Structured Editor.</div>
      </div>
    );
  }

  const { type, id, data, provenance } = selectedItem;

  const handleSave = () => {
    setSaveNotification(true);
    refreshEngine();
    setTimeout(() => setSaveNotification(false), 2000);
  };

  return (
    <div
      id="structured-editor-workspace"
      className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden select-none"
    >
      {/* Editor Top Bar */}
      <div className="h-11 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-2">
          {type === 'concept' && <Boxes className="w-4 h-4 text-indigo-400" />}
          {type === 'entity' && <Database className="w-4 h-4 text-emerald-400" />}
          {type === 'rule' && <ShieldAlert className="w-4 h-4 text-indigo-300" />}
          {type === 'proposition' && <Sparkles className="w-4 h-4 text-blue-400" />}
          {type === 'shrapnel_object' && <Flame className="w-4 h-4 text-amber-400" />}
          
          <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
            {type}: <span className="text-sky-300">{data?.name || data?.external_id || data?.title || id}</span>
          </span>
          <ProvenanceBadge provenance={provenance} size="xs" />
        </div>

        <div className="flex items-center gap-2">
          {saveNotification && (
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved to SOL runtime
            </span>
          )}
          <button
            onClick={() => openGroundingModal(type === 'concept' ? `schema.org/${data?.name}` : undefined)}
            className="px-2 py-1 rounded bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-700/60 text-[10px] flex items-center gap-1 font-mono transition-colors"
            title="Ground and enrich schema from live web"
          >
            <Globe className="w-3 h-3 text-sky-400" />
            <span>Ground Spec</span>
          </button>
          <button
            onClick={() => sendToRepl(`inspect($selected)`)}
            className="px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-sky-300 border border-[var(--border-subtle)] text-[10px]"
          >
            Send to REPL
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 shadow-xs text-[10px]"
          >
            <Save className="w-3 h-3" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>

      {/* Editor Subtabs for Concepts or Entities */}
      <div className="h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/60 px-3 flex items-center gap-1 shrink-0 font-mono text-xs">
        <button
          onClick={() => setActiveTab('attributes')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold ${
            activeTab === 'attributes' ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {type === 'concept' ? 'Attributes & Fields' : 'Instance Values'}
        </button>

        {type === 'concept' && (
          <>
            <button
              onClick={() => setActiveTab('invariants')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                activeTab === 'invariants' ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              Invariants & Rules ({data?.invariants?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('state_fsm')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                activeTab === 'state_fsm' ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              State Machine FSM ({data?.state_transitions?.length || 0})
            </button>
          </>
        )}

        {(type === 'entity' || type === 'shrapnel_object') && (
          <button
            onClick={() => setActiveTab('eav_facts')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
              activeTab === 'eav_facts' ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Polymorphic EAV Slots
          </button>
        )}

        <button
          onClick={() => setActiveTab('ast')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold ${
            activeTab === 'ast' ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          SOL AST / Raw Record
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-4">
        
        {/* ========================================================= */}
        {/* Tab 1: Attributes & Fields */}
        {/* ========================================================= */}
        {activeTab === 'attributes' && type === 'concept' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300">Concept Definition</span>
                <span className="text-[10px] text-[var(--text-muted)]">ID: {data?.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Name: <input className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-primary)]" defaultValue={data?.name} /></div>
                <div>Label: <input className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-primary)]" defaultValue={data?.label || ''} /></div>
              </div>
              <div>
                Description: <input className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-primary)]" defaultValue={data?.description || ''} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider">
                  Defined Attributes ({Object.keys(data?.attributes || {}).length})
                </span>
                <button className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-sky-400 hover:text-sky-300 border border-[var(--border-subtle)] flex items-center gap-1 text-[10px]">
                  <Plus className="w-3 h-3" /> Add Attribute
                </button>
              </div>

              <div className="space-y-1.5">
                {Object.values((data as Concept)?.attributes || {}).map(attr => (
                  <div key={attr.id} className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-300">{attr.name}</span>
                      <span className="text-[10px] px-1 rounded bg-[var(--bg-primary)] text-[var(--text-muted)]">
                        type: {attr.value_type}
                      </span>
                      {attr.is_state_attribute && (
                        <span className="text-[9px] px-1 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          STATE ATTRIBUTE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      {attr.allowed_values && (
                        <span>enum: [{attr.allowed_values.join(', ')}]</span>
                      )}
                      {attr.shrapnel_field_id && (
                        <span className="text-amber-400">EAV Slot #{attr.shrapnel_field_id}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Concrete Entity Attributes */}
        {activeTab === 'attributes' && type === 'entity' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300">Entity: {(data as Entity)?.external_id}</span>
                <span className="text-[10px] text-[var(--text-muted)]">Concept: {(data as Entity)?.concept_name}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries((data as Entity)?.attributes || {}).map(([key, val]) => (
                  <div key={key} className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">{key}</div>
                    <input
                      className="w-full bg-transparent font-bold text-[var(--text-primary)] border-b border-transparent focus:border-sky-400 focus:outline-hidden"
                      defaultValue={String(val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Tab 2: Invariants & Rules */}
        {/* ========================================================= */}
        {activeTab === 'invariants' && type === 'concept' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider">
                Invariant Constraint Rules ({data?.invariants?.length || 0})
              </span>
            </div>
            {((data as Concept)?.invariants || []).map(inv => (
              <div key={inv.id} className="p-3 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">{inv.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {inv.rule_type} ({inv.severity})
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">{inv.description}</p>
                <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sky-300 font-code text-[11px]">
                  {inv.expression?.raw_code || JSON.stringify(inv.expression)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* Tab 3: State Machine Transitions */}
        {/* ========================================================= */}
        {activeTab === 'state_fsm' && type === 'concept' && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
              Finite State Machine Transitions ({data?.state_transitions?.length || 0})
            </div>
            {((data as Concept)?.state_transitions || []).map(st => (
              <div key={st.id} className="p-2.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] text-indigo-300 font-bold">{st.from_state}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] text-emerald-300 font-bold">{st.to_state}</span>
                </div>
                <div className="text-[10px] text-sky-400 font-bold">
                  trigger: {st.trigger_event}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* Tab 4: EAV Facts Slots */}
        {/* ========================================================= */}
        {activeTab === 'eav_facts' && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
              Polymorphic Shrapnel EAV Values
            </div>
            {Object.entries((data as Entity)?.eav_attributes || (data as any)?.values || {}).map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="font-bold text-amber-300">{k}</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* Tab 5: Raw Record AST */}
        {/* ========================================================= */}
        {activeTab === 'ast' && (
          <pre className="p-3 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-code text-[11px] overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}

      </div>
    </div>
  );
};
