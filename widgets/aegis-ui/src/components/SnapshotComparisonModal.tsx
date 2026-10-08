import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Check,
  Download,
  Filter,
  Layers,
  Sparkles,
  Search,
  Clock,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Code2,
} from 'lucide-react';
import { StateSnapshot, SnapshotComparisonResult, VariableDiffItem } from '../types';
import {
  compareSnapshots,
  exportSnapshotComparisonMarkdown,
} from '../utils/simulator';

interface SnapshotComparisonModalProps {
  snapshotA: StateSnapshot;
  snapshotB: StateSnapshot;
  onClose: () => void;
  onSwapSnapshots?: () => void;
}

export const SnapshotComparisonModal: React.FC<SnapshotComparisonModalProps> = ({
  snapshotA: initialA,
  snapshotB: initialB,
  onClose,
}) => {
  const [currentA, setCurrentA] = useState<StateSnapshot>(initialA);
  const [currentB, setCurrentB] = useState<StateSnapshot>(initialB);
  const [filterMode, setFilterMode] = useState<'all' | 'changed' | 'unchanged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFormat, setCopiedFormat] = useState<'markdown' | 'json' | null>(null);

  // Compute live diff comparison
  const comparisonResult: SnapshotComparisonResult = useMemo(() => {
    return compareSnapshots(currentA, currentB);
  }, [currentA, currentB]);

  // Swap snapshots direction
  const handleSwap = () => {
    setCurrentA(currentB);
    setCurrentB(currentA);
  };

  // Filtered variable diffs
  const filteredDiffs = useMemo(() => {
    return comparisonResult.variableDiffs.filter((diff) => {
      // Filter by status tab
      if (filterMode === 'changed' && !diff.hasChanged) return false;
      if (filterMode === 'unchanged' && diff.hasChanged) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const keyMatch = diff.key.toLowerCase().includes(q);
        const valAMatch = JSON.stringify(diff.prevVal)?.toLowerCase().includes(q);
        const valBMatch = JSON.stringify(diff.currentVal)?.toLowerCase().includes(q);
        return keyMatch || valAMatch || valBMatch;
      }

      return true;
    });
  }, [comparisonResult.variableDiffs, filterMode, searchQuery]);

  const handleCopyMarkdown = async () => {
    const md = exportSnapshotComparisonMarkdown(comparisonResult);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedFormat('markdown');
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(comparisonResult, null, 2));
      setCopiedFormat('json');
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadReport = () => {
    const md = exportSnapshotComparisonMarkdown(comparisonResult);
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `state-snapshot-diff-step${currentA.stepIndex}-vs-step${currentB.stepIndex}.md`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderValueDisplay = (val: unknown, isTarget: boolean, color: 'green' | 'red' | 'none') => {
    if (val === undefined) {
      return <span className="text-[#8B949E] italic text-[11px]">&lt;undefined&gt;</span>;
    }
    if (val === null) {
      return <span className="text-[#8B949E] font-mono text-[11px]">null</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
            val
              ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40'
              : 'bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/40'
          }`}
        >
          {val ? 'TRUE' : 'FALSE'}
        </span>
      );
    }
    if (typeof val === 'number') {
      return (
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
            isTarget && color === 'green'
              ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40'
              : isTarget && color === 'red'
              ? 'bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/40'
              : 'bg-[#0F1115] text-[#79c0ff] border border-[#2D333B]'
          }`}
        >
          {val}
        </span>
      );
    }
    if (typeof val === 'string') {
      return (
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded break-all ${
            isTarget && color === 'green'
              ? 'bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30'
              : isTarget && color === 'red'
              ? 'bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/30'
              : 'bg-[#0F1115] text-[#A5D6FF] border border-[#2D333B]'
          }`}
        >
          &quot;{val}&quot;
        </span>
      );
    }
    // Objects or Arrays
    return (
      <pre className="font-mono text-[11px] text-[#C9D1D9] bg-[#0A0C10] p-1.5 rounded border border-[#2D333B] overflow-x-auto max-h-24">
        {JSON.stringify(val, null, 2)}
      </pre>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#16191E] border border-[#2D333B] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2D333B] bg-[#0F1115] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#F0F6FC] tracking-tight">
                  State Snapshot Comparison
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#21262D] text-[#58a6ff] border border-[#30363D]">
                  Step {currentA.stepIndex} ➔ Step {currentB.stepIndex}
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Visual delta inspection between state execution checkpoints and variable assignments.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Swap Button */}
            <button
              onClick={handleSwap}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] hover:border-[#3B82F6]/50 rounded-lg transition-colors"
              title="Swap Baseline (A) and Target (B)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Swap A ⇄ B</span>
            </button>

            {/* Export Markdown */}
            <button
              onClick={handleCopyMarkdown}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-lg transition-colors"
              title="Copy markdown comparison table to clipboard"
            >
              {copiedFormat === 'markdown' ? (
                <Check className="w-3.5 h-3.5 text-[#3fb950]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#8B949E]" />
              )}
              <span>{copiedFormat === 'markdown' ? 'Copied MD!' : 'Copy MD'}</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleCopyJson}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-lg transition-colors"
              title="Copy JSON comparison object to clipboard"
            >
              {copiedFormat === 'json' ? (
                <Check className="w-3.5 h-3.5 text-[#3fb950]" />
              ) : (
                <Code2 className="w-3.5 h-3.5 text-[#8B949E]" />
              )}
              <span>{copiedFormat === 'json' ? 'Copied JSON!' : 'Copy JSON'}</span>
            </button>

            {/* Download Report */}
            <button
              onClick={handleDownloadReport}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#C9D1D9] bg-[#16191E] hover:bg-[#21262D] border border-[#2D333B] rounded-lg transition-colors"
              title="Download comparison markdown report"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-[#8B949E] hover:text-white hover:bg-[#21262D] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Snapshot Cards Summary Bar */}
        <div className="px-6 py-4 bg-[#12151A] border-b border-[#2D333B]">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            {/* Snapshot A Card */}
            <div className="md:col-span-5 p-3.5 bg-[#16191E] rounded-xl border border-[#2D333B] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#3B82F6]/20 text-[#58a6ff] text-[10px] font-mono font-bold border border-[#3B82F6]/40">
                    SNAPSHOT A (BASELINE)
                  </span>
                  <span className="text-xs font-semibold text-[#F0F6FC]">
                    {currentA.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8B949E] flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{currentA.timestamp}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D333B] text-xs">
                  <span className="text-[#8B949E] text-[11px]">Step:</span>
                  <span className="font-mono font-bold text-[#F0F6FC]">{currentA.stepIndex}</span>
                </div>

                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D333B] text-xs">
                  <span className="text-[#8B949E] text-[11px]">State:</span>
                  <span className="font-mono font-semibold text-[#58a6ff]">{currentA.stateName}</span>
                </div>

                {currentA.transitionName && (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D333B] text-xs">
                    <span className="text-[#8B949E] text-[11px]">Via:</span>
                    <span className="text-[#C9D1D9]">{currentA.transitionName}</span>
                  </div>
                )}

                {currentA.triggerEvent && (
                  <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#D29922]/15 text-[#D29922] border border-[#D29922]/30 text-[10px] font-mono">
                    <Zap className="w-2.5 h-2.5" />
                    <span>{currentA.triggerEvent}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Directional Center Pillar */}
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-[#21262D] border border-[#2D333B] flex items-center justify-center text-[#58a6ff] shadow-sm">
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#8B949E]">
                {comparisonResult.stepDifference >= 0
                  ? `+${comparisonResult.stepDifference} steps`
                  : `${comparisonResult.stepDifference} steps`}
              </span>
            </div>

            {/* Snapshot B Card */}
            <div className="md:col-span-5 p-3.5 bg-[#16191E] rounded-xl border border-[#2D333B] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#238636]/20 text-[#3fb950] text-[10px] font-mono font-bold border border-[#238636]/40">
                    SNAPSHOT B (TARGET)
                  </span>
                  <span className="text-xs font-semibold text-[#F0F6FC]">
                    {currentB.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8B949E] flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{currentB.timestamp}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D333B] text-xs">
                  <span className="text-[#8B949E] text-[11px]">Step:</span>
                  <span className="font-mono font-bold text-[#F0F6FC]">{currentB.stepIndex}</span>
                </div>

                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D333B] text-xs">
                  <span className="text-[#8B949E] text-[11px]">State:</span>
                  <span className="font-mono font-semibold text-[#3fb950]">{currentB.stateName}</span>
                </div>

                {currentB.transitionName && (
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D333B] text-xs">
                    <span className="text-[#8B949E] text-[11px]">Via:</span>
                    <span className="text-[#C9D1D9]">{currentB.transitionName}</span>
                  </div>
                )}

                {currentB.triggerEvent && (
                  <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#D29922]/15 text-[#D29922] border border-[#D29922]/30 text-[10px] font-mono">
                    <Zap className="w-2.5 h-2.5" />
                    <span>{currentB.triggerEvent}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Natural Language Summary Banner */}
          <div className="mt-3 p-2.5 rounded-lg bg-[#0F1115] border border-[#2D333B] flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-[#C9D1D9]">
              <Sparkles className="w-4 h-4 text-[#58a6ff] shrink-0" />
              <span>{comparisonResult.summary}</span>
            </div>
            {comparisonResult.changedCount > 0 ? (
              <span className="text-[11px] font-bold text-[#3fb950] font-mono px-2 py-0.5 rounded bg-[#238636]/10 border border-[#238636]/30 shrink-0 ml-2">
                {comparisonResult.changedCount} MUTATED
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8B949E] font-mono px-2 py-0.5 rounded bg-[#21262D] border border-[#30363D] shrink-0 ml-2">
                IDENTICAL
              </span>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 bg-[#16191E] border-b border-[#2D333B] flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-[#0F1115] p-1 rounded-xl border border-[#2D333B]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-[#21262D] text-[#F0F6FC] shadow-xs'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
            >
              All Variables ({comparisonResult.totalVariables})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('changed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                filterMode === 'changed'
                  ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40'
                  : 'text-[#8B949E] hover:text-[#3fb950]'
              }`}
            >
              <span>Changed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#238636]/30 text-[#3fb950]">
                {comparisonResult.changedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unchanged')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                filterMode === 'unchanged'
                  ? 'bg-[#21262D] text-[#F0F6FC]'
                  : 'text-[#8B949E] hover:text-[#C9D1D9]'
              }`}
            >
              <span>Unchanged</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#21262D] text-[#8B949E]">
                {comparisonResult.unchangedCount}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search variables or values..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0F1115] border border-[#2D333B] rounded-lg text-xs text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#3B82F6]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#8B949E] hover:text-[#C9D1D9]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Variable Diffs Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0F1115]">
          {filteredDiffs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#8B949E]/40" />
              <p className="text-xs font-medium text-[#8B949E]">
                {filterMode === 'changed'
                  ? 'No variable mutations detected between these two snapshots. Values are strictly identical.'
                  : 'No variables match the active filters.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#16191E] rounded-xl border border-[#2D333B] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0C10] text-[#8B949E] font-semibold border-b border-[#2D333B]">
                  <tr>
                    <th className="px-5 py-3 w-1/4">Variable Name</th>
                    <th className="px-5 py-3 w-1/4">
                      Snapshot A (Step {currentA.stepIndex})
                    </th>
                    <th className="px-4 py-3 w-1/12 text-center">Direction</th>
                    <th className="px-5 py-3 w-1/4">
                      Snapshot B (Step {currentB.stepIndex})
                    </th>
                    <th className="px-5 py-3 text-right">Delta / Highlight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D333B]">
                  {filteredDiffs.map((diff) => {
                    return (
                      <tr
                        key={diff.key}
                        className={`transition-colors ${
                          diff.hasChanged
                            ? diff.color === 'green'
                              ? 'bg-[#238636]/5 hover:bg-[#238636]/10'
                              : diff.color === 'red'
                              ? 'bg-[#f85149]/5 hover:bg-[#f85149]/10'
                              : 'bg-[#58a6ff]/5 hover:bg-[#58a6ff]/10'
                            : 'hover:bg-[#1C2128]'
                        }`}
                      >
                        {/* Variable Key */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                diff.hasChanged
                                  ? diff.color === 'green'
                                    ? 'bg-[#3fb950]'
                                    : diff.color === 'red'
                                    ? 'bg-[#f85149]'
                                    : 'bg-[#58a6ff]'
                                  : 'bg-[#8B949E]'
                              }`}
                            />
                            <span className="font-mono font-bold text-[#F0F6FC]">
                              {diff.key}
                            </span>
                          </div>
                        </td>

                        {/* Snapshot A Value */}
                        <td className="px-5 py-3.5">
                          {renderValueDisplay(diff.prevVal, false, 'none')}
                        </td>

                        {/* Direction Arrow */}
                        <td className="px-4 py-3.5 text-center">
                          <ArrowRight
                            className={`w-3.5 h-3.5 mx-auto ${
                              diff.hasChanged ? 'text-[#F0F6FC]' : 'text-[#8B949E]/40'
                            }`}
                          />
                        </td>

                        {/* Snapshot B Value */}
                        <td className="px-5 py-3.5">
                          {renderValueDisplay(diff.currentVal, true, diff.color)}
                        </td>

                        {/* Delta Badge */}
                        <td className="px-5 py-3.5 text-right">
                          {diff.hasChanged ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                diff.color === 'green'
                                  ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40'
                                  : diff.color === 'red'
                                  ? 'bg-[#f85149]/20 text-[#f85149] border-[#f85149]/40'
                                  : 'bg-[#58a6ff]/20 text-[#79c0ff] border-[#58a6ff]/40'
                              }`}
                            >
                              {diff.badgeLabel || diff.deltaText || 'MUTATED'}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-[#8B949E]">
                              unchanged
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0F1115] border-t border-[#2D333B] flex items-center justify-between text-xs text-[#8B949E]">
          <div>
            Comparing <span className="text-[#F0F6FC] font-semibold">{currentA.name}</span> with{' '}
            <span className="text-[#F0F6FC] font-semibold">{currentB.name}</span>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] hover:text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
