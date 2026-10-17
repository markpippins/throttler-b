import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Code2,
  Shield,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  globalGenerativeCompiler,
  GenerativeWidgetInstance,
  GenerativeSectionProvenance,
} from '../compiler/generativeCompiler';
import { EpistemicEnvelope, WitnessedServerStatus } from '../types';
import { globalThemeRegistry } from '../core/themeRegistry';
import { AegisStateMachineRelic } from '../relics/AegisStateMachineRelic';
import {
  GaugeRelic,
  SparklineRelic,
  ConduitPlanKanbanRelic,
  AgentRecordTelemetryRelic,
} from '../relics/HarvestedRelics';

export interface GenerativeResponseViewerProps {
  onSelectEntity?: (id: string, name: string) => void;
  className?: string;
}

const SectionProvenanceFooter: React.FC<{ section: GenerativeSectionProvenance }> = ({
  section,
}) => {
  const { themeStateToken, treatment, caption, compiledStateToken, roleId, capabilityId } =
    section;

  return (
    <div
      className={`mt-2 px-3 py-1.5 rounded-lg font-mono text-[10px] flex flex-wrap items-center justify-between gap-2 ${themeStateToken.border} ${themeStateToken.surfaceTint}`}
      data-testid={`section-provenance-${section.sectionId}`}
      data-stroke-pattern={themeStateToken.strokePattern}
      data-state-token={compiledStateToken}
    >
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{themeStateToken.glyph}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${themeStateToken.badgeClass}`}
        >
          {treatment.statusBadge}
        </span>
        <span className="font-semibold" style={{ color: themeStateToken.color }}>
          [{caption}]
        </span>
      </div>
      <div className="flex items-center gap-2 text-[9px] opacity-80">
        <span>role={roleId}</span>
        <span>·</span>
        <span>cap={capabilityId}</span>
        <span>·</span>
        <span>token={compiledStateToken}</span>
      </div>
    </div>
  );
};

export const GenerativeResponseViewer: React.FC<GenerativeResponseViewerProps> = ({
  onSelectEntity,
  className = '',
}) => {
  const [prompt, setPrompt] = useState<string>(
    'Show me the Aegis State Machine for Governed Director'
  );
  const [selectedEnvelope, setSelectedEnvelope] = useState<EpistemicEnvelope>('live');
  const [selectedStatus, setSelectedStatus] = useState<WitnessedServerStatus>('complete');
  const [viewMode, setViewMode] = useState<'rendered' | 'viewspec-ast' | 'design-ir'>('rendered');
  const [activeTheme, setActiveTheme] = useState(() => globalThemeRegistry.getActiveTheme());

  useEffect(() => {
    return globalThemeRegistry.subscribe((theme) => {
      setActiveTheme(theme);
    });
  }, []);

  const [activeInstance, setActiveInstance] = useState<GenerativeWidgetInstance>(() =>
    globalGenerativeCompiler.compileQuery(
      'Show me the Aegis State Machine for Governed Director',
      {
        envelope: 'live',
        serverStatus: 'complete',
        themeId: globalThemeRegistry.getActiveThemeId(),
      }
    )
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Re-compile instance when theme or envelope/status toggles so stateTokens stay live-bound
  useEffect(() => {
    const next = globalGenerativeCompiler.compileQuery(prompt, {
      envelope: selectedEnvelope,
      serverStatus: selectedStatus,
      themeId: activeTheme.id,
    });
    setActiveInstance(next);
  }, [activeTheme.id, selectedEnvelope, selectedStatus]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      const instance = globalGenerativeCompiler.compileQuery(prompt, {
        envelope: selectedEnvelope,
        serverStatus: selectedStatus,
        themeId: activeTheme.id,
      });
      setActiveInstance(instance);
      setIsGenerating(false);
    }, 150);
  };

  const setSampleQuery = (
    q: string,
    env: EpistemicEnvelope = selectedEnvelope,
    status: WitnessedServerStatus = selectedStatus
  ) => {
    setPrompt(q);
    setSelectedEnvelope(env);
    setSelectedStatus(status);
    setIsGenerating(true);
    setTimeout(() => {
      const instance = globalGenerativeCompiler.compileQuery(q, {
        envelope: env,
        serverStatus: status,
        themeId: activeTheme.id,
      });
      setActiveInstance(instance);
      setIsGenerating(false);
    }, 120);
  };

  const primarySection = activeInstance.sections[0];
  const primaryStateToken =
    primarySection?.themeStateToken ||
    globalThemeRegistry.resolveStateToken(
      activeInstance.envelope,
      activeInstance.serverStatus,
      activeTheme.id
    );

  return (
    <div
      className={`flex flex-col bg-[rgb(var(--color-surface-base))] text-[rgb(var(--color-text-base))] border border-[rgb(var(--color-border-base))] rounded-2xl overflow-hidden shadow-xl ${className}`}
    >
      {/* Header Prompt Form */}
      <div className="p-3.5 bg-[rgb(var(--color-surface-muted))] border-b border-[rgb(var(--color-border-base))] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold">
              Generative ViewSpec Vocabulary (DesignIR → ViewSpec AST Compiler)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Envelope / ServerStatus Simulator Controls (Condition 1 / EAC-4) */}
            <select
              aria-label="Epistemic Envelope"
              value={`${selectedEnvelope}:${selectedStatus}`}
              onChange={(e) => {
                const [env, st] = e.target.value.split(':') as [
                  EpistemicEnvelope,
                  WitnessedServerStatus
                ];
                setSelectedEnvelope(env);
                setSelectedStatus(st);
              }}
              className="px-2 py-0.5 rounded bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] text-[10px] font-mono"
            >
              <option value="live:complete">🟢 LIVE · complete</option>
              <option value="degraded:stale">⚠️ DEGRADED · stale</option>
              <option value="degraded:drift">⚠️ DEGRADED · drift</option>
              <option value="live:refusal">🛑 LIVE · refusal (blocking)</option>
              <option value="unknown:missing_lineage">⚪ UNKNOWN · missing_lineage</option>
              <option value="demo:unknown">🧪 DEMO · fixture</option>
            </select>

            {/* Inspection Mode Switcher */}
            <div className="flex items-center gap-0.5 bg-[rgb(var(--color-surface-base))] p-0.5 rounded-lg border border-[rgb(var(--color-border-base))] text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setViewMode('rendered')}
                className={`px-2 py-0.5 rounded ${
                  viewMode === 'rendered'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-[rgb(var(--color-text-muted))]'
                }`}
              >
                Hydrated View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('viewspec-ast')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                  viewMode === 'viewspec-ast'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-[rgb(var(--color-text-muted))]'
                }`}
              >
                <Code2 className="w-3 h-3" />
                ViewSpec AST ({activeInstance.viewSpecAst.widgets.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('design-ir')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                  viewMode === 'design-ir'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-[rgb(var(--color-text-muted))]'
                }`}
              >
                <Layers className="w-3 h-3" />
                DesignIR
              </button>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask the system to express itself (e.g. 'Show Aegis State Machine', 'Inspect storage health gauges')..."
              className="w-full bg-[rgb(var(--color-surface-input))] border border-[rgb(var(--color-border-input))] rounded-xl px-3 py-1.5 text-xs text-[rgb(var(--color-text-base))] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Compile &amp; Hydrate
          </button>
        </form>

        {/* Quick Sample Query Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-0.5">
          <span className="text-[rgb(var(--color-text-muted))] font-mono text-[10px]">
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() =>
              setSampleQuery(
                'Show me the Aegis State Machine for Governed Director',
                'live',
                'complete'
              )
            }
            className="px-2 py-0.5 rounded-lg bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px] flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-emerald-500" />
            Aegis State Machine (LIVE)
          </button>
          <button
            type="button"
            onClick={() =>
              setSampleQuery(
                'Inspect the storage health of host-01 gauges and heterogeneous sparkline',
                'live',
                'complete'
              )
            }
            className="px-2 py-0.5 rounded-lg bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px]"
          >
            Composite Metrics (Per-Section Provenance)
          </button>
          <button
            type="button"
            onClick={() =>
              setSampleQuery('Show me conduit plan kanban under stale telemetry', 'degraded', 'stale')
            }
            className="px-2 py-0.5 rounded-lg bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px]"
          >
            Degraded Stale Board
          </button>
          <button
            type="button"
            onClick={() =>
              setSampleQuery('Show me refused governance telemetry stream', 'live', 'refusal')
            }
            className="px-2 py-0.5 rounded-lg bg-[rgb(var(--color-surface-base))] hover:bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border-base))] font-mono text-[10px]"
          >
            Live Refusal (F-1)
          </button>
        </div>
      </div>

      {/* Rendered Generative Widget Payload */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {/* Top Authority & Theme Multi-Channel Banner */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl font-mono text-xs ${primaryStateToken.border} ${primaryStateToken.surfaceTint}`}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-sm">
              {primaryStateToken.glyph}
            </span>
            <span className="font-bold">{activeInstance.title}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${primaryStateToken.badgeClass}`}
            >
              {primarySection?.treatment.statusBadge || activeInstance.envelope.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span>Theme: {activeTheme.name}</span>
            <span>·</span>
            <span>Stroke: {primaryStateToken.strokePattern}</span>
            <span>·</span>
            <span>ViewSpec ID: {activeInstance.viewSpecAst.id}</span>
          </div>
        </div>

        {/* Blocking Refusal Predicate Callout (Invariant F-1) */}
        {primarySection?.treatment.isBlocking && primarySection.treatment.refusalPredicate && (
          <div
            className={`p-2.5 rounded-xl font-mono text-xs ${primaryStateToken.border} ${primaryStateToken.surfaceTint}`}
          >
            <span className="font-bold uppercase">
              {primaryStateToken.glyph} Authoritative Server Refusal:{' '}
            </span>
            <span>{primarySection.treatment.refusalPredicate}</span>
          </div>
        )}

        {/* Non-collapsible DEMO fixture banner when envelope === 'demo' */}
        {activeInstance.envelope === 'demo' && (
          <div
            className={`p-2 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wide ${primaryStateToken.border} ${primaryStateToken.surfaceTint}`}
          >
            🧪 DEMO · fixture · non-authoritative sandbox preview
          </div>
        )}

        <p className="text-xs font-mono bg-[rgb(var(--color-surface-muted))] p-2.5 rounded-xl border border-[rgb(var(--color-border-base))]">
          💡 <span>{activeInstance.explanation}</span>
        </p>

        {viewMode === 'viewspec-ast' ? (
          <pre className="p-3 rounded-xl bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] font-mono text-[11px] overflow-x-auto max-h-[460px]">
            {JSON.stringify(activeInstance.viewSpecAst, null, 2)}
          </pre>
        ) : viewMode === 'design-ir' ? (
          <pre className="p-3 rounded-xl bg-[rgb(var(--color-surface-muted))] border border-[rgb(var(--color-border-base))] font-mono text-[11px] overflow-x-auto max-h-[460px]">
            {JSON.stringify(activeInstance.designIr, null, 2)}
          </pre>
        ) : (
          /* Hydrated Widget Payload Display with Per-Section Provenance Captions (Condition 4 / F-4) */
          <div className="pt-1 space-y-4">
            {(activeInstance.widgetType === 'aegis-state-machine' ||
              activeInstance.widgetType === 'uml-diagram') && (
              <div className="space-y-2">
                {activeInstance.sections[0] && (
                  <SectionProvenanceFooter section={activeInstance.sections[0]} />
                )}
                <AegisStateMachineRelic
                  title={activeInstance.title}
                  moduleName={
                    activeInstance.stateMachinePayload?.moduleName ||
                    'MODULE AegisGovernanceProtocol'
                  }
                  states={
                    activeInstance.stateMachinePayload?.states ||
                    activeInstance.umlPayload?.classes
                  }
                  transitions={
                    activeInstance.stateMachinePayload?.transitions ||
                    activeInstance.umlPayload?.edges
                  }
                  onSelectNode={(id, name) => onSelectEntity?.(id, name)}
                  envelope={activeInstance.envelope}
                  height={440}
                />
                {activeInstance.sections[1] && (
                  <SectionProvenanceFooter section={activeInstance.sections[1]} />
                )}
              </div>
            )}

            {activeInstance.widgetType === 'metrics-matrix' &&
              activeInstance.metricsPayload && (
                <div className="space-y-4">
                  {/* Composite Section A: Gauges */}
                  <div className="p-3 rounded-xl border border-[rgb(var(--color-border-base))] bg-[rgb(var(--color-surface-muted))] space-y-2">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider">
                      {activeInstance.sections[0]?.title || 'Composite Section A — Gauges'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {activeInstance.metricsPayload.gauges.map((g, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[rgb(var(--color-surface-base))] rounded-xl border border-[rgb(var(--color-border-base))]"
                        >
                          <span className="text-[10px] font-mono uppercase text-[rgb(var(--color-text-muted))] font-bold">
                            {g.label}
                          </span>
                          <GaugeRelic
                            value={g.value}
                            label={g.label}
                            color={g.color || activeTheme.tokens.chartPrimary}
                          />
                        </div>
                      ))}
                    </div>
                    {activeInstance.sections[0] && (
                      <SectionProvenanceFooter section={activeInstance.sections[0]} />
                    )}
                  </div>

                  {/* Composite Section B: Sparkline */}
                  <div className="p-3.5 bg-[rgb(var(--color-surface-muted))] rounded-xl border border-[rgb(var(--color-border-base))] space-y-2">
                    <span className="text-[11px] font-mono uppercase font-bold">
                      {activeInstance.sections[1]?.title ||
                        'Composite Section B — Real-Time IOps Sparkline'}
                    </span>
                    <SparklineRelic
                      data={activeInstance.metricsPayload.sparklineData}
                      color={activeTheme.tokens.chartSecondary}
                      height={70}
                    />
                    {activeInstance.sections[1] && (
                      <SectionProvenanceFooter section={activeInstance.sections[1]} />
                    )}
                  </div>
                </div>
              )}

            {activeInstance.widgetType === 'kanban-board' && (
              <div className="space-y-2">
                <ConduitPlanKanbanRelic />
                {activeInstance.sections[0] && (
                  <SectionProvenanceFooter section={activeInstance.sections[0]} />
                )}
              </div>
            )}

            {activeInstance.widgetType === 'telemetry-stream' && (
              <div className="space-y-2">
                <AgentRecordTelemetryRelic />
                {activeInstance.sections[0] && (
                  <SectionProvenanceFooter section={activeInstance.sections[0]} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Composite Provenance Summary Footer (Condition 4 / F-4) */}
        <div
          className="mt-3 pt-2.5 border-t border-[rgb(var(--color-border-base))] flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[rgb(var(--color-text-muted))]"
          data-testid="composite-provenance-summary"
        >
          <span className="font-bold text-[rgb(var(--color-text-base))]">
            [{activeInstance.compositeSummary.summaryCaption}]
          </span>
          <span>
            Compiled Widgets: {activeInstance.viewSpecAst.widgets.length} · Layout Regions:{' '}
            {activeInstance.viewSpecAst.layout.nodes.length}
          </span>
        </div>
      </div>
    </div>
  );
};
