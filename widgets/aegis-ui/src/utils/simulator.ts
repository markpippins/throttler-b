/**
 * State Machine Interactive Simulation Engine
 */

import {
  StateNode,
  Transition,
  Variable,
  SimState,
  SimStep,
  StateSnapshot,
  VariableDiffItem,
  SnapshotComparisonResult,
  ExecutionLogItem,
} from '../types';
import { getVariableChangeInfo } from './variableDelta';

export type { SimState, SimStep, StateSnapshot, VariableDiffItem, SnapshotComparisonResult };

export interface ConstraintEvaluationResult {
  satisfied: boolean;
  reason?: string;
  expression?: string;
}

type TokenType = 'LPAREN' | 'RPAREN' | 'AND' | 'OR' | 'NOT' | 'COMP' | 'LITERAL' | 'IDENTIFIER';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

/**
 * Tokenize a boolean expression string.
 */
function tokenizeExpression(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }

    // TLA+ / Boolean AND: '/\' or '&&'
    if ((ch === '/' && input[i + 1] === '\\') || (ch === '&' && input[i + 1] === '&')) {
      tokens.push({ type: 'AND', value: '/\\', pos: i });
      i += 2;
      continue;
    }

    // TLA+ / Boolean OR: '\/' or '||'
    if ((ch === '\\' && input[i + 1] === '/') || (ch === '|' && input[i + 1] === '|')) {
      tokens.push({ type: 'OR', value: '\\/', pos: i });
      i += 2;
      continue;
    }

    // Negation: '~' or '!'
    if (ch === '~' || ch === '!') {
      // Check if it's '!='
      if (ch === '!' && input[i + 1] === '=') {
        tokens.push({ type: 'COMP', value: '!=', pos: i });
        i += 2;
        continue;
      }
      tokens.push({ type: 'NOT', value: '~', pos: i });
      i++;
      continue;
    }

    // Multi-char comparisons: '==', '!=', '/=', '<=', '>=', '=>', '=<', '<>'
    if (
      (ch === '=' && input[i + 1] === '=') ||
      (ch === '/' && input[i + 1] === '=') ||
      (ch === '<' && input[i + 1] === '=') ||
      (ch === '>' && input[i + 1] === '=') ||
      (ch === '=' && input[i + 1] === '<') ||
      (ch === '=' && input[i + 1] === '>') ||
      (ch === '<' && input[i + 1] === '>')
    ) {
      const op = input.slice(i, i + 2);
      tokens.push({ type: 'COMP', value: op, pos: i });
      i += 2;
      continue;
    }

    // Single-char comparisons: '=', '<', '>'
    if (ch === '=' || ch === '<' || ch === '>') {
      tokens.push({ type: 'COMP', value: ch, pos: i });
      i++;
      continue;
    }

    // String literals: "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < n && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < n) {
          str += input[i + 1];
          i += 2;
        } else {
          str += input[i];
          i++;
        }
      }
      if (i < n && input[i] === quote) {
        i++; // skip closing quote
      }
      tokens.push({ type: 'LITERAL', value: JSON.stringify(str), pos: i });
      continue;
    }

    // Number literals (including negative numbers after operators or start)
    const prevToken = tokens[tokens.length - 1];
    const canBeUnaryMinus =
      ch === '-' &&
      (tokens.length === 0 ||
        prevToken.type === 'COMP' ||
        prevToken.type === 'AND' ||
        prevToken.type === 'OR' ||
        prevToken.type === 'NOT' ||
        prevToken.type === 'LPAREN');

    if (/\d/.test(ch) || (canBeUnaryMinus && i + 1 < n && /\d/.test(input[i + 1]))) {
      let numStr = ch;
      i++;
      while (i < n && /[\d.]/.test(input[i])) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'LITERAL', value: numStr, pos: i });
      continue;
    }

    // Words (identifiers, keywords like AND, OR, NOT, TRUE, FALSE)
    if (/[a-zA-Z_]/.test(ch)) {
      let word = '';
      while (i < n && /[a-zA-Z0-9_]/.test(input[i])) {
        word += input[i];
        i++;
      }

      const upper = word.toUpperCase();
      if (upper === 'AND') {
        tokens.push({ type: 'AND', value: '/\\', pos: i });
      } else if (upper === 'OR') {
        tokens.push({ type: 'OR', value: '\\/', pos: i });
      } else if (upper === 'NOT') {
        tokens.push({ type: 'NOT', value: '~', pos: i });
      } else if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push({ type: 'LITERAL', value: upper, pos: i });
      } else if (upper === 'NULL' || upper === 'NONE' || upper === 'NIL') {
        tokens.push({ type: 'LITERAL', value: 'null', pos: i });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word, pos: i });
      }
      continue;
    }

    // Unknown character, skip
    i++;
  }

  return tokens;
}

