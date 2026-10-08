# SOL — Surface-Projection / SOLScript Redistributable

Source + built redistributable for the Nexus **surface-projection** stack, packaged for
upstream handoff (e.g. Google AI Studio / Gemini). This bundle contains three
interlocking packages:

| Package | Path | Role |
|---|---|---|
| **surface-ui** | `widgets/surface-ui/` | The studio application — React/TanStack Start app that *consumes* the projection-core library |
| **@nexus/projection-core** | `typescript/projection-core/` | The redistributable core — SOL/ViewSpec surface compiler + runtime (multi-surface, incremental, deterministic, governance) |
| **@nexus/solscript** | `typescript/solscript/` | The deterministic SOLScript evaluation library (resolution-domain interpreter), consumed by projection-core |

The three form a dependency chain: **surface-ui → @nexus/projection-core → @nexus/solscript**
(via `file:` links, so the bundle stays coherent as a unit).

---

## 1. Structure

```
SOL.zip
├── widgets/
│   └── surface-ui/            # Studio app (consumes projection-core)
│       ├── package.json       # deps include "@nexus/projection-core": "file:../../typescript/projection-core"
│       ├── src/               # routes, components, hooks, lib (UI + app logic)
│       └── ...                # configs, docs, specs
├── typescript/
│   ├── projection-core/       # @nexus/projection-core — the redistributable core
│   │   ├── src/               # compiler, runtime, adapter, types, widget
│   │   ├── dist/              # BUILT output (index.js + .d.ts + submodules)
│   │   ├── package.json
│   │   └── tsconfig*.json
│   └── solscript/             # @nexus/solscript — deterministic evaluation library
│       ├── src/               # interpreter, expression-compiler, models, events, query-builder
│       ├── dist/              # BUILT output
│       ├── package.json
│       └── tsconfig*.json
└── README.md                  # this file
```

> Build artifacts (`dist/`) ARE included for runnable-out-of-the-box consumption.
> `node_modules`, `bun.lock`, and `.git` are excluded.

---

## 2. What each package does

### @nexus/solscript (`typescript/solscript`)
Deterministic SOLScript core — the resolution-domain evaluation library. Library-first
(no server coupling). Ships a full interpreter for the resolution schema language:
- `interpreter.ts` — the ResolutionInterpreter (evaluate resolution propositions, state transitions)
- `expression-compiler.ts` — compiles SOLScript expressions
- `models.ts` — canonical resolution-domain models
- `events.ts` — durable Keychain event model
- `query-builder.ts` — query construction

**Consumption:** `import { ... } from "@nexus/solscript"` (root → `dist/index.js`).

### @nexus/projection-core (`typescript/projection-core`)
The redistributable **surface-projection core** — compiles a `DesignIR` document into a
compiled `ViewSpec`/`MultiSurfaceViewSpec` program AST and executes it against
capability contracts. Built for governance, determinism, and redistribution:

- **Compiler** (`src/compiler/`) — `compileDesignIR` (single/multi-surface),
  `compileSurfaceSpec`, `validateDesignIR`, plus **public composable steps**
  (`resolveCapabilities`, `createContractStub`, `selectWidgets`, `synthesizeLayout`,
  `bindAdapters`, `synthesizeEventRouting`, `synthesizeFixtures`, `synthesizeWorkflows`),
  a **deterministic hash** (`deterministicHash`), an **incremental compiler**
  (`IncrementalDesignIRCompiler` + `GranularSurfacePatch`), and an **auditable
  widget selector** (`selectWidgetDeterministically` + `SelectionScoreBreakdown`).
- **Runtime** (`src/runtime/`) — `Runtime`, `DefaultActionInterpreter`, `WidgetRegistry`,
  `SimpleEventBus`, `ContractStateStore`, operator persona, documentation registry,
  interaction context, mock data, and a capability/resource `sandboxGuard`.
- **Governance** — `ArtifactIdentity` provenance on compiled artifacts, `validateViewSpec`,
  governed adapter path (`adapter/governed.ts`), witnessed-run, doctrine lookup,
  replay verification, lifecycle, and modes.
- **Adapter** (`src/adapter/`) — `AdapterRuntime`, adapter operations, governed adapter.

**Consumption:** `import { compileDesignIR, DesignIR, ViewSpec, ... } from "@nexus/projection-core"`
(root → `dist/index.js`).

