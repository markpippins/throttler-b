import React from 'react';
import { ProvenanceType } from '../../types/sol';

interface ProvenanceBadgeProps {
  provenance: ProvenanceType | string;
  showDetails?: boolean;
  size?: '2xs' | 'xs' | 'sm' | 'md';
  className?: string;
  title?: string;
}

const PROVENANCE_CONFIG: Record<string, {
  label: string;
  short: string;
  bgDark: string;
  borderDark: string;
  textDark: string;
  dotColor: string;
  description: string;
}> = {
  asserted: {
    label: 'Asserted',
    short: 'AST',
    bgDark: 'bg-emerald-950/90',
    borderDark: 'border-emerald-700/70',
    textDark: 'text-emerald-300',
    dotColor: 'bg-emerald-400',
    description: 'Directly stated and authoritatively asserted baseline or invariant rule'
  },
  inferred: {
    label: 'Inferred',
    short: 'INF',
    bgDark: 'bg-purple-950/90',
    borderDark: 'border-purple-700/70',
    textDark: 'text-purple-300',
    dotColor: 'bg-purple-400',
    description: 'Synthesized or deduced via inference reasoner and forward/backward rule chaining'
  },
  projected: {
    label: 'Projected',
    short: 'PRJ',
    bgDark: 'bg-rose-950/90',
    borderDark: 'border-rose-700/70',
    textDark: 'text-rose-300',
    dotColor: 'bg-rose-400',
    description: 'Projected outbound artifact (TypeSpec, CUE, TLA+, JSON-LD)'
  },
  evaluated: {
    label: 'Evaluated',
    short: 'EVL',
    bgDark: 'bg-blue-950/90',
    borderDark: 'border-blue-700/70',
    textDark: 'text-blue-300',
    dotColor: 'bg-blue-400',
    description: 'Result of proposition or invariant rule runtime evaluation'
  },
  derived: {
    label: 'Derived',
    short: 'DER',
    bgDark: 'bg-cyan-950/90',
    borderDark: 'border-cyan-700/70',
    textDark: 'text-cyan-300',
    dotColor: 'bg-cyan-400',
    description: 'Deterministically calculated from raw concrete or EAV attributes'
  },
  imported: {
    label: 'Imported',
    short: 'IMP',
    bgDark: 'bg-teal-950/90',
    borderDark: 'border-teal-700/70',
    textDark: 'text-teal-300',
    dotColor: 'bg-teal-400',
    description: 'Inbound converted ontology source (OWL, RDF, SHACL, Schema.org)'
  },
  semantic: {
    label: 'Semantic',
    short: 'SEM',
    bgDark: 'bg-indigo-950/90',
    borderDark: 'border-indigo-700/70',
    textDark: 'text-indigo-300',
    dotColor: 'bg-indigo-400',
    description: 'Ontology specification definition (concept, rule, frame, dimension)'
  },
  concrete: {
    label: 'Concrete',
    short: 'CON',
    bgDark: 'bg-emerald-950/90',
    borderDark: 'border-emerald-700/70',
    textDark: 'text-emerald-300',
    dotColor: 'bg-emerald-400',
    description: 'Instantiated entity or fact record in the concrete layer'
  },
  eav: {
    label: 'EAV (Shrapnel)',
    short: 'EAV',
    bgDark: 'bg-amber-950/90',
    borderDark: 'border-amber-700/70',
    textDark: 'text-amber-300',
    dotColor: 'bg-amber-400',
    description: 'Polymorphic value-family attribute stored in Shrapnel EAV substrate'
  }
};

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  showDetails = false,
  size = 'xs',
  className = '',
  title
}) => {
  const normKey = String(provenance || 'semantic').toLowerCase();
  const conf = PROVENANCE_CONFIG[normKey] || PROVENANCE_CONFIG.semantic;

  const sizeClasses = {
    '2xs': 'text-[8.5px] px-1 py-0.2 font-mono uppercase tracking-wider leading-none',
    xs: 'text-[9px] px-1.5 py-0.5 font-mono uppercase tracking-wider',
    sm: 'text-[10px] px-2 py-0.5 font-mono tracking-wide',
    md: 'text-xs px-2.5 py-1 font-mono'
  }[size];

  const dotSize = {
    '2xs': 'w-1 h-1',
    xs: 'w-1.5 h-1.5',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2'
  }[size];

  const tooltip = title || `${conf.label}: ${conf.description}`;

  return (
    <span
      id={`provenance-${normKey}`}
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded-xs border font-semibold select-none shrink-0 transition-colors duration-150 ${sizeClasses} ${conf.bgDark} ${conf.borderDark} ${conf.textDark} ${className}`}
    >
      <span className={`${dotSize} rounded-full ${conf.dotColor} shrink-0`} />
      <span className="truncate">{showDetails ? conf.label : conf.short}</span>
    </span>
  );
};

