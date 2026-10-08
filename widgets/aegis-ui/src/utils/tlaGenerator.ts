/**
 * TLA+ Specification Generator and Model Config Builder
 */

import { Registry, Constant, Variable, StateNode, Transition, Invariant, Property } from '../types';

export function generateTlaPlus(
  registry: Registry,
  constants: Constant[],
  variables: Variable[],
  states: StateNode[],
  transitions: Transition[],
  invariants: Invariant[],
  _properties?: Property[]
): string {
  const moduleName = (registry.tla_plus_module || registry.name || 'StateMachine')
    .replace(/[^a-zA-Z0-9_]/g, '_');

  const sep = '-'.repeat(Math.max(10, 40 - Math.floor(moduleName.length / 2)));
  const endSep = '='.repeat(80);

  const lines: string[] = [];

  lines.push(`${sep} MODULE ${moduleName} ${sep}`);
  lines.push('EXTENDS Integers, Sequences, TLC, FiniteSets, Naturals');
  lines.push('');

  // Constants
  if (constants.length > 0) {
    const constNames = constants.map((c) => c.name).join(', ');
    lines.push(`CONSTANTS ${constNames}`);
    lines.push('');
  }

  // Variables
  const varNames = ['currentState', ...variables.map((v) => v.name)];
  lines.push(`VARIABLES ${varNames.join(', ')}`);
  lines.push('');
  lines.push(`vars == <<${varNames.join(', ')}>>`);
  lines.push('');

  // States set
  const stateNames = states.map((s) => `"${s.name}"`).join(', ');
  lines.push(`States == {${stateNames || '"INIT"'}}`);
  lines.push('');

  // TypeOK Invariant
  lines.push('\\* Type invariant');
  lines.push('TypeOK ==');
  const typeConditions: string[] = [`currentState \\in States`];
  variables.forEach((v) => {
    if (v.domain) {
      const domStr = typeof v.domain === 'string' ? v.domain : JSON.stringify(v.domain);
      typeConditions.push(`${v.name} \\in ${domStr}`);
    } else if (v.type === 'integer' || v.type === 'number') {
      typeConditions.push(`${v.name} \\in Int`);
    } else if (v.type === 'boolean') {
      typeConditions.push(`${v.name} \\in BOOLEAN`);
    } else {
      typeConditions.push(`TRUE`);
    }
  });
  lines.push('  /\\ ' + typeConditions.join('\n  /\\ '));
  lines.push('');

  // Init Predicate
  lines.push('\\* Initial predicate');
  lines.push('Init ==');
  const initialStates = states.filter((s) => s.is_initial);
  const initialStatesExpr =
    initialStates.length > 0
      ? initialStates.length === 1
        ? `currentState = "${initialStates[0].name}"`
        : `currentState \\in {${initialStates.map((s) => `"${s.name}"`).join(', ')}}`
      : states.length > 0
      ? `currentState = "${states[0].name}"`
      : `currentState = "INIT"`;

  const initConditions: string[] = [initialStatesExpr];
  variables.forEach((v) => {
    if (v.initial_value !== undefined && v.initial_value !== null) {
      let valStr = String(v.initial_value);
      if (typeof v.initial_value === 'string') {
        valStr = v.initial_value.startsWith('"') ? v.initial_value : `"${v.initial_value}"`;
      }
      initConditions.push(`${v.name} = ${valStr}`);
    } else {
      initConditions.push(`${v.name} = 0`);
    }
  });
  lines.push('  /\\ ' + initConditions.join('\n  /\\ '));
  lines.push('');

  // Actions / Transitions
  const actionNames: string[] = [];
  transitions.forEach((t) => {
    const fromState = states.find((s) => s.id === t.from_state_id);
    const toState = states.find((s) => s.id === t.to_state_id);
    const actName = t.name.replace(/[^a-zA-Z0-9_]/g, '_');
    actionNames.push(actName);

    lines.push(`\\* Transition: ${t.name}`);
    if (t.trigger) {
      lines.push(`\\* Trigger Event: ${t.trigger}`);
    } else if (t.triggers && t.triggers.length > 0) {
      lines.push(`\\* Trigger Events: ${t.triggers.join(', ')}`);
    }
    if (t.trigger_condition && t.trigger_condition.trim()) {
      lines.push(`\\* Trigger Condition: ${t.trigger_condition.trim()}`);
    }
    lines.push(`${actName} ==`);
    const conds: string[] = [];
    if (fromState) {
      conds.push(`currentState = "${fromState.name}"`);
    }
    if (t.constraints && t.constraints.trim()) {
      conds.push(t.constraints.trim());
    } else if (t.guard_expression && t.guard_expression.trim()) {
      conds.push(t.guard_expression.trim());
    }
    if (toState) {
      conds.push(`currentState' = "${toState.name}"`);
    } else {
      conds.push(`currentState' = currentState`);
    }

    // Variable updates from action or unchanged
    const actionObj = typeof t.action === 'object' && t.action !== null ? t.action : null;
    const modifiedVars: string[] = [];

    if (actionObj) {
      Object.entries(actionObj).forEach(([varKey, expr]) => {
        conds.push(`${varKey}' = ${typeof expr === 'string' ? expr : JSON.stringify(expr)}`);
        modifiedVars.push(varKey);
      });
    }

    const unchangedVars = variables
      .filter((v) => !modifiedVars.includes(v.name))
      .map((v) => v.name);

    if (unchangedVars.length > 0) {
      conds.push(`UNCHANGED <<${unchangedVars.join(', ')}>>`);
    }

    lines.push('  /\\ ' + conds.join('\n  /\\ '));
    lines.push('');
  });

  // Next Relation
  lines.push('\\* Next-state relation');
  lines.push('Next ==');
  if (actionNames.length > 0) {
    lines.push('  \\/ ' + actionNames.join('\n  \\/ '));
  } else {
    lines.push('  FALSE \\* No defined transitions');
  }
  lines.push('');

  // Fairness & Temporal Spec
  const wfList = transitions.filter((t) => t.weak_fairness).map((t) => `WF_vars(${t.name.replace(/[^a-zA-Z0-9_]/g, '_')})`);
  const sfList = transitions.filter((t) => t.strong_fairness).map((t) => `SF_vars(${t.name.replace(/[^a-zA-Z0-9_]/g, '_')})`);
  const fairness = [...wfList, ...sfList];

  lines.push('\\* Complete specification formula');
  if (fairness.length > 0) {
    lines.push(`Spec == Init /\\ [][Next]_vars /\\ ${fairness.join(' /\\ ')}`);
  } else {
    lines.push('Spec == Init /\\ [][Next]_vars');
  }
  lines.push('');

  // Invariants
  if (invariants.length > 0) {
    lines.push('\\* Invariants');
    invariants.forEach((inv) => {
      const invName = inv.name.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`${invName} ==`);
      lines.push(`  ${inv.expression}`);
      lines.push('');
    });
  }

  lines.push(endSep);
  return lines.join('\n');
}

export function generateTlcConfig(
  _registry: Registry,
  constants: Constant[],
  invariants: Invariant[]
): string {
  const lines: string[] = [];
  lines.push('SPECIFICATION Spec');
  lines.push('INVARIANT TypeOK');

  invariants.forEach((inv) => {
    lines.push(`INVARIANT ${inv.name.replace(/[^a-zA-Z0-9_]/g, '_')}`);
  });

  if (constants.length > 0) {
    lines.push('CONSTANTS');
    constants.forEach((c) => {
      const valStr = typeof c.value === 'string' ? c.value : JSON.stringify(c.value);
      lines.push(`  ${c.name} = ${valStr}`);
    });
  }

  return lines.join('\n');
}
