/**
 * Re-export AegisStateMachineRelic as UmlDiagramRelic for backward compatibility.
 * Clarification: Aegis is the TLA+/TLC State Machine Editor & Validator, not UML.
 * Future UML diagramming will be implemented as a separate module.
 */
export * from './AegisStateMachineRelic';
export { AegisStateMachineRelic as default } from './AegisStateMachineRelic';
