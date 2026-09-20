import React, { useMemo } from 'react';
import {
  Code2,
  Activity,
  Wrench,
  Gauge,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { AbsorbedWidget, RelicArchetype } from '../types';

export interface RelicTypeDefinition {
  type: RelicArchetype;
  title: string;
  shortCode: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeClass: string;
  capabilities: string[];
}

export const RELIC_TYPE_DEFINITIONS: RelicTypeDefinition[] = [
  {
    type: 'react-component',
    title: 'React Component',
    shortCode: 'COMP',
    description: 'Self-contained reactive UI components with automatic AST prop inference and simulated DOM state.',
    icon: Code2,
    accentColor: 'text-indigo-400',
    badgeClass: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    capabilities: ['Prop Auto-Inference', 'Simulated State', 'DOM Tree'],
  },
  {
    type: 'data-vis',
    title: 'Data Visualization',
    shortCode: 'DVIS',
    description: 'Time-series charts, sparklines, and metric monitors fed by continuous telemetry loops.',
    icon: Activity,
    accentColor: 'text-blue-400',
    badgeClass: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    capabilities: ['Mock Data Stream', 'SVG & Canvas', 'Interpolated Updates'],
  },
  {
    type: 'interactive-tool',
    title: 'Interactive Tool',
    shortCode: 'TOOL',
    description: 'Real-time calculators, schema converters, testing rigs, and developer utilities.',
    icon: Wrench,
    accentColor: 'text-emerald-400',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    capabilities: ['Two-Way Binding', 'Event Interceptor', 'State Isolation'],
  },
  {
    type: 'control-surface',
    title: 'Control Surface',
    shortCode: 'CTRL',
    description: 'Knobs, sliders, telemetry toggles, and high-frequency parameter dispatchers.',
    icon: Gauge,
    accentColor: 'text-amber-400',
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    capabilities: ['Param Mapping', 'Instant Dispatch', 'Feedback Loop'],
  },
  {
    type: 'canvas-element',
    title: 'Canvas Element',
    shortCode: 'CNVS',
    description: 'Hardware-accelerated 2D graphics, particle engines, and generative algorithm relics.',
    icon: Sparkles,
    accentColor: 'text-purple-400',
    badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    capabilities: ['Raf Loop', 'Pixel Pipelines', 'Interactive Physics'],
  },
];

interface RelicArchetypesGridProps {
  widgets: AbsorbedWidget[];
  selectedType: RelicArchetype | 'all';
  onSelectType: (type: RelicArchetype | 'all') => void;
}

export const RelicArchetypesGrid: React.FC<RelicArchetypesGridProps> = ({
  widgets,
  selectedType,
  onSelectType,
}) => {
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: widgets.length,
      'react-component': 0,
      'data-vis': 0,
      'interactive-tool': 0,
      'control-surface': 0,
      'canvas-element': 0,
    };
    for (const w of widgets) {
      if (map[w.archetype] !== undefined) {
        map[w.archetype]++;
      }
    }
    return map;
  }, [widgets]);

  return (
    <div className="space-y-3">
      {/* Category selector row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelectType('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all border ${
            selectedType === 'all'
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/20'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Harvested Relics</span>
          <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-bold">
            {counts['all']}
          </span>
        </button>

        {RELIC_TYPE_DEFINITIONS.map((def) => {
          const Icon = def.icon;
          const isSelected = selectedType === def.type;
          return (
            <button
              key={def.type}
              onClick={() => onSelectType(def.type)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all border ${
                isSelected
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-background' : def.accentColor}`} />
              <span>{def.title}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  isSelected ? 'bg-background/30 text-background' : 'bg-muted text-foreground'
                }`}
              >
                {counts[def.type] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
