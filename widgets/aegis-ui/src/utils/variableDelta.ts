/**
 * Variable Delta & Highlight Detection Utilities
 * Evaluates variable mutation between simulation steps and classifies
 * directional change into green (increased/asserted/positive) or red (decreased/cleared/negative).
 */

export type ChangeColor = 'green' | 'red' | 'none';

export type ChangeType =
  | 'increased'
  | 'decreased'
  | 'activated'
  | 'deactivated'
  | 'collection_expanded'
  | 'collection_shrunk'
  | 'status_positive'
  | 'status_negative'
  | 'initialized'
  | 'cleared'
  | 'modified_green'
  | 'modified_red'
  | 'none';

export interface VariableChangeInfo {
  hasChanged: boolean;
  color: ChangeColor;
  type: ChangeType;
  deltaText: string | null;
  deltaNum: number | null;
  prevVal: unknown;
  currentVal: unknown;
  badgeLabel: string;
}

const POSITIVE_STRINGS = new Set([
  'success',
  'active',
  'ok',
  'running',
  'completed',
  'approved',
  'ready',
  'connected',
  'true',
  'passed',
  'online',
  'open',
  'enabled',
  'up',
  'verified',
  'healthy',
  'unlocked',
  'authorized',
  'valid',
]);

const NEGATIVE_STRINGS = new Set([
  'error',
  'fail',
  'failed',
  'cancelled',
  'blocked',
  'denied',
  'stopped',
  'aborted',
  'false',
  'rejected',
  'offline',
  'closed',
  'timeout',
  'unhealthy',
  'disabled',
  'down',
  'locked',
  'unauthorized',
  'invalid',
  'err',
]);

/**
 * Computes difference and color highlighting for a variable between simulation steps.
 */