/**
 * Validate syntax of a boolean constraint expression.
 */
export function validateBooleanExpressionSyntax(expr: string): { valid: boolean; error?: string } {
  if (!expr || !expr.trim()) return { valid: true };
  try {
    const tokens = tokenizeExpression(expr);
    if (tokens.length === 0) return { valid: true };

    // Check parenthesis balance
    let parenCount = 0;
    for (const t of tokens) {
      if (t.type === 'LPAREN') parenCount++;
      if (t.type === 'RPAREN') parenCount--;
      if (parenCount < 0) return { valid: false, error: 'Unexpected closing parenthesis ")"' };
    }
    if (parenCount > 0) return { valid: false, error: 'Unclosed opening parenthesis "("' };

    // Run test evaluation with empty context
    parseAndEvaluate(tokens, {}, 'testState');
    return { valid: true };
  } catch (err: unknown) {
    return { valid: false, error: (err as Error).message };
  }
}

/**
 * Evaluates tokens with recursive descent.
 */
function parseAndEvaluate(
  tokens: Token[],
  vars: Record<string, unknown>,
  currentStateName?: string
): boolean {
  let idx = 0;

  function peek(): Token | undefined {
    return tokens[idx];
  }

  function consume(): Token {
    return tokens[idx++];
  }

  function parseOr(): boolean {
    let left = parseAnd();
    while (peek()?.type === 'OR') {
      consume(); // consume 'OR'
      const right = parseAnd();
      left = left || right;
    }
    return left;
  }

  function parseAnd(): boolean {
    let left = parseNot();
    while (peek()?.type === 'AND') {
      consume(); // consume 'AND'
      const right = parseNot();
      left = left && right;
    }
    return left;
  }

  function parseNot(): boolean {
    if (peek()?.type === 'NOT') {
      consume(); // consume NOT
      return !parseNot();
    }
    return parseComparison();
  }

  function parseComparison(): boolean {
    const leftVal = parseOperand();

    if (peek()?.type === 'COMP') {
      const opToken = consume();
      const rightVal = parseOperand();
      return compareValues(leftVal, opToken.value, rightVal);
    }

    // Bare boolean expression or truthy check
    return toBooleanValue(leftVal);
  }

  function parseOperand(): unknown {
    const t = peek();
    if (!t) return undefined;

    if (t.type === 'LPAREN') {
      consume(); // '('
      const val = parseOr();
      if (peek()?.type === 'RPAREN') {
        consume(); // ')'
      }
      return val;
    }

    if (t.type === 'NOT') {
      consume(); // '~'
      const val = parseOperand();
      return !toBooleanValue(val);
    }

    if (t.type === 'LITERAL') {
      consume();
      return parseLiteralToken(t.value);
    }

    if (t.type === 'IDENTIFIER') {
      consume();
      if (t.value === 'currentState') return currentStateName;
      if (t.value in vars) return vars[t.value];
      return undefined;
    }

    consume();
    return undefined;
  }

  return parseOr();
}

function parseLiteralToken(raw: string): unknown {
  if (raw === 'TRUE') return true;
  if (raw === 'FALSE') return false;
  if (raw === 'null') return null;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (!isNaN(Number(raw))) return Number(raw);
  return raw;
}

function toBooleanValue(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    if (lower === 'true') return true;
    if (lower === 'false' || lower === '') return false;
    return true;
  }
  return Boolean(val);
}