### surface-ui (`widgets/surface-ui`)
The studio application built on TanStack Start / React. It imports `@nexus/projection-core`
(no longer contains a vendored copy of the core). Provides the authoring surfaces:
- Studio tabs (Adapter / Contract / Context / Fixture / ViewSpec)
- Runtime panels (Operator, Help drawer/video)
- Widget sandbox + live source guards

---

## 3. Dependencies

- **@nexus/projection-core** depends on **@nexus/solscript** (`file:../solscript`).
- **surface-ui** depends on **@nexus/projection-core** (`file:../../typescript/projection-core`).
- surface-ui uses **bun** (`bun.lock`) and a large UI dependency set (Radix, TanStack,
  Tailwind, etc.) — resolve those via `bun install` / `npm install`.

---

## 4. Building & running

The bundle includes built `dist/` for both libraries, so it is runnable out of the box.
To rebuild from source:

```bash
# 1. @nexus/solscript (dependency first)
cd typescript/solscript
npm install
npm run build        # → dist/

# 2. @nexus/projection-core
cd ../projection-core
npm install
npm run build        # → dist/

# 3. surface-ui (bun)
cd ../../../widgets/surface-ui
bun install
bun run build        # vite/nitro build
bun run dev          # dev server on :4298
```

> Rebuild `@nexus/solscript` before `@nexus/projection-core`, and rebuild both before
> `surface-ui`, because surface-ui consumes the built `dist` of both.

---

## 5. Tests / verification

- **@nexus/solscript**: `npm test` (jest), `npm run parity` (parity vs reference).
- **@nexus/projection-core**: `npm run typecheck`, `npm run build`, and conformance suites
  (`test:replay`, `test:witnessed-run`, `test:doctrine-lookup`, `test:doctrine-lookup-registry`,
  `test:contract-catalog`), plus examples (`example:compile`, `example:adapter`).

---

## 6. Throttler Surface Absorption & Widget Registry

Throttler incorporates a dedicated surface absorption and ontological projection layer (`src/surface/`) that discovers, catalogs, and injects components from `widgets/` subfolders directly into the `@nexus/projection-core` runtime.

```
src/surface/
├── registry/                      # Subfolder scanner & dynamic manifest registry
│   ├── manifest.ts                # Schemas: WidgetManifestEntry, SubfolderCatalogManifest, etc.
│   ├── scanner.ts                 # Source AST/regex scanner discovering widgets/ subfolder relics
│   ├── projectionBridge.ts        # Dynamic bridge injecting widgets into @nexus/projection-core
│   ├── registryStore.ts           # widgetRegistryManager singleton & query engine
│   └── index.ts                   # Public barrel exports
├── relics/
│   └── HarvestedRelics.tsx        # 10 harvested interactive relics from widgets/surface-ui
├── components/
│   ├── WidgetRegistryView.tsx     # Full-screen visual subfolder registry & manifest inspector
│   ├── ViewSpecStudioView.tsx     # ViewSpec spatial layout switchboard & compiler
│   ├── GovernanceWorkbenchView.tsx# SolScript governance & keychain checkpoint inspector
│   └── OperatorPersonaPanel.tsx   # Interactive operator persona co-pilot
├── widgetAbsorption.ts            # High-level absorption service & ontological space map
├── SurfaceRecomposedView.tsx      # Multi-tab ontological surface recomposition container
└── types.ts                       # Ontological node, relic archetype, and surface tab types
```

---

## 7. Widget Registry Usage & Assimilation Guide

### 7.1 Manifest Architecture

Every component exported from a `widgets/` subfolder is mapped to a strongly typed `WidgetManifestEntry`:

```typescript
import type { WidgetManifestEntry } from './surface/registry';

// Example entry structure
const entry: WidgetManifestEntry = {
  id: 'surface-ui-sparkline',
  name: 'Sparkline Metric Monitor',
  componentName: 'Sparkline',
  exportName: 'default',
  subfolder: 'surface-ui',
  sourcePath: 'widgets/surface-ui/src/lib/seed.ts',
  archetype: 'data-vis',
  capabilities: ['MetricSeries'],
  inputs: [
    { name: 'data', type: 'number[]', defaultValue: [14, 21, 19, 27], required: true },
    { name: 'color', type: 'string', defaultValue: '#3b82f6' }
  ],
  endpoints: [
    { raw: 'GET /api/telemetry/timeseries', method: 'GET', signature: '/api/telemetry/timeseries' }
  ],
  tags: ['telemetry', 'chart', 'metrics'],
  projectionConfig: {
    defaultDensity: 'compact',
    defaultLayout: 'main',
    variants: ['default', 'compact', 'live'],
    events: ['click', 'pointSelect']
  }
};
```