export function getVariableChangeInfo(prevVal: unknown, currentVal: unknown): VariableChangeInfo {
  // If neither value exists or both are strictly identical
  if (prevVal === undefined && currentVal === undefined) {
    return {
      hasChanged: false,
      color: 'none',
      type: 'none',
      deltaText: null,
      deltaNum: null,
      prevVal,
      currentVal,
      badgeLabel: '',
    };
  }

  // Initialized from undefined
  if (prevVal === undefined && currentVal !== undefined) {
    return {
      hasChanged: true,
      color: 'green',
      type: 'initialized',
      deltaText: 'INIT',
      deltaNum: null,
      prevVal,
      currentVal,
      badgeLabel: 'INITIALIZED',
    };
  }

  // Cleared or deleted
  if (prevVal !== undefined && (currentVal === undefined || currentVal === null)) {
    return {
      hasChanged: true,
      color: 'red',
      type: 'cleared',
      deltaText: 'CLEARED',
      deltaNum: null,
      prevVal,
      currentVal,
      badgeLabel: 'CLEARED',
    };
  }

  // Check strict deep equality
  if (JSON.stringify(prevVal) === JSON.stringify(currentVal)) {
    return {
      hasChanged: false,
      color: 'none',
      type: 'none',
      deltaText: null,
      deltaNum: null,
      prevVal,
      currentVal,
      badgeLabel: '',
    };
  }

  // 1. Numeric evaluation
  const numCurrent =
    typeof currentVal === 'number'
      ? currentVal
      : typeof currentVal === 'string' && !isNaN(Number(currentVal)) && currentVal.trim() !== ''
      ? Number(currentVal)
      : null;

  const numPrev =
    typeof prevVal === 'number'
      ? prevVal
      : typeof prevVal === 'string' && !isNaN(Number(prevVal)) && prevVal.trim() !== ''
      ? Number(prevVal)
      : null;

  if (numCurrent !== null && numPrev !== null) {
    const diff = numCurrent - numPrev;
    if (diff > 0) {
      const formattedDiff = diff % 1 === 0 ? `+${diff}` : `+${Number(diff.toFixed(2))}`;
      return {
        hasChanged: true,
        color: 'green',
        type: 'increased',
        deltaText: formattedDiff,
        deltaNum: diff,
        prevVal,
        currentVal,
        badgeLabel: formattedDiff,
      };
    } else if (diff < 0) {
      const formattedDiff = diff % 1 === 0 ? `${diff}` : `${Number(diff.toFixed(2))}`;
      return {
        hasChanged: true,
        color: 'red',
        type: 'decreased',
        deltaText: formattedDiff,
        deltaNum: diff,
        prevVal,
        currentVal,
        badgeLabel: formattedDiff,
      };
    }
  }

  // 2. Boolean evaluation
  if (typeof currentVal === 'boolean' || typeof prevVal === 'boolean') {
    const bCurrent = Boolean(currentVal);
    const bPrev = Boolean(prevVal);

    if (!bPrev && bCurrent) {
      return {
        hasChanged: true,
        color: 'green',
        type: 'activated',
        deltaText: 'TRUE (+)',
        deltaNum: null,
        prevVal,
        currentVal,
        badgeLabel: 'ASSERTED',
      };
    } else if (bPrev && !bCurrent) {
      return {
        hasChanged: true,
        color: 'red',
        type: 'deactivated',
        deltaText: 'FALSE (-)',
        deltaNum: null,
        prevVal,
        currentVal,
        badgeLabel: 'DEASSERTED',
      };
    }
  }

  // 3. Array / Collection length evaluation
  if (Array.isArray(currentVal) && Array.isArray(prevVal)) {
    const lenDiff = currentVal.length - prevVal.length;
    if (lenDiff > 0) {
      return {
        hasChanged: true,
        color: 'green',
        type: 'collection_expanded',
        deltaText: `+${lenDiff} items`,
        deltaNum: lenDiff,
        prevVal,
        currentVal,
        badgeLabel: `+${lenDiff} ITEMS`,
      };
    } else if (lenDiff < 0) {
      return {
        hasChanged: true,
        color: 'red',
        type: 'collection_shrunk',
        deltaText: `${lenDiff} items`,
        deltaNum: lenDiff,
        prevVal,
        currentVal,
        badgeLabel: `${lenDiff} ITEMS`,
      };
    }
  }

  // 4. String Status evaluation
  if (typeof currentVal === 'string' && typeof prevVal === 'string') {
    const lowerCurr = currentVal.toLowerCase();
    const lowerPrev = prevVal.toLowerCase();

    // Check if transitioned to an error or negative state
    const isNegativeNow = Array.from(NEGATIVE_STRINGS).some((kw) => lowerCurr.includes(kw));
    const wasNegativeBefore = Array.from(NEGATIVE_STRINGS).some((kw) => lowerPrev.includes(kw));
    const isPositiveNow = Array.from(POSITIVE_STRINGS).some((kw) => lowerCurr.includes(kw));
    const wasPositiveBefore = Array.from(POSITIVE_STRINGS).some((kw) => lowerPrev.includes(kw));

    if (isNegativeNow && !wasNegativeBefore) {
      return {
        hasChanged: true,
        color: 'red',
        type: 'status_negative',
        deltaText: currentVal,
        deltaNum: null,
        prevVal,
        currentVal,
        badgeLabel: 'FAULT / NEGATIVE',
      };
    }

    if (isPositiveNow && !wasPositiveBefore) {
      return {
        hasChanged: true,
        color: 'green',
        type: 'status_positive',
        deltaText: currentVal,
        deltaNum: null,
        prevVal,
        currentVal,
        badgeLabel: 'ACTIVE / POSITIVE',
      };
    }

    // Check alphabetical sequence or stage progression (e.g. stage_1 -> stage_2)
    const currMatches = currentVal.match(/\d+/g);
    const prevMatches = prevVal.match(/\d+/g);
    if (currMatches && prevMatches && currMatches.length === prevMatches.length) {
      const currNum = Number(currMatches[currMatches.length - 1]);
      const prevNum = Number(prevMatches[prevMatches.length - 1]);
      if (!isNaN(currNum) && !isNaN(prevNum)) {
        if (currNum > prevNum) {
          return {
            hasChanged: true,
            color: 'green',
            type: 'increased',
            deltaText: `→ ${currentVal}`,
            deltaNum: currNum - prevNum,
            prevVal,
            currentVal,
            badgeLabel: 'ADVANCED',
          };
        } else if (currNum < prevNum) {
          return {
            hasChanged: true,
            color: 'red',
            type: 'decreased',
            deltaText: `→ ${currentVal}`,
            deltaNum: currNum - prevNum,
            prevVal,
            currentVal,
            badgeLabel: 'REGRESSED',
          };
        }
      }
    }
  }

  // Default general update: green indicates successful update/assignment between steps
  return {
    hasChanged: true,
    color: 'green',
    type: 'modified_green',
    deltaText: 'UPDATED',
    deltaNum: null,
    prevVal,
    currentVal,
    badgeLabel: 'MODIFIED',
  };
}
