import React, { useState } from 'react';
import { 
  FileCode2, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  Boxes, 
  Sparkles, 
  RefreshCw, 
  Code, 
  Layers, 
  Eye,
  FileCheck
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { solEngine } from '../../engine/solEngine';
import { OutboundFormat, InboundFormat } from '../../types/sol';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

export const ProjectionsExplorer: React.FC = () => {
  const { selectedItem, selectById } = useWorkbench();
  const [selectedConceptId, setSelectedConceptId] = useState<string>(() => {
    return selectedItem?.type === 'concept' ? String(selectedItem.id) : 'concept-host';
  });
  const [activeOutboundFormat, setActiveOutboundFormat] = useState<OutboundFormat>('TypeSpec');
  const [copied, setCopied] = useState(false);

  const concepts = Object.values(solEngine.concepts);
  const currentConcept = solEngine.concepts[selectedConceptId] || concepts[0];
  const repMapping = solEngine.representations[currentConcept?.id];

  const outboundCode = repMapping?.outbound_projections[activeOutboundFormat]?.generated_code || 
    `// Projection for ${currentConcept?.name} in ${activeOutboundFormat} is dynamically generated from SOL canonical AST.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(outboundCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      id="projections-explorer"
      className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden select-none"
    >
      {/* Top Header & Concept Selector */}
      <div className="h-11 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 flex items-center justify-between shrink-0 font-mono text-xs">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-rose-400" />
          <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
            SOL Canonical Pivot & Projections
          </span>
          <span className="text-[10px] text-[var(--text-muted)] border-l border-[var(--border-strong)] pl-2 hidden md:inline">
            Inbound (OWL/SHACL) ↔ SOL IR ↔ Outbound (TypeSpec/CUE/TLA+/JSON-LD)
          </span>
        </div>

        {/* Concept Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)] text-[11px]">Concept Pivot:</span>
          <select
            id="proj-concept-select"
            value={selectedConceptId}
            onChange={e => {
              setSelectedConceptId(e.target.value);
              selectById('concept', e.target.value);
            }}
            className="bg-[var(--bg-primary)] text-sky-300 font-bold border border-[var(--border-subtle)] rounded px-2 py-1 focus:outline-hidden"
          >
            {concepts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.label || 'Concept'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tri-Pane Architecture: Inbound ↔ SOL Intermediate Representation ↔ Outbound */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        
        {/* 1. Inbound Semantic Representation (Left - 3 cols) */}
        <div className="lg:col-span-3 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-teal-300 flex items-center gap-1.5">
              <span>INBOUND SOURCE</span>
              <span className="text-[9px] px-1 rounded bg-teal-950 text-teal-300 border border-teal-800">
                {repMapping?.inbound_source?.format || 'OWL'}
              </span>
            </span>
            <ProvenanceBadge provenance="imported" size="xs" />
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto font-mono text-xs">
            {repMapping?.inbound_source ? (
              <>
                <div className="text-[11px] text-[var(--text-muted)] space-y-1">
                  <div>Source URI: <span className="text-[var(--text-primary)] text-[10px] truncate block">{repMapping.inbound_source.source_uri}</span></div>
                  <div>Axiom Count: <span className="text-teal-400 font-bold">{repMapping.inbound_source.axioms_count}</span></div>
                  <div>Parsed Classes: <span className="text-[var(--text-primary)]">{repMapping.inbound_source.parsed_classes.join(', ')}</span></div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Raw Inbound Axioms:</div>
                  <pre className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-teal-200 text-[10px] overflow-x-auto font-code whitespace-pre-wrap">
                    {repMapping.inbound_source.raw_syntax}
                  </pre>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-[var(--text-muted)] text-[11px]">
                Native SOL Concept (defined directly in specification database without legacy OWL/RDF wrapper).
              </div>
            )}
          </div>
        </div>

        {/* 2. Central Canonical SOL Representation (Center - 4 cols) */}
        <div className="lg:col-span-4 border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
              <span>CANONICAL SOL IR</span>
            </span>
            <ProvenanceBadge provenance="semantic" size="xs" />
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-y-auto font-mono text-xs">
            <div className="p-2.5 rounded border border-indigo-900/50 bg-indigo-950/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 text-sm">{currentConcept.name}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{currentConcept.id}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">{currentConcept.description}</p>
            </div>

            {/* Semantic Attributes */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
                Schema Attributes ({Object.keys(currentConcept.attributes).length}):
              </div>
              <div className="space-y-1">
                {Object.values(currentConcept.attributes).map(attr => (
                  <div key={attr.id} className="p-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-400 font-bold">{attr.name}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">:{attr.value_type}</span>
                    </div>
                    {attr.shrapnel_field_id && (
                      <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        EAV #{attr.shrapnel_field_id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invariants & State Transitions */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
                Invariant Rules ({currentConcept.invariants.length}):
              </div>
              {currentConcept.invariants.map(inv => (
                <div key={inv.id} className="p-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px]">
                  <div className="font-semibold text-indigo-200">{inv.name}</div>
                  <div className="text-[var(--text-muted)] font-code">{inv.expression?.raw_code || 'Expression AST'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Outbound Projections Engine (Right - 5 cols) */}
        <div className="lg:col-span-5 bg-[var(--bg-secondary)]/30 flex flex-col overflow-hidden">
          {/* Format Tabs Header */}
          <div className="p-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1">
              {(['TypeSpec', 'CUE', 'TLA_PLUS', 'JSON_LD'] as OutboundFormat[]).map(fmt => (
                <button
                  key={fmt}
                  id={`proj-fmt-${fmt}`}
                  onClick={() => setActiveOutboundFormat(fmt)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                    activeOutboundFormat === fmt
                      ? 'bg-rose-950 text-rose-300 border border-rose-600 shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {fmt === 'TLA_PLUS' ? 'TLA+' : (fmt === 'JSON_LD' ? 'JSON-LD' : fmt)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                id="proj-copy-code-btn"
                onClick={handleCopy}
                className="px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] text-[10px] flex items-center gap-1 border border-[var(--border-subtle)]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <ProvenanceBadge provenance="projected" size="xs" />
            </div>
          </div>

          {/* Projected Code View */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            <pre className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-rose-200 font-code text-xs leading-relaxed overflow-x-auto whitespace-pre">
              {outboundCode}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};