### 7.2 Programmatic Usage

#### Accessing the Registry Manager
```typescript
import { widgetRegistryManager } from './surface/registry';

// 1. Get current master manifest
const manifest = widgetRegistryManager.getManifest();
console.log(`Discovered ${manifest.stats.totalWidgets} widgets across ${manifest.stats.totalSubfolders} subfolders`);

// 2. Query widgets by capability, archetype, or subfolder
const telemetryWidgets = widgetRegistryManager.getWidgetsByCapability('MetricSeries');
const dataVisRelics = widgetRegistryManager.getWidgetsByArchetype('data-vis');
const surfaceWidgets = widgetRegistryManager.getWidgetsBySubfolder('surface-ui');

// 3. Search catalog
const searchResults = widgetRegistryManager.searchWidgets('gauge');

// 4. Trigger a rescan of all widgets/ subfolders
const freshManifest = widgetRegistryManager.rescan({ forceRefresh: true });

// 5. Subscribe to reactive updates
const unsubscribe = widgetRegistryManager.subscribe((updatedManifest) => {
  console.log('Registry manifest updated:', updatedManifest.stats);
});
```

#### Dynamically Injecting into `@nexus/projection-core`
```typescript
import { WidgetCatalog, WidgetRegistry } from '@nexus/projection-core';
import { injectManifestIntoProjectionCore } from './surface/registry';

const catalog = new WidgetCatalog();
const registry = new WidgetRegistry();

// Inject entire manifest into projection-core's runtime
const audit = injectManifestIntoProjectionCore(manifest, {
  catalog,
  registry
});

console.log(`Successfully bound ${audit.registeredCount} widgets into projection-core catalog`);
```

### 7.3 Adding and Assimilating New `widgets/` Subfolders

As new subfolders are added to `widgets/` (e.g. `widgets/analytics-ui`, `widgets/operator-ui`), they can be assimilated automatically or declared via the registry:

#### Option A: Auto-Discovery & Scanning
1. Place components in `widgets/<your-subfolder>/` with standard TypeScript/JavaScript exports:
   ```typescript
   // widgets/analytics-ui/src/components/NetworkLatency.tsx
   // API: GET /api/network/latency
   export default function NetworkLatency({ samples, pingRate }) {
     // ...
   }
   ```
2. The scanner recognizes:
   - `export default function <Name>` or `export const <Name>`
   - `// API: [METHOD] [SIGNATURE]` inline comments
   - Archetype heuristics from naming conventions (`Gauge`, `Table`, `Console`, `Dial`, `Kanban`, `Sparkline`, etc.)
   - Corresponding projection-core capabilities (`MetricSeries`, `KeyMetricMatrix`, etc.)

#### Option B: Dynamic Runtime Registration
Call `addAndScanSubfolder()` from anywhere in the application or use the UI:
```typescript
import { widgetRegistryManager } from './surface/registry';

widgetRegistryManager.addAndScanSubfolder({
  subfolder: 'analytics-ui',
  path: 'widgets/analytics-ui',
  displayName: 'Analytics Visualizer Suite',
  description: 'Real-time telemetry and network diagnostic widgets',
  version: '1.0.0'
});
```

### 7.4 UI Navigation & Interactive Registry

1. **Ontological Address Bar**: Click the surface button in the address bar or navigate to `onto://surface-ui/registry`.
2. **Subfolder & Functional Category Organization**:
   - **Functional Category Navigation**: Filter or group widgets by `UI Components`, `Data & Metrics`, or `Utility & Tooling`.
   - **View Mode Switcher**:
     - **Grouped View**: Organizes assimilated widgets into dedicated, collapsible category sections with custom icons, descriptions, and item count badges.
     - **Tabbed List View**: Quickly displays a flat list filtered to the active category tab.
   - **Sidebar Filtering**: Filter by Source Subfolder, Functional Category, Archetype, and Projection Capability.
   - **Inspection & Preview**: Expand any widget card to view specification, schema inputs, bound API endpoints, tags, and projection variants, or click **Live** for interactive rendering.
   - **Dynamic Assimilation**: Click **Rescan Subfolders** to refresh catalogs, **Assimilate Subfolder** to declare new packages, or **Export JSON** to copy the full manifest.

---

## 8. Notes

- The three packages were reconciled so surface-ui **imports** the core rather than
  containing a divergent copy — the core is the single source of truth.
- `dist/` is committed in the bundle for portability; source lives under `src/`.
- All packages are `private: true` — intended for internal/upstream redistribution,
  not public npm publication.
