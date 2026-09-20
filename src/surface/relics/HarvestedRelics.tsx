import React, { useState } from 'react';

// 1. Sparkline Relic
export interface SparklineProps {
  data?: number[];
  color?: string;
  height?: number;
  width?: number | string;
  fill?: boolean;
}

export const SparklineRelic: React.FC<SparklineProps> = ({
  data = [12, 19, 3, 5, 2, 3, 20, 15, 25, 22, 30, 28, 35],
  color = '#3b82f6',
  height = 48,
  width = '100%',
  fill = true,
}) => {
  const points = data.length > 0 ? data : [0, 10, 5, 20, 15];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const svgWidth = 240;
  const svgHeight = height;
  const padding = 4;
  const usableHeight = svgHeight - padding * 2;
  const usableWidth = svgWidth - padding * 2;

  const coordinates = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1 || 1)) * usableWidth;
    const y = svgHeight - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coordinates.join(' L ')}`;
  const fillD = `${pathD} L ${svgWidth - padding},${svgHeight} L ${padding},${svgHeight} Z`;

  return (
    <div className="w-full flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full overflow-visible"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {fill && <path d={fillD} fill={`url(#spark-grad-${color.replace('#', '')})`} />}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((c, i) => {
          const [cx, cy] = c.split(',');
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i === points.length - 1 ? 3.5 : 2}
              fill={i === points.length - 1 ? color : '#ffffff'}
              stroke={color}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>Min: {min}</span>
        <span className="font-semibold text-foreground">Current: {points[points.length - 1]}</span>
        <span>Max: {max}</span>
      </div>
    </div>
  );
};

// 2. Gauge Relic
export interface GaugeProps {
  value?: number;
  max?: number;
  label?: string;
  unit?: string;
  color?: string;
}

export const GaugeRelic: React.FC<GaugeProps> = ({
  value = 74,
  max = 100,
  label = 'utilization',
  unit = '%',
  color = '#10b981',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75;

  return (
    <div className="flex flex-col items-center justify-center p-2 font-mono">
      <div className="relative flex items-center justify-center w-28 h-28">
        <svg className="w-full h-full -rotate-135 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-muted/30"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference * 0.75}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference * 0.75}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {value}
            <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
};

// 3. Inventory Table Relic
export interface InventoryItem {
  sku: string;
  name: string;
  stock: number;
  category: string;
  status: 'optimal' | 'low' | 'critical';
}

export interface InventoryTableProps {
  items?: InventoryItem[];
}

