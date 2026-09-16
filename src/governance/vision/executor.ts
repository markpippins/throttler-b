/**
 * Vision Capability Execution Substrate
 * Executes authorized capability requests dispatched to registered targets.
 * Emits execution receipts.
 */

import { AuthorizedInvocationRequest } from '../solscript/evaluator';

export interface ExecutionReceipt<TResult = any> {
  receipt_id: string;
  target: string;
  status: 'completed' | 'failed';
  result?: TResult;
  error?: string;
  executed_at: string;
  duration_ms: number;
}

export type RenameCapabilityHandler = (
  sourcePath: string[],
  oldName: string,
  newName: string
) => Promise<boolean> | boolean;

export class VisionExecutionSubstrate {
  private handlers = new Map<string, Function>();

  registerHandler(target: string, handler: Function) {
    this.handlers.set(target, handler);
  }

  async execute<TParams, TResult>(
    request: AuthorizedInvocationRequest<TParams>
  ): Promise<ExecutionReceipt<TResult>> {
    const handler = this.handlers.get(request.target);
    const receipt_id = `rcpt:${Date.now()}:${Math.random().toString(36).substring(2, 7)}`;
    const start = performance.now();
    const executed_at = new Date().toISOString();

    if (!handler) {
      return {
        receipt_id,
        target: request.target,
        status: 'failed',
        error: `Capability '${request.target}' is not registered in active Vision substrate.`,
        executed_at,
        duration_ms: Math.round(performance.now() - start),
      };
    }

    try {
      const result = await handler(request.parameters);
      return {
        receipt_id,
        target: request.target,
        status: 'completed',
        result,
        executed_at,
        duration_ms: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        receipt_id,
        target: request.target,
        status: 'failed',
        error: err?.message || String(err),
        executed_at,
        duration_ms: Math.round(performance.now() - start),
      };
    }
  }
}
