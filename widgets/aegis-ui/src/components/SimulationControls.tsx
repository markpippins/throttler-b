/**
 * Interactive State Machine Simulation Controls & Debugger
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  ArrowRight,
  Database,
  History,
  CheckCircle,
  AlertTriangle,
  Radio,
  XCircle,
} from 'lucide-react';
import {
  StateNode,
  Transition,
  Variable,
  SimState,
} from '../types';
import { validateTrigger, evaluateTransitionConstraints, ConstraintEvaluationResult } from '../utils/simulator';
import { VariableWatchPanel } from './VariableWatchPanel';

interface SimulationControlsProps {
  states: StateNode[];
  transitions: Transition[];
  variables: Variable[];
  simState: SimState | null;
  enabledTransitions: { transition: Transition; toState: StateNode | undefined }[];
  onFireTransition: (transition: Transition, triggerEvent?: string) => void;
  onResetSimulation: () => void;
  onStepBackward: () => void;
  onUpdateVariableValue?: (varName: string, value: unknown) => void;
  onResetAllVariables?: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  states,
  transitions,
  variables,
  simState,
  enabledTransitions: baseEnabledTransitions,
  onFireTransition,
  onResetSimulation,
  onStepBackward,
  onUpdateVariableValue,
  onResetAllVariables,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1200);
  const [activeEventTrigger, setActiveEventTrigger] = useState<string>('');
  const [customEventInput, setCustomEventInput] = useState<string>('');

  // Discovered triggers defined across transitions in this model
  const availableTriggers = useMemo(() => {
    const set = new Set<string>();
    transitions.forEach((t) => {
      if (t.trigger) {
        t.trigger.split(',').forEach((tr) => {
          const trimmed = tr.trim();
          if (trimmed) set.add(trimmed);
        });
      }
      if (t.triggers && Array.isArray(t.triggers)) {
        t.triggers.forEach((tr) => {
          const trimmed = tr.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [transitions]);

  // Current active state
  const currentState = states.find((s) => s.id === simState?.currentStateId);

  // All outgoing transitions from the current state
  const currentOutgoingTransitions = useMemo(() => {
    if (!simState) return [];
    return transitions.filter((t) => t.from_state_id === simState.currentStateId);
  }, [simState, transitions]);

  // Evaluated transitions with guard and trigger validations
  const evaluatedTransitions = useMemo(() => {
    if (!simState) return [];

    return currentOutgoingTransitions.map((t) => {
      const toState = states.find((s) => s.id === t.to_state_id);

      // Guard & Constraints check
      const constraintResult = evaluateTransitionConstraints(t, simState.variables, currentState?.name);
      const guardPassed = constraintResult.satisfied;

      // Trigger check
      const triggerResult = validateTrigger(
        t,
        activeEventTrigger.trim() ? activeEventTrigger.trim() : undefined,
        simState.variables
      );

      const isFullyEnabled = guardPassed && triggerResult.valid;

      return {
        transition: t,
        toState,
        constraintResult,
        guardPassed,
        triggerResult,
        isFullyEnabled,
      };
    });
  }, [simState, currentOutgoingTransitions, states, currentState, activeEventTrigger]);

  const enabledList = evaluatedTransitions.filter((e) => e.isFullyEnabled);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && enabledList.length > 0) {
      timer = setTimeout(() => {
        const next = enabledList[0];
        if (next) {
          const trig = activeEventTrigger.trim() || next.transition.trigger || next.transition.triggers?.[0];
          onFireTransition(next.transition, trig);
        } else {
          setIsPlaying(false);
        }
      }, speedMs);
    } else if (isPlaying && enabledList.length === 0) {
      setIsPlaying(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, enabledList, speedMs, onFireTransition, activeEventTrigger]);

  const handleDispatchCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customEventInput.trim();
    if (val) {
      setActiveEventTrigger(val);
      setCustomEventInput('');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0F1115] p-6 text-[#C9D1D9]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Simulation Control Toolbar */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={enabledList.length === 0 && !isPlaying}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                isPlaying
                  ? 'bg-[#D29922] hover:bg-[#b07d17] text-white'
                  : 'bg-[#238636] hover:bg-[#2ea043] text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
            </button>

            <button
              onClick={() => {
                if (enabledList[0]) {
                  const t = enabledList[0].transition;
                  const trig = activeEventTrigger.trim() || t.trigger || t.triggers?.[0];
                  onFireTransition(t, trig);
                }
              }}
              disabled={isPlaying || enabledList.length === 0}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] text-[#C9D1D9] shadow-xs transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4 text-[#3B82F6]" />
              <span>Step Forward</span>
            </button>

            <button
              onClick={onStepBackward}
              disabled={isPlaying || (simState?.history.length ?? 0) <= 1}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] text-[#8B949E] hover:text-[#C9D1D9] shadow-xs transition-colors disabled:opacity-50"
            >
              <History className="w-4 h-4 text-[#8B949E]" />
              <span>Undo Step</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                onResetSimulation();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] text-[#8B949E] hover:text-[#C9D1D9] shadow-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-[#8B949E]" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-[#8B949E]">
              <Sliders className="w-3.5 h-3.5 text-[#8B949E]" />
              <span>Tick Speed:</span>
              <select
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="bg-[#0F1115] border border-[#2D333B] rounded px-2 py-1 text-xs text-[#C9D1D9] focus:outline-none focus:border-[#3B82F6]"
              >
                <option value={500}>Fast (0.5s)</option>
                <option value={1200}>Normal (1.2s)</option>
                <option value={2500}>Slow (2.5s)</option>
              </select>
            </div>

            <div className="h-6 w-px bg-[#2D333B]" />

            <div className="text-xs text-[#8B949E]">
              Step: <span className="font-bold text-[#F0F6FC] font-mono">{(simState?.history.length ?? 1) - 1}</span>
            </div>
          </div>
        </div>

        {/* Event Trigger Dispatcher Bar */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#D29922] animate-pulse" />
              <h3 className="font-bold text-xs text-[#F0F6FC] uppercase tracking-wider">
                Event Trigger Dispatcher
              </h3>
              <span className="text-[10px] text-[#8B949E]">
                (Validates transition trigger events and conditions before firing)
              </span>
            </div>

            {activeEventTrigger ? (
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#D29922]/15 text-[#D29922] border border-[#D29922]/30 text-xs font-mono font-semibold">
                  <Zap className="w-3 h-3" />
                  <span>Active Event: {activeEventTrigger}</span>
                </span>
                <button
                  onClick={() => setActiveEventTrigger('')}
                  title="Clear active event trigger"
                  className="p-1 hover:bg-[#21262D] rounded text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[#8B949E] px-2 py-0.5 rounded bg-[#0F1115] border border-[#2D333B]">
                Mode: Direct / All Enabled
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs text-[#8B949E] font-medium mr-1">Discovered Model Triggers:</span>
              {availableTriggers.length === 0 ? (
                <span className="text-xs text-[#8B949E] italic">No trigger tags defined on transitions</span>
              ) : (
                availableTriggers.map((tr) => {
                  const isActive = activeEventTrigger === tr;
                  return (
                    <button
                      key={tr}
                      type="button"
                      onClick={() => setActiveEventTrigger(isActive ? '' : tr)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                        isActive
                          ? 'bg-[#D29922] text-white shadow-xs'
                          : 'bg-[#0F1115] hover:bg-[#21262D] text-[#C9D1D9] border border-[#2D333B] hover:border-[#D29922]/50'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-[#D29922]" />
                      <span>{tr}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Custom event input */}
            <form onSubmit={handleDispatchCustomEvent} className="flex items-center space-x-2">
              <input
                type="text"
                value={customEventInput}
                onChange={(e) => setCustomEventInput(e.target.value)}
                placeholder="Dispatch custom event..."
                className="px-2.5 py-1 bg-[#0F1115] border border-[#2D333B] rounded-lg text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6] w-48"
              />
              <button
                type="submit"
                disabled={!customEventInput.trim()}
                className="px-2.5 py-1 bg-[#21262D] hover:bg-[#30363D] disabled:opacity-40 text-xs font-medium text-[#F0F6FC] border border-[#2D333B] rounded-lg transition-colors"
              >
                Dispatch
              </button>
            </form>
          </div>
        </div>

        {/* Current State & Available Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active State Card */}
          <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#3fb950] animate-ping" />
                <h3 className="font-bold text-sm text-[#F0F6FC] uppercase tracking-wider">
                  Active State Node
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#58a6ff] border border-[#3B82F6]/30 font-medium font-mono">
                Running
              </span>
            </div>

            {currentState ? (
              <div className="space-y-3">
                <div className="p-4 bg-[#0F1115] rounded-xl border border-[#2D333B]">
                  <span className="text-xs font-mono font-medium text-[#3B82F6] uppercase">State Identifier</span>
                  <p className="text-2xl font-black text-[#F0F6FC] mt-0.5">{currentState.name}</p>
                  {currentState.description && (
                    <p className="text-xs text-[#8B949E] mt-1">{currentState.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-[#0F1115] rounded-lg border border-[#2D333B] text-xs">
                    <span className="text-[#8B949E] block">Initial State</span>
                    <span className={`font-semibold ${currentState.is_initial ? 'text-[#3fb950]' : 'text-[#8B949E]'}`}>
                      {currentState.is_initial ? 'YES (Start)' : 'NO'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0F1115] rounded-lg border border-[#2D333B] text-xs">
                    <span className="text-[#8B949E] block">Terminal State</span>
                    <span className={`font-semibold ${currentState.is_terminal ? 'text-[#F0F6FC]' : 'text-[#8B949E]'}`}>
                      {currentState.is_terminal ? 'YES (Completion)' : 'NO'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#8B949E]">No active state selected</p>
            )}
          </div>

          {/* Enabled Transitions (Actions) */}
          <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#D29922]" />
                <h3 className="font-bold text-sm text-[#F0F6FC] uppercase tracking-wider">
                  Available Transitions ({evaluatedTransitions.length})
                </h3>
              </div>
              <span className="text-xs text-[#8B949E]">
                {enabledList.length} enabled / ready
              </span>
            </div>

            {evaluatedTransitions.length === 0 ? (
              <div className="p-8 text-center bg-[#0F1115] rounded-xl border border-dashed border-[#2D333B] text-[#8B949E] text-xs">
                {currentState?.is_terminal ? (
                  <div>
                    <CheckCircle className="w-8 h-8 text-[#3fb950] mx-auto mb-2" />
                    <p className="font-semibold text-[#F0F6FC]">Terminal State Reached</p>
                    <p className="text-[11px] text-[#8B949E] mt-1">
                      Execution completed. Click "Reset" to start a new simulation cycle.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-[#D29922]">No Transitions Enabled</p>
                    <p className="text-[11px] text-[#8B949E] mt-1">
                      Guards or triggers are blocking progress from {currentState?.name}.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {evaluatedTransitions.map(({ transition, toState, constraintResult, guardPassed, triggerResult, isFullyEnabled }) => {
                  const effectiveTrigger =
                    activeEventTrigger.trim() ||
                    transition.trigger ||
                    transition.triggers?.[0];

                  const activeConstraint = transition.constraints || transition.guard_expression;

                  return (
                    <div
                      key={transition.id}
                      className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                        isFullyEnabled
                          ? 'bg-[#0F1115] hover:bg-[#1C2128] border-[#2D333B] hover:border-[#3B82F6]/50'
                          : 'bg-[#0D0E12] border-[#21262D] opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-[#F0F6FC]">{transition.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#8B949E]" />
                            <span className="text-xs font-semibold text-[#58a6ff]">
                              {toState?.name || 'TARGET'}
                            </span>
                          </div>

                          {/* Trigger tags */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {transition.trigger ? (
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  triggerResult.valid
                                    ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40'
                                    : 'bg-[#D29922]/15 text-[#D29922] border-[#D29922]/40'
                                }`}
                              >
                                <Zap className="w-2.5 h-2.5" />
                                <span>Trigger: {transition.trigger}</span>
                                {triggerResult.valid && <span>✓</span>}
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#21262D] text-[#8B949E] border border-[#2D333B]">
                                <span>Spontaneous</span>
                              </span>
                            )}

                            {transition.trigger_condition && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-[#3B82F6]/10 text-[#58a6ff] border border-[#3B82F6]/30">
                                <span>Cond: {transition.trigger_condition}</span>
                              </span>
                            )}
                          </div>

                          {/* Constraints / Guard Expression Tag & Status */}
                          {activeConstraint && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  guardPassed
                                    ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40'
                                    : 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/40'
                                }`}
                                title={
                                  guardPassed
                                    ? 'Constraint condition satisfied by current simulation variables'
                                    : constraintResult?.reason || 'Constraint condition blocking transition'
                                }
                              >
                                <span className="font-semibold text-[9px] uppercase">
                                  {transition.constraints ? 'Constraint' : 'Guard'}:
                                </span>
                                <span>{activeConstraint}</span>
                                <span className="ml-1 font-bold">
                                  {guardPassed ? '✓ PASS' : '✗ BLOCKED'}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Reason why constraint failed */}
                          {!guardPassed && constraintResult?.reason && (
                            <div className="text-[10px] text-[#f85149] flex items-center space-x-1 font-mono">
                              <AlertTriangle className="w-3 h-3 text-[#f85149] shrink-0" />
                              <span className="truncate max-w-sm">{constraintResult.reason}</span>
                            </div>
                          )}

                          {transition.action && (
                            <div className="text-[10px] font-mono text-[#8B949E] truncate max-w-xs">
                              action: {JSON.stringify(transition.action)}
                            </div>
                          )}

                          {!triggerResult.valid && (
                            <div className="text-[10px] text-[#D29922] flex items-center space-x-1 font-mono">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{triggerResult.reason}</span>
                            </div>
                          )}
                        </div>

                        {/* Fire button */}
                        <div>
                          {isFullyEnabled ? (
                            <button
                              onClick={() => onFireTransition(transition, effectiveTrigger)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white shadow-xs transition-colors"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Fire</span>
                            </button>
                          ) : guardPassed && !triggerResult.valid && transition.trigger ? (
                            <button
                              onClick={() => {
                                setActiveEventTrigger(transition.trigger!);
                                onFireTransition(transition, transition.trigger!);
                              }}
                              title={`Dispatch '${transition.trigger}' and fire`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#16191E] hover:bg-[#21262D] text-[#D29922] border border-[#D29922]/50 hover:border-[#D29922] transition-colors"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Dispatch & Fire</span>
                            </button>
                          ) : (
                            <span
                              title={
                                !guardPassed
                                  ? `Blocked by guard constraint: ${activeConstraint}`
                                  : 'Blocked by trigger requirement'
                              }
                              className="text-[10px] px-2 py-1 rounded bg-[#16191E] text-[#8B949E] border border-[#2D333B]"
                            >
                              {!guardPassed ? 'Constraint Blocked' : 'Blocked'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Variable Watch Panel */}
        <VariableWatchPanel
          variables={variables}
          simState={simState}
          onUpdateVariableValue={onUpdateVariableValue}
          onResetAllVariables={onResetAllVariables}
        />

        {/* Simulation Trace History */}
        {simState && simState.history.length > 0 && (
          <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D333B]">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#3B82F6]" />
                <h4 className="font-bold text-xs text-[#F0F6FC] uppercase tracking-wider">
                  Simulation Execution History ({simState.history.length} steps)
                </h4>
              </div>
              <span className="text-xs text-[#8B949E]">Synchronized with Aegis execution-log</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {simState.history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-[#0F1115] rounded-lg border border-[#2D333B] text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-[#21262D] text-[#C9D1D9] border border-[#2D333B] flex items-center justify-center font-mono font-bold text-[10px]">
                      {h.step}
                    </span>
                    <span className="font-semibold text-[#F0F6FC]">{h.stateName}</span>
                    {h.transitionName && (
                      <span className="text-[11px] text-[#8B949E] flex items-center space-x-1.5">
                        <span>via</span>
                        <span className="font-medium text-[#58a6ff]">{h.transitionName}</span>
                        {h.triggerEvent && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#D29922]/15 text-[#D29922] border border-[#D29922]/30 text-[9px] font-mono">
                            <Zap className="w-2.5 h-2.5" />
                            <span>{h.triggerEvent}</span>
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-mono text-[#8B949E]">{h.timestamp}</span>
                    <span className="text-[10px] font-mono bg-[#0A0C10] text-[#C9D1D9] px-2 py-0.5 rounded border border-[#2D333B]">
                      {JSON.stringify(h.variables)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
