import React from 'react';
import { 
  Network, 
  Terminal, 
  FileCode2, 
  Layers, 
  Cpu, 
  Database, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Sun, 
  Moon, 
  Sliders, 
  Activity, 
  Search,
  Sparkles,
  Zap
} from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext';
import { WorkspacePersona, AppTheme, GraphMode } from '../../types/sol';

export const Header: React.FC = () => {
  const {
    theme,
    setTheme,
    persona,
    setPersona,
    graphMode,
    setGraphMode,
    activeWorkspaceTab,
    setActiveWorkspaceTab,
    frameContext,
    updateFrameContext,
    refreshEngine,
    openGroundingModal
  } = useWorkbench();

  return (
    <header
      id="workbench-header"
      className="h-11 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between px-3 text-xs select-none shrink-0 gap-2 overflow-x-auto"
    >
      {/* Brand & System Liveness */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black font-mono text-[11px] shadow-sm">
            Ω
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold tracking-wider font-mono text-sm uppercase text-[var(--text-primary)]">
              SOL<span className="text-sky-400 font-normal">.workbench</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)] border-l border-[var(--border-strong)] pl-1.5 hidden sm:inline">
              v3.7·db-driven
            </span>
          </div>
        </div>

        {/* DB & Interpreter Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>REST: :8111</span>
          <span className="text-[var(--text-muted)]">|</span>
          <span className="text-sky-300">interpreter: loaded</span>
        </div>
      </div>

      {/* Primary Workspace Navigation Tabs */}
      <div className="flex items-center bg-[var(--bg-primary)] p-0.5 rounded border border-[var(--border-subtle)] gap-0.5 shrink-0">
        <button
          id="tab-btn-graph"
          onClick={() => setActiveWorkspaceTab('graph')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeWorkspaceTab === 'graph'
              ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold shadow-xs border border-[var(--border-strong)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph</span>
          <span className={`text-[9px] px-1 rounded uppercase font-mono ${
            graphMode === 'semantic' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-emerald-900/60 text-emerald-300'
          }`}>
            {graphMode === 'semantic' ? 'Ontology' : 'Knowledge'}
          </span>
        </button>

        <button
          id="tab-btn-editor"
          onClick={() => setActiveWorkspaceTab('editor')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeWorkspaceTab === 'editor'
              ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold shadow-xs border border-[var(--border-strong)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Structured</span>
        </button>

        <button
          id="tab-btn-projections"
          onClick={() => setActiveWorkspaceTab('projections')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeWorkspaceTab === 'projections'
              ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold shadow-xs border border-[var(--border-strong)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Projections</span>
          <span className="text-[9px] px-1 rounded bg-rose-900/40 text-rose-300 font-mono">TSP/CUE</span>
        </button>

        <button
          id="tab-btn-repl"
          onClick={() => setActiveWorkspaceTab('repl')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
            activeWorkspaceTab === 'repl'
              ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold shadow-xs border border-[var(--border-strong)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>SOLScript REPL</span>
        </button>

        <button
          id="tab-btn-shrapnel"
          onClick={() => setActiveWorkspaceTab('shrapnel')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all hidden md:flex ${
            activeWorkspaceTab === 'shrapnel'
              ? 'bg-[var(--bg-tertiary)] text-sky-400 font-semibold shadow-xs border border-[var(--border-strong)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>Shrapnel EAV</span>
        </button>
      </div>

      {/* Search Grounding Quick Action */}
      <button
        id="open-grounding-utility-btn"
        onClick={() => openGroundingModal()}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-600/70 hover:border-sky-500 text-sky-300 hover:text-sky-200 text-xs font-medium transition-all shadow-xs shrink-0 cursor-pointer"
        title="Search Grounding: Pull schema.org / OWL specifications from live web"
      >
        <Globe className="w-3.5 h-3.5 text-sky-400" />
        <span className="font-semibold hidden sm:inline">Search Grounding</span>
        <span className="font-semibold sm:hidden">Ground</span>
        <Sparkles className="w-3 h-3 text-sky-400" />
      </button>

      {/* Frame Context Scoper & Persona Preset Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Frame Context Pills */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-primary)] rounded border border-[var(--border-subtle)] text-[11px] font-mono">
          <span className="text-[var(--text-muted)] flex items-center gap-1">
            <Globe className="w-3 h-3 text-sky-400" /> Frame:
          </span>
          <select
            id="frame-env-select"
            value={frameContext.environment || 'prod'}
            onChange={e => updateFrameContext({ environment: e.target.value as any })}
            className="bg-transparent text-sky-300 font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="prod">env:prod</option>
            <option value="staging">env:staging</option>
            <option value="dev">env:dev</option>
            <option value="dr">env:dr</option>
          </select>

          <span className="text-[var(--text-muted)]">/</span>

          <select
            id="frame-jur-select"
            value={frameContext.jurisdiction || 'US'}
            onChange={e => updateFrameContext({ jurisdiction: e.target.value as any })}
            className="bg-transparent text-emerald-300 focus:outline-hidden cursor-pointer"
          >
            <option value="US">jur:US</option>
            <option value="EU">jur:EU (GDPR)</option>
            <option value="APAC">jur:APAC</option>
            <option value="GLOBAL">jur:GLOBAL</option>
          </select>
        </div>

        {/* Persona Selector */}
        <div className="flex items-center bg-[var(--bg-primary)] p-0.5 rounded border border-[var(--border-subtle)] text-[11px]">
          {(['ontologist', 'developer', 'analyst'] as WorkspacePersona[]).map(p => (
            <button
              key={p}
              id={`persona-btn-${p}`}
              onClick={() => setPersona(p)}
              className={`px-2 py-0.5 rounded capitalize transition-all ${
                persona === p
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={`Switch layout to ${p} profile`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Theme Switcher */}
        <div className="flex items-center bg-[var(--bg-primary)] p-0.5 rounded border border-[var(--border-subtle)] text-[10px] font-mono">
          <button
            id="theme-steel-btn"
            onClick={() => setTheme('steel')}
            className={`px-1.5 py-0.5 rounded ${theme === 'steel' ? 'bg-sky-900/50 text-sky-300 font-bold' : 'text-[var(--text-muted)]'}`}
            title="Steel Industrial Theme"
          >
            STEEL
          </button>
          <button
            id="theme-dark-btn"
            onClick={() => setTheme('dark')}
            className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-[var(--text-muted)]'}`}
            title="Dark Graphite Theme"
          >
            DARK
          </button>
          <button
            id="theme-light-btn"
            onClick={() => setTheme('light')}
            className={`px-1.5 py-0.5 rounded ${theme === 'light' ? 'bg-sky-100 text-sky-900 font-bold' : 'text-[var(--text-muted)]'}`}
            title="Light High-Contrast Theme"
          >
            LIGHT
          </button>
        </div>

        {/* Reload Interpreter */}
        <button
          id="refresh-interpreter-btn"
          onClick={() => {
            refreshEngine();
          }}
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-strong)] transition-all"
          title="Refresh in-memory SOLScript interpreter (POST /api/evaluate/refresh)"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
