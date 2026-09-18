import {
  ExecutionApiService,
  DEFAULT_EXECUTION_SRV_PORT,
  DEFAULT_EXECUTION_SRV_URL,
} from './apiService.js';
import { ReadOnlyWitnessedRunAdapter } from '@nexus/projection-core';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function runApiServiceTests(): Promise<{ allPassed: boolean; logs: string[] }> {
  const logs: string[] = [];

  try {
    // 1. Verify default port is 4249 and default URL is http://localhost:4249
    assert(DEFAULT_EXECUTION_SRV_PORT === 4249, `DEFAULT_EXECUTION_SRV_PORT must be 4249, got ${DEFAULT_EXECUTION_SRV_PORT}`);
    assert(DEFAULT_EXECUTION_SRV_URL === 'http://localhost:4249', `DEFAULT_EXECUTION_SRV_URL must be http://localhost:4249`);
    logs.push('✔ Default port and URL verified (4249 / http://localhost:4249)');

    // 2. Local simulated projection mode
    const simulatedService = new ExecutionApiService({ live: false, baseUrl: 'http://localhost:4249' });
    assert(!simulatedService.isLive(), 'Service initialized with live: false must report !isLive()');

    const run = await simulatedService.fetchWitnessedRun({
      workflowInstanceId: 'wf-test-1',
      nodeId: 'node-action-alpha',
    });
    assert(run.workflow.instanceId === 'wf-test-1', 'Workflow instanceId must match query');
    assert(run.workflow.nodeId === 'node-action-alpha', 'NodeId must match query');
    assert(run.status === 'complete', 'Simulated valid run should have complete status');
    assert(run.law.propositionIds.length > 0, 'Should include proposition law IDs');
    logs.push('✔ Simulated witnessed-run projection query verified');

    // 3. Missing lineage handling
    const missingRun = await simulatedService.fetchWitnessedRun({
      workflowInstanceId: 'missing-wf',
      nodeId: 'node-x',
    });
    assert(missingRun.status === 'missing_lineage', 'Missing run should have missing_lineage status');
    logs.push('✔ Missing lineage handling verified');

    // 4. Integration with ReadOnlyWitnessedRunAdapter
    const adapter = new ReadOnlyWitnessedRunAdapter(simulatedService);
    const adaptedProjection = await adapter.get({
      workflowInstanceId: 'wf-adapted',
      nodeId: 'node-adapted',
    });
    assert(adaptedProjection.workflow.instanceId === 'wf-adapted', 'Adapter must normalize query instanceId');
    logs.push('✔ ReadOnlyWitnessedRunAdapter integration verified');

    // 5. Diagnostics endpoint (simulated)
    const diagnostics = await simulatedService.fetchDiagnostics();
    assert(diagnostics.status === 'healthy', 'Diagnostics status must be healthy');
    assert(diagnostics.port === 4249, 'Diagnostics port must report 4249');
    assert(diagnostics.subsystems.solscript !== undefined, 'Subsystems should include solscript');
    logs.push('✔ Diagnostics endpoint query verified');

    // 6. Live API routing with mock fetch
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        if (capturedUrl.includes('/diagnostics')) {
          return new Response(
            JSON.stringify({
              status: 'healthy',
              service: 'execution-srv',
              version: '2.1.0',
              port: 4249,
              uptimeSeconds: 120,
              subsystems: { solscript: { status: 'healthy' } },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (capturedUrl.includes('/api/execution/witnessed-runs')) {
          return new Response(
            JSON.stringify({
              workflow: { instanceId: 'wf-live-100', nodeId: 'node-200' },
              envelope: { id: 'env-live', evaluationFingerprint: 'sha256:live' },
              manifest: { id: 'man-1', version: 1, digest: 'sha256:man' },
              law: { propositionIds: ['prop-1'], doctrineIds: ['doc-1'], evaluatorId: 'eval-1' },
              assessment: { disposition: 'allow', status: 'admitted', reason: null },
              receipts: { pebAdmission: 'peb-1', conduitTransition: 'conduit-1' },
              evidence: { ids: ['ev-1'], fingerprint: 'sha256:ev' },
              replay: { fixtureId: 'F01', status: 'replay_ok' },
              status: 'complete',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not found', { status: 404 });
      };

      const liveService = new ExecutionApiService({ live: true, baseUrl: 'http://localhost:4249' });
      assert(liveService.isLive(), 'Service must report isLive() true');

      const liveRun = await liveService.fetchWitnessedRun({
        workflowInstanceId: 'wf-live-100',
        nodeId: 'node-200',
      });
      assert(capturedUrl.includes('http://localhost:4249/api/execution/witnessed-runs'), 'Live run must target /api/execution/witnessed-runs');
      assert(capturedUrl.includes('workflowInstanceId=wf-live-100'), 'Query params must include workflowInstanceId');
      assert(capturedUrl.includes('nodeId=node-200'), 'Query params must include nodeId');
      assert(liveRun.workflow.instanceId === 'wf-live-100', 'Live projection parsed properly');
      assert(liveRun.status === 'complete', 'Status parsed properly');
      logs.push('✔ Live API /api/execution/witnessed-runs endpoint call verified');

      const liveDiag = await liveService.fetchDiagnostics();
      assert(capturedUrl === 'http://localhost:4249/diagnostics', 'Diagnostics must target /diagnostics');
      assert(liveDiag.version === '2.1.0', 'Diagnostics version parsed correctly');
      assert(liveDiag.live === true, 'Diagnostics reports live: true');
      logs.push('✔ Live API /diagnostics endpoint call verified');
    } finally {
      globalThis.fetch = originalFetch;
    }

    return { allPassed: true, logs };
  } catch (error) {
    logs.push(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    return { allPassed: false, logs };
  }
}
