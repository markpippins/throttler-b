/**
 * Modals for creating and editing States, Transitions, Invariants, Variables, and Registries
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Zap,
  Search,
  Plus,
  Star,
  CheckSquare,
  Square,
  Sparkles,
  Filter,
  Sliders,
  Code,
  Tag,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Shield,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { StateNode, Transition, Variable, Invariant, Registry, StateGroup } from '../types';
import { aegisApi } from '../api/client';
import { validateBooleanExpressionSyntax, evaluateGuard } from '../utils/simulator';

export type ModalType =
  | { type: 'state'; data?: Partial<StateNode> }
  | { type: 'transition'; data?: Partial<Transition> }
  | { type: 'variable'; data?: Partial<Variable> }
  | { type: 'invariant'; data?: Partial<Invariant> }
  | { type: 'new-registry' }
  | null;

interface ResourceEditorModalProps {
  modal: ModalType;
  states: StateNode[];
  transitions?: Transition[];
  groups?: StateGroup[];
  variables?: Variable[];
  simVariables?: Record<string, unknown>;
  activeRegistry?: Registry | null;
  onClose: () => void;
  onSaveState: (data: Partial<StateNode>) => Promise<void>;
  onSaveTransition: (data: Partial<Transition>) => Promise<void>;
  onSaveVariable: (data: Partial<Variable>) => Promise<void>;
  onSaveInvariant: (data: Partial<Invariant>) => Promise<void>;
  onCreateRegistry: (data: Partial<Registry>) => Promise<void>;
}

export const ResourceEditorModal: React.FC<ResourceEditorModalProps> = ({
  modal,
  states,
  transitions = [],
  groups = [],
  variables = [],
  simVariables = {},
  activeRegistry = null,
  onClose,
  onSaveState,
  onSaveTransition,
  onSaveVariable,
  onSaveInvariant,
  onCreateRegistry,
}) => {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        className={`bg-[#16191E] rounded-xl shadow-2xl border border-[#2D333B] w-full ${
          modal.type === 'transition' || modal.type === 'state' ? 'max-w-xl' : 'max-w-md'
        } overflow-hidden text-[#C9D1D9] animate-in fade-in zoom-in-95 duration-150`}
      >
        {modal.type === 'state' && (
          <StateForm
            state={modal.data}
            states={states}
            transitions={transitions}
            groups={groups}
            variables={variables}
            registryName={activeRegistry?.name}
            registryDescription={activeRegistry?.description}
            onClose={onClose}
            onSave={onSaveState}
          />
        )}
        {modal.type === 'transition' && (
          <TransitionForm
            transition={modal.data}
            states={states}
            transitions={transitions}
            variables={variables}
            simVariables={simVariables}
            onClose={onClose}
            onSave={onSaveTransition}
          />
        )}
        {modal.type === 'variable' && (
          <VariableForm variable={modal.data} onClose={onClose} onSave={onSaveVariable} />
        )}
        {modal.type === 'invariant' && (
          <InvariantForm invariant={modal.data} onClose={onClose} onSave={onSaveInvariant} />
        )}
        {modal.type === 'new-registry' && (
          <RegistryForm onClose={onClose} onSave={onCreateRegistry} />
        )}
      </div>
    </div>
  );
};

// 1. State Form with Gemini-Powered Automatic Documentation Generation
const StateForm: React.FC<{
  state?: Partial<StateNode>;
  states?: StateNode[];
  transitions?: Transition[];
  groups?: StateGroup[];
  variables?: Variable[];
  registryName?: string;
  registryDescription?: string;
  onClose: () => void;
  onSave: (data: Partial<StateNode>) => Promise<void>;
}> = ({
  state,
  states = [],
  transitions = [],
  groups = [],
  variables = [],
  registryName,
  registryDescription,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(state?.name || '');
  const [description, setDescription] = useState(state?.description || '');
  const [groupId, setGroupId] = useState<string | null>(state?.group_id || null);
  const [isInitial, setIsInitial] = useState(state?.is_initial || false);
  const [isTerminal, setIsTerminal] = useState(state?.is_terminal || false);
  const [varJson, setVarJson] = useState(
    state?.variable_assignments ? JSON.stringify(state.variable_assignments, null, 2) : ''
  );
  const [loading, setLoading] = useState(false);

  // Gemini AI Generation States
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  // Transitions connected to this state
  const incomingTransitions = useMemo(() => {
    return (transitions || []).filter((t) => {
      if (state?.id) return t.to_state_id === state.id;
      return t.to_state_id === name.trim();
    });
  }, [transitions, state?.id, name]);

  const outgoingTransitions = useMemo(() => {
    return (transitions || []).filter((t) => {
      if (state?.id) return t.from_state_id === state.id;
      return t.from_state_id === name.trim();
    });
  }, [transitions, state?.id, name]);

  // Count of local variables in JSON
  const localVarsCount = useMemo(() => {
    try {
      if (!varJson.trim()) return 0;
      const parsed = JSON.parse(varJson);
      return typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0;
    } catch {
      return 0;
    }
  }, [varJson]);

  // Trigger Gemini API to automatically generate descriptive documentation
  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      setGenerateError('Please enter a State Name before generating documentation.');
      return;
    }

    setIsGeneratingDesc(true);
    setGenerateError(null);
    setGenerateSuccess(false);

    let parsedVarAssignments: Record<string, unknown> | undefined = undefined;
    if (varJson.trim()) {
      try {
        parsedVarAssignments = JSON.parse(varJson);
      } catch {
        // use raw or keep undefined
      }
    }

    // Map transitions with readable state names for Gemini context
    const stateNameMap = new Map(states.map((s) => [s.id, s.name]));

    const formattedIncoming = incomingTransitions.map((t) => ({
      name: t.name,
      fromStateName: stateNameMap.get(t.from_state_id) || t.from_state_id,
      trigger: t.trigger || (t.triggers && t.triggers.length > 0 ? t.triggers.join(', ') : 'NONE'),
      guard: t.guard_expression,
      action: t.action_statements,
    }));

    const formattedOutgoing = outgoingTransitions.map((t) => ({
      name: t.name,
      toStateName: stateNameMap.get(t.to_state_id) || t.to_state_id,
      trigger: t.trigger || (t.triggers && t.triggers.length > 0 ? t.triggers.join(', ') : 'NONE'),
      guard: t.guard_expression,
      action: t.action_statements,
    }));

    const currentGroupName = groups.find((g) => g.id === groupId)?.name;

    try {
      const res = await aegisApi.generateStateDescription({
        stateName: name.trim(),
        isInitial,
        isTerminal,
        groupName: currentGroupName,
        variableAssignments: parsedVarAssignments,
        incomingTransitions: formattedIncoming,
        outgoingTransitions: formattedOutgoing,
        registryName,
        registryDescription,
        modelVariables: (variables || []).map((v) => ({
          name: v.name,
          type: v.type,
          initial_value: v.initial_value,
          description: v.description,
        })),
      });

      if (res?.description) {
        setDescription(res.description);
        setGenerateSuccess(true);
        setTimeout(() => setGenerateSuccess(false), 4000);
      } else {
        setGenerateError('No description returned by the AI service.');
      }
    } catch (err: any) {
      console.error('Failed to generate state description:', err);
      setGenerateError(
        err?.errorPayload?.message ||
          err?.errorPayload?.error ||
          err?.message ||
          'Failed to generate description. Check network connection or GEMINI_API_KEY.'
      );
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let variableAssignments: Record<string, unknown> | undefined = undefined;
    if (varJson.trim()) {
      try {
        variableAssignments = JSON.parse(varJson);
      } catch {
        // keep as is
      }
    }

    try {
      await onSave({
        ...state,
        name: name.trim(),
        description: description.trim(),
        group_id: groupId || null,
        is_initial: isInitial,
        is_terminal: isTerminal,
        variable_assignments: variableAssignments,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between p-4 border-b border-[#2D333B]">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-sm text-[#F0F6FC]">
            {state?.id ? 'Edit State' : 'New State'}
          </h3>
          {name && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0F1115] border border-[#2D333B] text-blue-400">
              {name}
            </span>
          )}
        </div>
        <button type="button" onClick={onClose} className="text-[#8B949E] hover:text-[#C9D1D9]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5 text-xs">
        <div>
          <label className="font-medium text-[#8B949E] block mb-1">State Name *</label>
          <input
            id="input-state-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. COMMITTED, PENDING, PREPARED"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] font-mono font-medium"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-medium text-[#8B949E] flex items-center gap-1.5">
              <span>Description & Documentation</span>
              {generateSuccess && (
                <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Generated with Gemini
                </span>
              )}
            </label>
            <button
              id="btn-generate-state-desc"
              type="button"
              onClick={handleGenerateDescription}
              disabled={isGeneratingDesc || !name.trim()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-500/15 border border-blue-500/40 text-blue-300 hover:bg-blue-500/25 hover:text-white hover:border-blue-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              title="Use Gemini API to automatically generate documentation based on transitions and variables"
            >
              {isGeneratingDesc ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                  <span>Generating with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>Generate Description</span>
                </>
              )}
            </button>
          </div>

          {/* Context Badges strip */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px] text-[#8B949E]">
            <span
              className="px-1.5 py-0.5 rounded bg-[#0F1115] border border-[#2D333B] flex items-center gap-1"
              title={`${incomingTransitions.length} incoming transition(s) detected`}
            >
              <ArrowDownLeft className="w-2.5 h-2.5 text-blue-400" />
              <span>{incomingTransitions.length} Incoming</span>
            </span>
            <span
              className="px-1.5 py-0.5 rounded bg-[#0F1115] border border-[#2D333B] flex items-center gap-1"
              title={`${outgoingTransitions.length} outgoing transition(s) detected`}
            >
              <ArrowUpRight className="w-2.5 h-2.5 text-emerald-400" />
              <span>{outgoingTransitions.length} Outgoing</span>
            </span>
            <span
              className="px-1.5 py-0.5 rounded bg-[#0F1115] border border-[#2D333B] flex items-center gap-1"
              title={`${localVarsCount} local variable assignment(s), ${(variables || []).length} global model variable(s)`}
            >
              <Code className="w-2.5 h-2.5 text-purple-400" />
              <span>
                {localVarsCount} Local Vars · {(variables || []).length} Global Vars
              </span>
            </span>
          </div>

          <textarea
            id="input-state-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Operational role, invariant conditions, and lifecycle semantics of this state..."
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] leading-relaxed resize-y font-sans"
          />

          {generateError && (
            <div className="mt-1.5 p-2 rounded bg-red-950/40 border border-red-800/50 text-[11px] text-red-300 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{generateError}</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Visual Container</label>
          <select
            value={groupId || ''}
            onChange={(e) => setGroupId(e.target.value || null)}
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="">None (Independent State)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-6 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInitial}
              onChange={(e) => setIsInitial(e.target.checked)}
              className="rounded border-[#2D333B] bg-[#0F1115] text-[#3B82F6] focus:ring-0"
            />
            <span className="text-[#C9D1D9]">Initial State</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTerminal}
              onChange={(e) => setIsTerminal(e.target.checked)}
              className="rounded border-[#2D333B] bg-[#0F1115] text-[#3B82F6] focus:ring-0"
            />
            <span className="text-[#C9D1D9]">Terminal State</span>
          </label>
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">
            Variable Assignments (JSON)
          </label>
          <textarea
            rows={3}
            value={varJson}
            onChange={(e) => setVarJson(e.target.value)}
            placeholder='{ "decision": "COMMITTED" }'
            className="w-full p-2.5 bg-[#0F1115] text-[#C9D1D9] border border-[#2D333B] rounded-lg text-xs font-mono focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 p-4 border-t border-[#2D333B] bg-[#0F1115]">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs text-[#8B949E] hover:text-[#C9D1D9]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save State'}
        </button>
      </div>
    </form>
  );
};

