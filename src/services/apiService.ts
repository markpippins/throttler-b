/**
 * API Integration Layer for execution-srv
 *
 * Interfaces with execution-srv to fetch backend-attested projections
 * and runtime diagnostics via:
 *   - /api/execution/witnessed-runs
 *   - /diagnostics
 *
 * Configured via environment variables:
 *   - VITE_USE_LIVE_API: toggles live execution-srv vs local projection simulation
 *   - VITE_EXECUTION_SRV_PORT: port number (defaults to 4249)
 *   - VITE_EXECUTION_SRV_URL: base URL (defaults to http://localhost:4249)
 */

import {
  type WitnessedRunProjection,
  type WitnessedRunQuery,
  type WitnessedRunStatus,
  type WitnessedRunSource,
  normalizeProjection,
  emptyProjection,
} from '@nexus/projection-core';
import { sha256Hex } from '@nexus/solscript';

export interface WitnessedRunListFilters {
  workflowInstanceId?: string;
  nodeId?: string;
  status?: WitnessedRunStatus | string;
  limit?: number;
  offset?: number;
}

export interface ExecutionSubsystemDiagnostics {
  status: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ExecutionDiagnostics {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  service: string;
  version: string;
  port: number;
  live: boolean;
  uptimeSeconds?: number;
  timestamp: string;
  subsystems: {
    solscript?: ExecutionSubsystemDiagnostics;
    aegis?: ExecutionSubsystemDiagnostics;
    projections?: ExecutionSubsystemDiagnostics;
    vision?: ExecutionSubsystemDiagnostics;
    [key: string]: unknown;
  };
  metrics?: {
    activeWitnessedRuns?: number;
    cachedProjections?: number;
    totalEvaluations?: number;
    [key: string]: unknown;
  };
  details?: Record<string, unknown>;
}

export const DEFAULT_EXECUTION_SRV_PORT = 4249;
export const DEFAULT_EXECUTION_SRV_URL = `http://localhost:${DEFAULT_EXECUTION_SRV_PORT}`;

/**
 * Reads whether the live API is enabled from environment variables.
 */
export function isLiveApiConfigured(): boolean {
  try {
    const raw = import.meta.env.VITE_USE_LIVE_API;
    if (typeof raw === 'string') {
      const trimmed = raw.trim().toLowerCase();
      return trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'on';
    }
  } catch {
    // ignore in environments without import.meta.env
  }
  return false;
}

/**
 * Resolves the configured execution-srv base URL.
 */
export function resolveExecutionSrvBaseUrl(): string {
  try {
    if (import.meta.env.VITE_EXECUTION_SRV_URL) {
      return import.meta.env.VITE_EXECUTION_SRV_URL.replace(/\/+$/, '');
    }
    const port = import.meta.env.VITE_EXECUTION_SRV_PORT
      ? parseInt(import.meta.env.VITE_EXECUTION_SRV_PORT, 10)
      : DEFAULT_EXECUTION_SRV_PORT;
    return `http://localhost:${isNaN(port) ? DEFAULT_EXECUTION_SRV_PORT : port}`;
  } catch {
    return DEFAULT_EXECUTION_SRV_URL;
  }
}

export class ExecutionApiService implements WitnessedRunSource {
  private liveMode: boolean;
  private baseUrl: string;

  constructor(options?: { live?: boolean; baseUrl?: string }) {
    this.liveMode = options?.live ?? isLiveApiConfigured();
    this.baseUrl = options?.baseUrl ?? resolveExecutionSrvBaseUrl();
  }

  public isLive(): boolean {
    return this.liveMode;
  }

