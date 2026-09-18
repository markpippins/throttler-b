# SOL — Surface-Projection / SOLScript Redistributable

Source + built redistributable for the Nexus **surface-projection** stack, packaged for
upstream handoff (e.g. Google AI Studio / Gemini). This bundle contains three
interlocking packages:

| Package | Path | Role |
|---|---|---|
| **surface-ui** | `angular/surface-ui/` | The studio application — React/TanStack Start app that *consumes* the projection-core library |
| **@nexus/projection-core** | `typescript/projection-core/` | The redistributable core — SOL/ViewSpec surface compiler + runtime (multi-surface, incremental, deterministic, governance) |
| **@nexus/solscript** | `typescript/solscript/` | The deterministic SOLScript evaluation library (resolution-domain interpreter), consumed by projection-core |

The three form a dependency chain: **surface-ui → @nexus/projection-core → @nexus/solscript**
(via `file:` links, so the bundle stays coherent as a unit).

---

## 1. Structure

```
SOL.zip
├── angular/
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

### surface-ui (`angular/surface-ui`)
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
cd ../../../angular/surface-ui
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

## 6. Notes

- The three packages were reconciled so surface-ui **imports** the core rather than
  containing a divergent copy — the core is the single source of truth.
- `dist/` is committed in the bundle for portability; source lives under `src/`.
- All packages are `private: true` — intended for internal/upstream redistribution,
  not public npm publication.