// 2. Searchable Multi-Select Trigger Component
interface TriggerOption {
  name: string;
  inModel: boolean;
  modelCount: number;
  isPreset: boolean;
  description?: string;
}

interface TriggerMultiSelectProps {
  selectedTriggers: string[];
  primaryTrigger: string;
  onTriggersChange: (triggers: string[], primary: string) => void;
  allTransitions?: Transition[];
}

const PRESET_TRIGGERS: { name: string; description: string }[] = [
  { name: 'TIMEOUT', description: 'Timer or deadline expiration event' },
  { name: 'TICK', description: 'Periodic simulation clock pulse step' },
  { name: 'VOTE_PREPARE', description: '2PC coordinator prepare broadcast' },
  { name: 'VOTE_COMMIT', description: 'Participant vote commit response' },
  { name: 'VOTE_ABORT', description: 'Participant vote abort response' },
  { name: 'GLOBAL_COMMIT', description: '2PC coordinator global commit' },
  { name: 'GLOBAL_ABORT', description: '2PC coordinator global abort' },
  { name: 'ABORT_SIGNAL', description: 'Emergency cancel or abort signal' },
  { name: 'PED_BUTTON_PRESS', description: 'Pedestrian crossing call button' },
  { name: 'USER_ACTION', description: 'Interactive operator or user action' },
  { name: 'REQUEST', description: 'Client or service request payload' },
  { name: 'RESPONSE', description: 'Peer or service response payload' },
  { name: 'HEARTBEAT', description: 'Node liveness health pulse' },
  { name: 'ACK', description: 'Positive message acknowledgment' },
  { name: 'NACK', description: 'Negative acknowledgment / rejection' },
  { name: 'RETRY', description: 'Retry attempt dispatch' },
  { name: 'FAILOVER', description: 'High availability cluster failover' },
  { name: 'START', description: 'System or process start event' },
  { name: 'STOP', description: 'System or process shutdown event' },
  { name: 'RESET', description: 'Reset system to initial parameters' },
];