export const InventoryTableRelic: React.FC<InventoryTableProps> = ({ items }) => {
  const defaultItems: InventoryItem[] = [
    { sku: 'REL-001', name: 'AST Syntax Tokenizer', stock: 142, category: 'Parsing', status: 'optimal' },
    { sku: 'REL-002', name: 'SolScript Sandbox Leases', stock: 18, category: 'Security', status: 'low' },
    { sku: 'REL-003', name: 'Keychain Checkpoint Seeds', stock: 4, category: 'Lineage', status: 'critical' },
    { sku: 'REL-004', name: 'Projection Frame Canvas', stock: 89, category: 'Rendering', status: 'optimal' },
  ];
  const list = items && items.length > 0 ? items : defaultItems;

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border/60 bg-surface/80 p-2 font-mono text-xs shadow-xs">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground">
            <th className="pb-1.5 pl-1 font-medium">SKU</th>
            <th className="pb-1.5 font-medium">Artifact Name</th>
            <th className="pb-1.5 font-medium">Domain</th>
            <th className="pb-1.5 font-medium text-right">Pool</th>
            <th className="pb-1.5 pr-1 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {list.map((it) => (
            <tr key={it.sku} className="hover:bg-muted/30 transition-colors">
              <td className="py-1.5 pl-1 font-semibold text-primary">{it.sku}</td>
              <td className="py-1.5 text-foreground">{it.name}</td>
              <td className="py-1.5 text-muted-foreground text-[11px]">{it.category}</td>
              <td className="py-1.5 text-right font-bold text-foreground">{it.stock}</td>
              <td className="py-1.5 pr-1 text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                    it.status === 'optimal'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : it.status === 'low'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  {it.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 4. Execution State Console Relic
export interface ExecutionStateConsoleProps {
  title?: string;
  requests?: { DRAFT?: number; COMPILED?: number; ADMITTED?: number; READY?: number };
  leases?: { ACTIVE?: number; RELEASED?: number };
  attempts?: { RUNNING?: number; SUCCEEDED?: number; FAILED?: number };
  totalRequests?: number;
  activeLeases?: number;
}

export const ExecutionStateConsoleRelic: React.FC<ExecutionStateConsoleProps> = ({
  title = 'Nebula Execution Switchboard',
  requests = { DRAFT: 3, COMPILED: 5, ADMITTED: 2, READY: 1 },
  leases = { ACTIVE: 1, RELEASED: 4 },
  attempts = { RUNNING: 1, SUCCEEDED: 3, FAILED: 1 },
  totalRequests = 11,
  activeLeases = 1,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="font-semibold tracking-tight text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary border border-primary/20">
            {totalRequests} Total
          </span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-500 border border-emerald-500/20">
            {activeLeases} Active Lease
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Request Pipeline</div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="rounded border border-border/50 bg-background/50 p-2">
            <div className="text-[10px] text-muted-foreground">DRAFT</div>
            <div className="text-base font-bold text-foreground">{requests.DRAFT ?? 0}</div>
          </div>
          <div className="rounded border border-primary/30 bg-primary/5 p-2">
            <div className="text-[10px] text-primary">COMPILED</div>
            <div className="text-base font-bold text-primary">{requests.COMPILED ?? 0}</div>
          </div>
          <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
            <div className="text-[10px] text-emerald-500">ADMITTED</div>
            <div className="text-base font-bold text-emerald-500">{requests.ADMITTED ?? 0}</div>
          </div>
          <div className="rounded border border-accent/40 bg-accent/10 p-2">
            <div className="text-[10px] text-accent">READY</div>
            <div className="text-base font-bold text-accent">{requests.READY ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2 text-[11px]">
        <div className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5">
          <span className="text-muted-foreground">Active Leases:</span>
          <span className="font-bold text-emerald-500">
            {leases.ACTIVE ?? 0} / {(leases.ACTIVE ?? 0) + (leases.RELEASED ?? 0)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded bg-muted/40 px-2 py-1.5">
          <span className="text-muted-foreground">Attempts (Run/Pass/Fail):</span>
          <span className="font-bold text-foreground">
            {attempts.RUNNING ?? 0} / {attempts.SUCCEEDED ?? 0} / {attempts.FAILED ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
};

// 5. CPF Readiness Dial Relic
export interface CpfReadinessDialProps {
  title?: string;
  counts?: { ready?: number; promoted?: number; nearMiss?: number; low?: number };
  threshold?: number;
  system?: string;
}

export const CpfReadinessDialRelic: React.FC<CpfReadinessDialProps> = ({
  title = 'Compilation Readiness (CPF)',
  counts = { ready: 5, promoted: 3, nearMiss: 2, low: 10 },
  threshold = 0.7,
  system = 'nebula-core',
}) => {
  const ready = counts?.ready ?? 5;
  const promoted = counts?.promoted ?? 3;
  const nearMiss = counts?.nearMiss ?? 2;
  const low = counts?.low ?? 10;
  const total = ready + promoted + nearMiss + low || 1;
  const readyPct = Math.round(((ready + promoted) / total) * 100);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{system}</span>
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
          ≥ {threshold} Threshold
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Promotable Velocity</span>
          <span className="font-bold text-emerald-500">{readyPct}% Ready</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/40 flex">
          <div style={{ width: `${(promoted / total) * 100}%` }} className="bg-primary" title="Promoted" />
          <div style={{ width: `${(ready / total) * 100}%` }} className="bg-emerald-500" title="Ready" />
          <div style={{ width: `${(nearMiss / total) * 100}%` }} className="bg-amber-500" title="Near Miss" />
          <div style={{ width: `${(low / total) * 100}%` }} className="bg-muted-foreground/30" title="Low" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-1.5">
          <div className="text-emerald-500">Ready</div>
          <div className="text-sm font-bold text-emerald-500">{ready}</div>
        </div>
        <div className="rounded border border-primary/30 bg-primary/5 p-1.5">
          <div className="text-primary">Promoted</div>
          <div className="text-sm font-bold text-primary">{promoted}</div>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-1.5">
          <div className="text-amber-500">Near Miss</div>
          <div className="text-sm font-bold text-amber-500">{nearMiss}</div>
        </div>
        <div className="rounded border border-border/40 bg-background/50 p-1.5">
          <div className="text-muted-foreground">Low</div>
          <div className="text-sm font-bold text-foreground">{low}</div>
        </div>
      </div>
    </div>
  );
};

// 6. Entity Counts Matrix Relic
export interface EntityCountsMatrixProps {
  counts?: Record<string, number>;
  title?: string;
}

export const EntityCountsMatrixRelic: React.FC<EntityCountsMatrixProps> = ({
  counts,
  title = 'Nebula 13-Entity Schema Matrix',
}) => {
  const defaultCounts: Record<string, number> = {
    threads: 42,
    requirements: 85,
    plans: 24,
    propositions: 112,
    hypotheses: 31,
    evidence: 67,
    work_requests: 19,
    execution_receipts: 8,
    harvest_candidates: 14,
    questions: 28,
  };
  const data = counts && Object.keys(counts).length > 0 ? counts : defaultCounts;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
          {Object.keys(data).length} Ontological Types
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(data).map(([key, val]) => (
          <div
            key={key}
            className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/40 hover:border-border transition-colors"
          >
            <span className="text-[11px] text-muted-foreground truncate">{key.replace(/_/g, ' ')}</span>
            <span className="font-bold text-foreground text-sm ml-2">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 7. Conduit Plan Kanban Relic
export interface ConduitPlanItem {
  id: string;
  title: string;
  goal: string;
  status: 'backlog' | 'in_progress' | 'accepted' | 'done';
  files_affected: string[];
}

export interface ConduitPlanKanbanProps {
  title?: string;
  plans?: ConduitPlanItem[];
}

export const ConduitPlanKanbanRelic: React.FC<ConduitPlanKanbanProps> = ({
  title = 'Conduit Implementation Plan Board',
  plans,
}) => {
  const defaultPlans: ConduitPlanItem[] = [
    {
      id: 'PLN-101',
      title: 'Bitemporal Migration Engine',
      goal: 'Implement validity intervals on audit tables without breaking existing foreign keys',
      status: 'in_progress',
      files_affected: ['src/db/schema.ts', 'src/services/bitemporal.ts'],
    },
    {
      id: 'PLN-102',
      title: 'Redis Subsystem Invalidation Hook',
      goal: 'Flush snapshot segment cache on upstream Postgres transaction commit',
      status: 'backlog',
      files_affected: ['src/cache/redis.ts'],
    },
    {
      id: 'PLN-103',
      title: 'CPF Readiness Scoring Pipeline',
      goal: 'Automate harvest candidate scoring based on intent resolution threshold >= 0.7',
      status: 'accepted',
      files_affected: ['src/services/cpf.ts'],
    },
    {
      id: 'PLN-104',
      title: 'Opcode Trace Journaler',
      goal: 'Record stage 2 compilation execution receipts into agent_records',
      status: 'done',
      files_affected: ['src/compiler/stage2.ts'],
    },
  ];

  const planList = plans && plans.length > 0 ? plans : defaultPlans;

  const statusColors: Record<string, string> = {
    backlog: 'bg-muted text-muted-foreground border-border',
    in_progress: 'bg-primary/10 text-primary border-primary/30',
    accepted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    done: 'bg-accent/15 text-accent border-accent/30',
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <span className="rounded bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/40">
          {planList.length} Active Plans
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {planList.map((plan) => (
          <div
            key={plan.id}
            className="rounded-md border border-border/40 bg-background/60 p-2.5 hover:border-border transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-[11px]">{plan.id}</span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[9px] uppercase font-bold ${
                  statusColors[plan.status] || 'bg-muted'
                }`}
              >
                {plan.status.replace('_', ' ')}
              </span>
            </div>
            <div className="font-semibold text-foreground text-[12px]">{plan.title}</div>
            <div className="text-[11px] text-muted-foreground line-clamp-2">{plan.goal}</div>
            <div className="flex flex-wrap gap-1 pt-1">
              {plan.files_affected.map((f) => (
                <span key={f} className="rounded bg-muted/50 px-1 py-0.2 text-[9px] text-muted-foreground">
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 8. Agent Record Telemetry Relic
export interface AgentTelemetryRecord {
  recordType: string;
  role: string;
  title: string;
  level: number;
  time: string;
}

export interface AgentRecordTelemetryProps {
  title?: string;
  records?: AgentTelemetryRecord[];
}

export const AgentRecordTelemetryRelic: React.FC<AgentRecordTelemetryProps> = ({
  title = 'Agent Audit Telemetry Stream',
  records,
}) => {
  const defaultRecords: AgentTelemetryRecord[] = [
    { recordType: 'report', role: 'architect', title: 'Level 1 System Boundary Validated', level: 1, time: '2m ago' },
    { recordType: 'engineering_log', role: 'engineer', title: 'Generated opcode sequence for REQ-8192', level: 2, time: '5m ago' },
    { recordType: 'assessment', role: 'inspector', title: 'Resolved dependency lattice cycle', level: 3, time: '12m ago' },
    { recordType: 'decision', role: 'planner', title: 'Conduit PLN-104 admitted to Ready state', level: 4, time: '18m ago' },
  ];

  const list = records && records.length > 0 ? records : defaultRecords;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground uppercase">live stream</span>
      </div>

      <div className="space-y-1.5">
        {list.map((rec, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded border border-border/30 bg-background/50 px-2.5 py-1.5 hover:border-border/60 transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase border border-primary/20">
                {rec.role}
              </span>
              <span className="truncate text-foreground text-[11px]">{rec.title}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
              <span className="rounded bg-muted px-1 py-0.5 text-muted-foreground">L{rec.level}</span>
              <span className="text-muted-foreground">{rec.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 9. Cross Reference Lattice Relic
export interface LatticeEdge {
  relType: string;
  sourceType: string;
  targetType: string;
  domain: string;
}

export interface CrossReferenceLatticeProps {
  title?: string;
  items?: LatticeEdge[];
}

export const CrossReferenceLatticeRelic: React.FC<CrossReferenceLatticeProps> = ({
  title = 'Cross-Reference Dependency Lattice',
  items,
}) => {
  const defaultItems: LatticeEdge[] = [
    { relType: 'req:blocks', sourceType: 'requirement', targetType: 'requirement', domain: 'Requirement' },
    { relType: 'spawns_plan', sourceType: 'harvest_candidate', targetType: 'plan', domain: 'Agent' },
    { relType: 'wrp:implements', sourceType: 'plan', targetType: 'work_request', domain: 'WRP' },
    { relType: 'kv:sourced_from', sourceType: 'knowledge_entity', targetType: 'harvest', domain: 'Knowledge' },
  ];

  const list = items && items.length > 0 ? items : defaultItems;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-500 font-bold">
          {list.length} Lattice Edges
        </span>
      </div>

      <div className="space-y-1.5">
        {list.map((edge, i) => (
          <div key={i} className="flex items-center justify-between rounded border border-border/40 bg-background/50 p-2">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent font-semibold">
                {edge.domain}
              </span>
              <span className="text-[11px] font-bold text-foreground">{edge.relType}</span>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span>{edge.sourceType}</span>
              <span>→</span>
              <span>{edge.targetType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 10. Open Question Deliberation Relic
export interface OpenQuestionItem {
  id: string;
  question: string;
  author: string;
  status: 'open' | 'resolved';
  votes: number;
}

export interface OpenQuestionDeliberationProps {
  title?: string;
  items?: OpenQuestionItem[];
}

export const OpenQuestionDeliberationRelic: React.FC<OpenQuestionDeliberationProps> = ({
  title = 'Open Question Deliberation Ledger',
  items,
}) => {
  const [localItems, setLocalItems] = useState<OpenQuestionItem[]>(
    items && items.length > 0
      ? items
      : [
          { id: 'Q-01', question: 'Should SolScript runtime support external wasm modules?', author: 'architect', status: 'open', votes: 7 },
          { id: 'Q-02', question: 'Should Keychain attestation enforce SHA-256 vs BLAKE3?', author: 'security', status: 'resolved', votes: 12 },
          { id: 'Q-03', question: 'Is bitemporal validity window inclusive of upper bound?', author: 'engineer', status: 'open', votes: 4 },
        ]
  );

  const handleUpvote = (id: string) => {
    setLocalItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, votes: it.votes + 1 } : it))
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface/80 p-3.5 font-mono text-xs shadow-xs">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground">{localItems.length} Deliberations</span>
      </div>

      <div className="space-y-2">
        {localItems.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between p-2.5 rounded bg-background/50 border border-border/40 hover:border-border transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold">{q.id}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] uppercase font-bold ${
                    q.status === 'open'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  }`}
                >
                  {q.status}
                </span>
                <span className="text-muted-foreground text-[10px]">@{q.author}</span>
              </div>
              <div className="text-[11px] text-foreground">{q.question}</div>
            </div>
            <button
              onClick={() => handleUpvote(q.id)}
              className="ml-3 px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1 text-[10px] border border-border/50"
            >
              <span>▲</span>
              <span className="font-bold">{q.votes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
