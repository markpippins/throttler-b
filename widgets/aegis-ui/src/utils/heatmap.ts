import { ExecutionLogItem, SimState, StateNode, Transition } from '../types';

export interface TraversalHeatmapData {
  totalExecutions: number;
  stateCounts: Record<string, number>;
  transitionCounts: Record<string, number>;
  maxStateCount: number;
  maxTransitionCount: number;
  hotspotState: { id: string; name: string; count: number } | null;
  hotspotTransition: { id: string; name: string; count: number } | null;
}

export interface HeatStyle {
  intensity: number; // 0.0 to 1.0
  color: string;
  glowColor: string;
  borderColor: string;
  boxShadow: string;
  strokeWidth: number;
  labelBg: string;
  labelTextColor: string;
  tag: string;
}

/**
 * Computes frequency counts for states and transitions based on execution history logs
 * and active simulation history.
 */
export function computeExecutionHeatmap(
  states: StateNode[],
  transitions: Transition[],
  logs: ExecutionLogItem[] = [],
  simState?: SimState | null
): TraversalHeatmapData {
  const stateCounts: Record<string, number> = {};
  const transitionCounts: Record<string, number> = {};

  // Initialize all states and transitions with 0
  states.forEach((s) => {
    stateCounts[s.id] = 0;
  });
  transitions.forEach((t) => {
    transitionCounts[t.id] = 0;
  });

  let totalExecutions = 0;

  // 1. Process persisted and live execution history logs
  logs.forEach((log) => {
    totalExecutions++;

    // Increment destination state
    if (log.to_state_id && stateCounts[log.to_state_id] !== undefined) {
      stateCounts[log.to_state_id]++;
    }

    // If source state was logged, we count it as well if it's the very first entry or distinct
    if (log.from_state_id && stateCounts[log.from_state_id] !== undefined) {
      // Also attribute visit to from_state
      stateCounts[log.from_state_id] = (stateCounts[log.from_state_id] || 0) + 1;
    }

    // Increment matched transition
    if (log.transition_id && transitionCounts[log.transition_id] !== undefined) {
      transitionCounts[log.transition_id]++;
    } else if (log.from_state_id && log.to_state_id) {
      // Match by endpoint pair
      const matched = transitions.find(
        (t) => t.from_state_id === log.from_state_id && t.to_state_id === log.to_state_id
      );
      if (matched) {
        transitionCounts[matched.id] = (transitionCounts[matched.id] || 0) + 1;
      }
    }
  });

  // 2. Also incorporate in-memory simulation steps if not already mirrored in logs
  if (simState && simState.history && simState.history.length > 0) {
    // Initial state visit
    const initialStep = simState.history[0];
    if (initialStep && stateCounts[initialStep.stateId] !== undefined && logs.length === 0) {
      stateCounts[initialStep.stateId] = (stateCounts[initialStep.stateId] || 0) + 1;
    }

    for (let i = 1; i < simState.history.length; i++) {
      const step = simState.history[i];
      const prevStep = simState.history[i - 1];

      // If no executionLogs exist (e.g. fresh simulation without persisted DB logs yet),
      // count steps directly from simulation history
      if (logs.length === 0) {
        totalExecutions++;
        if (stateCounts[step.stateId] !== undefined) {
          stateCounts[step.stateId]++;
        }

        const matchedTrans = transitions.find(
          (t) =>
            (t.name === step.transitionName) ||
            (t.from_state_id === prevStep.stateId && t.to_state_id === step.stateId)
        );
        if (matchedTrans) {
          transitionCounts[matchedTrans.id] = (transitionCounts[matchedTrans.id] || 0) + 1;
        }
      }
    }
  }

  // Calculate maximums
  let maxStateCount = 0;
  let hotspotStateId: string | null = null;
  Object.entries(stateCounts).forEach(([id, count]) => {
    if (count > maxStateCount) {
      maxStateCount = count;
      hotspotStateId = id;
    }
  });

  let maxTransitionCount = 0;
  let hotspotTransitionId: string | null = null;
  Object.entries(transitionCounts).forEach(([id, count]) => {
    if (count > maxTransitionCount) {
      maxTransitionCount = count;
      hotspotTransitionId = id;
    }
  });

  const hotspotStateNode = states.find((s) => s.id === hotspotStateId);
  const hotspotTransNode = transitions.find((t) => t.id === hotspotTransitionId);

  return {
    totalExecutions,
    stateCounts,
    transitionCounts,
    maxStateCount,
    maxTransitionCount,
    hotspotState: hotspotStateNode && maxStateCount > 0
      ? { id: hotspotStateNode.id, name: hotspotStateNode.name, count: maxStateCount }
      : null,
    hotspotTransition: hotspotTransNode && maxTransitionCount > 0
      ? { id: hotspotTransNode.id, name: hotspotTransNode.name, count: maxTransitionCount }
      : null,
  };
}

/**
 * Returns color, halo, stroke, and styling parameters for a given count and maxCount.
 */
export function getHeatStyle(count: number, maxCount: number): HeatStyle {
  if (count <= 0 || maxCount <= 0) {
    return {
      intensity: 0,
      color: '#4B5563', // gray-600
      glowColor: 'transparent',
      borderColor: 'rgba(75, 85, 99, 0.4)',
      boxShadow: 'none',
      strokeWidth: 1.75,
      labelBg: '#16191E',
      labelTextColor: '#9CA3AF',
      tag: '0x',
    };
  }

  const intensity = Math.min(1, Math.max(0.1, count / maxCount));

  if (intensity < 0.3) {
    // Cool / Low frequency: Cyan / Teal
    return {
      intensity,
      color: '#06B6D4',
      glowColor: 'rgba(6, 182, 212, 0.35)',
      borderColor: 'rgba(6, 182, 212, 0.7)',
      boxShadow: '0 0 16px rgba(6, 182, 212, 0.25)',
      strokeWidth: 2.5,
      labelBg: 'rgba(6, 182, 212, 0.18)',
      labelTextColor: '#67E8F9',
      tag: `${count}x`,
    };
  } else if (intensity < 0.65) {
    // Medium frequency: Warm Amber / Gold
    return {
      intensity,
      color: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      borderColor: 'rgba(245, 158, 11, 0.85)',
      boxShadow: '0 0 22px rgba(245, 158, 11, 0.35)',
      strokeWidth: 3.25,
      labelBg: 'rgba(245, 158, 11, 0.22)',
      labelTextColor: '#FCD34D',
      tag: `${count}x`,
    };
  } else if (intensity < 0.88) {
    // High frequency: Orange-Red
    return {
      intensity,
      color: '#F97316',
      glowColor: 'rgba(249, 115, 22, 0.6)',
      borderColor: 'rgba(249, 115, 22, 0.9)',
      boxShadow: '0 0 26px rgba(249, 115, 22, 0.45)',
      strokeWidth: 4,
      labelBg: 'rgba(249, 115, 22, 0.25)',
      labelTextColor: '#FDBA74',
      tag: `🔥 ${count}x`,
    };
  } else {
    // Hotspot / Extreme: Fire Crimson
    return {
      intensity,
      color: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.75)',
      borderColor: '#EF4444',
      boxShadow: '0 0 32px rgba(239, 68, 68, 0.6)',
      strokeWidth: 4.75,
      labelBg: 'rgba(239, 68, 68, 0.3)',
      labelTextColor: '#FCA5A5',
      tag: `🔥 HOT (${count}x)`,
    };
  }
}
