import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Code2,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { globalGenerativeCompiler, GenerativeWidgetInstance } from '../compiler/generativeCompiler';
import { AegisStateMachineRelic } from '../relics/AegisStateMachineRelic';
import { GaugeRelic, SparklineRelic, ConduitPlanKanbanRelic, AgentRecordTelemetryRelic } from '../relics/HarvestedRelics';

export interface GenerativeResponseViewerProps {
  onSelectEntity?: (id: string, name: string) => void;
  className?: string;
}

export const GenerativeResponseViewer: React.FC<GenerativeResponseViewerProps> = ({
  onSelectEntity,
  className = '',
}) => {
  const [prompt, setPrompt] = useState<string>('Show me the Aegis State Machine for Governed Director');
  const [activeInstance, setActiveInstance] = useState<GenerativeWidgetInstance>(() =>
    globalGenerativeCompiler.compileQuery('Show me the Aegis State Machine for Governed Director')
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      const instance = globalGenerativeCompiler.compileQuery(prompt);
      setActiveInstance(instance);
      setIsGenerating(false);
    }, 200);
  };

  const setSampleQuery = (q: string) => {
    setPrompt(q);
    setIsGenerating(true);
    setTimeout(() => {
      const instance = globalGenerativeCompiler.compileQuery(q);
      setActiveInstance(instance);
      setIsGenerating(false);
    }, 150);
  };

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl ${className}`}>
      {/* Header Prompt Form */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Generative ViewSpec Vocabulary (Agent Response Canvas)
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
            AST GENERATOR ACTIVE
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask the system to express itself (e.g. 'Show Aegis State Machine', 'Show metrics gauges')..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Generate
          </button>
        </form>

        {/* Quick Sample Query Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1">
          <span className="text-slate-500 font-mono text-[10px]">Quick Presets:</span>
          <button
            onClick={() => setSampleQuery('Show me the Aegis State Machine for Governed Director')}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-700/50 font-mono text-[10px] flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-emerald-400" />
            Aegis State Machine (TLA+/TLC)
          </button>
          <button
            onClick={() => setSampleQuery('Show me VFS readiness gauges and sparkline')}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[10px]"
          >
            Metrics Gauges
          </button>
          <button
            onClick={() => setSampleQuery('Show me conduit plan kanban')}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono text-[10px]"
          >
            Conduit Kanban
          </button>
        </div>
      </div>

      {/* Rendered Generative Widget Payload */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800">
          <span className="font-semibold text-slate-200">{activeInstance.title}</span>
          <span>Envelope: {activeInstance.envelope.toUpperCase()}</span>
        </div>

        <p className="text-xs text-slate-400 font-mono bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          💡 <span className="text-slate-300">{activeInstance.explanation}</span>
        </p>

        {/* Widget Payload Display */}
        <div className="pt-2">
          {(activeInstance.widgetType === 'aegis-state-machine' || activeInstance.widgetType === 'uml-diagram') && (
            <AegisStateMachineRelic
              title={activeInstance.title}
              moduleName={activeInstance.stateMachinePayload?.moduleName || 'MODULE AegisGovernanceProtocol'}
              states={activeInstance.stateMachinePayload?.states || activeInstance.umlPayload?.classes}
              transitions={activeInstance.stateMachinePayload?.transitions || activeInstance.umlPayload?.edges}
              onSelectNode={(id, name) => onSelectEntity?.(id, name)}
              height={460}
            />
          )}

          {activeInstance.widgetType === 'metrics-matrix' && activeInstance.metricsPayload && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {activeInstance.metricsPayload.gauges.map((g, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">{g.label}</span>
                    <GaugeRelic value={g.value} label={g.label} color={g.color || '#3b82f6'} />
                  </div>
                ))}
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Real-time IOps Sparkline</span>
                <SparklineRelic data={activeInstance.metricsPayload.sparklineData} color="#10b981" height={70} />
              </div>
            </div>
          )}

          {activeInstance.widgetType === 'kanban-board' && (
            <ConduitPlanKanbanRelic />
          )}

          {activeInstance.widgetType === 'telemetry-stream' && (
            <AgentRecordTelemetryRelic />
          )}
        </div>
      </div>
    </div>
  );
};
