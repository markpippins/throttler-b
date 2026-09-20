import React, { useState } from 'react';
import { Play, Code, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { AbsorbedWidget } from '../types';

interface RelicCardProps {
  widget: AbsorbedWidget;
  onSelect?: (widget: AbsorbedWidget) => void;
}

export const RelicCard: React.FC<RelicCardProps> = ({ widget, onSelect }) => {
  const [showCode, setShowCode] = useState(false);
  const endpoint = widget.endpoints[0];

  const archetypeBadgeStyle: Record<string, string> = {
    'react-component': 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
    'data-vis': 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    'interactive-tool': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    'control-surface': 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    'canvas-element': 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="flex flex-col rounded-xl border border-border/70 bg-surface/90 overflow-hidden shadow-xs hover:border-primary/60 transition-all group">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/50 bg-surface/50 px-3.5 py-2">
        <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
          {endpoint ? endpoint.signature : 'no api detected'}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-1.5 py-0.2 font-mono text-[10px] uppercase font-semibold ${
              archetypeBadgeStyle[widget.archetype] || 'border-border text-foreground'
            }`}
          >
            {widget.archetype.replace('-', ' ')}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        </div>
      </div>

      {/* Interactive live preview sandbox */}
      <div className="p-4 bg-background/40 flex items-center justify-center min-h-[160px] border-b border-border/30">
        <div className="w-full">
          {widget.render(widget.defaultProps || {})}
        </div>
      </div>

      {/* Info and metadata */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm tracking-tight group-hover:text-primary transition-colors">
              {widget.name}
            </h3>
            <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {widget.componentName}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {widget.description}
          </p>
        </div>

        {/* Inputs and Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {widget.inputs.map((i) => (
              <span
                key={i.name}
                className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {i.name}: {i.type}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            {widget.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-background/80 px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground/70"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Actions bar */}
        <div className="pt-2 border-t border-border/30 flex items-center justify-between">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Code className="w-3 h-3" />
            <span>{showCode ? 'Hide Code' : 'View Code'}</span>
            {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onSelect && (
            <button
              onClick={() => onSelect(widget)}
              className="flex items-center gap-1 font-mono text-[11px] font-semibold text-primary hover:underline"
            >
              <span>Inspect Relic</span>
              <Play className="w-2.5 h-2.5 fill-primary" />
            </button>
          )}
        </div>

        {/* Code inspection expandable */}
        {showCode && (
          <div className="rounded-lg bg-black/70 p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-40 border border-border/40">
            <pre>{widget.code}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