function compareValues(left: unknown, op: string, right: unknown): boolean {
  // Equality
  if (op === '=' || op === '==') {
    if (typeof left === 'number' || typeof right === 'number') {
      return Number(left) === Number(right);
    }
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      return toBooleanValue(left) === toBooleanValue(right);
    }
    if (left === null || right === null || left === undefined || right === undefined) {
      return left === right;
    }
    return String(left).toLowerCase() === String(right).toLowerCase();
  }

  // Inequality
  if (op === '!=' || op === '/=' || op === '<>') {
    return !compareValues(left, '=', right);
  }

  // Numeric comparisons
  const leftNum = Number(left);
  const rightNum = Number(right);

  if (op === '<') return leftNum < rightNum;
  if (op === '<=' || op === '=<') return leftNum <= rightNum;
  if (op === '>') return leftNum > rightNum;
  if (op === '>=' || op === '=>') return leftNum >= rightNum;

  return true;
}

/**
 * Evaluates a guard or constraint expression against variables and current state.
 */
export function evaluateGuard(
  guard: string | undefined,
  vars: Record<string, unknown>,
  currentStateName?: string
): boolean {
  if (!guard || !guard.trim()) return true;

  try {
    const tokens = tokenizeExpression(guard.trim());
    if (tokens.length === 0) return true;
    return parseAndEvaluate(tokens, vars, currentStateName);
  } catch (err) {
    console.warn('Guard expression evaluation error:', err);
    return false;
  }
}

/**
 * Evaluates all guard constraints configured on a transition.
 * Checks both `constraints` and `guard_expression`.
 */
export function evaluateTransitionConstraints(
  transition: Transition,
  vars: Record<string, unknown> = {},
  currentStateName?: string
): ConstraintEvaluationResult {
  // 1. Check constraints field
  if (transition.constraints && transition.constraints.trim()) {
    const expr = transition.constraints.trim();
    try {
      const satisfied = evaluateGuard(expr, vars, currentStateName);
      if (!satisfied) {
        return {
          satisfied: false,
          expression: expr,
          reason: `Constraint '${expr}' evaluated to FALSE for variables ${JSON.stringify(vars)}.`,
        };
      }
    } catch (err: unknown) {
      return {
        satisfied: false,
        expression: expr,
        reason: `Constraint '${expr}' evaluation error: ${(err as Error).message}`,
      };
    }
  }

  // 2. Check legacy / alternate guard_expression if defined and different
  if (
    transition.guard_expression &&
    transition.guard_expression.trim() &&
    transition.guard_expression.trim() !== transition.constraints?.trim()
  ) {
    const expr = transition.guard_expression.trim();
    try {
      const satisfied = evaluateGuard(expr, vars, currentStateName);
      if (!satisfied) {
        return {
          satisfied: false,
          expression: expr,
          reason: `Guard expression '${expr}' evaluated to FALSE for variables ${JSON.stringify(vars)}.`,
        };
      }
    } catch (err: unknown) {
      return {
        satisfied: false,
        expression: expr,
        reason: `Guard expression '${expr}' evaluation error: ${(err as Error).message}`,
      };
    }
  }

  return { satisfied: true };
}

