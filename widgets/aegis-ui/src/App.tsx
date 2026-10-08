/**
 * Aegis State-Machine IDE Toolkit
 * Integrated visual design, TLC/TLA+ formal verification, and simulation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { aegisApi } from './api/client';
import {
  Registry,
  StateNode,
  Transition,
  Variable,
  Constant,
  Invariant,
  Property,
  TemporalProperty,
  ExecutionLogItem,
  ValidationResult,
  ModelCheckResult,
  SimState,
  ThemeMode,
  NavigationTab,
  StateGroup,
} from './types';
import { Header } from './components/Header';
import { LeftNav } from './components/LeftNav';
import { VisualCanvas } from './components/VisualCanvas';
import { TlaEditor } from './components/TlaEditor';
import { ModelCheckerPanel } from './components/ModelCheckerPanel';
import { SimulationControls } from './components/SimulationControls';
import { ApiConsole } from './components/ApiConsole';
import { ExecutionLogViewer } from './components/ExecutionLogViewer';
import { ResourceEditorModal, ModalType } from './components/ResourceEditorModal';
import { GroupEditorModal } from './components/GroupEditorModal';
import {
  initializeSimulation,
  getEnabledTransitions,
  executeTransition,
} from './utils/simulator';
import { generateTlaPlus, generateTlcConfig } from './utils/tlaGenerator';

export default function App() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState<NavigationTab>('canvas');

  const [registries, setRegistries] = useState<Registry[]>([]);
  const [activeRegistryId, setActiveRegistryId] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState(false);
  const [loadingRegistry, setLoadingRegistry] = useState(false);

  // Registry child resources
  const [states, setStates] = useState<StateNode[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [groups, setGroups] = useState<StateGroup[]>([]);
  const [constants, setConstants] = useState<Constant[]>([]);
  const [invariants, setInvariants] = useState<Invariant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [temporalProperties, setTemporalProperties] = useState<TemporalProperty[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogItem[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [modelCheckResults, setModelCheckResults] = useState<ModelCheckResult[]>([]);

  // Simulation State
  const [simState, setSimState] = useState<SimState | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  // Operations Status
  const [isValidating, setIsValidating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Theme State with localStorage persistence (Light / Dark / Steel)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('aegis_ide_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'steel') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is restricted
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('aegis_ide_theme', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Modal State
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StateGroup | null>(null);

  // Active Canvas Selection (for search jump navigation)
  const [selectedCanvasStateId, setSelectedCanvasStateId] = useState<string | null>(null);
  const [selectedCanvasTransitionId, setSelectedCanvasTransitionId] = useState<string | null>(null);

  const handleSelectStateFromNav = (state: StateNode) => {
    setActiveTab('canvas');
    setSelectedCanvasStateId(state.id);
    setSelectedCanvasTransitionId(null);
  };

  const handleSelectTransitionFromNav = (transition: Transition) => {
    setActiveTab('canvas');
    setSelectedCanvasTransitionId(transition.id);
    setSelectedCanvasStateId(null);
  };

  const handleSelectRegistryFromNav = (registryId: string) => {
    if (registryId !== activeRegistryId) {
      setActiveRegistryId(registryId);
      const targetReg = registries.find((r) => r.id === registryId);
      showToast(`Switched to registry '${targetReg?.name || registryId}'`, 'info');
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Health Check & Fetch Registries
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await aegisApi.getHealth();
        setHealthOk(health.ok);
      } catch {
        setHealthOk(false);
      }
    };
    checkHealth();

    const loadRegistries = async () => {
      try {
        const res = await aegisApi.listRegistries();
        setRegistries(res.items);
        if (res.items.length > 0 && !activeRegistryId) {
          setActiveRegistryId(res.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load registries:', err);
      }
    };
    loadRegistries();
  }, []);

  // 2. Load Active Registry Data
  const loadRegistryData = useCallback(async (id: string) => {
    setLoadingRegistry(true);
    try {
      // Use the fast full dump endpoint
      const res = await fetch(`/api/registries/${id}/full`);
      if (res.ok) {
        const data = await res.json();
        setStates(data.states || []);
        setTransitions(data.transitions || []);
        setVariables(data.variables || []);
        setGroups(data.groups || []);
        setConstants(data.constants || []);
        setInvariants(data.invariants || []);
        setProperties(data.properties || []);
        setTemporalProperties(data.temporal_properties || []);
        setExecutionLogs(data.execution_logs || []);
        setValidationResults(data.validation_results || []);
        setModelCheckResults(data.model_check_results || []);

        // Initialize simulation
        const sim = initializeSimulation(data.states || [], data.variables || []);
        setSimState(sim);
      } else {
        // Fallback to individual calls
        const [sts, trs, vars, grps, invs, logs, vres, mres] = await Promise.all([
          aegisApi.getStates(id),
          aegisApi.getTransitions(id),
          aegisApi.getVariables(id),
          aegisApi.getGroups(id),
          aegisApi.getInvariants(id),
          aegisApi.getExecutionLogs(id),
          aegisApi.listValidationResults(id),
          aegisApi.listModelCheckResults(id),
        ]);
        setStates(sts.items);
        setTransitions(trs.items);
        setVariables(vars.items);
        setGroups(grps.items);
        setInvariants(invs.items);
        setExecutionLogs(logs.items);
        setValidationResults(vres.items);
        setModelCheckResults(mres.items);

        const sim = initializeSimulation(sts.items, vars.items);
        setSimState(sim);
      }
    } catch (err) {
      console.error('Error loading registry data:', err);
      showToast('Failed to load state machine data', 'error');
    } finally {
      setLoadingRegistry(false);
    }
  }, []);

  useEffect(() => {
    if (activeRegistryId) {
      loadRegistryData(activeRegistryId);
    }
  }, [activeRegistryId, loadRegistryData]);

  const activeRegistry = registries.find((r) => r.id === activeRegistryId) || null;

  // Compute enabled transitions for current simulation state
  const enabledTransitions =
    simState && states.length > 0
      ? getEnabledTransitions(simState.currentStateId, states, transitions, simState.variables)
      : [];

  // 3. Action: Run Validation
  const handleValidate = async () => {
    if (!activeRegistryId) return;
    setIsValidating(true);
    try {
      const res = await aegisApi.validateRegistry(activeRegistryId, 'aegis-ide-user');
      setValidationResults((prev) => [res, ...prev]);
      if (res.is_valid) {
        showToast('Structural validation passed! No issues detected.', 'success');
      } else {
        showToast(`Validation found ${res.errors.length} error(s), ${res.warnings.length} warning(s)`, 'info');
      }
    } catch (err: unknown) {
      showToast('Validation request failed: ' + (err as Error).message, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // 4. Action: Run TLC Model Check
  const handleModelCheck = async () => {
    if (!activeRegistryId) return;
    setIsChecking(true);
    try {
      const res = await aegisApi.modelCheckRegistry(activeRegistryId, {
        checked_by: 'aegis-ide-tlc',
      });
      setModelCheckResults((prev) => [res, ...prev]);
      if (res.status === 'pass') {
        showToast(`TLC verification passed in ${res.execution_time_ms}ms! All invariants hold.`, 'success');
      } else if (res.status === 'fail') {
        showToast(`TLC found violation in ${res.execution_time_ms}ms! See error trace.`, 'error');
      } else {
        showToast('TLC check returned: ' + res.status, 'info');
      }
    } catch (err: unknown) {
      showToast('Model check failed: ' + (err as Error).message, 'error');
    } finally {
      setIsChecking(false);
    }
  };

  // 5. Action: Fire Simulation Transition
  const handleFireTransition = async (transition: Transition, triggerEvent?: string) => {
    if (!simState || !activeRegistryId) return;

    try {
      const nextSim = executeTransition(simState, transition, states, triggerEvent);
      setSimState(nextSim);
      setScrubIndex(null);

      const effectiveTrigger =
        triggerEvent ||
        transition.trigger ||
        transition.triggers?.[0] ||
        `FIRE_${transition.name.toUpperCase()}`;

      showToast(`Transition '${transition.name}' fired (Trigger: ${effectiveTrigger})`, 'success');

      // Record to execution log
      try {
        const logItem = await aegisApi.appendExecutionLog(activeRegistryId, {
          from_state_id: transition.from_state_id,
          to_state_id: transition.to_state_id,
          transition_id: transition.id,
          trigger_event: effectiveTrigger,
          trigger_user: 'ide-simulation',
          context: {
            step: nextSim.history.length - 1,
            variables: nextSim.variables,
            trigger: transition.trigger,
            trigger_condition: transition.trigger_condition,
          },
        });
        setExecutionLogs((prev) => [logItem, ...prev]);
      } catch (err) {
        console.warn('Could not record execution log:', err);
      }
    } catch (err: unknown) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleResetSimulation = () => {
    const sim = initializeSimulation(states, variables);
    setSimState(sim);
    setScrubIndex(null);
    showToast('Simulation reset to initial state', 'info');
  };

  const handleStepBackward = () => {
    if (!simState || simState.history.length <= 1) return;
    const prevHistory = simState.history.slice(0, -1);
    const lastStep = prevHistory[prevHistory.length - 1];
    setSimState({
      currentStateId: lastStep.stateId,
      variables: { ...lastStep.variables },
      history: prevHistory,
    });
    setScrubIndex(null);
  };

  const handleBranchFromStep = (stepIndex: number) => {
    if (!simState || !simState.history[stepIndex]) return;
    const targetStep = simState.history[stepIndex];
    const newHistory = simState.history.slice(0, stepIndex + 1);
    setSimState({
      currentStateId: targetStep.stateId,
      variables: { ...targetStep.variables },
      history: newHistory,
    });
    setScrubIndex(null);
    showToast(`Simulation rewound to Step ${stepIndex} (${targetStep.stateName})`, 'info');
  };

  const handleUpdateSimVariable = (varName: string, value: unknown) => {
    if (!simState) return;
    const updatedVariables = { ...simState.variables, [varName]: value };
    const updatedHistory = [...simState.history];
    if (updatedHistory.length > 0) {
      const lastStep = { ...updatedHistory[updatedHistory.length - 1], variables: updatedVariables };
      updatedHistory[updatedHistory.length - 1] = lastStep;
    }
    setSimState({
      ...simState,
      variables: updatedVariables,
      history: updatedHistory,
    });
    showToast(`Variable '${varName}' updated to ${JSON.stringify(value)}`, 'info');
  };

  const handleResetAllVariables = () => {
    if (!simState) return;
    const initialVars: Record<string, unknown> = {};
    variables.forEach((v) => {
      initialVars[v.name] = v.initial_value;
    });
    const updatedHistory = [...simState.history];
    if (updatedHistory.length > 0) {
      const lastStep = { ...updatedHistory[updatedHistory.length - 1], variables: initialVars };
      updatedHistory[updatedHistory.length - 1] = lastStep;
    }
    setSimState({
      ...simState,
      variables: initialVars,
      history: updatedHistory,
    });
    showToast('Reset all variables to initial values', 'info');
  };

  // 6. Canvas node position update
  const handleUpdateStatePosition = async (stateId: string, x: number, y: number) => {
    setStates((prev) =>
      prev.map((s) => (s.id === stateId ? { ...s, x, y } : s))
    );
    if (!activeRegistryId) return;
    try {
      await aegisApi.updateChild<StateNode>(activeRegistryId, 'states', stateId, { x, y });
    } catch {
      // ignore
    }
  };

  // 6b. Batch node position update (for Force-Directed Auto-Layout)
  const handleBatchUpdateStatePositions = async (positions: { id: string; x: number; y: number }[]) => {
    const posMap = new Map(positions.map((p) => [p.id, p]));
    setStates((prev) =>
      prev.map((s) => {
        const found = posMap.get(s.id);
        return found ? { ...s, x: found.x, y: found.y } : s;
      })
    );
    showToast('Force-directed auto-layout applied', 'info');
    if (!activeRegistryId) return;
    try {
      await Promise.all(
        positions.map((p) =>
          aegisApi.updateChild<StateNode>(activeRegistryId, 'states', p.id, { x: p.x, y: p.y })
        )
      );
    } catch {
      // ignore
    }
  };

  // 7. CRUD Handlers
  const handleSaveState = async (data: Partial<StateNode>) => {
    if (!activeRegistryId) return;
    if (data.id) {
      const updated = await aegisApi.updateChild<StateNode>(activeRegistryId, 'states', data.id, data);
      setStates((prev) => prev.map((s) => (s.id === data.id ? updated : s)));
      
      // Update groups membership if group_id changed
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          const hasState = g.state_ids?.includes(data.id!);
          if (g.id === updated.group_id && !hasState) {
            return { ...g, state_ids: [...(g.state_ids || []), data.id!] };
          } else if (g.id !== updated.group_id && hasState) {
            return { ...g, state_ids: (g.state_ids || []).filter((sid) => sid !== data.id) };
          }
          return g;
        })
      );

      showToast(`State '${updated.name}' updated`, 'success');
    } else {
      const created = await aegisApi.createChild<StateNode>(activeRegistryId, 'states', {
        ...data,
        x: 200 + (states.length % 4) * 220,
        y: 150 + Math.floor(states.length / 4) * 160,
      });
      setStates((prev) => [...prev, created]);

      if (created.group_id) {
        setGroups((prevGroups) =>
          prevGroups.map((g) =>
            g.id === created.group_id
              ? { ...g, state_ids: [...(g.state_ids || []), created.id] }
              : g
          )
        );
      }

      showToast(`State '${created.name}' created`, 'success');
    }
  };

  const handleDeleteState = async (stateId: string) => {
    if (!activeRegistryId) return;
    try {
      await aegisApi.deleteChild(activeRegistryId, 'states', stateId);
      setStates((prev) => prev.filter((s) => s.id !== stateId));
      setTransitions((prev) =>
        prev.filter((t) => t.from_state_id !== stateId && t.to_state_id !== stateId)
      );
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          state_ids: (g.state_ids || []).filter((sid) => sid !== stateId),
        }))
      );
      showToast('State deleted', 'info');
    } catch (err: unknown) {
      showToast('Failed to delete state: ' + (err as Error).message, 'error');
    }
  };

  // Group Handlers
  const handleSaveGroup = async (groupData: Partial<StateGroup>, selectedStateIds: string[]) => {
    if (!activeRegistryId) return;
    try {
      let savedGroup: StateGroup;
      if (groupData.id) {
        savedGroup = await aegisApi.updateChild<StateGroup>(
          activeRegistryId,
          'groups',
          groupData.id,
          {
            ...groupData,
            state_ids: selectedStateIds,
          }
        );
        setGroups((prev) => prev.map((g) => (g.id === savedGroup.id ? savedGroup : g)));
        showToast(`Container '${savedGroup.name}' updated`, 'success');
      } else {
        savedGroup = await aegisApi.createChild<StateGroup>(
          activeRegistryId,
          'groups',
          {
            ...groupData,
            state_ids: selectedStateIds,
          }
        );
        setGroups((prev) => [...prev, savedGroup]);
        showToast(`Container '${savedGroup.name}' created`, 'success');
      }

      // Synchronize states' group_id
      setStates((prevStates) =>
        prevStates.map((st) => {
          if (selectedStateIds.includes(st.id)) {
            if (st.group_id !== savedGroup.id) {
              aegisApi.updateChild<StateNode>(activeRegistryId, 'states', st.id, {
                group_id: savedGroup.id,
              }).catch(() => {});
              return { ...st, group_id: savedGroup.id };
            }
          } else if (st.group_id === savedGroup.id) {
            aegisApi.updateChild<StateNode>(activeRegistryId, 'states', st.id, {
              group_id: null,
            }).catch(() => {});
            return { ...st, group_id: null };
          }
          return st;
        })
      );
    } catch (err: unknown) {
      showToast('Failed to save container: ' + (err as Error).message, 'error');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!activeRegistryId) return;
    try {
      await aegisApi.deleteChild(activeRegistryId, 'groups', groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setStates((prev) =>
        prev.map((s) => (s.group_id === groupId ? { ...s, group_id: null } : s))
      );
      showToast('Container deleted', 'info');
    } catch (err: unknown) {
      showToast('Failed to delete container: ' + (err as Error).message, 'error');
    }
  };

  const handleAddGroup = () => {
    setEditingGroup(null);
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: StateGroup) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleAddStateToGroup = (group: StateGroup) => {
    setActiveModal({ type: 'state', data: { group_id: group.id } });
  };

  const handleUpdateGroupPosition = (groupId: string, x: number, y: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, x, y } : g))
    );
    if (activeRegistryId) {
      aegisApi.updateChild<StateGroup>(activeRegistryId, 'groups', groupId, { x, y }).catch(() => {});
    }
  };

  const handleSaveTransition = async (data: Partial<Transition>) => {
    if (!activeRegistryId) return;
    if (data.id) {
      const updated = await aegisApi.updateChild<Transition>(activeRegistryId, 'transitions', data.id, data);
      setTransitions((prev) => prev.map((t) => (t.id === data.id ? updated : t)));
      showToast(`Transition '${updated.name}' updated`, 'success');
    } else {
      const created = await aegisApi.createChild<Transition>(activeRegistryId, 'transitions', data);
      setTransitions((prev) => [...prev, created]);
      showToast(`Transition '${created.name}' created`, 'success');
    }
  };

  const handleDeleteTransition = async (transitionId: string) => {
    if (!activeRegistryId) return;
    try {
      await aegisApi.deleteChild(activeRegistryId, 'transitions', transitionId);
      setTransitions((prev) => prev.filter((t) => t.id !== transitionId));
      showToast('Transition deleted', 'info');
    } catch (err: unknown) {
      showToast('Failed to delete transition: ' + (err as Error).message, 'error');
    }
  };

  const handleSaveVariable = async (data: Partial<Variable>) => {
    if (!activeRegistryId) return;
    if (data.id) {
      const updated = await aegisApi.updateChild<Variable>(activeRegistryId, 'variables', data.id, data);
      setVariables((prev) => prev.map((v) => (v.id === data.id ? updated : v)));
      showToast(`Variable '${updated.name}' updated`, 'success');
    } else {
      const created = await aegisApi.createChild<Variable>(activeRegistryId, 'variables', data);
      setVariables((prev) => [...prev, created]);
      showToast(`Variable '${created.name}' added`, 'success');
    }
  };

  const handleSaveInvariant = async (data: Partial<Invariant>) => {
    if (!activeRegistryId) return;
    if (data.id) {
      const updated = await aegisApi.updateChild<Invariant>(activeRegistryId, 'invariants', data.id, data);
      setInvariants((prev) => prev.map((i) => (i.id === data.id ? updated : i)));
      showToast(`Invariant '${updated.name}' updated`, 'success');
    } else {
      const created = await aegisApi.createChild<Invariant>(activeRegistryId, 'invariants', data);
      setInvariants((prev) => [...prev, created]);
      showToast(`Invariant '${created.name}' added`, 'success');
    }
  };

  const handleCreateRegistry = async (data: Partial<Registry>) => {
    try {
      const created = await aegisApi.createRegistry(data);
      setRegistries((prev) => [...prev, created]);
      setActiveRegistryId(created.id);
      showToast(`Registry '${created.name}' created!`, 'success');
    } catch (err: unknown) {
      showToast('Failed to create registry: ' + (err as Error).message, 'error');
    }
  };

  const handleUpdateTlaSource = async (source: string) => {
    if (!activeRegistryId) return;
    try {
      await aegisApi.updateRegistry(activeRegistryId, { tla_plus_source: source });
      showToast('TLA+ specification synchronized with registry', 'success');
    } catch (err: unknown) {
      showToast('Failed to sync TLA+: ' + (err as Error).message, 'error');
    }
  };

  const handleRefreshLogs = async () => {
    if (!activeRegistryId) return;
    setIsRefreshingLogs(true);
    try {
      const res = await aegisApi.getExecutionLogs(activeRegistryId);
      setExecutionLogs(res.items);
      showToast('Execution logs refreshed', 'info');
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  const handleExportTla = (format: 'tla' | 'cfg' | 'both' = 'tla') => {
    if (!activeRegistry) {
      showToast('No active model to export', 'error');
      return;
    }

    const moduleName = (activeRegistry.tla_plus_module || activeRegistry.name || 'StateMachine')
      .replace(/[^a-zA-Z0-9_]/g, '_');

    const tlaContent = generateTlaPlus(
      activeRegistry,
      constants,
      variables,
      states,
      transitions,
      invariants,
      properties
    );

    const cfgContent = generateTlcConfig(activeRegistry, constants, invariants);

    const triggerDownload = (filename: string, content: string) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    if (format === 'tla' || format === 'both') {
      triggerDownload(`${moduleName}.tla`, tlaContent);
    }
    if (format === 'cfg' || format === 'both') {
      if (format === 'both') {
        setTimeout(() => triggerDownload(`${moduleName}.cfg`, cfgContent), 150);
      } else {
        triggerDownload(`${moduleName}.cfg`, cfgContent);
      }
    }

    if (format === 'both') {
      showToast(`Exported ${moduleName}.tla and ${moduleName}.cfg for TLC`, 'success');
    } else if (format === 'tla') {
      showToast(`Exported ${moduleName}.tla for offline verification`, 'success');
    } else {
      showToast(`Exported ${moduleName}.cfg for TLC`, 'success');
    }
  };

  return (
    <div className="h-screen bg-[#0F1115] flex flex-col antialiased text-[#C9D1D9] selection:bg-[#3B82F6] selection:text-white overflow-hidden">
      {/* Top Header */}
      <Header
        registries={registries}
        activeRegistry={activeRegistry}
        onSelectRegistry={setActiveRegistryId}
        onNewRegistry={() => setActiveModal({ type: 'new-registry' })}
        onValidate={handleValidate}
        onModelCheck={handleModelCheck}
        onExportTla={handleExportTla}
        isValidating={isValidating}
        isChecking={isChecking}
        lastValidation={validationResults[0]}
        lastModelCheck={modelCheckResults[0]}
        healthOk={healthOk}
        theme={theme}
        onToggleTheme={setTheme}
      />

      {/* Main Workspace Area with Left Navigation */}
      <div className="flex-1 flex overflow-hidden relative">
        <LeftNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeRegistry={activeRegistry}
          registries={registries}
          states={states}
          transitions={transitions}
          onSelectRegistry={handleSelectRegistryFromNav}
          onSelectState={handleSelectStateFromNav}
          onSelectTransition={handleSelectTransitionFromNav}
          onEditState={(s) => setActiveModal({ type: 'state', data: s })}
          onEditTransition={(t) => setActiveModal({ type: 'transition', data: t })}
          stateCount={states.length}
          transitionCount={transitions.length}
          logCount={executionLogs.length}
          simStepsCount={simState?.history?.length || 0}
          lastValidation={validationResults[0]}
          lastModelCheck={modelCheckResults[0]}
        />

        {/* Main Workspace Active View */}
        <main className="flex-1 h-full overflow-hidden relative">
          {loadingRegistry ? (
            <div className="h-full flex items-center justify-center bg-[#0F1115]">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-[#8B949E]">Loading state machine registry...</p>
              </div>
            </div>
          ) : (
          <>
            {activeTab === 'canvas' && (
              <VisualCanvas
                states={states}
                transitions={transitions}
                variables={variables}
                groups={groups}
                simState={simState}
                enabledTransitions={enabledTransitions}
                onFireTransition={handleFireTransition}
                onAddState={() => setActiveModal({ type: 'state' })}
                onAddTransition={() => setActiveModal({ type: 'transition' })}
                onAddGroup={handleAddGroup}
                onEditGroup={handleEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onAddStateToGroup={handleAddStateToGroup}
                onEditState={(s) => setActiveModal({ type: 'state', data: s })}
                onDeleteState={handleDeleteState}
                onEditTransition={(t) => setActiveModal({ type: 'transition', data: t })}
                onDeleteTransition={handleDeleteTransition}
                onUpdateStatePosition={handleUpdateStatePosition}
                onBatchUpdateStatePositions={handleBatchUpdateStatePositions}
                onUpdateGroupPosition={handleUpdateGroupPosition}
                theme={theme}
                executionLogs={executionLogs}
                scrubIndex={scrubIndex}
                onScrubStep={setScrubIndex}
                onBranchFromStep={handleBranchFromStep}
                onResetSimulation={handleResetSimulation}
                selectedStateId={selectedCanvasStateId}
                onSelectStateId={setSelectedCanvasStateId}
                selectedTransitionId={selectedCanvasTransitionId}
                onSelectTransitionId={setSelectedCanvasTransitionId}
              />
            )}

            {activeTab === 'simulator' && (
              <SimulationControls
                states={states}
                transitions={transitions}
                variables={variables}
                simState={simState}
                enabledTransitions={enabledTransitions}
                onFireTransition={handleFireTransition}
                onResetSimulation={handleResetSimulation}
                onStepBackward={handleStepBackward}
                onUpdateVariableValue={handleUpdateSimVariable}
                onResetAllVariables={handleResetAllVariables}
              />
            )}

            {activeTab === 'model-check' && activeRegistry && (
              <ModelCheckerPanel
                registry={activeRegistry}
                invariants={invariants}
                modelCheckResults={modelCheckResults}
                validationResults={validationResults}
                onRunModelCheck={handleModelCheck}
                onRunValidation={handleValidate}
                isChecking={isChecking}
                isValidating={isValidating}
              />
            )}

            {activeTab === 'tla' && activeRegistry && (
              <TlaEditor
                registry={activeRegistry}
                constants={constants}
                variables={variables}
                states={states}
                transitions={transitions}
                invariants={invariants}
                onUpdateTlaSource={handleUpdateTlaSource}
              />
            )}

            {activeTab === 'api-console' && (
              <ApiConsole registry={activeRegistry} />
            )}

            {activeTab === 'logs' && (
              <ExecutionLogViewer
                logs={executionLogs}
                states={states}
                transitions={transitions}
                onRefresh={handleRefreshLogs}
                isRefreshing={isRefreshingLogs}
              />
            )}
          </>
        )}
      </main>
      </div>

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-[#238636] text-white border-[#2ea043]'
              : toastMessage.type === 'error'
              ? 'bg-[#f85149] text-white border-[#da3633]'
              : 'bg-[#16191E] text-[#C9D1D9] border-[#2D333B]'
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Modals for Editing States, Transitions, etc. */}
      <ResourceEditorModal
        modal={activeModal}
        states={states}
        transitions={transitions}
        groups={groups}
        variables={variables}
        simVariables={simState?.variables}
        activeRegistry={activeRegistry}
        onClose={() => setActiveModal(null)}
        onSaveState={handleSaveState}
        onSaveTransition={handleSaveTransition}
        onSaveVariable={handleSaveVariable}
        onSaveInvariant={handleSaveInvariant}
        onCreateRegistry={handleCreateRegistry}
      />

      {/* Modal for Creating / Editing Visual State Groups */}
      <GroupEditorModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        availableStates={states}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
      />
    </div>
  );
}
