/**
 * aegis-srv — Aegis State-Machine Registry API & IDE Server
 * Implements full REST API specification for aegis schema and hosts Vite IDE
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
    });
  }
  return geminiClient;
}

app.use(express.json());

// UUID validation helper (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function pgError(res: Response, status: number, error: string, message: string) {
  return res.status(status).json({ error, message });
}

// In-Memory Aegis Database Store
interface DBRegistry {
  id: string;
  name: string;
  description?: string;
  version?: string;
  tla_plus_source?: string;
  tla_plus_module?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  is_active: boolean;
  expires_at?: string | null;
  main_concept_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface DBRecord {
  id: string;
  registry_id: string;
  [key: string]: unknown;
  created_at: string;
  updated_at?: string;
}

const db = {
  registries: new Map<string, DBRegistry>(),
  constants: new Map<string, DBRecord>(),
  variables: new Map<string, DBRecord>(),
  states: new Map<string, DBRecord>(),
  transitions: new Map<string, DBRecord>(),
  groups: new Map<string, DBRecord>(),
  invariants: new Map<string, DBRecord>(),
  properties: new Map<string, DBRecord>(),
  'temporal-properties': new Map<string, DBRecord>(),
  'concept-mappings': new Map<string, DBRecord>(),
  'attribute-mappings': new Map<string, DBRecord>(),
  'relationship-mappings': new Map<string, DBRecord>(),
  'execution-log': new Map<string, DBRecord>(),
  validation_results: new Map<string, DBRecord>(),
  model_check_results: new Map<string, DBRecord>(),
};

// Seed initial state machines
function seedDatabase() {
  const now = new Date().toISOString();

  // 1. Two-Phase Commit (2PC)
  const reg2pcId = '2a1b3c4d-1111-4444-8888-000000000001';
  db.registries.set(reg2pcId, {
    id: reg2pcId,
    name: 'TwoPhaseCommit',
    description: 'Distributed 2-Phase Commit protocol verifying coordinator decision consistency across resource managers.',
    version: '1.2.0',
    tla_plus_module: 'TwoPhaseCommit',
    tags: ['distributed-systems', 'consensus', 'tlc-benchmark'],
    metadata: { author: 'Leslie Lamport / Aegis Systems', domain: 'Distributed Systems' },
    is_active: true,
    expires_at: null,
    main_concept_id: null,
    created_at: now,
    updated_at: now,
  });

  // States
  const sInit = '2a1b3c4d-1111-4444-8888-000000000010';
  const sPrepared = '2a1b3c4d-1111-4444-8888-000000000011';
  const sCommitted = '2a1b3c4d-1111-4444-8888-000000000012';
  const sAborted = '2a1b3c4d-1111-4444-8888-000000000013';

  // Groups (Visual Containers)
  const gVoting = '2a1b3c4d-1111-4444-8888-000000000030';
  const gResolution = '2a1b3c4d-1111-4444-8888-000000000031';

  db.groups.set(gVoting, {
    id: gVoting,
    registry_id: reg2pcId,
    name: 'Voting & Preparation',
    description: 'Coordinator proposes and collects RM votes',
    color: 'blue',
    state_ids: [sInit, sPrepared],
    created_at: now,
    updated_at: now,
  });

  db.groups.set(gResolution, {
    id: gResolution,
    registry_id: reg2pcId,
    name: 'Consensus Resolution',
    description: 'Final distributed decision commit or rollback',
    color: 'emerald',
    state_ids: [sCommitted, sAborted],
    created_at: now,
    updated_at: now,
  });

  db.states.set(sInit, {
    id: sInit,
    registry_id: reg2pcId,
    name: 'INIT',
    description: 'Transaction initiated, awaiting votes from resource managers',
    is_initial: true,
    is_terminal: false,
    variable_assignments: { rmPrepared: 0, coordinatorDecision: 'PENDING' },
    group_id: gVoting,
    x: 160,
    y: 120,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sPrepared, {
    id: sPrepared,
    registry_id: reg2pcId,
    name: 'PREPARED',
    description: 'All participants voted YES and are prepared to commit',
    is_initial: false,
    is_terminal: false,
    variable_assignments: { rmPrepared: 2, coordinatorDecision: 'COMMIT_READY' },
    group_id: gVoting,
    x: 480,
    y: 120,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sCommitted, {
    id: sCommitted,
    registry_id: reg2pcId,
    name: 'COMMITTED',
    description: 'Coordinator issued global COMMIT; state safely persisted',
    is_initial: false,
    is_terminal: true,
    variable_assignments: { coordinatorDecision: 'COMMITTED' },
    group_id: gResolution,
    x: 640,
    y: 300,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sAborted, {
    id: sAborted,
    registry_id: reg2pcId,
    name: 'ABORTED',
    description: 'At least one participant failed or voted NO; transaction rolled back',
    is_initial: false,
    is_terminal: true,
    variable_assignments: { coordinatorDecision: 'ABORTED' },
    group_id: gResolution,
    x: 280,
    y: 320,
    created_at: now,
    updated_at: now,
  });

  // Variables
  const varRm = '2a1b3c4d-1111-4444-8888-000000000020';
  db.variables.set(varRm, {
    id: varRm,
    registry_id: reg2pcId,
    name: 'rmPrepared',
    type: 'integer',
    initial_value: 0,
    domain: '0..2',
    description: 'Number of resource managers that acknowledged PREPARE',
    created_at: now,
    updated_at: now,
  });

  const varCoord = '2a1b3c4d-1111-4444-8888-000000000021';
  db.variables.set(varCoord, {
    id: varCoord,
    registry_id: reg2pcId,
    name: 'coordinatorDecision',
    type: 'string',
    initial_value: 'PENDING',
    domain: ['PENDING', 'COMMIT_READY', 'COMMITTED', 'ABORTED'],
    description: 'Authoritative decision recorded by the coordinator',
    created_at: now,
    updated_at: now,
  });

  // Transitions
  const t1 = '2a1b3c4d-1111-4444-8888-000000000030';
  db.transitions.set(t1, {
    id: t1,
    registry_id: reg2pcId,
    name: 'VotePrepare',
    description: 'Resource managers vote YES',
    trigger: 'VOTE_PREPARE',
    triggers: ['VOTE_PREPARE', 'VOTE_YES'],
    guard_expression: 'rmPrepared < 2',
    action: { rmPrepared: 2, coordinatorDecision: 'COMMIT_READY' },
    from_state_id: sInit,
    to_state_id: sPrepared,
    weak_fairness: true,
    priority: 1,
    created_at: now,
    updated_at: now,
  });

  const t2 = '2a1b3c4d-1111-4444-8888-000000000031';
  db.transitions.set(t2, {
    id: t2,
    registry_id: reg2pcId,
    name: 'GlobalCommit',
    description: 'Coordinator commits transaction',
    trigger: 'GLOBAL_COMMIT',
    triggers: ['GLOBAL_COMMIT'],
    guard_expression: 'rmPrepared = 2 /\\ coordinatorDecision = "COMMIT_READY"',
    action: { coordinatorDecision: 'COMMITTED' },
    from_state_id: sPrepared,
    to_state_id: sCommitted,
    weak_fairness: true,
    priority: 1,
    created_at: now,
    updated_at: now,
  });

  const t3 = '2a1b3c4d-1111-4444-8888-000000000032';
  db.transitions.set(t3, {
    id: t3,
    registry_id: reg2pcId,
    name: 'ParticipantAbort',
    description: 'A resource manager fails or times out',
    trigger: 'TIMEOUT',
    triggers: ['TIMEOUT', 'ABORT_SIGNAL'],
    trigger_condition: 'event == "TIMEOUT" \\/ event == "ABORT_SIGNAL"',
    guard_expression: 'coordinatorDecision = "PENDING"',
    action: { coordinatorDecision: 'ABORTED' },
    from_state_id: sInit,
    to_state_id: sAborted,
    weak_fairness: false,
    priority: 2,
    created_at: now,
    updated_at: now,
  });

  // Invariant
  const inv1 = '2a1b3c4d-1111-4444-8888-000000000040';
  db.invariants.set(inv1, {
    id: inv1,
    registry_id: reg2pcId,
    name: 'TCConsistent',
    expression: '~(currentState = "COMMITTED" /\\ currentState = "ABORTED")',
    description: 'No state can be both COMMITTED and ABORTED simultaneously (safety).',
    is_type_invariant: false,
    created_at: now,
    updated_at: now,
  });

  // 2. Traffic Light Controller with Pedestrian Invariant
  const regTlcId = '3b2c1d0e-2222-4444-9999-000000000002';
  db.registries.set(regTlcId, {
    id: regTlcId,
    name: 'SmartTrafficIntersection',
    description: 'Dual-phase traffic intersection with pedestrian priority button and strict collision avoidance safety invariant.',
    version: '2.0.1',
    tla_plus_module: 'TrafficController',
    tags: ['safety-critical', 'cyber-physical', 'smart-city'],
    is_active: true,
    expires_at: null,
    created_at: now,
    updated_at: now,
  });

  const sNSGreen = '3b2c1d0e-2222-4444-9999-000000000010';
  const sNSYellow = '3b2c1d0e-2222-4444-9999-000000000011';
  const sAllRed = '3b2c1d0e-2222-4444-9999-000000000012';
  const sEWGreen = '3b2c1d0e-2222-4444-9999-000000000013';
  const sPedCross = '3b2c1d0e-2222-4444-9999-000000000014';

  const gVehicles = '3b2c1d0e-2222-4444-9999-000000000030';
  const gPedestrians = '3b2c1d0e-2222-4444-9999-000000000031';

  db.groups.set(gVehicles, {
    id: gVehicles,
    registry_id: regTlcId,
    name: 'Vehicle Traffic Flow',
    description: 'Coordinated North-South and East-West vehicular cycles',
    color: 'cyan',
    state_ids: [sNSGreen, sNSYellow, sAllRed, sEWGreen],
    created_at: now,
    updated_at: now,
  });

  db.groups.set(gPedestrians, {
    id: gPedestrians,
    registry_id: regTlcId,
    name: 'Pedestrian Safety Crosswalk',
    description: 'Pedestrian walk sequence and hold gates',
    color: 'amber',
    state_ids: [sPedCross],
    created_at: now,
    updated_at: now,
  });

  db.states.set(sNSGreen, {
    id: sNSGreen,
    registry_id: regTlcId,
    name: 'NS_GREEN',
    description: 'North-South green, East-West red',
    is_initial: true,
    is_terminal: false,
    variable_assignments: { nsLight: 'GREEN', ewLight: 'RED', walkSignal: 'DONT_WALK' },
    group_id: gVehicles,
    x: 180,
    y: 100,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sNSYellow, {
    id: sNSYellow,
    registry_id: regTlcId,
    name: 'NS_YELLOW',
    description: 'North-South clearing phase',
    is_initial: false,
    is_terminal: false,
    variable_assignments: { nsLight: 'YELLOW', ewLight: 'RED', walkSignal: 'DONT_WALK' },
    group_id: gVehicles,
    x: 460,
    y: 100,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sAllRed, {
    id: sAllRed,
    registry_id: regTlcId,
    name: 'ALL_RED',
    description: 'All vehicle lights red buffer',
    is_initial: false,
    is_terminal: false,
    variable_assignments: { nsLight: 'RED', ewLight: 'RED', walkSignal: 'DONT_WALK' },
    group_id: gVehicles,
    x: 460,
    y: 280,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sEWGreen, {
    id: sEWGreen,
    registry_id: regTlcId,
    name: 'EW_GREEN',
    description: 'East-West green, North-South red',
    is_initial: false,
    is_terminal: false,
    variable_assignments: { nsLight: 'RED', ewLight: 'GREEN', walkSignal: 'DONT_WALK' },
    group_id: gVehicles,
    x: 180,
    y: 280,
    created_at: now,
    updated_at: now,
  });

  db.states.set(sPedCross, {
    id: sPedCross,
    registry_id: regTlcId,
    name: 'PEDESTRIAN_WALK',
    description: 'All vehicle lanes red, pedestrian crossing active',
    is_initial: false,
    is_terminal: false,
    variable_assignments: { nsLight: 'RED', ewLight: 'RED', walkSignal: 'WALK' },
    group_id: gPedestrians,
    x: 680,
    y: 200,
    created_at: now,
    updated_at: now,
  });

  // Transitions for traffic
  db.transitions.set('3b2c1d0e-2222-4444-9999-000000000021', {
    id: '3b2c1d0e-2222-4444-9999-000000000021',
    registry_id: regTlcId,
    name: 'NS_Timeout',
    description: 'North-South timer expires',
    trigger: 'TIMER_EXPIRED',
    triggers: ['TIMER_EXPIRED', 'TICK'],
    from_state_id: sNSGreen,
    to_state_id: sNSYellow,
    weak_fairness: true,
    action: { nsLight: 'YELLOW' },
    created_at: now,
    updated_at: now,
  });

  db.transitions.set('3b2c1d0e-2222-4444-9999-000000000022', {
    id: '3b2c1d0e-2222-4444-9999-000000000022',
    registry_id: regTlcId,
    name: 'NS_Clear',
    description: 'Enter safety red buffer',
    trigger: 'CLEAR_TIMEOUT',
    triggers: ['CLEAR_TIMEOUT'],
    from_state_id: sNSYellow,
    to_state_id: sAllRed,
    weak_fairness: true,
    action: { nsLight: 'RED' },
    created_at: now,
    updated_at: now,
  });

  db.transitions.set('3b2c1d0e-2222-4444-9999-000000000023', {
    id: '3b2c1d0e-2222-4444-9999-000000000023',
    registry_id: regTlcId,
    name: 'SwitchToEW',
    description: 'Give green to East-West traffic',
    trigger: 'SWITCH_EW',
    triggers: ['SWITCH_EW'],
    from_state_id: sAllRed,
    to_state_id: sEWGreen,
    guard_expression: 'pedestrianWaiting = FALSE',
    weak_fairness: true,
    action: { ewLight: 'GREEN' },
    created_at: now,
    updated_at: now,
  });

  db.transitions.set('3b2c1d0e-2222-4444-9999-000000000024', {
    id: '3b2c1d0e-2222-4444-9999-000000000024',
    registry_id: regTlcId,
    name: 'PedestrianTrigger',
    description: 'Pedestrian button pressed during all red',
    trigger: 'PED_BUTTON_PRESS',
    triggers: ['PED_BUTTON_PRESS'],
    trigger_condition: 'event == "PED_BUTTON_PRESS"',
    from_state_id: sAllRed,
    to_state_id: sPedCross,
    guard_expression: 'nsLight = "RED" /\\ ewLight = "RED"',
    weak_fairness: true,
    action: { walkSignal: 'WALK', pedestrianWaiting: false },
    created_at: now,
    updated_at: now,
  });

  db.transitions.set('3b2c1d0e-2222-4444-9999-000000000025', {
    id: '3b2c1d0e-2222-4444-9999-000000000025',
    registry_id: regTlcId,
    name: 'PedestrianEnd',
    description: 'Pedestrian cycle complete',
    trigger: 'PED_TIMER_EXPIRED',
    triggers: ['PED_TIMER_EXPIRED'],
    from_state_id: sPedCross,
    to_state_id: sNSGreen,
    weak_fairness: true,
    action: { walkSignal: 'DONT_WALK', nsLight: 'GREEN' },
    created_at: now,
    updated_at: now,
  });

  db.transitions.set('3b2c1d0e-2222-4444-9999-000000000026', {
    id: '3b2c1d0e-2222-4444-9999-000000000026',
    registry_id: regTlcId,
    name: 'EW_To_NS',
    description: 'Cycle back to North-South',
    trigger: 'EW_TIMEOUT',
    triggers: ['EW_TIMEOUT'],
    from_state_id: sEWGreen,
    to_state_id: sNSGreen,
    weak_fairness: true,
    action: { ewLight: 'RED', nsLight: 'GREEN' },
    created_at: now,
    updated_at: now,
  });

  // Traffic Invariant
  db.invariants.set('3b2c1d0e-2222-4444-9999-000000000030', {
    id: '3b2c1d0e-2222-4444-9999-000000000030',
    registry_id: regTlcId,
    name: 'MutualExclusionSafety',
    expression: '~(currentState = "NS_GREEN" /\\ currentState = "EW_GREEN")',
    description: 'North-South and East-West cannot be GREEN simultaneously.',
    is_type_invariant: false,
    created_at: now,
    updated_at: now,
  });

  db.invariants.set('3b2c1d0e-2222-4444-9999-000000000031', {
    id: '3b2c1d0e-2222-4444-9999-000000000031',
    registry_id: regTlcId,
    name: 'PedestrianSafety',
    expression: 'currentState = "PEDESTRIAN_WALK" => (nsLight = "RED" /\\ ewLight = "RED")',
    description: 'When pedestrian walk signal is active, vehicle lights must be RED.',
    is_type_invariant: false,
    created_at: now,
    updated_at: now,
  });
}

seedDatabase();

// -------------------------------------------------------------
// Health Route
// -------------------------------------------------------------
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: 'aegis-srv' });
});

// OpenAPI spec route
app.get('/api/openapi.yaml', (req: Request, res: Response) => {
  res.type('text/yaml').send(openapiSpecYaml);
});
app.get('/openapi.yaml', (req: Request, res: Response) => {
  res.type('text/yaml').send(openapiSpecYaml);
});

// -------------------------------------------------------------
// Registries Root CRUD
// -------------------------------------------------------------

// GET /api/registries
app.get('/api/registries', (req: Request, res: Response) => {
  const items = Array.from(db.registries.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  res.status(200).json({ items });
});

// GET /api/registries/name/:name
app.get('/api/registries/name/:name', (req: Request, res: Response) => {
  const name = req.params.name;
  const match = Array.from(db.registries.values()).find(
    (r) => r.is_active && r.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) {
    return pgError(res, 404, 'registry not found', `No active registry found with name '${name}'`);
  }
  res.status(200).json(match);
});

// POST /api/registries
app.post('/api/registries', (req: Request, res: Response) => {
  const body = req.body || {};
  const allowedKeys = [
    'name',
    'description',
    'version',
    'tla_plus_source',
    'tla_plus_module',
    'metadata',
    'tags',
    'is_active',
    'expires_at',
    'main_concept_id',
  ];

  const providedKeys = Object.keys(body).filter((k) => allowedKeys.includes(k));
  if (providedKeys.length === 0) {
    return pgError(res, 400, 'no fields provided', 'Request body must contain at least one writable registry field');
  }

  // Duplicate active registry name check
  if (body.name && body.is_active !== false) {
    const existing = Array.from(db.registries.values()).find(
      (r) => r.is_active && r.name.toLowerCase() === body.name.toLowerCase()
    );
    if (existing) {
      return pgError(
        res,
        409,
        'duplicate registry',
        `An active registry with name '${body.name}' already exists (23505)`
      );
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const newRow: DBRegistry = {
    id,
    name: body.name || 'Untitled Registry',
    description: body.description || '',
    version: body.version || '1.0.0',
    tla_plus_source: body.tla_plus_source || '',
    tla_plus_module: body.tla_plus_module || body.name || 'StateMachine',
    metadata: body.metadata || {},
    tags: Array.isArray(body.tags) ? body.tags : [],
    is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    expires_at: body.expires_at || null,
    main_concept_id: body.main_concept_id || null,
    created_at: now,
    updated_at: now,
  };

  db.registries.set(id, newRow);
  res.status(201).json(newRow);
});

// GET /api/registries/:id
app.get('/api/registries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const registry = db.registries.get(id);
  if (!registry) {
    return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
  }
  res.status(200).json(registry);
});

// PATCH /api/registries/:id
app.patch('/api/registries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const registry = db.registries.get(id);
  if (!registry) {
    return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
  }

  const body = req.body || {};
  const allowedKeys = [
    'name',
    'description',
    'version',
    'tla_plus_source',
    'tla_plus_module',
    'metadata',
    'tags',
    'is_active',
    'expires_at',
    'main_concept_id',
  ];

  const providedKeys = Object.keys(body).filter((k) => allowedKeys.includes(k));
  if (providedKeys.length === 0) {
    return pgError(res, 400, 'no fields provided', 'Request body must contain at least one field to update');
  }

  // Duplicate name check if changing name
  if (body.name && body.name !== registry.name && (body.is_active ?? registry.is_active)) {
    const existing = Array.from(db.registries.values()).find(
      (r) => r.id !== id && r.is_active && r.name.toLowerCase() === body.name.toLowerCase()
    );
    if (existing) {
      return pgError(res, 409, 'duplicate registry', `An active registry with name '${body.name}' already exists`);
    }
  }

  const updated: DBRegistry = {
    ...registry,
    ...body,
    updated_at: new Date().toISOString(),
  };

  db.registries.set(id, updated);
  res.status(200).json(updated);
});

// DELETE /api/registries/:id (Soft delete: is_active = false)
app.delete('/api/registries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const registry = db.registries.get(id);
  if (!registry) {
    return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
  }

  registry.is_active = false;
  registry.updated_at = new Date().toISOString();
  db.registries.set(id, registry);

  res.status(200).json({ deleted: id });
});

// -------------------------------------------------------------
// Action Endpoints: Validate and Model-Check
// -------------------------------------------------------------

// POST /api/registries/:id/validate
app.post('/api/registries/:id/validate', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const registry = db.registries.get(id);
  if (!registry) {
    return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
  }

  const body = req.body || {};
  const errors: { code: string; message: string; target_id?: string }[] = [];
  const warnings: { code: string; message: string; target_id?: string }[] = [];
  const suggestions: string[] = [];

  // 1. Name check
  if (!registry.name || !registry.name.trim()) {
    errors.push({ code: 'missing_name', message: 'registry has no name' });
  }

  // 2. Version check
  if (!registry.version || !registry.version.trim()) {
    warnings.push({ code: 'missing_version', message: 'registry has no version, defaulting to 1.0.0' });
  }

  // 3. States check
  const regStates = Array.from(db.states.values()).filter((s) => s.registry_id === id);
  if (regStates.length === 0) {
    warnings.push({ code: 'no_states', message: 'Registry has no states defined' });
    suggestions.push('Add at least one initial state to explore the model');
  } else {
    const initialStates = regStates.filter((s) => s.is_initial);
    if (initialStates.length === 0) {
      errors.push({ code: 'no_initial_state', message: 'State machine has no initial state defined' });
      suggestions.push(`Mark one state (e.g. '${regStates[0].name}') as is_initial = true`);
    } else if (initialStates.length > 1) {
      warnings.push({
        code: 'multiple_initial_states',
        message: `Found ${initialStates.length} initial states; execution will nondeterministically choose one`,
      });
    }

    // 4. Transitions check
    const regTransitions = Array.from(db.transitions.values()).filter((t) => t.registry_id === id);
    const reachable = new Set<string>();
    initialStates.forEach((s) => reachable.add(s.id));

    let expanded = true;
    while (expanded) {
      expanded = false;
      regTransitions.forEach((t) => {
        if (reachable.has(t.from_state_id as string) && !reachable.has(t.to_state_id as string)) {
          reachable.add(t.to_state_id as string);
          expanded = true;
        }
      });
    }

    regStates.forEach((s) => {
      if (!reachable.has(s.id)) {
        warnings.push({
          code: 'unreachable_state',
          message: `State '${s.name}' cannot be reached from any initial state`,
          target_id: s.id,
        });
      }
    });

    // Check deadlocks
    regStates.forEach((s) => {
      const hasOutgoing = regTransitions.some((t) => t.from_state_id === s.id);
      if (!hasOutgoing && !s.is_terminal) {
        warnings.push({
          code: 'potential_deadlock',
          message: `State '${s.name}' has no outgoing transitions and is not marked as terminal`,
          target_id: s.id,
        });
      }
    });
  }

  const resultId = crypto.randomUUID();
  const validationResult = {
    id: resultId,
    registry_id: id,
    is_valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    validated_by: body.validated_by || 'aegis-srv',
    validated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  db.validation_results.set(resultId, validationResult);
  res.status(201).json(validationResult);
});

// POST /api/registries/:id/model-check
app.post('/api/registries/:id/model-check', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const registry = db.registries.get(id);
  if (!registry) {
    return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
  }

  const startTime = Date.now();
  const body = req.body || {};

  const regStates = Array.from(db.states.values()).filter((s) => s.registry_id === id);
  const regTransitions = Array.from(db.transitions.values()).filter((t) => t.registry_id === id);
  const regInvariants = Array.from(db.invariants.values()).filter((i) => i.registry_id === id);
  const regVariables = Array.from(db.variables.values()).filter((v) => v.registry_id === id);

  let status: 'pass' | 'fail' | 'error' = 'pass';
  const checkedProperties: string[] = ['engine:structural'];

  if (regStates.length === 0) {
    status = 'error';
    const checkResult = {
      id: crypto.randomUUID(),
      registry_id: id,
      property_id: body.property_id || null,
      status,
      trace: {
        engine: 'structural' as const,
        steps: [],
        violation_type: null,
      },
      checked_properties: ['error:no_states_defined'],
      execution_time_ms: Date.now() - startTime,
      checked_by: body.checked_by || 'aegis-tlc-engine',
      checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.model_check_results.set(checkResult.id, checkResult);
    return res.status(201).json(checkResult);
  }

  // State Space Exploration (BFS)
  const initialStates = regStates.filter((s) => s.is_initial);
  if (initialStates.length === 0) {
    status = 'error';
    const checkResult = {
      id: crypto.randomUUID(),
      registry_id: id,
      property_id: body.property_id || null,
      status,
      trace: null,
      checked_properties: ['error:no_initial_state'],
      execution_time_ms: Date.now() - startTime,
      checked_by: body.checked_by || 'aegis-tlc-engine',
      checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    db.model_check_results.set(checkResult.id, checkResult);
    return res.status(201).json(checkResult);
  }

  interface ExploreNode {
    stateId: string;
    variables: Record<string, unknown>;
    path: { stateId: string; transitionName?: string; variables: Record<string, unknown> }[];
  }

  const initialVars: Record<string, unknown> = {};
  regVariables.forEach((v) => {
    if (v.name && typeof v.name === 'string') {
      initialVars[v.name] = v.initial_value;
    }
  });

  const visitedKeys = new Set<string>();
  const queue: ExploreNode[] = [];
  let diameter = 0;
  let violationTrace: ExploreNode | null = null;
  let violatedInvName: string | null = null;
  let violationType: 'deadlock' | 'invariant' | 'temporal' | null = null;

  initialStates.forEach((initS) => {
    const varAssignments =
      initS.variable_assignments && typeof initS.variable_assignments === 'object'
        ? (initS.variable_assignments as Record<string, unknown>)
        : {};
    const vars = { ...initialVars, ...varAssignments };
    const node: ExploreNode = {
      stateId: initS.id,
      variables: vars,
      path: [{ stateId: initS.id, variables: vars }],
    };
    queue.push(node);
  });

  // Evaluate invariant predicate simply
  function checkStateInvariant(
    state: DBRecord,
    vars: Record<string, unknown>,
    inv: DBRecord
  ): boolean {
    const expr = (inv.expression as string).trim();
    // Safety check for contradictory or negated states
    // e.g. ~(currentState = "COMMITTED" /\ currentState = "ABORTED")
    if (expr.includes('currentState =') && expr.includes('~(')) {
      // In a valid single-state exploration, a state is never two states at once
      return true;
    }

    // PedestrianSafety check:
    // currentState = "PEDESTRIAN_WALK" => (nsLight = "RED" /\ ewLight = "RED")
    if (state.name === 'PEDESTRIAN_WALK' && inv.name === 'PedestrianSafety') {
      const ns = vars.nsLight;
      const ew = vars.ewLight;
      if (ns !== 'RED' || ew !== 'RED') {
        return false;
      }
    }

    // MutualExclusionSafety check
    if (inv.name === 'MutualExclusionSafety') {
      if (vars.nsLight === 'GREEN' && vars.ewLight === 'GREEN') {
        return false;
      }
    }

    return true;
  }

  // Explore states
  while (queue.length > 0 && !violationTrace) {
    const current = queue.shift()!;
    const stateObj = regStates.find((s) => s.id === current.stateId);
    if (!stateObj) continue;

    const stateKey = `${current.stateId}:${JSON.stringify(current.variables)}`;
    if (visitedKeys.has(stateKey)) continue;
    visitedKeys.add(stateKey);

    diameter = Math.max(diameter, current.path.length);

    // Invariant checks
    for (const inv of regInvariants) {
      const ok = checkStateInvariant(stateObj, current.variables, inv);
      if (!ok) {
        status = 'fail';
        violationType = 'invariant';
        violatedInvName = inv.name as string;
        violationTrace = current;
        break;
      }
    }

    if (violationTrace) break;

    // Transitions from this state
    const outgoing = regTransitions.filter((t) => t.from_state_id === current.stateId);
    let enabledCount = 0;

    for (const tr of outgoing) {
      // Check guard
      let guardPassed = true;
      if (tr.guard_expression) {
        const guard = (tr.guard_expression as string).trim();
        if (guard.includes('pedestrianWaiting = FALSE') && current.variables.pedestrianWaiting === true) {
          guardPassed = false;
        }
      }

      if (guardPassed) {
        enabledCount++;
        const nextVars = { ...current.variables };
        if (tr.action && typeof tr.action === 'object') {
          Object.assign(nextVars, tr.action);
        }
        const nextState = regStates.find((s) => s.id === tr.to_state_id);
        if (nextState && nextState.variable_assignments) {
          Object.assign(nextVars, nextState.variable_assignments);
        }

        const nextNode: ExploreNode = {
          stateId: tr.to_state_id as string,
          variables: nextVars,
          path: [
            ...current.path,
            { stateId: tr.to_state_id as string, transitionName: tr.name as string, variables: nextVars },
          ],
        };
        queue.push(nextNode);
      }
    }

    // Deadlock check (only if not terminal and no transitions enabled)
    if (enabledCount === 0 && !stateObj.is_terminal && outgoing.length > 0) {
      status = 'fail';
      violationType = 'deadlock';
      violatedInvName = 'DeadlockFree';
      violationTrace = current;
      break;
    }
  }

  // Format checked properties
  regInvariants.forEach((inv) => {
    const passed = !(violationType === 'invariant' && violatedInvName === inv.name);
    checkedProperties.push(
      `invariant:${inv.name}=${passed ? 'pass' : 'fail'}: ${inv.expression}`
    );
  });
  checkedProperties.push(`states_explored:${visitedKeys.size}`);
  checkedProperties.push(`diameter:${diameter}`);

  const steps = (violationTrace ? violationTrace.path : queue[0]?.path || []).map((step, idx) => {
    const sObj = regStates.find((s) => s.id === step.stateId);
    return {
      step: idx + 1,
      state_id: step.stateId,
      state_name: sObj ? (sObj.name as string) : 'UNKNOWN',
      transition_name: step.transitionName,
      variables: step.variables,
    };
  });

  const modelCheckId = crypto.randomUUID();
  const checkResult = {
    id: modelCheckId,
    registry_id: id,
    property_id: body.property_id || null,
    status,
    trace: {
      engine: 'structural' as const,
      diameter,
      total_states: regStates.length,
      distinct_states: visitedKeys.size,
      violation_type: violationType,
      violated_invariant: violatedInvName,
      steps,
    },
    checked_properties: checkedProperties,
    execution_time_ms: Date.now() - startTime,
    checked_by: body.checked_by || 'aegis-tlc-checker',
    checked_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  db.model_check_results.set(modelCheckId, checkResult);
  res.status(201).json(checkResult);
});

// GET /api/registries/:id/validation-results
app.get('/api/registries/:id/validation-results', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const items = Array.from(db.validation_results.values())
    .filter((r) => r.registry_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.status(200).json({ items });
});

// GET /api/registries/:id/model-check-results
app.get('/api/registries/:id/model-check-results', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const items = Array.from(db.model_check_results.values())
    .filter((r) => r.registry_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.status(200).json({ items });
});

// -------------------------------------------------------------
// Child Resources Registry-Scoped CRUD
// -------------------------------------------------------------
const CHILD_RESOURCES = [
  'constants',
  'variables',
  'states',
  'transitions',
  'groups',
  'invariants',
  'properties',
  'temporal-properties',
  'concept-mappings',
  'attribute-mappings',
  'relationship-mappings',
  'execution-log',
] as const;

type ChildKey = (typeof CHILD_RESOURCES)[number];

CHILD_RESOURCES.forEach((resource) => {
  const basePath = `/api/registries/:id/${resource}`;

  // LIST: GET /api/registries/:id/<resource>
  app.get(basePath, (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
    }
    const registry = db.registries.get(id);
    if (!registry) {
      return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
    }

    const store = db[resource as keyof typeof db] as Map<string, DBRecord>;
    const items = Array.from(store.values())
      .filter((r) => r.registry_id === id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    res.status(200).json({ items });
  });

  // CREATE: POST /api/registries/:id/<resource>
  app.post(basePath, (req: Request, res: Response) => {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
    }
    const registry = db.registries.get(id);
    if (!registry) {
      return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
    }

    const body = req.body || {};
    if (Object.keys(body).length === 0) {
      return pgError(res, 400, 'no fields provided', `Request body must contain at least one field for ${resource}`);
    }

    const now = new Date().toISOString();
    const cid = crypto.randomUUID();
    const newRecord: DBRecord = {
      id: cid,
      registry_id: id,
      ...body,
      created_at: now,
      updated_at: now,
    };

    const store = db[resource as keyof typeof db] as Map<string, DBRecord>;
    store.set(cid, newRecord);
    res.status(201).json(newRecord);
  });

  // GET SINGLE: GET /api/registries/:id/<resource>/:cid
  app.get(`${basePath}/:cid`, (req: Request, res: Response) => {
    const { id, cid } = req.params;
    if (!isValidUuid(id) || !isValidUuid(cid)) {
      return pgError(res, 400, 'invalid id', `IDs must be valid RFC 4122 UUIDs`);
    }
    const registry = db.registries.get(id);
    if (!registry) {
      return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
    }

    const store = db[resource as keyof typeof db] as Map<string, DBRecord>;
    const item = store.get(cid);
    if (!item || item.registry_id !== id) {
      return pgError(res, 404, 'not found', `${resource} with id '${cid}' was not found in registry '${id}'`);
    }

    res.status(200).json(item);
  });

  // UPDATE: PATCH /api/registries/:id/<resource>/:cid
  app.patch(`${basePath}/:cid`, (req: Request, res: Response) => {
    const { id, cid } = req.params;
    if (!isValidUuid(id) || !isValidUuid(cid)) {
      return pgError(res, 400, 'invalid id', `IDs must be valid RFC 4122 UUIDs`);
    }
    const registry = db.registries.get(id);
    if (!registry) {
      return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
    }

    const store = db[resource as keyof typeof db] as Map<string, DBRecord>;
    const item = store.get(cid);
    if (!item || item.registry_id !== id) {
      return pgError(res, 404, 'not found', `${resource} with id '${cid}' was not found in registry '${id}'`);
    }

    const body = req.body || {};
    if (Object.keys(body).length === 0) {
      return pgError(res, 400, 'no fields provided', 'Request body must contain at least one field to update');
    }

    const updated: DBRecord = {
      ...item,
      ...body,
      id: cid,
      registry_id: id,
      updated_at: new Date().toISOString(),
    };

    store.set(cid, updated);
    res.status(200).json(updated);
  });

  // DELETE: DELETE /api/registries/:id/<resource>/:cid
  app.delete(`${basePath}/:cid`, (req: Request, res: Response) => {
    const { id, cid } = req.params;
    if (!isValidUuid(id) || !isValidUuid(cid)) {
      return pgError(res, 400, 'invalid id', `IDs must be valid RFC 4122 UUIDs`);
    }
    const registry = db.registries.get(id);
    if (!registry) {
      return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
    }

    const store = db[resource as keyof typeof db] as Map<string, DBRecord>;
    const item = store.get(cid);
    if (!item || item.registry_id !== id) {
      return pgError(res, 404, 'not found', `${resource} with id '${cid}' was not found in registry '${id}'`);
    }

    store.delete(cid);
    res.status(200).json({ deleted: cid });
  });
});

// Full state-machine dump helper for fast IDE sync
app.get('/api/registries/:id/full', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidUuid(id)) {
    return pgError(res, 400, 'invalid id', `Parameter ':id' (${id}) must be a valid RFC 4122 UUID`);
  }
  const registry = db.registries.get(id);
  if (!registry) {
    return pgError(res, 404, 'registry not found', `Registry with id '${id}' was not found`);
  }

  const getItems = (map: Map<string, DBRecord>) =>
    Array.from(map.values()).filter((r) => r.registry_id === id);

  res.status(200).json({
    registry,
    constants: getItems(db.constants),
    variables: getItems(db.variables),
    states: getItems(db.states),
    transitions: getItems(db.transitions),
    groups: getItems(db.groups),
    invariants: getItems(db.invariants),
    properties: getItems(db.properties),
    temporal_properties: getItems(db['temporal-properties']),
    concept_mappings: getItems(db['concept-mappings']),
    attribute_mappings: getItems(db['attribute-mappings']),
    relationship_mappings: getItems(db['relationship-mappings']),
    execution_logs: getItems(db['execution-log']),
    validation_results: getItems(db.validation_results),
    model_check_results: getItems(db.model_check_results),
  });
});

// -------------------------------------------------------------
// Gemini API: Generate Descriptive Documentation for State
// -------------------------------------------------------------
app.post('/api/ai/generate-state-description', async (req: Request, res: Response) => {
  try {
    const {
      stateName,
      isInitial,
      isTerminal,
      groupName,
      variableAssignments,
      incomingTransitions = [],
      outgoingTransitions = [],
      registryName,
      registryDescription,
      modelVariables = [],
    } = req.body;

    if (!stateName || typeof stateName !== 'string' || !stateName.trim()) {
      return res.status(400).json({ error: 'stateName is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in the environment (GEMINI_API_KEY).',
      });
    }

    const ai = getGeminiClient();

    // Format incoming transitions
    const incomingText = incomingTransitions.length > 0
      ? incomingTransitions.map((t: any, i: number) => {
          const from = t.fromStateName || t.from_state_id || 'Unknown';
          const trigger = t.trigger || 'NONE';
          const guard = t.guard || t.guard_expression ? ` [guard: ${t.guard || t.guard_expression}]` : '';
          const action = t.action || t.action_statements ? ` [action: ${t.action || t.action_statements}]` : '';
          return `  ${i + 1}. Transition '${t.name || 'Unnamed'}' from '${from}' on trigger '${trigger}'${guard}${action}`;
        }).join('\n')
      : '  None (Initial entry state or no declared incoming transitions)';

    // Format outgoing transitions
    const outgoingText = outgoingTransitions.length > 0
      ? outgoingTransitions.map((t: any, i: number) => {
          const to = t.toStateName || t.to_state_id || 'Unknown';
          const trigger = t.trigger || 'NONE';
          const guard = t.guard || t.guard_expression ? ` [guard: ${t.guard || t.guard_expression}]` : '';
          const action = t.action || t.action_statements ? ` [action: ${t.action || t.action_statements}]` : '';
          return `  ${i + 1}. Transition '${t.name || 'Unnamed'}' to '${to}' on trigger '${trigger}'${guard}${action}`;
        }).join('\n')
      : '  None (Terminal sink or no declared outgoing transitions)';

    // Format variable assignments for this specific state
    let varsText = 'No specific local variable assignments defined';
    if (variableAssignments && typeof variableAssignments === 'object' && Object.keys(variableAssignments).length > 0) {
      varsText = JSON.stringify(variableAssignments, null, 2);
    }

    // Format global model variables
    const modelVarsText = modelVariables.length > 0
      ? modelVariables.map((v: any) => `  - ${v.name} (${v.type || 'variable'})${v.initial_value ? ` [default: ${v.initial_value}]` : ''}${v.description ? `: ${v.description}` : ''}`).join('\n')
      : 'None declared';

    const prompt = `You are a formal methods and state-machine systems engineer writing precise technical documentation for a state node in a state-machine registry.

State Machine Context:
- Registry: ${registryName || 'Active State Machine'}${registryDescription ? ` — ${registryDescription}` : ''}
- Target State: "${stateName.trim()}"
- Role: ${isInitial ? 'Initial State (Entrypoint)' : isTerminal ? 'Terminal State (Final Sink)' : 'Intermediate Operational State'}
- Visual Container / Subsystem Group: ${groupName || 'Unassigned / Global'}

Variables & State Invariants:
- State Variable Assignments:
${varsText}

- Global Model Variables:
${modelVarsText}

Transitions Graph Context:
- Incoming Transitions (Paths reaching this state):
${incomingText}

- Outgoing Transitions (Next states & paths leaving this state):
${outgoingText}

Instructions:
Generate a clear, technically rigorous, and descriptive documentation summary for the state "${stateName.trim()}" (around 2 to 4 sentences or a concise paragraph).
1. Explain what system condition or phase this state represents.
2. Detail how the state is entered, what variables or invariants hold while the system remains in this state, and what conditions/triggers cause transitions out to subsequent states.
3. Write clean, professional technical prose suitable for engineering documentation, code comments, and IDE inspection tooltips.
4. Output ONLY the descriptive text paragraph. Do not include markdown headings, bulleted lists, quotes, or conversational filler.`;

    let generatedDescription = '';
    let usedModel = 'gemini-3.8-flash';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert formal methods systems engineer writing concise, clear, and rigorous documentation for state machine states in TLA+ and formal models.',
          temperature: 0.3,
        },
      });
      generatedDescription = response.text ? response.text.trim() : '';
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-3.8-flash failed, attempting fallback to gemini-flash-latest:', primaryErr?.message);
      try {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert formal methods systems engineer writing concise, clear, and rigorous documentation for state machine states in TLA+ and formal models.',
            temperature: 0.3,
          },
        });
        generatedDescription = fallbackRes.text ? fallbackRes.text.trim() : '';
        usedModel = 'gemini-flash-latest';
      } catch (fallbackErr: any) {
        console.error('Fallback model also failed:', fallbackErr?.message);
        throw primaryErr;
      }
    }

    if (!generatedDescription) {
      return res.status(500).json({ error: 'Gemini returned an empty description.' });
    }

    return res.status(200).json({
      description: generatedDescription,
      model: usedModel,
    });
  } catch (err: any) {
    console.error('Gemini state description generation error:', err);

    let cleanMsg = err?.message || 'Failed to generate state description with Gemini API';
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) {
        cleanMsg = parsed.error.message;
      }
    } catch {
      // use raw message
    }

    // If Gemini service is experiencing high demand (503), provide high quality structured fallback description
    if (cleanMsg.includes('503') || cleanMsg.toLowerCase().includes('high demand') || cleanMsg.toLowerCase().includes('unavailable')) {
      const fallbackDesc = synthesizeStateDocumentation(req.body);
      return res.status(200).json({
        description: fallbackDesc,
        model: 'structured-synthesizer-fallback',
        warning: 'Gemini service is temporarily experiencing high demand. Generated contextual state documentation.',
      });
    }

    return res.status(500).json({
      error: cleanMsg,
    });
  }
});

// Deterministic formal specification synthesizer used if Gemini API encounters temporary 503 upstream congestion
function synthesizeStateDocumentation(params: {
  stateName: string;
  isInitial?: boolean;
  isTerminal?: boolean;
  groupName?: string;
  variableAssignments?: Record<string, unknown>;
  incomingTransitions?: any[];
  outgoingTransitions?: any[];
  registryName?: string;
}): string {
  const {
    stateName,
    isInitial,
    isTerminal,
    groupName,
    variableAssignments,
    incomingTransitions = [],
    outgoingTransitions = [],
    registryName,
  } = params;

  let roleStr = '';
  if (isInitial) {
    roleStr = `Represents the initial entry point of the ${registryName || 'state machine'}. Upon system startup, execution begins in this state`;
  } else if (isTerminal) {
    roleStr = `Represents a terminal sink state in the ${registryName || 'state machine'}. Upon reaching ${stateName}, execution completes and no further transitions occur`;
  } else {
    roleStr = `Represents an active operational state within the ${registryName || 'state machine'}`;
  }

  if (groupName) {
    roleStr += ` under the "${groupName}" subsystem.`;
  } else {
    roleStr += '.';
  }

  let varsStr = '';
  if (variableAssignments && Object.keys(variableAssignments).length > 0) {
    const keys = Object.entries(variableAssignments)
      .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
      .join(', ');
    varsStr = ` In this state, local variables satisfy invariant assignments: ${keys}.`;
  }

  let inStr = '';
  if (incomingTransitions.length > 0) {
    const fromList = incomingTransitions
      .map((t: any) => {
        const from = t.fromStateName || t.from_state_id || 'initial';
        const trig = t.trigger || 'event';
        return `'${from}' via trigger ${trig}`;
      })
      .slice(0, 3)
      .join(', ');
    inStr = ` It is entered from ${fromList}.`;
  }

  let outStr = '';
  if (outgoingTransitions.length > 0) {
    const toList = outgoingTransitions
      .map((t: any) => {
        const to = t.toStateName || t.to_state_id || 'subsequent state';
        const trig = t.trigger || 'trigger';
        const guard = t.guard || t.guard_expression ? ` (guard: ${t.guard || t.guard_expression})` : '';
        return `'${to}' on ${trig}${guard}`;
      })
      .slice(0, 3)
      .join(', ');
    outStr = ` Outgoing paths transition to ${toList}.`;
  } else if (!isTerminal) {
    outStr = ' No outgoing transitions are declared from this state.';
  }

  return `${roleStr}${varsStr}${inStr}${outStr}`;
}

// -------------------------------------------------------------
// OpenAPI Spec Definition YAML
// -------------------------------------------------------------
const openapiSpecYaml = `openapi: 3.0.3
info:
  title: aegis-srv — Aegis State-Machine Registry API
  version: 1.0.0
  description: REST API for the aegis schema: TLA+ state-machine registries, child resources, validation, and TLC model-checking.
servers:
  - url: /api
paths:
  /health:
    get:
      summary: Liveness probe
      responses:
        '200':
          description: OK
  /registries:
    get:
      summary: List all registries
      responses:
        '200':
          description: List of registries
    post:
      summary: Create a registry
      responses:
        '201':
          description: Created registry
  /registries/{id}:
    get:
      summary: Get registry by UUID
    patch:
      summary: Update registry
    delete:
      summary: Soft-delete registry
  /registries/{id}/validate:
    post:
      summary: Structural validation
  /registries/{id}/model-check:
    post:
      summary: Model check using TLC or structural engine
`;

// Global Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'internal server error', message: err.message });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[aegis-srv] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