export function initializeSimulation(
  states: StateNode[],
  variables: Variable[]
): SimState | null {
  if (states.length === 0) return null;

  const initial = states.find((s) => s.is_initial) || states[0];
  const initialVars: Record<string, unknown> = {};

  variables.forEach((v) => {
    initialVars[v.name] = v.initial_value;
  });

  if (initial.variable_assignments) {
    Object.assign(initialVars, initial.variable_assignments);
  }

  return {
    currentStateId: initial.id,
    variables: initialVars,
    history: [
      {
        step: 0,
        stateId: initial.id,
        stateName: initial.name,
        variables: { ...initialVars },
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
  };
}

export interface TriggerValidationResult {
  valid: boolean;
  reason?: string;
  matchedTrigger?: string;
}

export interface EnabledTransitionItem {
  transition: Transition;
  toState: StateNode | undefined;
  triggerValidation: TriggerValidationResult;
  isTriggerSatisfied: boolean;
  constraintEvaluation?: ConstraintEvaluationResult;
  isGuardSatisfied?: boolean;
}

export function validateTrigger(
  transition: Transition,
  eventOrName?: string | { name: string; [key: string]: unknown },
  vars: Record<string, unknown> = {}
): TriggerValidationResult {
  // Extract all trigger names / conditions defined on the transition
  const primaryTrigger = transition.trigger?.trim() || '';
  const triggersList = transition.triggers && transition.triggers.length > 0
    ? transition.triggers.map((t) => t.trim()).filter(Boolean)
    : primaryTrigger
    ? primaryTrigger.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const triggerCond = transition.trigger_condition?.trim() || '';

  // Spontaneous transition (no trigger required)
  if (triggersList.length === 0 && !triggerCond) {
    return { valid: true, matchedTrigger: 'AUTO_SPONTANEOUS' };
  }

  // If transition defines triggers, an event or condition must be provided
  const eventName = typeof eventOrName === 'string'
    ? eventOrName.trim()
    : eventOrName?.name?.trim() || '';

  const eventPayload = typeof eventOrName === 'object' && eventOrName !== null
    ? eventOrName
    : {};

  if (triggersList.length > 0) {
    if (!eventName) {
      return {
        valid: false,
        reason: `Trigger required: [${triggersList.join(', ')}], but no event was supplied.`,
      };
    }

    const matches = triggersList.some((t) => {
      if (t.toUpperCase() === eventName.toUpperCase()) return true;
      if (t.endsWith('*') && eventName.toUpperCase().startsWith(t.slice(0, -1).toUpperCase())) return true;
      // If trigger is formulated as condition, e.g. "event == 'TIMEOUT'"
      if (t.includes('event') || t.includes('=')) {
        return evaluateTriggerCondition(t, eventName, vars, eventPayload);
      }
      return false;
    });

    if (!matches) {
      return {
        valid: false,
        reason: `Supplied event '${eventName}' does not match required trigger(s): ${triggersList.join(', ')}.`,
      };
    }
  }

  // Check trigger condition if specified
  if (triggerCond) {
    const isCondTrue = evaluateTriggerCondition(triggerCond, eventName, vars, eventPayload);
    if (!isCondTrue) {
      return {
        valid: false,
        reason: `Trigger condition '${triggerCond}' evaluated to FALSE for event '${eventName || 'none'}'.`,
      };
    }
  }

  return { valid: true, matchedTrigger: eventName || triggersList[0] };
}

export function evaluateTriggerCondition(
  condition: string,
  eventName: string,
  vars: Record<string, unknown> = {},
  eventPayload: Record<string, unknown> = {}
): boolean {
  if (!condition || !condition.trim()) return true;

  const ctx: Record<string, unknown> = {
    ...vars,
    ...eventPayload,
    event: eventName,
    eventName,
  };

  // Handle conjuncts '/\'
  if (condition.includes('/\\')) {
    const parts = condition.split('/\\').map((p) => p.trim());
    return parts.every((p) => evaluateSingleTriggerCondition(p, ctx));
  }

  // Handle disjuncts '\/'
  if (condition.includes('\\/')) {
    const parts = condition.split('\\/').map((p) => p.trim());
    return parts.some((p) => evaluateSingleTriggerCondition(p, ctx));
  }

  return evaluateSingleTriggerCondition(condition.trim(), ctx);
}

function evaluateSingleTriggerCondition(expr: string, ctx: Record<string, unknown>): boolean {
  expr = expr.trim();
  if (!expr) return true;

  if (expr.startsWith('~')) {
    return !evaluateSingleTriggerCondition(expr.substring(1).trim(), ctx);
  }

  // Handle '==' or '='
  if (expr.includes('==') || expr.includes('=')) {
    const sep = expr.includes('==') ? '==' : '=';
    const [leftRaw, rightRaw] = expr.split(sep).map((s) => s.trim());
    const leftVal = resolveConditionOperand(leftRaw, ctx);
    const rightVal = resolveConditionOperand(rightRaw, ctx);
    return String(leftVal).toUpperCase() === String(rightVal).toUpperCase();
  }

  // Handle '!=' or '/='
  if (expr.includes('!=') || expr.includes('/=')) {
    const sep = expr.includes('!=') ? '!=' : '/=';
    const [leftRaw, rightRaw] = expr.split(sep).map((s) => s.trim());
    const leftVal = resolveConditionOperand(leftRaw, ctx);
    const rightVal = resolveConditionOperand(rightRaw, ctx);
    return String(leftVal).toUpperCase() !== String(rightVal).toUpperCase();
  }

  // Handle '<'
  if (expr.includes('<')) {
    const [leftRaw, rightRaw] = expr.split('<').map((s) => s.trim());
    const leftVal = Number(resolveConditionOperand(leftRaw, ctx));
    const rightVal = Number(resolveConditionOperand(rightRaw, ctx));
    return leftVal < rightVal;
  }

  // Handle '>'
  if (expr.includes('>')) {
    const [leftRaw, rightRaw] = expr.split('>').map((s) => s.trim());
    const leftVal = Number(resolveConditionOperand(leftRaw, ctx));
    const rightVal = Number(resolveConditionOperand(rightRaw, ctx));
    return leftVal > rightVal;
  }

  return true;
}

function resolveConditionOperand(operand: string, ctx: Record<string, unknown>): unknown {
  operand = operand.trim();
  if (operand === 'TRUE' || operand === 'true') return true;
  if (operand === 'FALSE' || operand === 'false') return false;
  if (!isNaN(Number(operand))) return Number(operand);
  if ((operand.startsWith('"') && operand.endsWith('"')) || (operand.startsWith("'") && operand.endsWith("'"))) {
    return operand.slice(1, -1);
  }
  if (operand in ctx) return ctx[operand];
  return operand;
}

export function getEnabledTransitions(
  currentStateId: string,
  states: StateNode[],
  transitions: Transition[],
  variables: Record<string, unknown>,
  activeTrigger?: string | { name: string; [key: string]: unknown }
): EnabledTransitionItem[] {
  const currentState = states.find((s) => s.id === currentStateId);
  const outgoing = transitions.filter((t) => t.from_state_id === currentStateId);

  return outgoing
    .map((t) => {
      const constraintEvaluation = evaluateTransitionConstraints(t, variables, currentState?.name);
      const isGuardSatisfied = constraintEvaluation.satisfied;

      const hasDefinedTrigger = Boolean(
        (t.trigger && t.trigger.trim()) ||
        (t.triggers && t.triggers.length > 0) ||
        (t.trigger_condition && t.trigger_condition.trim())
      );

      const triggerValidation = validateTrigger(t, activeTrigger, variables);
      const isTriggerSatisfied = !hasDefinedTrigger || (activeTrigger ? triggerValidation.valid : true);

      return {
        transition: t,
        toState: states.find((s) => s.id === t.to_state_id),
        triggerValidation,
        isTriggerSatisfied,
        constraintEvaluation,
        isGuardSatisfied,
      };
    })
    .filter((item) => {
      // Must satisfy guard / constraints!
      if (!item.isGuardSatisfied) {
        return false;
      }
      // If an active trigger was explicitly dispatched, only include transitions satisfied by this trigger!
      if (activeTrigger) {
        return item.triggerValidation.valid;
      }
      return true;
    });
}

export function executeTransition(
  sim: SimState,
  transition: Transition,
  states: StateNode[],
  triggerEvent?: string | { name: string; [key: string]: unknown }
): SimState {
  const currentState = states.find((s) => s.id === sim.currentStateId);

  // 1. Validate guard constraints before firing!
  const guardCheck = evaluateTransitionConstraints(transition, sim.variables, currentState?.name);
  if (!guardCheck.satisfied) {
    const exprDetails = guardCheck.expression ? ` '${guardCheck.expression}'` : '';
    throw new Error(
      `Cannot fire transition '${transition.name}': Guard constraint condition${exprDetails} is not satisfied. ${guardCheck.reason || ''}`
    );
  }

  // 2. Validate trigger before allowing transition to fire
  const eventToValidate = triggerEvent || transition.trigger || transition.triggers?.[0];
  const triggerCheck = validateTrigger(transition, eventToValidate, sim.variables);
  if (!triggerCheck.valid) {
    throw new Error(`Trigger validation failed for transition '${transition.name}': ${triggerCheck.reason}`);
  }

  const toState = states.find((s) => s.id === transition.to_state_id);
  const nextVars = { ...sim.variables };

  // Apply transition action
  if (transition.action) {
    if (typeof transition.action === 'object') {
      Object.assign(nextVars, transition.action);
    } else if (typeof transition.action === 'string') {
      try {
        const parsed = JSON.parse(transition.action);
        if (typeof parsed === 'object') Object.assign(nextVars, parsed);
      } catch {
        // action string
      }
    }
  }

  // Apply destination state assignments
  if (toState?.variable_assignments) {
    Object.assign(nextVars, toState.variable_assignments);
  }

  const effectiveEventName = typeof eventToValidate === 'string'
    ? eventToValidate
    : eventToValidate?.name || transition.trigger || `FIRE_${transition.name.toUpperCase()}`;

  const nextStep = sim.history.length;
  const historyEntry = {
    step: nextStep,
    stateId: transition.to_state_id,
    stateName: toState ? toState.name : 'UNKNOWN',
    transitionName: transition.name,
    triggerEvent: effectiveEventName,
    variables: { ...nextVars },
    timestamp: new Date().toLocaleTimeString(),
  };

  return {
    currentStateId: transition.to_state_id,
    variables: nextVars,
    history: [...sim.history, historyEntry],
  };
}

// -------------------------------------------------------------
// State Snapshot Creation & Comparison Logic
// -------------------------------------------------------------

/**
 * Creates a formal StateSnapshot from a simulation step.
 */
export function createSnapshotFromStep(
  step: SimStep,
  name?: string,
  description?: string
): StateSnapshot {
  return {
    id: `snap-step-${step.step}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name || `Snapshot: Step ${step.step} (${step.stateName})`,
    stepIndex: step.step,
    timestamp: step.timestamp || new Date().toLocaleTimeString(),
    stateId: step.stateId,
    stateName: step.stateName,
    transitionName: step.transitionName,
    triggerEvent: step.triggerEvent,
    variables: { ...step.variables },
    description:
      description ||
      `State snapshot captured from simulation step ${step.step} (${step.stateName}) at ${step.timestamp}.`,
    source: 'simulation_step',
  };
}

/**
 * Creates a formal StateSnapshot from an execution log entry.
 */
export function createSnapshotFromLog(
  log: ExecutionLogItem,
  states: StateNode[],
  transitions: Transition[],
  name?: string,
  fallbackStepIndex?: number
): StateSnapshot {
  const toState = states.find((s) => s.id === log.to_state_id);
  const transition = transitions.find((t) => t.id === log.transition_id);

  // Extract variables: check log.context?.variables first, then fallback to toState.variable_assignments or empty
  const rawVars =
    log.context &&
    typeof log.context === 'object' &&
    log.context.variables &&
    typeof log.context.variables === 'object'
      ? (log.context.variables as Record<string, unknown>)
      : toState?.variable_assignments && typeof toState.variable_assignments === 'object'
      ? (toState.variable_assignments as Record<string, unknown>)
      : {};

  const stepIdx =
    log.context && typeof log.context === 'object' && typeof log.context.step === 'number'
      ? log.context.step
      : typeof fallbackStepIndex === 'number'
      ? fallbackStepIndex
      : 0;

  const stateName = toState?.name || 'UNKNOWN_STATE';
  const transitionName = transition?.name;
  const triggerEvent = log.trigger_event || transition?.trigger || undefined;
  const formattedTime = log.created_at
    ? new Date(log.created_at).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return {
    id: `snap-log-${log.id || Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name || `Snapshot: Step ${stepIdx} (${stateName})`,
    stepIndex: stepIdx,
    timestamp: formattedTime,
    stateId: log.to_state_id || '',
    stateName,
    transitionName,
    triggerEvent,
    variables: { ...rawVars },
    description: `State snapshot recorded from execution log at ${formattedTime}.`,
    source: 'execution_log',
    logId: log.id,
  };
}

/**
 * Compares two state snapshots and produces detailed variable diffs and highlights.
 */
export function compareSnapshots(
  snapshotA: StateSnapshot,
  snapshotB: StateSnapshot
): SnapshotComparisonResult {
  const varsA = snapshotA.variables || {};
  const varsB = snapshotB.variables || {};

  // Collect union of all variable keys
  const allKeys = Array.from(new Set([...Object.keys(varsA), ...Object.keys(varsB)])).sort();

  const variableDiffs: VariableDiffItem[] = allKeys.map((key) => {
    const valA = varsA[key];
    const valB = varsB[key];

    const changeInfo = getVariableChangeInfo(valA, valB);

    return {
      key,
      prevVal: valA,
      currentVal: valB,
      hasChanged: changeInfo.hasChanged,
      type: changeInfo.type,
      color: changeInfo.color,
      deltaText: changeInfo.deltaText,
      deltaNum: changeInfo.deltaNum,
      badgeLabel: changeInfo.badgeLabel,
    };
  });

  const changedCount = variableDiffs.filter((d) => d.hasChanged).length;
  const unchangedCount = variableDiffs.length - changedCount;
  const stateChanged =
    snapshotA.stateId !== snapshotB.stateId || snapshotA.stateName !== snapshotB.stateName;
  const stepDifference = snapshotB.stepIndex - snapshotA.stepIndex;

  let summary = '';
  if (stateChanged) {
    summary = `Transitioned from '${snapshotA.stateName}' (Step ${snapshotA.stepIndex}) to '${snapshotB.stateName}' (Step ${snapshotB.stepIndex}): `;
  } else {
    summary = `Same state '${snapshotA.stateName}' between Step ${snapshotA.stepIndex} and Step ${snapshotB.stepIndex}: `;
  }

  if (changedCount === 0) {
    summary += 'All variable values are identical (0 mutations).';
  } else {
    summary += `${changedCount} of ${variableDiffs.length} variables mutated (${unchangedCount} unchanged).`;
  }

  return {
    snapshotA,
    snapshotB,
    variableDiffs,
    totalVariables: variableDiffs.length,
    changedCount,
    unchangedCount,
    stateChanged,
    stepDifference,
    summary,
  };
}

/**
 * Exports a snapshot comparison result to formatted Markdown.
 */
export function exportSnapshotComparisonMarkdown(result: SnapshotComparisonResult): string {
  const { snapshotA, snapshotB, variableDiffs, changedCount, summary } = result;
  const lines: string[] = [
    `# State Snapshot Comparison`,
    ``,
    `**Snapshot A:** ${snapshotA.name} (Step ${snapshotA.stepIndex}, State: \`${snapshotA.stateName}\`, Time: ${snapshotA.timestamp})  `,
    `**Snapshot B:** ${snapshotB.name} (Step ${snapshotB.stepIndex}, State: \`${snapshotB.stateName}\`, Time: ${snapshotB.timestamp})  `,
    `**Summary:** ${summary} (${changedCount} variable changes)`,
    ``,
    `| Variable | Snapshot A (Step ${snapshotA.stepIndex}) | Snapshot B (Step ${snapshotB.stepIndex}) | Delta / Change | Status |`,
    `| :--- | :--- | :--- | :--- | :--- |`,
  ];

  variableDiffs.forEach((diff) => {
    const valAStr = diff.prevVal !== undefined ? JSON.stringify(diff.prevVal) : '*(undefined)*';
    const valBStr = diff.currentVal !== undefined ? JSON.stringify(diff.currentVal) : '*(undefined)*';
    const delta = diff.deltaText || '—';
    const status = diff.hasChanged ? `CHANGED (${diff.badgeLabel})` : 'Unchanged';
    lines.push(`| \`${diff.key}\` | \`${valAStr}\` | \`${valBStr}\` | ${delta} | ${status} |`);
  });

  return lines.join('\n');
}
