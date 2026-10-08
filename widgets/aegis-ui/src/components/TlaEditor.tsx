/**
 * TLA+ Code Studio Component
 * Live formal specification generator, syntax viewer, and TLC configuration exporter.
 */

import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Download,
  Check,
  RefreshCw,
  FileText,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Registry, Constant, Variable, StateNode, Transition, Invariant } from '../types';
import { generateTlaPlus, generateTlcConfig } from '../utils/tlaGenerator';

interface TlaEditorProps {
  registry: Registry;
  constants: Constant[];
  variables: Variable[];
  states: StateNode[];
  transitions: Transition[];
  invariants: Invariant[];
  onUpdateTlaSource: (source: string) => Promise<void>;
}

export const TlaEditor: React.FC<TlaEditorProps> = ({
  registry,
  constants,
  variables,
  states,
  transitions,
  invariants,
  onUpdateTlaSource,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'spec' | 'config' | 'mapping'>('spec');
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const generatedTla = generateTlaPlus(
    registry,
    constants,
    variables,
    states,
    transitions,
    invariants
  );

  const generatedCfg = generateTlcConfig(registry, constants, invariants);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSyncToRegistry = async () => {
    setIsSyncing(true);
    try {
      await onUpdateTlaSource(generatedTla);
    } finally {
      setIsSyncing(false);
    }
  };

  const moduleName = registry.tla_plus_module || registry.name || 'StateMachine';

  return (
    <div className="h-full flex flex-col bg-[#0F1115] text-[#C9D1D9]">
      {/* Sub-header Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#2D333B] bg-[#16191E]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-1 bg-[#0F1115] border border-[#2D333B] rounded-lg p-0.5">
            <button
              onClick={() => setActiveSubTab('spec')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'spec'
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              {moduleName}.tla
            </button>
            <button
              onClick={() => setActiveSubTab('config')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'config'
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 inline mr-1.5" />
              {moduleName}.cfg
            </button>
            <button
              onClick={() => setActiveSubTab('mapping')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSubTab === 'mapping'
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 inline mr-1.5" />
              Formal Structure
            </button>
          </div>

          <span className="text-[11px] text-[#8B949E]">
            Bidirectional Aegis ↔ TLA+ formal synchronization
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopy(activeSubTab === 'spec' ? generatedTla : generatedCfg)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-[#16191E] hover:bg-[#21262D] text-[#C9D1D9] rounded-md border border-[#2D333B] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={() =>
              handleDownload(
                activeSubTab === 'spec' ? `${moduleName}.tla` : `${moduleName}.cfg`,
                activeSubTab === 'spec' ? generatedTla : generatedCfg
              )
            }
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-[#16191E] hover:bg-[#21262D] text-[#C9D1D9] rounded-md border border-[#2D333B] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={handleSyncToRegistry}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync to Registry</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 font-mono text-xs">
        {activeSubTab === 'spec' && (
          <div className="max-w-4xl mx-auto bg-[#16191E] p-6 rounded-xl border border-[#2D333B] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2D333B] text-[11px] text-[#8B949E]">
              <span>TLA+ Formal Model</span>
              <span>{states.length} states · {transitions.length} actions · {invariants.length} invariants</span>
            </div>
            <pre className="text-[#E6EDF3] leading-relaxed overflow-x-auto whitespace-pre font-mono">
              {generatedTla}
            </pre>
          </div>
        )}

        {activeSubTab === 'config' && (
          <div className="max-w-4xl mx-auto bg-[#16191E] p-6 rounded-xl border border-[#2D333B] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2D333B] text-[11px] text-[#8B949E]">
              <span>TLC Model Checker Configuration ({moduleName}.cfg)</span>
              <span>Used by tla2tools.jar</span>
            </div>
            <pre className="text-[#3fb950] leading-relaxed overflow-x-auto whitespace-pre font-mono">
              {generatedCfg}
            </pre>
          </div>
        )}

        {activeSubTab === 'mapping' && (
          <div className="max-w-4xl mx-auto space-y-4 font-sans text-xs">
            <div className="bg-[#16191E] p-5 rounded-xl border border-[#2D333B]">
              <h3 className="font-semibold text-sm text-[#F0F6FC] flex items-center space-x-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#58a6ff]" />
                <span>Aegis ↔ TLA+ Formal Mapping Architecture</span>
              </h3>
              <p className="text-[#8B949E] text-xs leading-relaxed">
                The Aegis State-Machine Registry automatically derives formal TLA+ specifications for TLC verification.
                Every graphical node, variable, and invariant is synthesized into mathematical logic:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#16191E] rounded-xl border border-[#2D333B]">
                <h4 className="font-semibold text-[#F0F6FC] mb-1">States & Transitions</h4>
                <p className="text-[#8B949E] text-[11px] mb-2">
                  States are compiled into a finite set <code className="text-[#58a6ff]">States</code> and
                  tracked by <code className="text-[#58a6ff]">currentState</code>. Transitions generate individual action
                  predicates composed under disjunctive <code className="text-[#58a6ff]">Next</code>.
                </p>
                <div className="p-2 bg-[#0F1115] rounded border border-[#2D333B] font-mono text-[10px] text-[#C9D1D9]">
                  Next == \/ Action1 \/ Action2 ...
                </div>
              </div>

              <div className="p-4 bg-[#16191E] rounded-xl border border-[#2D333B]">
                <h4 className="font-semibold text-[#F0F6FC] mb-1">Fairness & Liveness</h4>
                <p className="text-[#8B949E] text-[11px] mb-2">
                  Transitions tagged with <code className="text-[#58a6ff]">weak_fairness</code> or{' '}
                  <code className="text-[#58a6ff]">strong_fairness</code> generate temporal formulas:
                </p>
                <div className="p-2 bg-[#0F1115] rounded border border-[#2D333B] font-mono text-[10px] text-[#C9D1D9]">
                  WF_vars(Action) /\ SF_vars(Action)
                </div>
              </div>

              <div className="p-4 bg-[#16191E] rounded-xl border border-[#2D333B]">
                <h4 className="font-semibold text-[#F0F6FC] mb-1">Invariants & Safety</h4>
                <p className="text-[#8B949E] text-[11px] mb-2">
                  Invariants are checked by TLC at every reachable state in the state graph.
                  Violations yield an exact trace counterexample.
                </p>
                <div className="p-2 bg-[#0F1115] rounded border border-[#2D333B] font-mono text-[10px] text-[#C9D1D9]">
                  TypeOK /\ MutualExclusion /\ TCConsistent
                </div>
              </div>

              <div className="p-4 bg-[#16191E] rounded-xl border border-[#2D333B]">
                <h4 className="font-semibold text-[#F0F6FC] mb-1">State Variables</h4>
                <p className="text-[#8B949E] text-[11px] mb-2">
                  State variables define system valuation. Transitions specify updates via primed variables (
                  <code className="text-[#58a6ff]">v' = expr</code>) and enforce <code className="text-[#58a6ff]">UNCHANGED</code> on untouched variables.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
