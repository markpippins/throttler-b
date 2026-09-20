import React, { useState } from 'react';
import {
  Bot,
  Send,
  Lightbulb,
  HelpCircle,
  Play,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
} from 'lucide-react';

export interface NarrationItem {
  id: string;
  timestamp: string;
  type: 'info' | 'guidance' | 'warning';
  text: string;
}

interface OperatorPersonaPanelProps {
  activeSurfaceId: string;
  activeWidgetName?: string;
  selectedEntityId?: string;
}

export const OperatorPersonaPanel: React.FC<OperatorPersonaPanelProps> = ({
  activeSurfaceId,
  activeWidgetName,
  selectedEntityId,
}) => {
  const [narrations, setNarrations] = useState<NarrationItem[]>([
    {
      id: 'n-1',
      timestamp: 'Just now',
      type: 'guidance',
      text: `Initialized Surface Projection runtime for "${activeSurfaceId}". All absorbed widgets from surface-ui are cataloged and ready for spatial compilation.`,
    },
    {
      id: 'n-2',
      timestamp: 'Just now',
      type: 'info',
      text: 'SolScript sandbox doctrine active: evaluation pipeline verifies all mutating interactions before commit.',
    },
  ]);
  const [promptInput, setPromptInput] = useState('');

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    const query = promptInput.trim();
    setPromptInput('');

    const newNarration: NarrationItem = {
      id: `n-${Date.now()}`,
      timestamp: 'Just now',
      type: 'info',
      text: `Query: "${query}"`,
    };

    setNarrations((prev) => [newNarration, ...prev]);

    setTimeout(() => {
      let reply = `Context Analysis: Observing surface "${activeSurfaceId}". `;
      if (activeWidgetName) {
        reply += `Active relic widget is "${activeWidgetName}". `;
      }
      if (selectedEntityId) {
        reply += `Selected entity: "${selectedEntityId}". `;
      }
      if (query.toLowerCase().includes('solscript') || query.toLowerCase().includes('guard')) {
        reply += 'SolScript AST invariants are strictly satisfied. No drift detected.';
      } else if (query.toLowerCase().includes('projection') || query.toLowerCase().includes('viewspec')) {
        reply += 'Projection-core synthesized the layout tree dynamically from pure DesignIR declarations.';
      } else {
        reply += 'Operating at optimal throughput. You can freely inspect relics or execute governed actions.';
      }

      setNarrations((prev) => [
        {
          id: `n-${Date.now()}-reply`,
          timestamp: 'Just now',
          type: 'guidance',
          text: reply,
        },
        ...prev,
      ]);
    }, 250);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-surface/95 p-4 shadow-md font-mono text-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
              <span className="font-bold text-foreground text-xs tracking-tight">
                Operator Persona // Contextual Co-Pilot
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-sans">
              Observes ontological space & state store to provide automated guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Context Badge Strip */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded bg-muted/60 px-2 py-0.5 border border-border/40 text-muted-foreground">
          Surface: <strong className="text-foreground">{activeSurfaceId}</strong>
        </span>
        {activeWidgetName && (
          <span className="rounded bg-primary/10 px-2 py-0.5 border border-primary/20 text-primary font-semibold">
            Widget: {activeWidgetName}
          </span>
        )}
        {selectedEntityId && (
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 text-emerald-500">
            Entity: {selectedEntityId}
          </span>
        )}
      </div>

      {/* Narration Stream */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {narrations.map((item) => (
          <div
            key={item.id}
            className={`p-2 rounded-lg border text-[11px] leading-relaxed font-sans ${
              item.type === 'guidance'
                ? 'bg-primary/5 border-primary/25 text-foreground'
                : 'bg-background/60 border-border/40 text-muted-foreground'
            }`}
          >
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/70 mb-1">
              <span className="uppercase font-bold tracking-wider">{item.type}</span>
              <span>{item.timestamp}</span>
            </div>
            <div>{item.text}</div>
          </div>
        ))}
      </div>

      {/* Suggestion Quick Chips */}
      <div className="flex flex-wrap gap-1 pt-1">
        {['Explain ViewSpec', 'Check SolScript Drift', 'Trace Keychain Lineage'].map((chip) => (
          <button
            key={chip}
            onClick={() => {
              setPromptInput(chip);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
          >
            <Lightbulb className="w-2.5 h-2.5 text-amber-400" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Query Form */}
      <form onSubmit={handleAsk} className="flex gap-1.5 pt-1">
        <input
          type="text"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Ask Operator about this view, widget, or rule..."
          className="flex-1 px-2.5 py-1.5 rounded-md bg-background border border-border/60 text-foreground font-mono text-xs focus:outline-hidden focus:border-primary placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          className="px-2.5 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors"
          title="Send query"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
