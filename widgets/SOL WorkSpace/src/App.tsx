import React from 'react';
import { WorkbenchProvider, useWorkbench } from './context/WorkbenchContext';
import { Header } from './components/layout/Header';
import { Navigator } from './components/navigator/Navigator';
import { GraphEditor } from './components/graph/GraphEditor';
import { SolRepl } from './components/repl/SolRepl';
import { ProjectionsExplorer } from './components/projections/ProjectionsExplorer';
import { StructuredEditor } from './components/editor/StructuredEditor';
import { Inspector } from './components/inspector/Inspector';
import { ActivityPanel } from './components/activity/ActivityPanel';
import { SearchGroundingModal } from './components/grounding/SearchGroundingModal';
import { Network, Terminal, FileCode2, Layers } from 'lucide-react';

const WorkbenchContent: React.FC = () => {
  const { 
    activeWorkspaceTab, 
    setActiveWorkspaceTab,
    theme 
  } = useWorkbench();

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] theme-${theme}`}>
      {/* Top Application Header & Persona / Frame Bar */}
      <Header />

      {/* Main Multi-Pane Workbench Body */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* Left Navigator (Concepts, Entities, EAV, Rules) */}
        <Navigator />

        {/* Center Primary Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[var(--bg-primary)]">
          
          {/* Workspace Primary Tab Selector */}
          <div className="h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 flex items-center justify-between shrink-0 font-mono text-xs z-10">
            <div className="flex items-center gap-1">
              <button
                id="ws-tab-graph"
                onClick={() => setActiveWorkspaceTab('graph')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeWorkspaceTab === 'graph'
                    ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Graph Editor</span>
              </button>

              <button
                id="ws-tab-repl"
                onClick={() => setActiveWorkspaceTab('repl')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeWorkspaceTab === 'repl'
                    ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SOLScript REPL</span>
              </button>

              <button
                id="ws-tab-projections"
                onClick={() => setActiveWorkspaceTab('projections')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                  activeWorkspaceTab === 'projections'
                    ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Projections & Inbound</span>
              </button>

              <button
                id="ws-tab-structured"
                onClick={() => setActiveWorkspaceTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                  (activeWorkspaceTab === 'editor' || activeWorkspaceTab === 'structured')
                    ? 'bg-[var(--bg-primary)] text-sky-400 border border-[var(--border-subtle)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Structured Editor</span>
              </button>
            </div>
          </div>

          {/* Active Workspace View */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {activeWorkspaceTab === 'graph' && <GraphEditor />}
            {activeWorkspaceTab === 'repl' && <SolRepl />}
            {activeWorkspaceTab === 'projections' && <ProjectionsExplorer />}
            {(activeWorkspaceTab === 'editor' || activeWorkspaceTab === 'structured') && <StructuredEditor />}
          </div>

          {/* Bottom Activity & Reasoning Panel */}
          <ActivityPanel />
        </main>

        {/* Right Detail / Provenance Inspector */}
        <Inspector />
      </div>

      {/* Global Search Grounding Utility Modal */}
      <SearchGroundingModal />
    </div>
  );
};

export default function App() {
  return (
    <WorkbenchProvider>
      <WorkbenchContent />
    </WorkbenchProvider>
  );
}
