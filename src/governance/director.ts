/**
 * Governed Director for Interaction Execution
 * Orchestrates the full lifecycle: Shrapnel Envelope -> Pinned Read-Set ->
 * Aegis Definition -> SOLScript Check Guards -> Vision Invocation -> Resolution Evidence & Keychains.
 */

import { RenameItemInteraction } from './shrapnel/types';
import { AEGIS_FILE_MUTATION_REGISTRY, MutationState } from './aegis/registry';
import { SolStoragePort } from './solscript/port';
import { SolScriptEvaluator } from './solscript/evaluator';
import { VisionExecutionSubstrate } from './vision/executor';
import { ResolutionGovernanceLedger, GovernedTransitionResult } from './resolution/governance';

export class GovernedDirector {
  private evaluator: SolScriptEvaluator;

  constructor(
    private storagePort: SolStoragePort,
    private visionSubstrate: VisionExecutionSubstrate,
    private ledger: ResolutionGovernanceLedger
  ) {
    this.evaluator = new SolScriptEvaluator(storagePort);
  }

  /**
   * Execute RenameItem under strict semantic governance.
   */
  async executeRename(interaction: RenameItemInteraction): Promise<GovernedTransitionResult> {
    const transitionDef = AEGIS_FILE_MUTATION_REGISTRY.transitions.RenameItem;
    if (!transitionDef) {
      throw new Error(`Aegis registry does not define transition 'RenameItem'.`);
    }

    const fromState: MutationState = transitionDef.fromState;

    // 1. Capture pinned read-set
    const readSet = await this.storagePort.getDirectoryReadSet(interaction.context.source_path);

    // 2. Evaluate check guards deterministically via SOLScript
    const evaluation = await this.evaluator.evaluateRename(interaction, readSet);

    if (!evaluation.allowed) {
      // Guard failed: Refuse transition! Do NOT invoke capability.
      const allGuards = [
        ...evaluation.passedGuards,
        ...(evaluation.refusedGuard ? [evaluation.refusedGuard] : []),
      ];

      const evidence = this.ledger.recordEvidence(
        interaction.interaction_id,
        interaction.correlation_id,
        interaction.subject.id,
        readSet.digest,
        allGuards
      );

      return {
        status: 'refused',
        from_state: fromState,
        to_state: 'refused',
        guards: allGuards,
        refusal_reason: evaluation.refusedGuard?.reason || 'Guard validation refused.',
        evidence,
      };
    }

    // 3. Guards passed: Execute authorized invocation via Vision capability substrate
    const invocationRequest = evaluation.invocationRequest!;
    const executionReceipt = await this.visionSubstrate.execute(invocationRequest);

    if (executionReceipt.status === 'failed') {
      const evidence = this.ledger.recordEvidence(
        interaction.interaction_id,
        interaction.correlation_id,
        interaction.subject.id,
        readSet.digest,
        evaluation.passedGuards,
        executionReceipt
      );

      return {
        status: 'failed',
        from_state: fromState,
        to_state: 'failed',
        guards: evaluation.passedGuards,
        refusal_reason: executionReceipt.error,
        execution_receipt: executionReceipt,
        evidence,
      };
    }

    // 4. Success: Record final Resolution evidence & create Keychains checkpoint
    const evidence = this.ledger.recordEvidence(
      interaction.interaction_id,
      interaction.correlation_id,
      interaction.subject.id,
      readSet.digest,
      evaluation.passedGuards,
      executionReceipt
    );

    const checkpoint = this.ledger.createKeychainsCheckpoint(
      transitionDef.name,
      fromState,
      transitionDef.toState,
      readSet.digest,
      evidence.evidence_id
    );

    return {
      status: 'completed',
      from_state: fromState,
      to_state: transitionDef.toState,
      guards: evaluation.passedGuards,
      execution_receipt: executionReceipt,
      evidence,
      keychain_checkpoint: checkpoint,
    };
  }
}