  public setLive(live: boolean): void {
    this.liveMode = live;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  /**
   * WitnessedRunSource interface method.
   * Enables seamless integration with ReadOnlyWitnessedRunAdapter.
   */
  async query(query: WitnessedRunQuery, signal?: AbortSignal): Promise<WitnessedRunProjection | null> {
    try {
      return await this.fetchWitnessedRun(query, signal);
    } catch {
      return null;
    }
  }

  /**
   * Fetches a backend-attested witnessed-run projection by query.
   * Calls GET /api/execution/witnessed-runs?workflowInstanceId=...&nodeId=...
   */
  async fetchWitnessedRun(
    query: WitnessedRunQuery,
    signal?: AbortSignal
  ): Promise<WitnessedRunProjection> {
    if (!query.workflowInstanceId || !query.nodeId) {
      throw new Error('Both workflowInstanceId and nodeId are required to fetch witnessed run.');
    }

    if (this.liveMode) {
      return await this.fetchLiveWitnessedRun(query, signal);
    }

    return this.generateSimulatedWitnessedRun(query);
  }

  /**
   * Fetches a list of witnessed runs from execution-srv with optional filters.
   * Calls GET /api/execution/witnessed-runs
   */
  async fetchWitnessedRuns(
    filters?: WitnessedRunListFilters,
    signal?: AbortSignal
  ): Promise<WitnessedRunProjection[]> {
    if (this.liveMode) {
      return await this.fetchLiveWitnessedRuns(filters, signal);
    }

    return this.generateSimulatedWitnessedRunsList(filters);
  }

  /**
   * Fetches diagnostics information from execution-srv.
   * Calls GET /diagnostics
   */
  async fetchDiagnostics(signal?: AbortSignal): Promise<ExecutionDiagnostics> {
    if (this.liveMode) {
      return await this.fetchLiveDiagnostics(signal);
    }

    return this.generateSimulatedDiagnostics();
  }

  // --- Live API Fetch Implementations ---

  private async fetchLiveWitnessedRun(
    query: WitnessedRunQuery,
    signal?: AbortSignal
  ): Promise<WitnessedRunProjection> {
    const url = new URL(`${this.baseUrl}/api/execution/witnessed-runs`);
    url.searchParams.set('workflowInstanceId', query.workflowInstanceId);
    url.searchParams.set('nodeId', query.nodeId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (response.status === 404) {
      return emptyProjection(query, 'missing_lineage');
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `execution-srv returned ${response.status} ${response.statusText}: ${errorBody || 'Failed to fetch witnessed run'}`
      );
    }

    const data = await response.json();
    // In case the endpoint returns an array or wrapped object:
    const rawProjection: WitnessedRunProjection = Array.isArray(data)
      ? data[0]
      : data.projection || data;

    if (!rawProjection) {
      return emptyProjection(query, 'missing_lineage');
    }

    return normalizeProjection(rawProjection, query);
  }

  private async fetchLiveWitnessedRuns(
    filters?: WitnessedRunListFilters,
    signal?: AbortSignal
  ): Promise<WitnessedRunProjection[]> {
    const url = new URL(`${this.baseUrl}/api/execution/witnessed-runs`);
    if (filters?.workflowInstanceId) {
      url.searchParams.set('workflowInstanceId', filters.workflowInstanceId);
    }
    if (filters?.nodeId) {
      url.searchParams.set('nodeId', filters.nodeId);
    }
    if (filters?.status) {
      url.searchParams.set('status', filters.status);
    }
    if (filters?.limit != null) {
      url.searchParams.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      url.searchParams.set('offset', String(filters.offset));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `execution-srv returned ${response.status} ${response.statusText}: ${errorBody || 'Failed to list witnessed runs'}`
      );
    }

    const data = await response.json();
    const runsList: WitnessedRunProjection[] = Array.isArray(data)
      ? data
      : data.items || data.runs || [];

    return runsList.map((item) =>
      normalizeProjection(item, {
        workflowInstanceId: item.workflow?.instanceId || filters?.workflowInstanceId || 'unknown',
        nodeId: item.workflow?.nodeId || filters?.nodeId || 'unknown',
      })
    );
  }

  private async fetchLiveDiagnostics(signal?: AbortSignal): Promise<ExecutionDiagnostics> {
    const url = `${this.baseUrl}/diagnostics`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `execution-srv /diagnostics returned ${response.status} ${response.statusText}: ${errorBody || 'Failed to fetch diagnostics'}`
      );
    }

