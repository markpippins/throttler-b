import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AppTheme, 
  WorkspacePersona, 
  GraphMode, 
  ProvenanceType, 
  FrameContext,
  EvaluationResult,
  ReplHistoryItem
} from '../types/sol';
import { solEngine } from '../engine/solEngine';

export type PrimaryWorkspaceTab = 'graph' | 'editor' | 'structured' | 'projections' | 'repl' | 'shrapnel' | 'gateway';
export type ActivityPanelTab = 'evaluator' | 'violations' | 'pre_llm_patterns' | 'inference_trace' | 'repl_history' | 'shrapnel_eav';

export interface SelectedItem {
  type: 'concept' | 'entity' | 'rule' | 'proposition' | 'shrapnel_object' | 'frame' | 'fact';
  id: string | number;
  data: any;
  provenance: ProvenanceType;
}

interface WorkbenchContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  persona: WorkspacePersona;
  setPersona: (p: WorkspacePersona) => void;
  graphMode: GraphMode;
  setGraphMode: (m: GraphMode) => void;
  activeWorkspaceTab: PrimaryWorkspaceTab;
  setActiveWorkspaceTab: (t: PrimaryWorkspaceTab) => void;
  activeActivityTab: ActivityPanelTab;
  setActiveActivityTab: (t: ActivityPanelTab) => void;
  
  // Selection & Navigation
  selectedItem: SelectedItem | null;
  selectItem: (item: SelectedItem | null) => void;
  selectById: (type: SelectedItem['type'], id: string | number) => void;
  
  // Frame Context Scope
  frameContext: FrameContext;
  updateFrameContext: (ctx: Partial<FrameContext>) => void;
  
  // REPL interaction
  replHistory: ReplHistoryItem[];
  executeRepl: (cmd: string) => ReplHistoryItem;
  sendToRepl: (cmd: string, autoRun?: boolean) => void;
  replDraft: string;
  setReplDraft: (s: string) => void;
  
  // Evaluation & Debugger
  activeEvaluation: EvaluationResult | null;
  runEvaluation: (propId: string, ctx?: FrameContext) => EvaluationResult;
  refreshEngine: () => void;
  
  // Layout Controls
  isNavCollapsed: boolean;
  setIsNavCollapsed: (c: boolean) => void;
  isInspectorCollapsed: boolean;
  setIsInspectorCollapsed: (c: boolean) => void;
  isActivityCollapsed: boolean;
  setIsActivityCollapsed: (c: boolean) => void;

  // Search Grounding Utility
  isGroundingModalOpen: boolean;
  setIsGroundingModalOpen: (open: boolean) => void;
  groundingInitialQuery: string;
  openGroundingModal: (initialQuery?: string) => void;
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export const WorkbenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>('steel');
  const [persona, setPersonaState] = useState<WorkspacePersona>('ontologist');
  const [graphMode, setGraphMode] = useState<GraphMode>('semantic');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<PrimaryWorkspaceTab>('graph');
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityPanelTab>('evaluator');

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(() => ({
    type: 'concept',
    id: 'concept-host',
    data: solEngine.concepts['concept-host'],
    provenance: 'semantic'
  }));

  const [frameContext, setFrameContext] = useState<FrameContext>({
    environment: 'prod',
    jurisdiction: 'US',
    security_tier: 'high'
  });

  const [replDraft, setReplDraft] = useState<string>('');
  const [replHistory, setReplHistory] = useState<ReplHistoryItem[]>(() => [
    solEngine.executeReplCommand('help'),
    solEngine.executeReplCommand('evaluate("prop-host01-prod-compute", {"environment":"prod"})')
  ]);

  const [activeEvaluation, setActiveEvaluation] = useState<EvaluationResult | null>(() => {
    try {
      return solEngine.evaluateProposition('prop-host01-prod-compute', { environment: 'prod', jurisdiction: 'US' });
    } catch (e) {
      return null;
    }
  });

  // Pane layout toggles
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);

  // Search Grounding Utility State
  const [isGroundingModalOpen, setIsGroundingModalOpen] = useState(false);
  const [groundingInitialQuery, setGroundingInitialQuery] = useState('schema.org/ComputerServer');

  const openGroundingModal = (initialQuery?: string) => {
    if (initialQuery) {
      setGroundingInitialQuery(initialQuery);
    }
    setIsGroundingModalOpen(true);
  };

  // Apply Persona Presets
  const setPersona = (newPersona: WorkspacePersona) => {
    setPersonaState(newPersona);
    if (newPersona === 'ontologist') {
      setGraphMode('semantic');
      setActiveWorkspaceTab('graph');
      setActiveActivityTab('evaluator');
      if (!selectedItem || selectedItem.type !== 'concept') {
        setSelectedItem({
          type: 'concept',
          id: 'concept-host',
          data: solEngine.concepts['concept-host'],
          provenance: 'semantic'
        });
      }
    } else if (newPersona === 'developer') {
      setActiveWorkspaceTab('repl');
      setActiveActivityTab('inference_trace');
    } else if (newPersona === 'analyst') {
      setGraphMode('concrete');
      setActiveWorkspaceTab('graph');
      setActiveActivityTab('violations');
      const faulty = solEngine.entities.find(e => e.id === 'ent-host-03-faulty');
      if (faulty) {
        setSelectedItem({
          type: 'entity',
          id: faulty.id,
          data: faulty,
          provenance: faulty.provenance
        });
      }
    }
  };

  const updateFrameContext = (ctx: Partial<FrameContext>) => {
    setFrameContext(prev => ({ ...prev, ...ctx }));
  };

  const selectById = (type: SelectedItem['type'], id: string | number) => {
    let data: any = null;
    let provenance: ProvenanceType = 'semantic';

    if (type === 'concept') {
      data = solEngine.concepts[id as string];
      provenance = data?.provenance || 'semantic';
    } else if (type === 'entity') {
      data = solEngine.entities.find(e => e.id === id);
      provenance = data?.provenance || 'concrete';
    } else if (type === 'proposition') {
      data = solEngine.propositions.find(p => p.id === id);
      provenance = data?.provenance || 'evaluated';
    } else if (type === 'rule') {
      data = solEngine.rules.find(r => r.id === id);
      provenance = data?.provenance || 'semantic';
    } else if (type === 'shrapnel_object') {
      data = solEngine.getShrapnelObject(Number(id));
      provenance = 'eav';
    } else if (type === 'frame') {
      data = solEngine.frameDimensions.find(f => f.id === id);
      provenance = 'semantic';
    } else if (type === 'fact') {
      data = solEngine.facts.find(f => f.id === id);
      provenance = data?.provenance || 'concrete';
    }

    if (data) {
      setSelectedItem({ type, id, data, provenance });
    }
  };

  const executeRepl = (cmd: string): ReplHistoryItem => {
    const item = solEngine.executeReplCommand(cmd);
    setReplHistory(prev => [item, ...prev]);
    if (item.outputType === 'evaluation' && item.output?.proposition_id) {
      setActiveEvaluation(item.output);
    }
    return item;
  };

  const sendToRepl = (cmd: string, autoRun: boolean = false) => {
    setReplDraft(cmd);
    setActiveWorkspaceTab('repl');
    if (autoRun) {
      executeRepl(cmd);
    }
  };

  const runEvaluation = (propId: string, ctx?: FrameContext): EvaluationResult => {
    const contextToUse = ctx || frameContext;
    const result = solEngine.evaluateProposition(propId, contextToUse);
    setActiveEvaluation(result);
    setActiveActivityTab('evaluator');
    return result;
  };

  const refreshEngine = () => {
    // trigger state re-render
    setSelectedItem(prev => (prev ? { ...prev } : null));
  };

  return (
    <WorkbenchContext.Provider
      value={{
        theme,
        setTheme,
        persona,
        setPersona,
        graphMode,
        setGraphMode,
        activeWorkspaceTab,
        setActiveWorkspaceTab,
        activeActivityTab,
        setActiveActivityTab,
        selectedItem,
        selectItem: setSelectedItem,
        selectById,
        frameContext,
        updateFrameContext,
        replHistory,
        executeRepl,
        sendToRepl,
        replDraft,
        setReplDraft,
        activeEvaluation,
        runEvaluation,
        refreshEngine,
        isNavCollapsed,
        setIsNavCollapsed,
        isInspectorCollapsed,
        setIsInspectorCollapsed,
        isActivityCollapsed,
        setIsActivityCollapsed,
        isGroundingModalOpen,
        setIsGroundingModalOpen,
        groundingInitialQuery,
        openGroundingModal
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
};

export const useWorkbench = () => {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return context;
};
