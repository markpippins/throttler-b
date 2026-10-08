/**
 * Aegis State-Machine Registry REST API Client
 */

import {
  Registry,
  Constant,
  Variable,
  StateNode,
  Transition,
  StateGroup,
  Invariant,
  Property,
  TemporalProperty,
  ConceptMapping,
  AttributeMapping,
  RelationshipMapping,
  ExecutionLogItem,
  ValidationResult,
  ModelCheckResult,
  ChildResourceName,
} from '../types';

const BASE_URL = '/api';

export class ApiError extends Error {
  statusCode: number;
  errorPayload: { error?: string; message?: string };

  constructor(statusCode: number, payload: { error?: string; message?: string }) {
    super(payload.message || payload.error || `HTTP ${statusCode}`);
    this.statusCode = statusCode;
    this.errorPayload = payload;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    throw new ApiError(res.status, (json as { error?: string; message?: string }) || {});
  }

  return json as T;
}

export const aegisApi = {
  // Health
  async getHealth(): Promise<{ ok: boolean; service: string }> {
    return request<{ ok: boolean; service: string }>('/health');
  },

  // Registries
  async listRegistries(): Promise<{ items: Registry[] }> {
    return request<{ items: Registry[] }>(`${BASE_URL}/registries`);
  },

  async getRegistry(id: string): Promise<Registry> {
    return request<Registry>(`${BASE_URL}/registries/${id}`);
  },

  async getRegistryByName(name: string): Promise<Registry> {
    return request<Registry>(`${BASE_URL}/registries/name/${encodeURIComponent(name)}`);
  },

  async createRegistry(data: Partial<Registry>): Promise<Registry> {
    return request<Registry>(`${BASE_URL}/registries`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRegistry(id: string, data: Partial<Registry>): Promise<Registry> {
    return request<Registry>(`${BASE_URL}/registries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteRegistry(id: string): Promise<{ deleted: string }> {
    return request<{ deleted: string }>(`${BASE_URL}/registries/${id}`, {
      method: 'DELETE',
    });
  },

  // Actions
  async validateRegistry(id: string, validated_by?: string): Promise<ValidationResult> {
    return request<ValidationResult>(`${BASE_URL}/registries/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ validated_by: validated_by || 'aegis-ide' }),
    });
  },

  async modelCheckRegistry(
    id: string,
    options?: { property_id?: string; checked_by?: string }
  ): Promise<ModelCheckResult> {
    return request<ModelCheckResult>(`${BASE_URL}/registries/${id}/model-check`, {
      method: 'POST',
      body: JSON.stringify(options || { checked_by: 'aegis-ide-tlc' }),
    });
  },

  async listValidationResults(id: string): Promise<{ items: ValidationResult[] }> {
    return request<{ items: ValidationResult[] }>(`${BASE_URL}/registries/${id}/validation-results`);
  },

  async listModelCheckResults(id: string): Promise<{ items: ModelCheckResult[] }> {
    return request<{ items: ModelCheckResult[] }>(`${BASE_URL}/registries/${id}/model-check-results`);
  },

  // Generic Child CRUD
  async listChildren<T>(registryId: string, resource: ChildResourceName): Promise<{ items: T[] }> {
    return request<{ items: T[] }>(`${BASE_URL}/registries/${registryId}/${resource}`);
  },

  async getChild<T>(registryId: string, resource: ChildResourceName, childId: string): Promise<T> {
    return request<T>(`${BASE_URL}/registries/${registryId}/${resource}/${childId}`);
  },

  async createChild<T>(registryId: string, resource: ChildResourceName, data: unknown): Promise<T> {
    return request<T>(`${BASE_URL}/registries/${registryId}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateChild<T>(
    registryId: string,
    resource: ChildResourceName,
    childId: string,
    data: unknown
  ): Promise<T> {
    return request<T>(`${BASE_URL}/registries/${registryId}/${resource}/${childId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteChild(
    registryId: string,
    resource: ChildResourceName,
    childId: string
  ): Promise<{ deleted: string }> {
    return request<{ deleted: string }>(`${BASE_URL}/registries/${registryId}/${resource}/${childId}`, {
      method: 'DELETE',
    });
  },

  // Convenience Child accessors
  async getStates(id: string) {
    return aegisApi.listChildren<StateNode>(id, 'states');
  },
  async getGroups(id: string) {
    return aegisApi.listChildren<StateGroup>(id, 'groups');
  },
  async getTransitions(id: string) {
    return aegisApi.listChildren<Transition>(id, 'transitions');
  },
  async getVariables(id: string) {
    return aegisApi.listChildren<Variable>(id, 'variables');
  },
  async getConstants(id: string) {
    return aegisApi.listChildren<Constant>(id, 'constants');
  },
  async getInvariants(id: string) {
    return aegisApi.listChildren<Invariant>(id, 'invariants');
  },
  async getProperties(id: string) {
    return aegisApi.listChildren<Property>(id, 'properties');
  },
  async getTemporalProperties(id: string) {
    return aegisApi.listChildren<TemporalProperty>(id, 'temporal-properties');
  },
  async getExecutionLogs(id: string) {
    return aegisApi.listChildren<ExecutionLogItem>(id, 'execution-log');
  },
  async appendExecutionLog(id: string, log: Partial<ExecutionLogItem>) {
    return aegisApi.createChild<ExecutionLogItem>(id, 'execution-log', log);
  },

  // Gemini API: Automatic State Documentation Generator
  async generateStateDescription(payload: {
    stateName: string;
    isInitial?: boolean;
    isTerminal?: boolean;
    groupName?: string;
    variableAssignments?: Record<string, unknown>;
    incomingTransitions?: Array<{
      name?: string;
      fromStateName?: string;
      from_state_id?: string;
      trigger?: string;
      guard?: string;
      guard_expression?: string;
      action?: string;
      action_statements?: string;
    }>;
    outgoingTransitions?: Array<{
      name?: string;
      toStateName?: string;
      to_state_id?: string;
      trigger?: string;
      guard?: string;
      guard_expression?: string;
      action?: string;
      action_statements?: string;
    }>;
    registryName?: string;
    registryDescription?: string;
    modelVariables?: Array<{
      name: string;
      type?: string;
      initial_value?: string;
      description?: string;
    }>;
  }): Promise<{ description: string; model: string }> {
    return request<{ description: string; model: string }>(`${BASE_URL}/ai/generate-state-description`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