    const data = await response.json();
    return {
      status: data.status || 'healthy',
      service: data.service || 'execution-srv',
      version: data.version || '1.0.0',
      port: data.port || this.extractPortFromBaseUrl(),
      live: true,
      uptimeSeconds: data.uptimeSeconds ?? data.uptime,
      timestamp: data.timestamp || new Date().toISOString(),
      subsystems: data.subsystems || {},
      metrics: data.metrics || {},
      details: data.details,
    };
  }

  private extractPortFromBaseUrl(): number {
    try {
      const u = new URL(this.baseUrl);
      return u.port ? parseInt(u.port, 10) : DEFAULT_EXECUTION_SRV_PORT;
    } catch {
      return DEFAULT_EXECUTION_SRV_PORT;
    }
  }

  // --- Simulated / Local Fallback Implementations ---

  private generateSimulatedWitnessedRun(query: WitnessedRunQuery): WitnessedRunProjection {
    const isCompleted = !query.workflowInstanceId.includes('missing');
    if (!isCompleted) {
      return emptyProjection(query, 'missing_lineage');
    }

    const raw: WitnessedRunProjection = {
      workflow: {
        instanceId: query.workflowInstanceId,
        nodeId: query.nodeId,
      },
      envelope: {
        id: `env-${query.workflowInstanceId}-${query.nodeId}`,
        evaluationFingerprint: `sha256:${sha256Hex(`fp:${query.workflowInstanceId}`)}`,
        contractId: 'contract:file-mutation',
        contractVersion: 1,
        contractDigest: `sha256:${sha256Hex('contract:file-mutation:v1')}`,
      },
      manifest: {
        id: `manifest-${query.workflowInstanceId}`,
        version: 1,
        digest: `sha256:${sha256Hex(`manifest:${query.nodeId}`)}`,
      },
      law: {
        propositionIds: ['prop:valid_name_syntax', 'prop:target_exists', 'prop:unique_sibling_name'],
        doctrineIds: ['doctrine:file_mutation_rules_v1'],
        evaluatorId: 'solscript-evaluator-v1',
      },
      assessment: {
        disposition: 'allow',
        status: 'admitted',
        reason: null,
      },
      receipts: {
        pebAdmission: `peb:${query.workflowInstanceId}:admission`,
        conduitTransition: `conduit:${query.nodeId}:committed`,
      },
      evidence: {
        ids: [`ev:${query.workflowInstanceId}:1`, `ev:${query.workflowInstanceId}:2`],
        fingerprint: `sha256:${sha256Hex(`evidence:${query.nodeId}`)}`,
      },
      replay: {
        fixtureId: 'F01-live-simulation',
        status: 'replay_ok',
      },
      status: 'complete',
    };

    return normalizeProjection(raw, query);
  }

  private generateSimulatedWitnessedRunsList(
    filters?: WitnessedRunListFilters
  ): WitnessedRunProjection[] {
    const instanceId = filters?.workflowInstanceId || 'wf-live-demo-1';
    const runs: WitnessedRunProjection[] = [
      this.generateSimulatedWitnessedRun({
        workflowInstanceId: instanceId,
        nodeId: filters?.nodeId || 'node:rename-item-alpha',
      }),
      this.generateSimulatedWitnessedRun({
        workflowInstanceId: instanceId,
        nodeId: 'node:check-guards-target-exists',
      }),
    ];
    return runs;
  }

  private generateSimulatedDiagnostics(): ExecutionDiagnostics {
    return {
      status: 'healthy',
      service: 'execution-srv (simulated local)',
      version: '1.0.0',
      port: this.extractPortFromBaseUrl(),
      live: this.liveMode,
      uptimeSeconds: 3600,
      timestamp: new Date().toISOString(),
      subsystems: {
        solscript: { status: 'healthy', rulesCount: 4, evaluator: 'ResolutionInterpreter' },
        aegis: { status: 'healthy', activeWorkflows: 1 },
        projections: { status: 'healthy', cachedCount: 12 },
        vision: { status: 'healthy', activeSubstrates: 1 },
      },
      metrics: {
        activeWitnessedRuns: 2,
        cachedProjections: 2,
        totalEvaluations: 48,
      },
    };
  }
}

/** Singleton instance configured by default environment */
export const apiService = new ExecutionApiService();
