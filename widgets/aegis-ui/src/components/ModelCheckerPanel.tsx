/**
 * TLC Formal Verification & Model Checker Panel
 * Runs model checks, visualizes state space exploration, verified invariants,
 * and steps through counterexample error traces.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Activity,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck,
  RefreshCw,
  GitCommit,
} from 'lucide-react';
import {
  Registry,
  ModelCheckResult,
  ValidationResult,
  Invariant,
  TraceStep,
} from '../types';

interface ModelCheckerPanelProps {
  registry: Registry;
  invariants: Invariant[];
  modelCheckResults: ModelCheckResult[];
  validationResults: ValidationResult[];
  onRunModelCheck: () => Promise<void>;
  onRunValidation: () => Promise<void>;
  isChecking: boolean;
  isValidating: boolean;
}

export const ModelCheckerPanel: React.FC<ModelCheckerPanelProps> = ({
  registry,
  invariants,
  modelCheckResults,
  validationResults,
  onRunModelCheck,
  onRunValidation,
  isChecking,
  isValidating,
}) => {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'model-check' | 'validation'>('model-check');

  const latestResult =
    modelCheckResults.find((r) => r.id === selectedResultId) || modelCheckResults[0] || null;
  const latestValidation = validationResults[0] || null;

  return (
    <div className="h-full overflow-y-auto bg-[#0F1115] p-6 text-[#C9D1D9]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-[#16191E] rounded-xl border border-[#2D333B] p-6 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg border border-[#3B82F6]/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-[#F0F6FC] tracking-tight">
                TLC Model Checking & Formal Verification
              </h2>
            </div>
            <p className="text-xs text-[#8B949E] mt-1">
              Verifies safety invariants, temporal liveness properties, deadlock freedom, and reachable state space.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onRunValidation}
              disabled={isValidating}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <FileCheck className={`w-4 h-4 text-[#8B949E] ${isValidating ? 'animate-spin' : ''}`} />
              <span>Validate Spec</span>
            </button>

            <button
              onClick={onRunModelCheck}
              disabled={isChecking}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg shadow-sm shadow-[#238636]/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Exploring State Space...' : 'Run TLC Checker'}</span>
            </button>
          </div>
        </div>

        {/* Tab Toggle: Model Check Results vs Structural Validation */}
        <div className="flex space-x-2 border-b border-[#2D333B] pb-2">
          <button
            onClick={() => setActiveTab('model-check')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'model-check'
                ? 'bg-[#21262D] text-[#F0F6FC] border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#C9D1D9]'
            }`}
          >
            Model Check Engine Results ({modelCheckResults.length})
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'validation'
                ? 'bg-[#21262D] text-[#F0F6FC] border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#C9D1D9]'
            }`}
          >
            Structural Validation ({validationResults.length})
          </button>
        </div>

        {/* Main Content */}
        {activeTab === 'model-check' ? (
          latestResult ? (
            <div className="space-y-6">
              {/* Status Banner */}
              <div
                className={`p-5 rounded-xl border flex items-center justify-between ${
                  latestResult.status === 'pass'
                    ? 'bg-[#238636]/10 border-[#238636]/40 text-[#3fb950]'
                    : latestResult.status === 'fail'
                    ? 'bg-[#F85149]/10 border-[#F85149]/40 text-[#f85149]'
                    : 'bg-[#D29922]/10 border-[#D29922]/40 text-[#D29922]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {latestResult.status === 'pass' ? (
                    <CheckCircle2 className="w-8 h-8 text-[#3fb950]" />
                  ) : latestResult.status === 'fail' ? (
                    <XCircle className="w-8 h-8 text-[#f85149]" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-[#D29922]" />
                  )}
                  <div>
                    <h3 className="text-base font-bold uppercase tracking-wide">
                      Model Check {latestResult.status === 'pass' ? 'Passed: All Invariants Hold' : latestResult.status === 'fail' ? 'Failed: Violation Detected' : 'Error'}
                    </h3>
                    <p className="text-xs text-[#8B949E] mt-0.5">
                      Checked by: <span className="font-medium text-[#C9D1D9]">{latestResult.checked_by || 'aegis-tlc'}</span> ·{' '}
                      {new Date(latestResult.checked_at).toLocaleTimeString()} ·{' '}
                      Execution Time: <span className="font-semibold text-[#C9D1D9]">{latestResult.execution_time_ms} ms</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-[#8B949E] block">Check ID: {latestResult.id.slice(0, 8)}...</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0F1115] border border-[#2D333B] text-[#8B949E] font-medium inline-block mt-1">
                    Engine: {latestResult.trace?.engine || 'TLC'}
                  </span>
                </div>
              </div>

              {/* Exploration Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#16191E] p-4 rounded-xl border border-[#2D333B] shadow-sm">
                  <span className="text-xs text-[#8B949E] font-medium block">Distinct States</span>
                  <p className="text-2xl font-bold text-[#F0F6FC] mt-1 font-mono">
                    {latestResult.trace?.distinct_states ?? latestResult.trace?.total_states ?? 1}
                  </p>
                  <span className="text-[11px] text-[#8B949E] mt-1 block">Full reachable state graph</span>
                </div>

                <div className="bg-[#16191E] p-4 rounded-xl border border-[#2D333B] shadow-sm">
                  <span className="text-xs text-[#8B949E] font-medium block">Graph Diameter</span>
                  <p className="text-2xl font-bold text-[#F0F6FC] mt-1 font-mono">
                    {latestResult.trace?.diameter ?? 1} steps
                  </p>
                  <span className="text-[11px] text-[#8B949E] mt-1 block">Longest acyclic path</span>
                </div>

                <div className="bg-[#16191E] p-4 rounded-xl border border-[#2D333B] shadow-sm">
                  <span className="text-xs text-[#8B949E] font-medium block">Invariants Verified</span>
                  <p className="text-2xl font-bold text-[#F0F6FC] mt-1 font-mono">
                    {invariants.length}
                  </p>
                  <span className="text-[11px] text-[#8B949E] mt-1 block">Safety & type conditions</span>
                </div>

                <div className="bg-[#16191E] p-4 rounded-xl border border-[#2D333B] shadow-sm">
                  <span className="text-xs text-[#8B949E] font-medium block">Check Duration</span>
                  <p className="text-2xl font-bold text-[#F0F6FC] mt-1 font-mono">
                    {latestResult.execution_time_ms} ms
                  </p>
                  <span className="text-[11px] text-[#8B949E] mt-1 block">Deterministic exploration</span>
                </div>
              </div>

              {/* Invariants Status Table */}
              <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#2D333B] bg-[#0A0C10] flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-[#F0F6FC] uppercase tracking-wider">
                    Checked Invariants & Properties
                  </h4>
                  <span className="text-xs text-[#8B949E] font-mono">{invariants.length} defined</span>
                </div>

                <div className="divide-y divide-[#2D333B]">
                  {invariants.length === 0 ? (
                    <div className="p-6 text-center text-[#8B949E] text-xs">
                      No custom invariants defined. Add an invariant (e.g. mutual exclusion, consistency) in the canvas.
                    </div>
                  ) : (
                    invariants.map((inv) => {
                      const failed =
                        latestResult.trace?.violation_type === 'invariant' &&
                        latestResult.trace.violated_invariant === inv.name;

                      return (
                        <div key={inv.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#1C2128]">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-xs text-[#F0F6FC]">{inv.name}</span>
                              {inv.is_type_invariant && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#0F1115] text-[#8B949E] border border-[#2D333B] rounded font-mono">
                                  TypeOK
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-[#8B949E]">{inv.expression}</p>
                            {inv.description && (
                              <p className="text-[11px] text-[#8B949E] opacity-75">{inv.description}</p>
                            )}
                          </div>

                          <div>
                            {failed ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F85149]/15 text-[#f85149] border border-[#F85149]/40">
                                <XCircle className="w-3.5 h-3.5 text-[#f85149]" />
                                <span>VIOLATED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#238636]/15 text-[#3fb950] border border-[#238636]/40">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                                <span>HOLDS</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Counterexample / Trace Visualizer */}
              {latestResult.trace && latestResult.trace.steps && latestResult.trace.steps.length > 0 && (
                <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2D333B]">
                    <div>
                      <h4 className="font-semibold text-sm text-[#F0F6FC]">
                        {latestResult.status === 'fail' ? 'Counterexample Error Trace' : 'Sample Execution Trace'}
                      </h4>
                      <p className="text-xs text-[#8B949E]">
                        {latestResult.status === 'fail'
                          ? `TLC discovered a path leading to violation of '${latestResult.trace.violated_invariant || 'Property'}':`
                          : 'State transition sequence from initial state:'}
                      </p>
                    </div>

                    <span className="text-xs font-mono text-[#8B949E] bg-[#0F1115] border border-[#2D333B] px-2 py-1 rounded">
                      {latestResult.trace.steps.length} Steps
                    </span>
                  </div>

                  {/* Step Sequence */}
                  <div className="space-y-3">
                    {latestResult.trace.steps.map((step) => (
                      <div
                        key={step.step}
                        className="flex items-start space-x-3 p-3 bg-[#0F1115] rounded-lg border border-[#2D333B]"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                          {step.step}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-xs text-[#F0F6FC]">
                              State: {step.state_name}
                            </span>
                            {step.transition_name && (
                              <span className="text-[11px] text-[#58a6ff] bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-2 py-0.5 rounded-full font-medium">
                                via {step.transition_name}
                              </span>
                            )}
                          </div>

                          {/* Variables valuation */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {Object.entries(step.variables).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[10px] font-mono bg-[#16191E] text-[#C9D1D9] px-2 py-0.5 rounded border border-[#2D333B]"
                              >
                                {k} = <span className="font-semibold text-[#58a6ff]">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#16191E] rounded-xl border border-[#2D333B] p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-[#8B949E] opacity-50 mx-auto mb-3" />
              <h3 className="font-semibold text-[#F0F6FC] text-sm">No Model Check Results Yet</h3>
              <p className="text-xs text-[#8B949E] mt-1 max-w-sm mx-auto">
                Click "Run TLC Checker" above to explore the state space and formally verify safety invariants.
              </p>
            </div>
          )
        ) : (
          /* Structural Validation Tab */
          <div className="bg-[#16191E] rounded-xl border border-[#2D333B] shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2D333B]">
              <div>
                <h3 className="font-bold text-sm text-[#F0F6FC]">Structural Validation Report</h3>
                <p className="text-xs text-[#8B949E]">
                  Checks graph consistency, state reachability, initial state assignment, and name/version requirements.
                </p>
              </div>
              {latestValidation && (
                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                    latestValidation.is_valid
                      ? 'bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30'
                      : 'bg-[#F85149]/15 text-[#f85149] border border-[#F85149]/30'
                  }`}
                >
                  {latestValidation.is_valid ? 'SPEC VALID' : 'ISSUES DETECTED'}
                </span>
              )}
            </div>

            {latestValidation ? (
              <div className="space-y-4 text-xs">
                {/* Errors */}
                {latestValidation.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#f85149] mb-2 flex items-center space-x-1.5">
                      <XCircle className="w-4 h-4" />
                      <span>Errors ({latestValidation.errors.length})</span>
                    </h4>
                    <div className="space-y-1.5">
                      {latestValidation.errors.map((e, i) => (
                        <div key={i} className="p-2.5 bg-[#F85149]/10 border border-[#F85149]/30 rounded-md text-[#f85149] font-mono">
                          [{e.code}]: {e.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {latestValidation.warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#D29922] mb-2 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Warnings ({latestValidation.warnings.length})</span>
                    </h4>
                    <div className="space-y-1.5">
                      {latestValidation.warnings.map((w, i) => (
                        <div key={i} className="p-2.5 bg-[#D29922]/10 border border-[#D29922]/30 rounded-md text-[#D29922]">
                          <span className="font-mono font-semibold">[{w.code}]:</span> {w.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {latestValidation.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#58a6ff] mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Suggestions</span>
                    </h4>
                    <div className="space-y-1.5">
                      {latestValidation.suggestions.map((s, i) => (
                        <div key={i} className="p-2 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-md text-[#58a6ff]">
                          • {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {latestValidation.errors.length === 0 && latestValidation.warnings.length === 0 && (
                  <div className="p-8 text-center bg-[#238636]/10 rounded-xl border border-[#238636]/30">
                    <CheckCircle2 className="w-10 h-10 text-[#3fb950] mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-[#3fb950]">No Structural Issues Found</h4>
                    <p className="text-xs text-[#8B949E] mt-1">
                      All states, transitions, initial states, and variable bindings are well-formed.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B949E] text-xs">
                Click "Validate Spec" to run structural validation.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