const TriggerMultiSelect: React.FC<TriggerMultiSelectProps> = ({
  selectedTriggers,
  primaryTrigger,
  onTriggersChange,
  allTransitions = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'model' | 'presets' | 'selected'>('all');
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawText, setRawText] = useState(() => selectedTriggers.join(', '));

  // Sync raw text when external triggers change
  useEffect(() => {
    setRawText(selectedTriggers.join(', '));
  }, [selectedTriggers]);

  // Discover triggers defined across all transitions in the state machine
  const modelTriggersMap = useMemo(() => {
    const counts = new Map<string, number>();
    allTransitions.forEach((t) => {
      const triggersInT = new Set<string>();
      if (t.trigger) {
        t.trigger.split(',').forEach((tr) => {
          const trimmed = tr.trim();
          if (trimmed) triggersInT.add(trimmed);
        });
      }
      if (t.triggers && Array.isArray(t.triggers)) {
        t.triggers.forEach((tr) => {
          const trimmed = tr.trim();
          if (trimmed) triggersInT.add(trimmed);
        });
      }
      triggersInT.forEach((tr) => {
        counts.set(tr, (counts.get(tr) || 0) + 1);
      });
    });
    return counts;
  }, [allTransitions]);

  // Build combined list of options: presets + model triggers + already selected custom triggers
  const allOptions = useMemo(() => {
    const map = new Map<string, TriggerOption>();

    // 1. Add Presets
    PRESET_TRIGGERS.forEach((p) => {
      map.set(p.name, {
        name: p.name,
        inModel: modelTriggersMap.has(p.name),
        modelCount: modelTriggersMap.get(p.name) || 0,
        isPreset: true,
        description: p.description,
      });
    });

    // 2. Add Model Triggers not already covered
    modelTriggersMap.forEach((count, name) => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          inModel: true,
          modelCount: count,
          isPreset: false,
          description: `Discovered in model (${count} transition${count === 1 ? '' : 's'})`,
        });
      }
    });

    // 3. Add any selected triggers that are custom
    selectedTriggers.forEach((name) => {
      if (!map.has(name)) {
        map.set(name, {
          name,
          inModel: false,
          modelCount: 0,
          isPreset: false,
          description: 'Custom trigger',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const aSel = selectedTriggers.includes(a.name) ? 1 : 0;
      const bSel = selectedTriggers.includes(b.name) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel;
      if (a.inModel !== b.inModel) return a.inModel ? -1 : 1;
      if (a.modelCount !== b.modelCount) return b.modelCount - a.modelCount;
      return a.name.localeCompare(b.name);
    });
  }, [modelTriggersMap, selectedTriggers]);

  // Filter options based on search query and active tab
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allOptions.filter((opt) => {
      if (filterTab === 'model' && !opt.inModel) return false;
      if (filterTab === 'presets' && !opt.isPreset) return false;
      if (filterTab === 'selected' && !selectedTriggers.includes(opt.name)) return false;
      if (!q) return true;
      return (
        opt.name.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
      );
    });
  }, [allOptions, filterTab, searchQuery, selectedTriggers]);

  const trimmedQuery = searchQuery.trim().toUpperCase();
  const isExactMatch = allOptions.some((o) => o.name.toUpperCase() === trimmedQuery);
  const canAddNew = trimmedQuery.length > 0 && !isExactMatch;

  const handleToggleOption = (triggerName: string) => {
    if (selectedTriggers.includes(triggerName)) {
      const next = selectedTriggers.filter((t) => t !== triggerName);
      const nextPrimary = primaryTrigger === triggerName ? (next[0] || '') : primaryTrigger;
      onTriggersChange(next, nextPrimary);
    } else {
      const next = [...selectedTriggers, triggerName];
      const nextPrimary = primaryTrigger ? primaryTrigger : triggerName;
      onTriggersChange(next, nextPrimary);
    }
  };

  const handleSetPrimary = (triggerName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedTriggers.includes(triggerName)) {
      onTriggersChange([...selectedTriggers, triggerName], triggerName);
    } else {
      onTriggersChange(selectedTriggers, triggerName);
    }
  };

  const handleAddCustomTrigger = () => {
    if (!trimmedQuery) return;
    if (!selectedTriggers.includes(trimmedQuery)) {
      const next = [...selectedTriggers, trimmedQuery];
      const nextPrimary = primaryTrigger || trimmedQuery;
      onTriggersChange(next, nextPrimary);
    }
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canAddNew) {
        handleAddCustomTrigger();
      } else if (filteredOptions.length > 0) {
        handleToggleOption(filteredOptions[0].name);
      }
    }
  };

  const handleClearAll = () => {
    onTriggersChange([], '');
  };

  const handleRawTextChange = (val: string) => {
    setRawText(val);
    const parsed = val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const nextPrimary = parsed.includes(primaryTrigger) ? primaryTrigger : (parsed[0] || '');
    onTriggersChange(parsed, nextPrimary);
  };

  const modelOptionsCount = useMemo(() => allOptions.filter((o) => o.inModel).length, [allOptions]);
  const presetOptionsCount = useMemo(() => allOptions.filter((o) => o.isPreset).length, [allOptions]);

  return (
    <div className="p-3.5 bg-[#12151B] border border-[#3B82F6]/30 rounded-xl space-y-3">
      {/* Header & Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#D29922]" />
          <div>
            <h4 className="font-semibold text-[#F0F6FC] text-xs flex items-center space-x-1.5">
              <span>Event Triggers Multi-Select</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#3B82F6]/15 text-[#58a6ff] border border-[#3B82F6]/30 font-mono">
                Simulator Validated
              </span>
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsRawMode(!isRawMode)}
          className="text-[10px] text-[#8B949E] hover:text-[#58a6ff] flex items-center space-x-1 transition-colors px-2 py-0.5 rounded hover:bg-[#16191E]"
          title="Toggle raw comma-separated text mode"
        >
          <Code className="w-3 h-3" />
          <span>{isRawMode ? 'Use Multi-Select' : 'Raw Text Mode'}</span>
        </button>
      </div>

      <p className="text-[11px] text-[#8B949E] leading-relaxed">
        Select one or more event triggers that activate this transition. The simulation engine only fires this transition when one of its defined event triggers matches the dispatched event.
      </p>

      {/* Selected Triggers Pills Area */}
      <div className="bg-[#0F1115] border border-[#2D333B] rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5 text-[#C9D1D9] font-medium">
            <Tag className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Active Triggers</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#21262D] text-[#8B949E] rounded-full font-mono">
              {selectedTriggers.length}
            </span>
          </div>
          {selectedTriggers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] text-[#F85149] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {selectedTriggers.length === 0 ? (
          <div className="p-2.5 bg-[#16191E]/60 border border-dashed border-[#2D333B] rounded-md text-center">
            <span className="text-[11px] text-[#8B949E]">
              ⚡ No event triggers selected. This transition is <strong className="text-[#C9D1D9]">spontaneous</strong> and fires automatically when its guard condition is satisfied.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {selectedTriggers.map((trig) => {
              const isPrimary = primaryTrigger === trig;
              return (
                <div
                  key={trig}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                    isPrimary
                      ? 'bg-[#D29922]/15 border border-[#D29922]/60 text-[#F0E6D2] shadow-xs'
                      : 'bg-[#16191E] border border-[#2D333B] text-[#C9D1D9] hover:border-[#3B82F6]/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => handleSetPrimary(trig, e)}
                    className="focus:outline-none"
                    title={isPrimary ? 'Primary simulation trigger' : 'Click to make primary trigger'}
                  >
                    <Star
                      className={`w-3 h-3 ${
                        isPrimary
                          ? 'text-[#D29922] fill-[#D29922]'
                          : 'text-[#8B949E] hover:text-[#D29922]'
                      }`}
                    />
                  </button>

                  <span className="font-semibold">{trig}</span>

                  {isPrimary && (
                    <span className="text-[9px] px-1 py-0.2 bg-[#D29922]/20 text-[#D29922] font-bold rounded">
                      PRIMARY
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleOption(trig)}
                    className="text-[#8B949E] hover:text-[#F85149] ml-1 focus:outline-none"
                    title="Remove trigger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw Comma-Separated Mode */}
      {isRawMode ? (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-[#8B949E] block">
            Comma-separated Triggers:
          </label>
          <input
            type="text"
            value={rawText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            placeholder="e.g. TIMEOUT, ABORT_SIGNAL, VOTE_COMMIT"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
          />
        </div>
      ) : (
        /* Searchable Multi-Select UI */
        <div className="space-y-2">
          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search triggers or type new (e.g. TIMEOUT, VOTE)..."
              className="w-full pl-9 pr-8 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#C9D1D9]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Add Custom Trigger Action */}
          {canAddNew && (
            <button
              type="button"
              onClick={handleAddCustomTrigger}
              className="w-full flex items-center justify-between p-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/40 rounded-lg text-xs text-[#58a6ff] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-3.5 h-3.5" />
                <span>
                  Add <strong className="font-mono underline">{trimmedQuery}</strong> as custom trigger
                </span>
              </div>
              <span className="text-[10px] text-[#8B949E] bg-[#16191E] px-1.5 py-0.5 rounded font-mono">
                Press Enter ↵
              </span>
            </button>
          )}

          {/* Filter Pills */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filterTab === 'all'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#16191E] text-[#8B949E] hover:text-[#C9D1D9] border border-[#2D333B]'
                }`}
              >
                All ({allOptions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('model')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filterTab === 'model'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#16191E] text-[#8B949E] hover:text-[#C9D1D9] border border-[#2D333B]'
                }`}
              >
                In Model ({modelOptionsCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('presets')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filterTab === 'presets'
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#16191E] text-[#8B949E] hover:text-[#C9D1D9] border border-[#2D333B]'
                }`}
              >
                Presets ({presetOptionsCount})
              </button>
              {selectedTriggers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('selected')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    filterTab === 'selected'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#16191E] text-[#8B949E] hover:text-[#C9D1D9] border border-[#2D333B]'
                  }`}
                >
                  Selected ({selectedTriggers.length})
                </button>
              )}
            </div>

            <span className="text-[10px] text-[#8B949E]">
              {filteredOptions.length} option{filteredOptions.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Scrollable Multi-Select Options List */}
          <div className="max-h-48 overflow-y-auto space-y-1 bg-[#0F1115] border border-[#2D333B] rounded-lg p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8B949E]">
                No matching triggers found for &quot;{searchQuery}&quot;.
                {trimmedQuery && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleAddCustomTrigger}
                      className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold rounded-md transition-colors"
                    >
                      Create trigger &quot;{trimmedQuery}&quot;
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedTriggers.includes(opt.name);
                const isPrimary = primaryTrigger === opt.name;

                return (
                  <div
                    key={opt.name}
                    onClick={() => handleToggleOption(opt.name)}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors group ${
                      isSelected
                        ? isPrimary
                          ? 'bg-[#D29922]/15 border border-[#D29922]/40 text-[#F0F6FC]'
                          : 'bg-[#3B82F6]/15 border border-[#3B82F6]/40 text-[#F0F6FC]'
                        : 'hover:bg-[#16191E] border border-transparent text-[#C9D1D9]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare
                            className={`w-4 h-4 ${
                              isPrimary ? 'text-[#D29922]' : 'text-[#3B82F6]'
                            }`}
                          />
                        ) : (
                          <Square className="w-4 h-4 text-[#8B949E] group-hover:text-[#C9D1D9]" />
                        )}
                      </div>

                      {/* Trigger Name & Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold truncate">
                            {opt.name}
                          </span>

                          {/* Source Origin Pill */}
                          {opt.inModel ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#388BFD]/15 text-[#58a6ff] border border-[#388BFD]/30 font-medium">
                              Model ({opt.modelCount})
                            </span>
                          ) : opt.isPreset ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#21262D] text-[#8B949E] font-medium">
                              Preset
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D29922]/15 text-[#D29922] font-medium">
                              Custom
                            </span>
                          )}

                          {isPrimary && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#D29922]/20 text-[#D29922] font-bold">
                              PRIMARY
                            </span>
                          )}
                        </div>

                        {opt.description && (
                          <p className="text-[10px] text-[#8B949E] truncate pt-0.5">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Set as Primary Action */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => handleSetPrimary(opt.name, e)}
                        className={`p-1 rounded hover:bg-[#21262D] focus:outline-none transition-colors ml-2 ${
                          isPrimary
                            ? 'text-[#D29922]'
                            : 'text-[#8B949E] hover:text-[#D29922]'
                        }`}
                        title={isPrimary ? 'Current primary trigger' : 'Click to make primary'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isPrimary ? 'fill-[#D29922]' : ''}`} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Simulation Behavior Card */}
      <div className="p-2.5 bg-[#0F1115] border border-[#2D333B] rounded-lg flex items-start space-x-2 text-[11px]">
        <Sparkles className="w-3.5 h-3.5 text-[#58a6ff] flex-shrink-0 mt-0.5" />
        <div className="text-[#8B949E] leading-relaxed">
          {selectedTriggers.length === 0 ? (
            <span>
              <strong className="text-[#F0F6FC]">Spontaneous Transition:</strong> Fires automatically during simulation without waiting for any event dispatch whenever its guard condition holds.
            </span>
          ) : selectedTriggers.length === 1 ? (
            <span>
              <strong className="text-[#F0F6FC]">Single Event Trigger:</strong> In simulation, dispatching event <code className="text-[#58a6ff] font-mono px-1 py-0.2 bg-[#16191E] rounded">{selectedTriggers[0]}</code> will activate and fire this transition.
            </span>
          ) : (
            <span>
              <strong className="text-[#F0F6FC]">Multi-Event Trigger:</strong> Transition will activate if <em className="text-[#C9D1D9]">ANY</em> of the {selectedTriggers.length} selected events are dispatched: {selectedTriggers.map((t, i) => (
                <span key={t}>
                  {i > 0 && ', '}
                  <code className={`font-mono px-1 py-0.2 rounded ${t === primaryTrigger ? 'bg-[#D29922]/20 text-[#D29922] font-bold' : 'bg-[#16191E] text-[#58a6ff]'}`}>
                    {t}{t === primaryTrigger ? ' (Primary)' : ''}
                  </code>
                </span>
              ))}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. Transition Form
const TransitionForm: React.FC<{
  transition?: Partial<Transition>;
  states: StateNode[];
  transitions?: Transition[];
  variables?: Variable[];
  simVariables?: Record<string, unknown>;
  onClose: () => void;
  onSave: (data: Partial<Transition>) => Promise<void>;
}> = ({
  transition,
  states,
  transitions = [],
  variables = [],
  simVariables = {},
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(transition?.name || '');
  const [fromStateId, setFromStateId] = useState(
    transition?.from_state_id || (states[0]?.id || '')
  );
  const [toStateId, setToStateId] = useState(
    transition?.to_state_id || (states[1]?.id || states[0]?.id || '')
  );

  // Initialize selected triggers list from transition.trigger and transition.triggers
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(() => {
    const list: string[] = [];
    if (transition?.trigger) {
      transition.trigger.split(',').forEach((s) => {
        const trimmed = s.trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    if (transition?.triggers && Array.isArray(transition.triggers)) {
      transition.triggers.forEach((s) => {
        const trimmed = s.trim();
        if (trimmed && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    return list;
  });

  const [primaryTrigger, setPrimaryTrigger] = useState<string>(() => {
    return transition?.trigger?.trim() || selectedTriggers[0] || '';
  });

  const [triggerCondition, setTriggerCondition] = useState(
    transition?.trigger_condition || ''
  );
  // Constraints field using simple boolean expression language
  const [constraints, setConstraints] = useState(
    transition?.constraints || transition?.guard_expression || ''
  );
  const [guard, setGuard] = useState(transition?.guard_expression || '');
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  const [actionJson, setActionJson] = useState(
    transition?.action ? JSON.stringify(transition.action, null, 2) : ''
  );
  const [weakFairness, setWeakFairness] = useState(transition?.weak_fairness || false);
  const [strongFairness, setStrongFairness] = useState(transition?.strong_fairness || false);
  const [loading, setLoading] = useState(false);

  // Real-time syntax & evaluation of constraints
  const syntaxCheck = useMemo(() => {
    return validateBooleanExpressionSyntax(constraints);
  }, [constraints]);

  // Context variables for testing guard in modal
  const evaluationContext = useMemo(() => {
    const vars: Record<string, unknown> = {};
    if (variables) {
      variables.forEach((v) => {
        vars[v.name] = v.initial_value;
      });
    }
    if (simVariables && Object.keys(simVariables).length > 0) {
      Object.assign(vars, simVariables);
    }
    return vars;
  }, [variables, simVariables]);

  const fromStateNode = states.find((s) => s.id === fromStateId);

  const evaluationResult = useMemo(() => {
    if (!constraints.trim()) return null;
    if (!syntaxCheck.valid) return null;
    try {
      const satisfied = evaluateGuard(constraints, evaluationContext, fromStateNode?.name);
      return { satisfied, error: null };
    } catch (err: unknown) {
      return { satisfied: false, error: (err as Error).message };
    }
  }, [constraints, syntaxCheck.valid, evaluationContext, fromStateNode]);

  const insertAtConstraint = (text: string) => {
    setConstraints((prev) => {
      const trimmed = prev.trimEnd();
      const updated = trimmed ? `${trimmed} ${text}` : text;
      setGuard(updated);
      return updated;
    });
  };

  const handleTriggersChange = (newTriggers: string[], newPrimary: string) => {
    setSelectedTriggers(newTriggers);
    setPrimaryTrigger(newPrimary);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let actionVal: Record<string, unknown> | undefined = undefined;
    if (actionJson.trim()) {
      try {
        actionVal = JSON.parse(actionJson);
      } catch {
        // preserve
      }
    }

    const cleanedTriggers = selectedTriggers.map((s) => s.trim()).filter(Boolean);
    const effectivePrimary = primaryTrigger.trim() || cleanedTriggers[0] || undefined;
    const effectiveConstraint = constraints.trim() || undefined;

    try {
      await onSave({
        ...transition,
        name: name.trim(),
        from_state_id: fromStateId,
        to_state_id: toStateId,
        trigger: effectivePrimary,
        triggers: cleanedTriggers.length > 0 ? cleanedTriggers : undefined,
        trigger_condition: triggerCondition.trim() || undefined,
        constraints: effectiveConstraint,
        guard_expression: effectiveConstraint || guard.trim() || undefined,
        action: actionVal,
        weak_fairness: weakFairness,
        strong_fairness: strongFairness,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between p-4 border-b border-[#2D333B]">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#58a6ff]" />
          <h3 className="font-semibold text-sm text-[#F0F6FC]">
            {transition?.id ? 'Edit Transition' : 'New Transition'}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="text-[#8B949E] hover:text-[#C9D1D9]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Transition Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PrepareVotes, TimeoutToAbort"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-[#8B949E] block mb-1">Source State *</label>
            <select
              value={fromStateId}
              onChange={(e) => setFromStateId(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] focus:outline-none focus:border-[#3B82F6]"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-[#8B949E] block mb-1">Target State *</label>
            <select
              value={toStateId}
              onChange={(e) => setToStateId(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] focus:outline-none focus:border-[#3B82F6]"
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Enhanced Searchable Multi-Select Trigger Section */}
        <TriggerMultiSelect
          selectedTriggers={selectedTriggers}
          primaryTrigger={primaryTrigger}
          onTriggersChange={handleTriggersChange}
          allTransitions={transitions}
        />

        {/* Optional Trigger Condition / Expression */}
        <div className="p-3 bg-[#0F1115] border border-[#2D333B] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-medium text-[#8B949E] block text-xs">
              Trigger Condition / Expression (Optional)
            </label>
            <span className="text-[10px] text-[#8B949E] font-mono">TLA+ Expression</span>
          </div>
          <input
            type="text"
            value={triggerCondition}
            onChange={(e) => setTriggerCondition(e.target.value)}
            placeholder='e.g. event == "TIMEOUT" \/ retryCount < 3'
            className="w-full px-3 py-2 bg-[#16191E] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
          />
          <span className="text-[10px] text-[#8B949E] block">
            Evaluated against event payloads and simulation state variables when checking if this transition is fireable.
          </span>
        </div>

        {/* Constraints (Guard Conditions) with Simple Boolean Expression Language */}
        <div className="p-3.5 bg-[#0F1115] border border-[#2D333B] rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-[#58a6ff]" />
              <label className="font-semibold text-[#F0F6FC] text-xs">
                Constraints (Guard Conditions)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262D] text-[#8B949E] font-mono border border-[#30363D]">
                Boolean Expression Language
              </span>
              <button
                type="button"
                onClick={() => setShowSyntaxGuide(!showSyntaxGuide)}
                className="text-[11px] text-[#58a6ff] hover:text-[#79b8ff] flex items-center space-x-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{showSyntaxGuide ? 'Hide Guide' : 'Syntax Guide'}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#8B949E]">
            Define guard conditions using boolean expressions. The transition will only be enabled and fireable in simulation when this expression evaluates to TRUE.
          </p>

          <input
            type="text"
            value={constraints}
            onChange={(e) => {
              setConstraints(e.target.value);
              setGuard(e.target.value);
            }}
            placeholder='e.g. rmPrepared = 2 /\ decision = "PENDING"'
            className={`w-full px-3 py-2 bg-[#16191E] border rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none font-mono text-xs ${
              !syntaxCheck.valid
                ? 'border-[#f85149] focus:border-[#f85149]'
                : constraints.trim() && evaluationResult?.satisfied
                ? 'border-[#238636] focus:border-[#3fb950]'
                : 'border-[#2D333B] focus:border-[#3B82F6]'
            }`}
          />

          {/* Quick Insert Operators & Variables */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-[#8B949E] mr-1">Operators:</span>
              {[
                { label: '/\\ (AND)', val: '/\\' },
                { label: '\\/ (OR)', val: '\\/' },
                { label: '~ (NOT)', val: '~' },
                { label: '=', val: '=' },
                { label: '!=', val: '!=' },
                { label: '<', val: '<' },
                { label: '<=', val: '<=' },
                { label: '>', val: '>' },
                { label: '>=', val: '>=' },
                { label: '( )', val: '( )' },
              ].map((op) => (
                <button
                  key={op.label}
                  type="button"
                  onClick={() => insertAtConstraint(op.val)}
                  className="px-1.5 py-0.5 rounded bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] hover:text-white text-[10px] font-mono border border-[#30363D] transition-colors"
                >
                  {op.label}
                </button>
              ))}
            </div>

            {variables && variables.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-[#8B949E] mr-1">Variables:</span>
                {variables.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertAtConstraint(v.name)}
                    className="px-1.5 py-0.5 rounded bg-[#16191E] hover:bg-[#21262D] text-[#58a6ff] hover:text-[#79b8ff] text-[10px] font-mono border border-[#58a6ff]/30 transition-colors"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Syntax & Evaluation Feedback Banner */}
          {constraints.trim() && (
            <div className="pt-1">
              {!syntaxCheck.valid ? (
                <div className="p-2 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] flex items-center space-x-2 text-[11px] font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Syntax Error: {syntaxCheck.error}</span>
                </div>
              ) : evaluationResult ? (
                <div
                  className={`p-2 rounded-lg border flex items-center justify-between text-[11px] font-mono ${
                    evaluationResult.satisfied
                      ? 'bg-[#238636]/10 border-[#238636]/30 text-[#3fb950]'
                      : 'bg-[#D29922]/10 border-[#D29922]/30 text-[#D29922]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {evaluationResult.satisfied ? (
                      <Check className="w-3.5 h-3.5 text-[#3fb950] shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-[#D29922] shrink-0" />
                    )}
                    <span>
                      {evaluationResult.satisfied
                        ? 'Guard condition SATISFIED by current variables (PASS)'
                        : 'Guard condition NOT MET by current variables (BLOCKED)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8B949E]">
                    {evaluationResult.satisfied ? 'Enabled' : 'Blocked'}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Collapsible Boolean Expression Language Guide */}
          {showSyntaxGuide && (
            <div className="p-3 bg-[#16191E] rounded-lg border border-[#30363D] text-[11px] space-y-2 text-[#8B949E]">
              <div className="font-semibold text-[#C9D1D9] text-xs">
                Boolean Expression Language Reference:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="space-y-1">
                  <div><span className="text-[#58a6ff]">/\</span> or <span className="text-[#58a6ff]">&&</span> or <span className="text-[#58a6ff]">AND</span> : Conjunction</div>
                  <div><span className="text-[#58a6ff]">\/</span> or <span className="text-[#58a6ff]">||</span> or <span className="text-[#58a6ff]">OR</span> : Disjunction</div>
                  <div><span className="text-[#58a6ff]">~</span> or <span className="text-[#58a6ff]">!</span> or <span className="text-[#58a6ff]">NOT</span> : Negation</div>
                </div>
                <div className="space-y-1">
                  <div><span className="text-[#58a6ff]">=</span> or <span className="text-[#58a6ff]">==</span> : Equality</div>
                  <div><span className="text-[#58a6ff]">!=</span> or <span className="text-[#58a6ff]">/=</span> : Inequality</div>
                  <div><span className="text-[#58a6ff]">&lt;, &lt;=, &gt;, &gt;=</span> : Comparisons</div>
                </div>
              </div>
              <div className="pt-1 text-[10px]">
                <span className="text-[#C9D1D9] font-medium">Quick Presets: </span>
                <button
                  type="button"
                  onClick={() => {
                    setConstraints('rmPrepared = 2 /\\ decision = "PENDING"');
                    setGuard('rmPrepared = 2 /\\ decision = "PENDING"');
                  }}
                  className="underline hover:text-[#58a6ff] mr-2"
                >
                  Two-phase commit guard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConstraints('pedestrianWaiting = TRUE /\\ counter >= 5');
                    setGuard('pedestrianWaiting = TRUE /\\ counter >= 5');
                  }}
                  className="underline hover:text-[#58a6ff] mr-2"
                >
                  Traffic timer constraint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConstraints('retryCount < 3 /\\ ~isLocked');
                    setGuard('retryCount < 3 /\\ ~isLocked');
                  }}
                  className="underline hover:text-[#58a6ff]"
                >
                  Retry & lock guard
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Action JSON (Variable Updates)</label>
          <textarea
            rows={2}
            value={actionJson}
            onChange={(e) => setActionJson(e.target.value)}
            placeholder='{ "rmPrepared": 2 }'
            className="w-full p-2.5 bg-[#0F1115] text-[#C9D1D9] border border-[#2D333B] rounded-lg text-xs font-mono focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div className="flex items-center space-x-6 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={weakFairness}
              onChange={(e) => setWeakFairness(e.target.checked)}
              className="rounded border-[#2D333B] bg-[#0F1115] text-[#3B82F6] focus:ring-0"
            />
            <span className="text-[#C9D1D9]">Weak Fairness (WF)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={strongFairness}
              onChange={(e) => setStrongFairness(e.target.checked)}
              className="rounded border-[#2D333B] bg-[#0F1115] text-[#3B82F6] focus:ring-0"
            />
            <span className="text-[#C9D1D9]">Strong Fairness (SF)</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 p-4 border-t border-[#2D333B] bg-[#0F1115]">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs text-[#8B949E] hover:text-[#C9D1D9]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Transition'}
        </button>
      </div>
    </form>
  );
};

// 3. Variable Form
const VariableForm: React.FC<{
  variable?: Partial<Variable>;
  onClose: () => void;
  onSave: (data: Partial<Variable>) => Promise<void>;
}> = ({ variable, onClose, onSave }) => {
  const [name, setName] = useState(variable?.name || '');
  const [type, setType] = useState(variable?.type || 'integer');
  const [initialValue, setInitialValue] = useState(
    variable?.initial_value !== undefined ? String(variable.initial_value) : '0'
  );
  const [domain, setDomain] = useState(
    variable?.domain ? (typeof variable.domain === 'string' ? variable.domain : JSON.stringify(variable.domain)) : ''
  );
  const [description, setDescription] = useState(variable?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let parsedInitial: unknown = initialValue;
    if (type === 'integer' || type === 'number') parsedInitial = Number(initialValue);
    if (type === 'boolean') parsedInitial = initialValue === 'true' || initialValue === 'TRUE';

    try {
      await onSave({
        ...variable,
        name: name.trim(),
        type,
        initial_value: parsedInitial,
        domain: domain.trim() || undefined,
        description: description.trim(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between p-4 border-b border-[#2D333B]">
        <h3 className="font-semibold text-sm text-[#F0F6FC]">
          {variable?.id ? 'Edit Variable' : 'New Variable'}
        </h3>
        <button type="button" onClick={onClose} className="text-[#8B949E] hover:text-[#C9D1D9]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 text-xs">
        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Variable Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. rmPrepared, timer, decision"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] font-mono focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-[#8B949E] block mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] focus:outline-none focus:border-[#3B82F6]"
            >
              <option value="integer">Integer</option>
              <option value="string">String</option>
              <option value="boolean">Boolean</option>
              <option value="set">Set</option>
            </select>
          </div>

          <div>
            <label className="font-medium text-[#8B949E] block mb-1">Initial Value</label>
            <input
              type="text"
              value={initialValue}
              onChange={(e) => setInitialValue(e.target.value)}
              placeholder="0, true, 'PENDING'"
              className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] font-mono focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Domain / Allowed Values</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="0..5 or ['PENDING', 'COMMITTED']"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] font-mono focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the role of this state variable"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 p-4 border-t border-[#2D333B] bg-[#0F1115]">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs text-[#8B949E] hover:text-[#C9D1D9]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Variable'}
        </button>
      </div>
    </form>
  );
};

// 4. Invariant Form
const InvariantForm: React.FC<{
  invariant?: Partial<Invariant>;
  onClose: () => void;
  onSave: (data: Partial<Invariant>) => Promise<void>;
}> = ({ invariant, onClose, onSave }) => {
  const [name, setName] = useState(invariant?.name || '');
  const [expression, setExpression] = useState(invariant?.expression || '');
  const [description, setDescription] = useState(invariant?.description || '');
  const [isTypeInvariant, setIsTypeInvariant] = useState(
    invariant?.is_type_invariant || false
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...invariant,
        name: name.trim(),
        expression: expression.trim(),
        description: description.trim(),
        is_type_invariant: isTypeInvariant,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between p-4 border-b border-[#2D333B]">
        <h3 className="font-semibold text-sm text-[#F0F6FC]">
          {invariant?.id ? 'Edit Invariant' : 'New Invariant'}
        </h3>
        <button type="button" onClick={onClose} className="text-[#8B949E] hover:text-[#C9D1D9]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 text-xs">
        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Invariant Identifier *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. MutualExclusionSafety, TCConsistency"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] font-mono focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Formal TLA+ Expression *</label>
          <textarea
            rows={3}
            required
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder='~(currentState = "COMMITTED" /\ currentState = "ABORTED")'
            className="w-full p-2.5 bg-[#0F1115] text-[#C9D1D9] border border-[#2D333B] rounded-lg font-mono text-xs focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Safety Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What property this guarantees"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <label className="flex items-center space-x-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={isTypeInvariant}
            onChange={(e) => setIsTypeInvariant(e.target.checked)}
            className="rounded border-[#2D333B] bg-[#0F1115] text-[#3B82F6] focus:ring-0"
          />
          <span className="text-[#C9D1D9]">Is TypeOK Invariant</span>
        </label>
      </div>

      <div className="flex items-center justify-end space-x-2 p-4 border-t border-[#2D333B] bg-[#0F1115]">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs text-[#8B949E] hover:text-[#C9D1D9]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim() || !expression.trim()}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Invariant'}
        </button>
      </div>
    </form>
  );
};

// 5. New Registry Form
const RegistryForm: React.FC<{
  onClose: () => void;
  onSave: (data: Partial<Registry>) => Promise<void>;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        version: version.trim() || '1.0.0',
        tags: tagArray,
        tla_plus_module: name.trim().replace(/[^a-zA-Z0-9_]/g, '_'),
        is_active: true,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between p-4 border-b border-[#2D333B]">
        <h3 className="font-semibold text-sm text-[#F0F6FC]">Create State-Machine Registry</h3>
        <button type="button" onClick={onClose} className="text-[#8B949E] hover:text-[#C9D1D9]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3 text-xs">
        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Registry Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. RaftConsensus, PaymentPipeline"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] font-mono focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Version</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="High-level description of the system specification"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>

        <div>
          <label className="font-medium text-[#8B949E] block mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="distributed, consensus, safety"
            className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D333B] rounded-lg text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2 p-4 border-t border-[#2D333B] bg-[#0F1115]">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs text-[#8B949E] hover:text-[#C9D1D9]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Registry'}
        </button>
      </div>
    </form>
  );
};
