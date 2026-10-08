import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Flame, 
  Boxes, 
  Code, 
  History, 
  ArrowRight,
  ShieldCheck,
  Search,
  CornerDownLeft,
  Globe,
  BookOpen
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { ReplHistoryItem, Disposition } from '../../types/sol';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { solEngine } from '../../engine/solEngine';

const REPL_SNIPPETS = [
  { label: 'Ground schema.org', cmd: 'ground("schema.org/ComputerServer")' },
  { label: 'Eval Prod Baseline', cmd: 'evaluate("prop-host01-prod-compute", {"environment":"prod"})' },
  { label: 'Check Host-03 Faulty', cmd: 'check("ent-host-03-faulty")' },
  { label: 'Reason on Host-01', cmd: 'reason("ent-host-01", true)' },
  { label: 'Query Active Hosts', cmd: 'select("Host").filter(cores > 4)' },
  { label: 'Decode EAV Obj #41', cmd: 'shrapnel.decode(41)' },
  { label: 'Project to TypeSpec', cmd: 'project("concept-host", "TypeSpec")' },
  { label: 'Address $selected', cmd: 'inspect($selected)' }
];

export const SolRepl: React.FC = () => {
  const {
    replHistory,
    executeRepl,
    replDraft,
    setReplDraft,
    selectedItem,
    selectById,
    runEvaluation,
    setActiveActivityTab,
    setActiveWorkspaceTab,
    openGroundingModal,
    refreshEngine,
    selectItem
  } = useWorkbench();

  const [input, setInput] = useState(replDraft || '');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replDraft) {
      setInput(replDraft);
      setReplDraft('');
      inputRef.current?.focus();
    }
  }, [replDraft]);

  useEffect(() => {
    // Scroll to top of list on new command
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [replHistory.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let cmd = input.trim();
    // Resolve $selected reference if present
    if (cmd.includes('$selected') && selectedItem) {
      if (selectedItem.type === 'entity') {
        cmd = cmd.replace('$selected', `entity("${selectedItem.id}")`);
      } else if (selectedItem.type === 'concept') {
        cmd = cmd.replace('$selected', `concept("${selectedItem.id}")`);
      } else if (selectedItem.type === 'proposition') {
        cmd = cmd.replace('$selected', `evaluate("${selectedItem.id}")`);
      } else if (selectedItem.type === 'shrapnel_object') {
        cmd = cmd.replace('$selected', `shrapnel.decode(${selectedItem.id})`);
      }
    }

    executeRepl(cmd);
    setInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (replHistory.length === 0) return;
      const nextIdx = Math.min(historyIndex + 1, replHistory.length - 1);
      setHistoryIndex(nextIdx);
      setInput(replHistory[nextIdx].input);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(replHistory[nextIdx].input);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Render rich structural output based on outputType
  const renderStructuralOutput = (item: ReplHistoryItem) => {
    const out = item.output;

    // 1. Evaluation Result Card
    if (item.outputType === 'evaluation' && out?.proposition_id) {
      const isAsserted = out.disposition === Disposition.Asserted;
      const isRejected = out.disposition === Disposition.Rejected;
      return (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <div className="flex items-center gap-2">
              {isAsserted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isRejected && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {!isAsserted && !isRejected && <Sparkles className="w-4 h-4 text-amber-400" />}
              <span className="font-bold text-[var(--text-primary)]">{out.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                isAsserted ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                isRejected ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                'bg-amber-950 text-amber-300 border border-amber-700'
              }`}>
                {out.disposition}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                conf: {(out.confidence_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Evaluated Rules Matrix */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
              Evaluated Invariants & Assertion Rules:
            </div>
            {(out.rules_evaluated || []).map((r: any) => (
              <div key={r.rule_id} className="flex items-start justify-between py-1 px-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <div>
                  <div className="flex items-center gap-1.5">
                    {r.passed ? (
                      <span className="text-emerald-400 font-bold">✓</span>
                    ) : (
                      <span className="text-rose-400 font-bold">✗</span>
                    )}
                    <span className="font-semibold text-[var(--text-primary)]">{r.rule_name}</span>
                    <span className="text-[9px] text-[var(--text-muted)]">({r.severity})</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] pl-3.5">
                    {r.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Links */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => {
                selectById('proposition', out.proposition_id);
                setActiveActivityTab('evaluator');
              }}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 text-[11px]"
            >
              <span>Inspect Full Explanation Trail ("Why did SOL conclude this?")</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-[var(--text-muted)]">
              db_eval: {out.database_eval_status} · {out.evaluation_time_ms}ms
            </span>
          </div>
        </div>
      );
    }

    // 2. Check Entity Result Card
    if (item.outputType === 'evaluation' && out?.rules && out?.entity_id) {
      return (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
            <span className="font-bold text-[var(--text-primary)]">
              Invariant Audit for Entity: <span className="text-emerald-400">{out.entity_id}</span> ({out.concept_name})
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              out.all_passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}>
              {out.all_passed ? 'ALL INVARIANTS PASS' : 'VIOLATION DETECTED'}
            </span>
          </div>
          <div className="space-y-1">
            {out.rules.map((r: any) => (
              <div key={r.rule_id} className="p-1.5 rounded bg-[var(--bg-tertiary)] flex items-center justify-between">
                <div>
                  <span className={r.passed ? 'text-emerald-400 font-bold mr-1.5' : 'text-rose-400 font-bold mr-1.5'}>
                    {r.passed ? '✓' : '✗'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{r.rule_name}</span>
                  <span className="text-[11px] text-[var(--text-muted)] ml-2">({r.reason})</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => selectById('entity', out.entity_id)}
            className="text-sky-400 hover:text-sky-300 text-[11px] flex items-center gap-1 pt-1"
          >
            <span>Open Entity Inspector</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      );
    }

    // 3. Entity Card
    if (item.outputType === 'entity' && out?.id) {
      return (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/10 p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-emerald-300 text-sm">{out.external_id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-muted)]">
                {out.concept_name}
              </span>
            </div>
            <ProvenanceBadge provenance={out.provenance || 'concrete'} size="sm" />
          </div>

          {/* Key Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1">
            {Object.entries(out.attributes || {}).map(([k, v]) => (
              <div key={k} className="p-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)] uppercase">{k}</div>
                <div className="font-bold text-[var(--text-primary)] truncate">{String(v)}</div>
              </div>
            ))}
          </div>

          {out.shrapnel_object_id && (
            <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Polymorphic EAV Object #{out.shrapnel_object_id} bound
              </span>
              <button
                onClick={() => selectById('shrapnel_object', out.shrapnel_object_id)}
                className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-900 text-white font-bold"
              >
                Inspect EAV
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => selectById('entity', out.id)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View in Graph & Inspector</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    // 4. Query Table Result
    if (item.outputType === 'table' && Array.isArray(out)) {
      return (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden font-mono text-xs">
          <div className="px-3 py-1.5 bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="font-bold text-[var(--text-secondary)]">Query ResultSet ({out.length} entities)</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">COLLECTION</span>
          </div>
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--bg-secondary)]/50">
                  <th className="p-2">ID</th>
                  <th className="p-2">Concept</th>
                  <th className="p-2">Attributes</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {out.map((ent: any) => (
                  <tr 
                    key={ent.id}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                    onClick={() => selectById('entity', ent.id)}
                  >
                    <td className="p-2 text-emerald-400 font-bold">{ent.external_id}</td>
                    <td className="p-2 text-[var(--text-secondary)]">{ent.concept_name}</td>
                    <td className="p-2 text-[var(--text-muted)] truncate max-w-xs font-mono">
                      {JSON.stringify(ent.attributes)}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectById('entity', ent.id);
                        }}
                        className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sky-400 hover:text-sky-300"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // 5. Shrapnel Object Card
    if (item.outputType === 'shrapnel_object' && out?.id) {
      return (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/10 p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Shrapnel EAV Object Instance #{out.id}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{out.created_at}</span>
          </div>

          <div className="space-y-1">
            {Object.entries(out.values || {}).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between p-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                <span className="font-semibold text-amber-200">{key}</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. Projections Output Block
    if (item.outputType === 'projection') {
      return (
        <div className="rounded-lg border border-rose-900/50 bg-[var(--bg-primary)] p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5 text-rose-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-rose-400" />
              Projected Representation
            </span>
            <button
              onClick={() => copyToClipboard(String(out), item.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedId === item.id ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="p-2 rounded bg-black/40 text-rose-200 overflow-x-auto text-[11px] max-h-64 font-code">
            {out}
          </pre>
        </div>
      );
    }

    // 7. Search Grounding Ontology Card
    if (item.outputType === 'grounding' && out?.canonical_name) {
      return (
        <div className="rounded-lg border border-sky-800/60 bg-sky-950/20 p-3 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-sky-800/40 pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sky-300">
                Grounded: {out.canonical_name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-200 border border-sky-700">
                subclassOf {out.subclass_of || 'Thing'}
              </span>
            </div>
            <span className="text-[10px] text-sky-400/80">
              {out.sources?.length || 0} Web Sources
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] font-sans">
            {out.description}
          </p>

          {/* Sources list */}
          {out.sources && out.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {out.sources.map((src: any, idx: number) => (
                <a
                  key={idx}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[10px] text-sky-400 hover:text-sky-300"
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[200px]">{src.title}</span>
                  <ExternalLink className="w-2 h-2" />
                </a>
              ))}
            </div>
          )}

          {/* Summary metrics & quick actions */}
          <div className="flex items-center justify-between pt-2 border-t border-sky-900/40">
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <span>{out.attributes?.length || 0} attributes</span>
              <span>•</span>
              <span>{out.invariants?.length || 0} invariants</span>
              <span>•</span>
              <span>{out.relationships?.length || 0} relations</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openGroundingModal(out.canonical_name)}
                className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-strong)] text-[11px] text-sky-300 flex items-center gap-1 transition-colors"
              >
                <span>Inspect in Utility</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  try {
                    const res = (window as any).__solEngine 
                      ? (window as any).__solEngine.importGroundedOntology(out)
                      : solEngine.importGroundedOntology(out);
                    refreshEngine();
                    selectItem({
                      type: 'concept',
                      id: res.conceptId,
                      data: res.concept,
                      provenance: 'imported'
                    });
                    setActiveWorkspaceTab('editor');
                  } catch (e: any) {
                    alert(`Import failed: ${e.message}`);
                  }
                }}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Database className="w-3 h-3" />
                <span>Import to SOL</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 8. Generic Primitive or JSON
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 font-mono text-xs">
        <pre className="text-[var(--text-secondary)] whitespace-pre-wrap font-code">
          {typeof out === 'object' ? JSON.stringify(out, null, 2) : String(out)}
        </pre>
      </div>
    );
  };

  return (
    <div
      id="solscript-repl-workspace"
      className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden select-none"
    >
      {/* REPL Header & Snippets Bar */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span className="font-bold font-mono text-xs uppercase tracking-wider text-[var(--text-primary)]">
              SOLScript Interactive REPL Runtime
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
              v3.7·in-memory
            </span>
          </div>

          {selectedItem && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
              <span>$selected:</span>
              <span className="text-sky-300 font-bold">{selectedItem.data?.external_id || selectedItem.data?.name || selectedItem.id}</span>
            </div>
          )}
        </div>

        {/* Quick Snippet Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" /> Quick:
          </span>
          {REPL_SNIPPETS.map(snip => (
            <button
              key={snip.label}
              onClick={() => {
                setInput(snip.cmd);
                inputRef.current?.focus();
              }}
              className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-sky-300 border border-[var(--border-subtle)] shrink-0 transition-colors"
            >
              {snip.label}
            </button>
          ))}
        </div>
      </div>

      {/* REPL History Stream (Scrollable) */}
      <div
        ref={scrollRef}
        id="repl-history-stream"
        className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs"
      >
        {replHistory.map(item => {
          const isError = item.status === 'error';
          return (
            <div
              key={item.id}
              id={`repl-item-${item.id}`}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 space-y-2 transition-all hover:border-[var(--border-strong)]"
            >
              {/* Command Input Row */}
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-sky-400 font-bold font-code">
                  <span className="text-[var(--text-muted)]">sol&gt;</span>
                  <span>{item.input}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>{item.executionTimeMs}ms</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Structured Output */}
              {isError ? (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
                  Error: {String(item.output)}
                </div>
              ) : (
                renderStructuralOutput(item)
              )}
            </div>
          );
        })}
      </div>

      {/* REPL Input Form */}
      <form
        id="repl-input-form"
        onSubmit={handleSubmit}
        className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 shrink-0 flex items-center gap-2"
      >
        <div className="flex items-center gap-2 flex-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded px-3 py-1.5 focus-within:border-sky-400">
          <span className="font-mono font-bold text-sky-400 text-xs">sol&gt;</span>
          <input
            ref={inputRef}
            id="repl-command-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type SOLScript expression (e.g. evaluate('prop-01'), check('ent-01'), select('Host'), help)..."
            className="flex-1 bg-transparent text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden"
          />
        </div>
        <button
          id="repl-run-btn"
          type="submit"
          className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span>Execute</span>
        </button>
      </form>
    </div>
  );
};
