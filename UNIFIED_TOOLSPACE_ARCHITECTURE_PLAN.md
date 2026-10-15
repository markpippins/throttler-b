# Unified Toolspace Architecture & Implementation Plan
**Consolidating Specialized Subsystems, Invariant Decoupling, Widget-as-Vocabulary, and Visual Surface Studio**

* **Status:** Approved Architecture Draft / Team Update
* **Author:** Nexus Core Architecture & Agent Systems Team
* **Target Audience:** Core Engineering, UI/UX, Runtime VM, and Governance Engineering Teams
* **Date:** September 2026
* **Canonical revision:** `95801ba` (2026-10-08) — reconciled against working tree 2026-10-10

---

## 0. READ FIRST — Current Verified State & Open Blockers

> This section is maintained by the Layout Mechanic as a **factual reconciliation against the working
> tree**. It records what is *actually built and verified* versus what this plan *proposes*. Where the
> two disagree, **the working tree is the truth and this section wins**. Sections 1–10 are the ratified
> design intent and are left unmodified; treat them as the target, not the current state.
>
> Anyone (human or agent) picking up a development thread from this document should start here.

### 0.1 Naming

The projection layer is now **Projection**. The former name (`projection-core`) conflicted with the
CI/CD pipeline. Package/directory rename is **pending** — see §0.4 item **B-1**.

### 0.2 Verified landed (trust/perceptibility layer — this is genuinely good)

| Item | Location | Status |
| :--- | :--- | :--- |
| Epistemic envelope type | `src/surface/types.ts:64` — `EpistemicEnvelope = 'live'\|'degraded'\|'unknown'\|'demo'` | Verified |
| Caption derivation | `src/surface/core/contextSnapshot.ts` — derives treatment from **envelope × serverStatus × refusalReason**; encodes *"`live` means server-anchored and current; it NEVER means 'healthy.'"* | Verified |
| Runtime authority gates | `typescript/projection-core` `modes.ts` — `governed-domain` actions **throw** outside `live-governed`; `local-fixture` **throw** outside demo | Verified |
| Container perceptual channels | `src/surface/core/containerScope.ts` — `getContainerStylingChannels()` returns ≥2 independent channels per `ContainerType` | Verified |
| Category-B affordance | `src/components/dialogs/GovernedMutationAffordance.tsx` | Verified |
| Unified shell | `UniversalNavigator` / `UniversalContextInspector` / `DiagramSurface` / `DockableTelemetryDrawer` | Verified |

The container channel map satisfies **Condition 2** as written:

| Container type | Channel 1 (border) | Channel 2 (tint) | Glyph | Authority level |
| :--- | :--- | :--- | :--- | :--- |
| `governance-boundary` | emerald **double** | emerald tint | 🛡️ | `authoritative-admission` |
| `execution-sandbox` | amber **dashed** | amber tint | 🧪 | `isolated-sandbox` |
| `spatial-group` | slate **hairline** | neutral slate | 📁 | `ephemeral-presentation` |

### 0.3 OPEN BLOCKERS — do not start new threads on these surfaces until resolved

These are **verified defects in the working tree**, not proposals. Each blocks a phase.

**B-1 — Three divergent `designIR.ts` copies; the UI imports the wrong one. (HIGHEST PRIORITY)**

| # | Path | Lines | `crossSurface` / `widgetVariant` |
| :--- | :--- | :--- | :--- |
| 1 | `widgets/surface-ui/src/core/types/designIR.ts` (vendored compiler core) | 166 | present |
| 2 | `typescript/projection-core/src/types/designIR.ts` ← **`@nexus/projection-core` alias target** | **96** | **absent** |
| 3 | `nexus/typescript/projection-core/src/types/designIR.ts` | 166 | present |

`@nexus/projection-core` (`tsconfig.json:20`, `vite.config.ts:14`) resolves to copy **#2**, which lacks
`crossSurface`, `switchboard`, `widgetVariant`, `matrix`, `GlobalContextSpec`, `SurfaceContextSpec`, and
`WorkflowSpec`.

**Consequence:** the approved W5.08 Design IR (`3a8fcf44`) **cannot typecheck against the surface the UI
actually imports** — it uses `kind: "switchboard"` (A.1), `scope: "crossSurface"` (A.4), and carries its
variant token on `ConstraintSet.widgetVariant`. The governed IR and the governed host are on two
incompatible type surfaces.

*Fix (recommended):* repoint the alias at a single canonical 166-line superset and retire the other two.
Copies #1 and #3 are already conforming — **consolidate to the superset; do not grow the 96-line copy.**
The `projection-core` → **Projection** rename (B-1 naming) is the natural moment to do this.

**B-2 — GAP-1: requested variant is dropped at compile time.** `selectWidgets()` in the compiler emits
`props.variant = selected.variant` (the canonical catalog entry variant). A requested `state.<TOKEN>` is
read at `widgetSelector.ts:216` **only to filter**; `variantMatch` (line 290) is a diagnostic. The per-state
identity carrier therefore evaporates, so theme state-tokens receive nothing to bind.

**B-3 — GAP-2: `SurfaceContext` has no catalog entry.** `CANONICAL_WIDGET_CATALOG` covers 9 capabilities;
`SurfaceContext` is absent, so `selectWidgetDeterministically` throws. Compiling the mode-authority region
fails hard. **This is what makes EAC-3 (authority always visible) unsatisfiable through the toolkit today.**

**B-4 — No theme-token substrate (U-4).** No `ThemeRegistry` and no per-theme `stateTokens` map exist
anywhere in `src/`. §6.2 and Phase 4 assume one. Without it, the ≥2-channel state-distinctness requirement
cannot hold across the six themes, and theme-switching will re-normalize degraded states (Condition 1 /
EAC-4).

**B-5 — Surface family has no shared region envelope (L-3).** In `src/surface/SurfaceRecomposedView.tsx`
the tab bodies still use divergent envelopes — `max-w-7xl mx-auto` (line 506), `max-w-6xl mx-auto`
(line 570), `-m-5` full-bleed (line 643). A surface family should share one region frame; only content
density should vary.

**B-6 — §9.1 Path-Bridge targeted the wrong root.** It mapped every subsystem to
`angular/projects/<name>/` (the old Angular-CLI convention). **No `angular/projects/` directory exists.**
The canonical target is now **`widgets/<name>/`**. Corrected in §9.1.

**B-7 — 25 orphaned Angular services.** `src/services/*.service.ts` are Angular (`@Injectable`,
`signal`, `inject` from `@angular/core`) but the app is React (`index.tsx` → `ReactDOM.createRoot`) and
never consumes them. Notably `ui-preferences.service.ts`, cited in §9 as the theme-token home, is one of
them — it is **dead code** and must not be treated as live theme infrastructure.

### 0.4 Phase status correction

Phases 1–3 are marked *COMPLETED & VERIFIED* in §8. Phase 3's claim of *"full TypeScript compilation and
runtime verification"* does not hold against B-1/B-2/B-3: the generative compiler it introduces depends on
a type surface that cannot express the governed IR, and the variant carrier is dropped before rendering.
Phase 3 should be read as **functionally present, verification claim withdrawn pending B-1..B-3**.

---

## 1. Executive Summary & Strategic Context

The Nexus development ecosystem currently consists of six specialized applications in the `widgets/` directory:
1. **`surface-ui`**: ViewSpec runtime execution VM, component capability sandbox, and harvested relic library.
2. **`SOL WorkSpace`**: High-density ontology workbench, graph visualizer, reasoning trace flow, and SOLScript runtime.
3. **`aegis-ui`**: State machine design canvas, formal verification IDE, and spatial visual container layer.
4. **`peb-ui`**: Governance observability suite, causal lineage tracing, drift detection, and admission verification.
5. **`semantics-ui`**: Graph visualization, node editing, and metadata explorer for semantic databases.
6. **`shrapnel-ui`**: Relational EAV (Entity-Attribute-Value) schema console and value store explorer.

While each subsystem provides distinct domain capabilities, their division into separate standalone tools creates high cognitive overhead, redundant application chrome, isolated navigation hierarchies, and duplicate inspectors. Furthermore, the **UI Invariant Contract critique** (`widgets/surface-ui/UI Invariant Contract critique.md`) and **Drift Analysis** (`widgets/peb-ui/DRIFT.md`) revealed critical architectural seams that must be addressed:
* The current UI contract collapses **UI Interaction Context**, **Semantic Evaluation Context**, and **Admission Authority** into a single layer.
* High-density workbenches (such as SOL Workspace) duplicate window chrome and fragment user attention.
* Current UI surface projections (such as the Throttler VFS projection) render as bare structural wireframes without cohesive styling tokens.

### The Strategic Objectives
1. **Rebuild the Suite as a Single Unified Toolspace**: Deconstruct redundant chrome and unify the six tools around a single multimodal navigator, a universal context inspector, a dockable activity/REPL drawer, and a high-performance visual canvas.
2. **Elevate the UI Widget Library as the System's Generative Vocabulary**: Enable the assistant, reasoner, and conversational agents to express responses using interactive ViewSpec widget instances (including ingested Aegis state machines, metrics, and temporal TLC models) instead of static markdown.
3. **Ingest Aegis State Machine & TLA+/TLC Formal Validator as a First-Class Citizen**: Integrate Aegis's complete state machine designer, TLC model checker, and TLA+ formal verification canvas into the widget vocabulary, with bidirectional symmetry between interactive manipulation and AI query generation. *(Clarification: Aegis is the state machine editor and formal validator; general UML diagramming will be incorporated in a separate future milestone.)*
4. **Establish a Production-Grade Design & Theme Substrate**: Migrate wireframe relics to Throttler's established theme library (`theme-light`, `theme-dark`, `theme-midnight`, `theme-nord`, `theme-solarized`, `theme-steel`) using a centralized, extensible `ThemeRegistry`.
5. **Build a Visual Builder for ViewSpec / DesignIR**: Create a visual WYSIWYG surface builder allowing engineers and operators to compose, wire, save, and mount full-view runtime surfaces directly.

> **Path & Structure Reconciliation Note**: Per operator mandate, no file renames are executed mid-flight.
> The six subsystems now live under `angular/throttler-ui/widgets/` alongside the Throttler shell in
> `angular/throttler-ui/src/` (commit `95801ba`). **The canonical target is `widgets/<name>/`; the verified
> path table is in §9.1.** Treat §0 as authoritative for current state.

---

## 2. Invariant Contract Decoupling & Three-Layer Architecture

The critique document identified that the existing `UI Invariant Contract` treats an in-memory SOLScript evaluation returning `disposition: Asserted` as equivalent to an admitted state mutation (`admitted: boolean`). This conflation bypasses PEB governance, causes state drift, and pollutes evaluation frames with transient DOM context.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. UI RUNTIME CONTEXT (Ephemeral Operator Layer)                            │
│    • InteractionContextStore: active surface, hovered node, selected row     │
│    • Local presentation actions (sorting, filtering, tab switching, zooming)│
│    • Zero network overhead, never triggers PEB governance or ledger writes  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Snapshot on Domain Mutation Intent
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. SEMANTIC EVALUATION CONTEXT (SOLScript Resolution Layer)                 │
│    • Immutable Evaluation Frame: { environment: 'prod', jurisdiction: 'US' } │
│    • Evaluates propositions, checks rules, runs pre-LLM inference patterns   │
│    • Output: Disposition (Asserted | Disputed | Rejected | Stale)           │
│    • Proves logical assessment ONLY — holds NO write or commit authority    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Asserted + Validated Mutation Envelope
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ADMISSION AUTHORITY (PEB Governance & Persistence Layer)                 │
│    • Evaluates doctrine policies, circuit breakers, and lineage constraints │
│    • Issues cryptographic admission receipt and commits mutation to store   │
│    • Emits causal event for state diffing and audit logging                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Decoupling Principles & Mutation Classification
* **Separation of Assessment from Authority**: SOLScript is an evaluation engine, not a write authority. An evaluation of `Asserted` proves logical validity within a given frame; only the PEB Governance Director can issue an admission receipt and write state.
* **Mutation Classification & Spatial Affordance (Mechanic U-2, Architect Condition 3, Synthesist F-2)**:
  * **Category A: Ephemeral Presentation Actions**: Tab switches, canvas panning, row selection, filter queries, temporary form edits, and visual drag-grouping. Handled purely in memory by `InteractionContextStore` with zero network overhead. Ephemeral gestures **never** mint authority, alter state, or carry governed badges.
  * **Category B: Governed Domain Mutations**: Attribute updates, entity deletion, schema changes, state machine transitions, container promotion, and rule creation. These capture an immutable snapshot of `InteractionContextStore`, package it with the proposed change into a governed frame, and submit it to the PEB Admission Pipeline.
  * **The Admission-Affordance Pattern**: All Category B mutations route through a visible pre-commit admission affordance before execution. The **Category-B admission-affordance pattern exemplified by Governed-Rename** serves as the suite-wide canonical template (displaying the evaluated proposition, doctrine policy check, cryptographic receipt preview, and explicit admission commit).

### 2.2 Epistemic State Envelope: Authority Projection & Keying Matrix (Synthesist F-1, Ontologist)
Every surface datum, metric, and widget carries an explicit authority envelope: `live | degraded | unknown | demo`.

> **Fundamental Invariant (F-1)**: The envelope controls **provenance and gating only**, NEVER visual health. `live` asserts that a datum is server-anchored and current—it does NOT mean "healthy." Visual styling, badges, and colors must key off the tuple:
> $$\text{Visual Treatment} \longleftarrow \mathbf{Envelope} \times \mathbf{ServerStatus} \times \mathbf{RefusalReason}$$

#### Mapping Server Status to Epistemic Envelope:
| Server Witnessed Status | Mapped Envelope | Provenance & Gating | Visual Treatment & Behavior |
| :--- | :--- | :--- | :--- |
| **`complete`** | **`live`** | Current, fully witnessed server state | Healthy / normal token palette per entity state |
| **`refusal`** | **`live`** | Authoritative, current server outcome | **Blocking managed state (Rose treatment)**, verbatim refusal predicate; **NEVER** borrows healthy accents |
| **`stale`** | **`degraded`** | Server-derived, but freshness threshold exceeded | Amber warning borders, stale-time timestamp indicator |
| **`drift`** | **`degraded`** | Divergence detected against baseline lineage | Amber/yellow divergence badge with drift inspection link |
| **`duplicate_retry`**| **`degraded`** | Idempotency replay / pending reconciliation | Muted pulse indicating in-flight retry reconciliation |
| **`missing_lineage`**| **`unknown`** | Unverifiable provenance (Ontologist ruling) | Neutral-gray hatched border with unknown provenance glyph; cannot gate as impaired-but-reliable |
| **Indeterminate** | **`unknown`** | No response, lost connection, or unmeasured | Neutral question indicator; system never guesses |
| **Local Fixture / Mock** | **`demo`** | Explicitly non-authoritative sandbox/fixture | Permanent, non-collapsible `DEMO · fixture` banner |

> **Anti-Mock Invariant & Definition of "Ungrounded"**: "Ungrounded" is not a valid envelope value; it is a **forbidden violation state** where data is rendered without either an authoritative server anchor or an explicit `demo` fixture label. Any component attempting to render ungrounded metrics fails compilation or fails visible with a contract violation placeholder.

---

## 3. Container Model Synthesis Across the Subsystems

Analysis of the `widgets/` directory reveals two complementary container paradigms:
1. **`surface-ui` Execution Container**:
   * Implemented in `WidgetSandbox.tsx` and `src/lib/sandbox-guard.ts`.
   * Enforces security and capability boundaries: provides React hooks and sandboxed proxy fetches while strictly denying ambient `window`, `document`, and raw network access.
2. **`aegis-ui` Spatial & Visual Grouping Container**:
   * Implemented in `VisualContainerLayer.tsx` and `VisualCanvas.tsx`.
   * Enforces spatial encapsulation: wraps groups of states in a bounded container with visual headers, status badges, drag-in-unison physics, and clearance calculation.

### 3.1 The Unified `ContainerScope` Specification
In the unified toolspace, visual containers and execution sandboxes are bridged to SOL Frame Dimensions:

```typescript
export interface UnifiedContainerScope {
  id: string;
  name: string;
  type: 'spatial-group' | 'execution-sandbox' | 'governance-boundary';
  
  // Aegis-derived spatial properties
  spatialBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    collapsed: boolean;
  };
  
  // SOL-derived semantic frame context
  frameContext: {
    subsystem: string;
    environment: 'dev' | 'staging' | 'prod';
    jurisdiction?: string;
    securityLevel?: 'standard' | 'restricted' | 'critical';
  };
  
  // Surface-UI-derived capability permissions
  capabilities: {
    allowNetworkProxy: boolean;
    allowedEntities: string[];
    allowedMutationVerbs: string[];
  };

  // Encapsulated children
  memberIds: string[]; // State IDs, Entity IDs, or Widget IDs
}
```

This structure allows an operator to drag a visual container around several states or entities to assemble a **proposed visual group or local sandbox** (a Category-A presentation action). Crucially, **dragging a container does NOT mint authority or establish an evaluation frame by mouse movement alone (F-2)**. Promoting a visual group into an `execution-sandbox` or `governance-boundary` requires an explicit Category-B governed affordance and a valid PEB admission receipt before the execution boundary is activated.

### 3.2 Perceptual Channel Distinction (Mechanic U-1, Architect Condition 2)
To avoid the cognitive defect of "emerald-overload" (where unrelated systems reuse the same green accent), the three container types are strictly distinguished across **at least two independent visual channels** (REC-C1):

| Container Type | Semantic Role | Channel 1: Border & Geometry | Channel 2: Badge & Header Glyph | Channel 3: Surface Tint |
| :--- | :--- | :--- | :--- | :--- |
| **`governance-boundary`** | **PEB Admission Authority** (Production Governed) | Double solid border (`border-2 border-double`), crisp 6px radius | Shield icon (`mat-icon: verified_user`), explicit `ADMISSION BOUNDARY` label | Subtle cold-blue / steel tint (`rgb(var(--color-surface-base)/0.9)`) |
| **`execution-sandbox`** | **Dev / Demo Sandbox** (Mock Harness, Preview) | Dashed stroke (`border-dashed border-2`), warning amber/slate | Beaker icon (`mat-icon: science`), permanent non-collapsible `SANDBOX · DEMO` tag | Subdued diagonal hatch or muted warm amber tint |
| **`spatial-group`** | **Neutral Layout** (Visual organization, drag-in-unison) | Thin single hairline (`border-1 border-solid`), standard 12px radius | Folder/Cluster icon (`mat-icon: grid_view`), user group title | Neutral transparent canvas (`bg-transparent`) |

> **Binding Rule (Condition 2)**: Admission semantics (`governance-boundary`) must **never** share a rendering channel with dev/demo (`execution-sandbox`). An operator must be able to tell at a glance whether an entity is protected by PEB admission or residing in a local sandbox.

---

## 4. Unifying Dense Workbenches into a Single Toolspace

Dense tools like **SOL Workspace** contain rich multi-pane layouts: a canvas/graph, structured AST editor, REPL terminal, inspector, and reasoning flow. When combined with Aegis and PEB, running these as independent apps produces fragmented window clutter.

### 4.1 Chrome Deconstruction Strategy
We strip the redundant outer chrome (sidebars, title bars, status footers) from each subsystem and map their internal components to **Universal Shell Services**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GLOBAL COMMAND & ADDRESS BAR                       │
│  [Omni-Search / onto://]   [Persona: Ontologist ▼]   [Theme: Dark ▼]       │
├───────────────┬─────────────────────────────────────────────┬───────────────┤
│               │             PRIMARY CANVAS VIEWPORT         │               │
│  UNIVERSAL    │  ┌───────────────────────────────────────┐  │  UNIVERSAL    │
│  NAVIGATOR    │  │  Multi-Tab / Split Stage              │  │  CONTEXT      │
│  • VFS Files  │  │  • SOL Graph / Aegis State Machine    │  │  INSPECTOR    │
│  • Ontologies │  │  • Structured AST Editor              │  │  • Entity Props│
│  • States     │  │  • ViewSpec Runtime Surface           │  │  • Lineage/Diff│
│  • EAV Store  │  │  • Relic Catalog                      │  │  • Invariants │
│               │  └───────────────────────────────────────┘  │  • Violations │
│               ├─────────────────────────────────────────────┤               │
│               │   DOCKABLE DRAWER: REPL / Reasoning / Logs  │               │
└───────────────┴─────────────────────────────────────────────┴───────────────┘
```

1. **Universal Multimodal Navigator**:
   Single left tree supporting polymorphic lenses:
   * **VFS Lens**: Files, scripts, and Markdown documents.
   * **Ontology Lens**: Concepts, entities, rules, and propositions from SOL.
   * **State Machine Lens**: Aegis states, transitions, TLA+ specifications, and container groups.
   * **Schema Lens**: Shrapnel EAV attributes, field types, and instances.
2. **Universal Context Inspector**:
   Single right-hand property pane that adapts to the current `InteractionContextStore.selectedItem`:
   * Clicking a VFS file $\rightarrow$ File metadata, permissions, hashes.
   * Clicking an Ontology Concept $\rightarrow$ Slots, parent concepts, invariant rules, representations.
   * Clicking an Aegis State $\rightarrow$ Invariants, enter/exit actions, container assignment.
   * Clicking a PEB Violation $\rightarrow$ Causal trace, rule diff, remediation options.
3. **Dockable Drawer (REPL, Terminal, Reasoning Trace & Audit)**:
   Shared bottom drawer serving both operational REPLs and governance observability:
   * **SOL REPL**: Interactive evaluation of `eval(proposition)`, `check(entity)`, `reason(entity)`.
   * **Reasoning Trace Flow**: Step-by-step causal derivation graphs.
   * **Audit & Telemetry**: PEB admission events, witnessed runs, and live stream logs.
   * **Read-Parity Observation**: Specifically architected to support Stage-5 read-parity observation during the canonicalization endgame prior to the production cutover window.
4. **Unified `DiagramSurface` Canvas Engine (Mechanic U-5, EAC-6)**:
   Rather than maintaining fractured renderers for SOL Graphs and Aegis State Machines, we implement a shared high-performance canvas engine (`DiagramSurface`):
   * Viewport virtualization and level-of-detail (LOD) rendering for graphs with $>1000$ nodes.
   * Hardware-accelerated CSS transform matrix (smooth pan, pinch-zoom, minimap).
   * Shared selection, marquee box drag, and container snapping mechanics.
   * **Lineage Visual Language (EAC-6)**: Standardizes visual semantics across SOL, Aegis, and Shrapnel:
     * *Hollow Nodes*: Indicate unresolved, unadmitted, or speculative states.
     * *Dashed + Named Edges*: Explicitly represent lineage gaps or asynchronous promises.
     * *Empty State Representation*: An empty container or group is rendered as semantically valid, not as a missing or failed error state.

---

## 5. The UI Widget Library as the System's Generative Vocabulary

### 5.1 Paradigm Shift: The Assistant Speaks in ViewSpecs
When the user or reasoner queries the system, the assistant should not merely generate prose or markdown tables. It compiles and emits **live ViewSpec ASTs** that render using our widget library.

```
User Query: "Inspect the storage health of host-01 and show its dependency structure"
                         │
                         ▼
             System Reasoning & Intent Parsing
                         │
                         ▼
        Emit ViewSpec AST Payload (JSON / TypeSpec)
                         │
                         ▼
       Client-Side ViewSpec Runtime Instant Hydration
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ [Rendered directly in chat / canvas response]               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Host-01 Telemetry (Composite Section A)                  │ │
│ │ Storage Allocation: 74.2% (GaugeRelic)                  │ │
│ │ I/O Ops/sec: 1,420 (Sparkline)                          │ │
│ │ [LIVE · source=node-agent-01 · runId=wr-9821 · 12:44:02Z]│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ State Machine Model (Composite Section B - AegisStateMachineRelic)│ │
│ │   [Host01] ─── utilizes ───> [VfsStoragePort]          │ │
│ │ [LIVE · source=topology-srv · digest=sha256-4b8a · 12:43] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [COMPOSITE VIEW · 2 live sources · 0 fixtures · validated]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 In-Chat Authority Disclosure & Composite Provenance (Mechanic U-3, Synthesist S-2, F-4, Architect Condition 4)
Because in-chat widget instances lack the persistent chrome and authority-dial header of a full toolspace view, they represent a distinct surface class requiring strict authority transparency:
1. **Per-Section Provenance for Composite Responses (F-4)**:
   A single blanket caption cannot truthfully cover a composite widget composed of multiple independent sources. 
   * **Source-Homogeneous Widgets**: Carry a single pinned monospace footer: `LIVE · source=<server-id> · runId=<id> · generatedAt=<timestamp>`.
   * **Heterogeneous Composite Widgets**: Each child slot/section declares its own **per-section source caption** (`LIVE · source=node-agent-01...` vs. `LIVE · source=topology-srv...`). The composite wrapper summarizes total source provenance without blurring individual origins.
   * **Fixtures / Demos**: Pinned non-collapsible banner: `DEMO · fixture · non-authoritative`.
2. **Prohibition of "Ungrounded" Data**:
   * **Definition**: *"Ungrounded"* is not an envelope state; it is an architectural **violation state**—data rendered with neither a verified server-derived anchor nor an explicit `demo` label.
   * **Enforcement**: ViewSpec compilation rejects ungrounded ASTs; runtime renders an ungrounded payload as a visible contract failure, preventing any fabricated telemetry (L-5) from ever appearing on screen.
3. **Elimination of Fabricated Telemetry**:
   Vague or hardcoded assertions like `"HEALTHY | 98.4%"` are strictly prohibited unless bound to a live, server-derived witnessed state. Fixtures without an authoritative server anchor must render with the `DEMO` envelope.

### 5.3 Composite Slot Contract & Late-Bound Widget Granularity (Synthesist S-3, Analyst)
Rather than forcing all widgets into monolithic `React.FC` components, the system adopts a **stable contract + default composition** pattern:
* **Leaf vs. Composite**:
  * **Leaf Widget**: No declared child slots; renders its internal DOM directly.
  * **Composite Widget**: Declares named typed slots (e.g. `nodeRenderer`, `edgeRenderer`, `controls`, `legend`) alongside a **default binding set**. It mounts and renders completely out of the box without requiring hosts to supply custom slot children.
* **Late-Bound Granularity**:
  Engineers can ship a widget as a simple leaf today and later promote internal elements to reusable slots without breaking existing mounts, altering component IDs, or changing capability contracts.
* **Slot Capability & Envelope Provenance**:
  When a child is promoted to an independent slot, it carries its own capability declarations, endpoint provenance, and state envelope (`live | degraded | unknown | demo`), making composites fully inspectable, composable, and token-bound.

### 5.4 Seam for Calibrated Judgments (TypeSafe / System One)
The in-chat ViewSpec generation pipeline serves as the target rendering substrate for calibrated AI judgments. Generative responses can emit interactive confidence badges, epistemic bounds, and one-click *"Flag for Human Review"* affordances directly within the widget envelope.

### 5.5 Ingesting the Aegis State Machine & TLA+/TLC Formal Validator

> **Architectural Clarification**: Aegis is the state machine editor, validator, and TLA+/TLC formal verification IDE, **not** a UML diagrammer. All prior preliminary references to "UML" in the architecture plan and prototype code have been systematically corrected to **Aegis State Machine** and **TLA+/TLC**. A dedicated UML diagrammer will be incorporated as a separate, independent tool later.

The Aegis state machine engine is ingested into the widget vocabulary under `src/surface/relics/AegisStateMachineRelic.tsx` (bridged to `widgets/surface-ui/src/relics/AegisStateMachineRelic.tsx`).

#### Core Aegis State Machine & TLA+ Capabilities:
1. **State Space Definition & Invariants**:
   * Named states (`uncommitted`, `evaluating_guards`, `peb_admitted`, `committed`, `refused`).
   * Explicit TLA+ typed variables (`state`, `active_receipt`, `candidate_name`, `vision_readset`, `storage_synced`).
   * Invariant constraints verified against the state: `TypeOK`, `Inv_NoStaleReceipt`, `Inv_ConstitutionalGuards`, `Inv_SignedAuthority`, and `Inv_AtomicCommit`.
2. **Action Transitions & Fairness**:
   * Transitions with trigger signatures (e.g., `StageMutation(name)`, `AdmitProposal(evals)`, `CommitPeb(receipt)`).
   * First-order logic guard conditions (e.g., `candidate_name # "" /\ ~IsReserved(candidate_name)`).
   * Action transformation formulas with primed next-state variables (`state' = "evaluating" /\ vision_readset' = Snapshot(VFS)`).
   * Weak fairness (`WF_vars`) and strong fairness specifications to guarantee eventual progress.
3. **TLC Model Checker Verification & Breadth-First State Exploration**:
   * Full TLC model checking telemetry: unique state count (e.g. 4,892 states explored), maximum graph diameter/depth, and wall-clock verification time.
   * Safety proofs: deadlock freedom and constitutional invariant satisfaction.
   * Liveness verification: proving `<>[](state = "committed" \/ state = "refused")`.

#### Bidirectional Symmetry:
* **Interactive Workbench Mode**: Users can inspect states, step through simulation cycles, trigger transitions, and inspect TLA+ formulas in the visual canvas.
* **Generative Query Mode**: When a user or agent asks *"Show me the Aegis State Machine for the Governed Director mutation lifecycle"*, the generative compiler compiles the exact state machine AST payload. The rendered canvas is fully interactive: clicking any state or transition immediately focuses and populates that entity in the Universal Context Inspector.

---

## 6. Design System, Styling, and Themes: Moving Beyond Wireframes

### 6.1 Diagnostic: Why Current Renditions Are Wireframes
The minimal, wireframe-like appearance of current Throttler surface renditions is due to:
1. **Structural Prototyping Skeletons**: `HarvestedRelics.tsx` and `ViewSpecStudioView.tsx` were initially coded with raw SVG outlines and static fallback hex codes (`#3b82f6`, `#10b981`) to validate event routing and AST generation first.
2. **Missing Token Mapping**: The relics currently bypass the CSS variable definitions established in Throttler's design system.

### 6.2 Throttler-First Theme Architecture & Extensible Theme Library

Rather than adopting the idiosyncratic themes of `surface-ui`, the unified toolspace adopts **Throttler's established aesthetic palette and theme library**, while maintaining a clean, extensible **`ThemeRegistry`**.

```
Tier 1: ViewSpec Semantic Intent (density: 'compact', salience: 'high', intent: 'critical')
                                 │
                                 ▼
Tier 2: Throttler Design Token Substrate (--color-background, --color-surface-base, --color-accent-text)
                                 │
                                 ▼
Tier 3: Extensible Theme Library (Light Clean, Dark Slate, Midnight Deep, Nord Frost, Solarized Warm, Steel)
```

#### The Authoritative Throttler Theme Library:
* **`theme-light` (Pure Clean / System Default)**:
  * Soft paper canvas (`rgb(248 250 252)`), crisp white surfaces (`rgb(255 255 255)`), deep slate text (`rgb(15 23 42)`), and classic royal blue accents (`rgb(37 99 235)`).
* **`theme-dark` (Dark Slate)**:
  * Deep slate canvas (`rgb(15 23 42)`), elevated slate card surfaces (`rgb(30 41 59)`), light slate text (`rgb(248 250 252)`), and sky-blue active accents (`rgb(96 165 250)`).
* **`theme-midnight` (Midnight Deep Blue)**:
  * High-depth obsidian/navy canvas (`rgb(3 7 18)`), rich indigo-slate surfaces (`rgb(17 24 39)`), and vibrant indigo accents (`rgb(129 140 248)`).
* **`theme-nord` (Nord Frost)**:
  * Arctic night canvas (`rgb(46 52 64)`), frosted blue-gray container surfaces (`rgb(59 66 82)`), and glacial ice-blue accents (`rgb(136 192 208)`).
* **`theme-solarized` (Solarized Warm)**:
  * Gentle parchment base (`rgb(253 246 227)`), soft cream dialogs (`rgb(255 255 255)`), deep teal text (`rgb(7 54 66)`), and warm amber accents (`rgb(181 137 0)`).
* **`theme-steel` (Operator IDE)**:
  * Neutral cool zinc/steel surfaces, low eye-fatigue contrast optimized for dense tables, graphs, and code inspection.

#### Extensible Theme Library Architecture:
To support pluggable themes without hardcoding styles into components:
1. **Dynamic CSS RGB Channels**:
   Tokens are stored as space-separated RGB values (e.g. `--color-surface-base: 30 41 59`), allowing Tailwind utility classes to use alpha channels dynamically: `bg-[rgb(var(--color-surface-base)/0.8)]` and `border-[rgb(var(--color-border-base))]`.
2. **Global Theme Registry (`ThemeRegistry`) & State-Token Matrix (Mechanic U-4, EAC-4)**:
   ```typescript
   export interface ThemeDefinition {
     id: string;
     name: string;
     category: 'light' | 'dark' | 'tinted';
     tokens: {
       background: string;
       surfaceBase: string;
       surfaceMuted: string;
       textBase: string;
       textMuted: string;
       borderBase: string;
       accentText: string;
       accentBg: string;
     };
     // Mandatory multi-channel state tokens per theme (EAC-4)
     stateTokens: {
       live: { color: string; border: string; glyph: string };
       degraded: { color: string; border: string; glyph: string }; // Stale, drift, refusal
       unknown: { color: string; border: string; glyph: string };  // Indeterminate
       demo: { color: string; border: string; glyph: string };     // Fixture / sandbox
     };
   }
   ```
   > **Multi-Channel Degradation Invariant (EAC-4)**: Every theme binds `stateTokens` using **at least two independent perceptual channels** (e.g. distinct chromatic hue + structural stroke pattern/glyph). Switching between themes (e.g., from `theme-dark` to `theme-solarized` or `theme-steel`) must **never** re-normalize degraded states or flatten warnings into neutral aesthetics.
3. **Relic & Diagram Canvas Theming**:
   SVG diagrams, Aegis state nodes, and sparklines read these tokens dynamically via CSS variables or `getComputedStyle()`, ensuring that switching themes immediately recalibrates all diagrams, graphs, and relics across the entire toolspace.

---

## 7. The Visual Builder for ViewSpec / DesignIR

The visual surface builder provides a complete WYSIWYG authoring and preview environment for ViewSpec layouts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SURFACE STUDIO VISUAL BUILDER                       │
│  [Layout Presets ▼]  [Density: Compact ▼]  [Compile AST]  [Mount Full View] │
├─────────────────┬───────────────────────────────────────────┬───────────────┤
│ WIDGET PALETTE  │              LAYOUT REGION CANVAS         │ PROPERTY &    │
│ • Sparkline     │  HEADER REGION (Drop Zone)                │ WIRING PANE   │
│ • Radial Gauge  │  ┌─────────────────────────────────────┐  │ Role: main    │
│ • Metric Matrix │  │ [GaugeRelic: Inodes] [Gauge: Alloc] │  │ Capability:   │
│ • State Machine │  └─────────────────────────────────────┘  │   EntityMatrix│
│ • Kanban Board  │  MAIN REGION (Split 70 / 30)              │ Density:      │
│ • Entity Table  │  ┌───────────────────────┬──────────────┐  │   compact     │
│ • Audit Stream  │  │[AegisStateMachineRelic│[InspectorRelic│  │ Wires:        │
│ • TLA+ Console  │  │ (FileMutationProtocol)│ (Active Node)│  │   onSelect ──>│
│                 │  └───────────────────────┴──────────────┘  │   Inspector   │
│                 │  FOOTER REGION (Drop Zone)                │               │
│                 │  ┌─────────────────────────────────────┐  │               │
│                 │  │ [SparklineRelic: Mutation Rate]     │  │               │
│                 │  └─────────────────────────────────────┘  │               │
├─────────────────┴───────────────────────────────────────────┴───────────────┤
│ CODE / AST SYNC: [Visual Designer] | [DesignIR JSON] | [Compiled ViewSpec]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Builder Components & Features
1. **Interactive Region Canvas**:
   * Drag-and-drop slots for `header`, `main`, `sidebar`, `footer`, and custom grid rows.
   * Visual splitters to adjust column/row ratios dynamically.
   * Drop indicators showing valid capability targets.
2. **Widget Vocabulary Palette**:
   * Lists all available relics from `src/surface/relics/` and ingested widgets (`Aegis`, `SOL`, `Shrapnel`).
   * Hover preview showing component metadata, required capabilities, and sample data.
3. **Visual Event Wiring (Interaction Editor)**:
   * Allows connecting an event emitted by one widget (e.g., `onSelect` from an Aegis state node or Kanban card) to an input action on a sibling widget (e.g., `inspectEntity` on the Inspector panel).
   * Generates valid `interactions` blocks in the underlying `DesignIR`.
4. **Bidirectional Synchronization**:
   * Modifying the canvas updates the DesignIR JSON.
   * Editing the DesignIR JSON updates the canvas in real time.
5. **One-Click Full View Mounting**:
   * Clicking **"Mount Full View"** compiles the DesignIR via `@nexus/projection-core`, instantiates the surface using `ViewSpecRuntime.mount()`, collapses the builder chrome, and presents the surface as a native, full-screen operational view.
   * Surfaces can be saved to the VFS (e.g., `vfs://surfaces/ops-overview.viewspec.json`) and opened anytime.

---

## 8. Detailed Implementation Roadmap

```
2026 Q4 Roadmap
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Weeks 1 - 2     │ Weeks 3 - 4     │ Weeks 5 - 6     │ Weeks 7 - 8     │ Weeks 9 - 10    │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Phase 1:        │ Phase 2:        │ Phase 3:        │ Phase 4:        │ Phase 5:        │
│ Invariant Seam  │ Unified Shell   │ Widget-as-      │ Theming Engine  │ Visual Surface  │
│ Decoupling      │ & Canvas Engine │ Vocabulary      │ & Design Tokens │ Builder Studio  │
│                 │ (Aegis TLA+)    │ Pipeline        │ Migration       │ & Full Mounting │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Phase 1: Invariant Seam Decoupling (Weeks 1–2) — [STATUS: COMPLETED & VERIFIED]
* **Status**: Complete. Tested with full TypeScript compilation and runtime verification.
* **Accomplishments**:
  1. Implemented `EphemeralInteractionContextStore` (`src/surface/core/interactionContextStore.ts`) strictly decoupling local UI selection from semantic authority.
  2. Implemented `createEvaluationSnapshot()` (`src/surface/core/contextSnapshot.ts`) freezing immutable read-set states.
  3. Implemented `GovernedActionInterpreter` (`src/surface/core/actionInterpreter.ts` & `widgets/surface-ui/src/core/runtime/actionInterpreter.ts`) strictly enforcing `Asserted != Admitted` and blocking unadmitted mutations.
  4. Implemented `GovernedMutationAffordance` (`src/components/dialogs/GovernedMutationAffordance.tsx`) as the canonical Category B pre-commit template.

### Phase 2: Unified Shell & Canvas Engine with Aegis State Machine Ingestion (Weeks 3–4) — [STATUS: COMPLETED & VERIFIED]
* **Status**: Complete. Tested with full TypeScript compilation and runtime verification.
* **Accomplishments**:
  1. Implemented **Universal Multimodal Navigator** (`src/components/navigation/UniversalNavigator.tsx`) spanning VFS, SOL, Aegis (TLA+/TLC), and Shrapnel lenses.
  2. Implemented **Universal Context Inspector** (`src/components/inspector/UniversalContextInspector.tsx`) with polymorphic property card adapters and Category-B rename integration.
  3. Ingested Aegis state machine engine and formal TLC validator into `src/surface/relics/AegisStateMachineRelic.tsx` and bridged to `widgets/surface-ui/src/relics/AegisStateMachineRelic.tsx`.
  4. Implemented multi-channel container scopes in `src/surface/core/containerScope.ts` ensuring $\ge 2$ independent perceptual channels between governance boundaries, execution sandboxes, and spatial groups.
  5. Built **Unified Diagram Surface Canvas Engine** (`src/components/canvas/DiagramSurface.tsx`) with pan/zoom, LOD threshold culling, hollow unadmitted nodes, and dashed lineage gap edges (EAC-6).
  6. Equipped **Dockable Telemetry Drawer** (`src/components/bottom-pane/DockableTelemetryDrawer.tsx`) supporting SOL REPL console, Multi-Agent Reasoning Trace, Governance Ledger, and Stage-5 Read-Parity observation.

### Phase 3: Widget-as-Vocabulary Conversational Engine (Weeks 5–6) — [STATUS: PRESENT; VERIFICATION CLAIM WITHDRAWN]
* **Status**: Functionally present. The prior "COMPLETED & VERIFIED — full TypeScript compilation and runtime verification" claim is **withdrawn** pending §0.3 **B-1**, **B-2**, **B-3**: the generative compiler depends on a type surface (`@nexus/projection-core`, 96-line copy) that cannot express the approved W5.08 Design IR, and the per-state variant carrier is dropped before rendering.
* **Accomplishments**:
  1. Implemented **Generative ViewSpec Compiler** (`src/surface/compiler/generativeCompiler.ts`) translating natural language intents into interactive ViewSpec AST instances.
  2. Implemented **Generative Response Canvas** (`src/surface/components/GenerativeResponseViewer.tsx`) allowing the system to express itself through the UI widget library (Aegis State Machines & TLA+ Specifications, Metrics Gauges, Kanban Boards, Telemetry Streams).
  3. Established bidirectional symmetry: selecting any node inside an AI-generated Aegis state machine or canvas element instantly focuses and populates the Universal Context Inspector.
  4. Seamlessly mounted into the master Unified Toolspace shell (`src/surface/SurfaceRecomposedView.tsx`) with instant toggles between Diagram Surface, Aegis State Machine (TLA+/TLC), and AI Vocabulary Studio.

### Phase 4: Production Design Tokens & Theme Migration (Weeks 7–8)
* **Goal**: Upgrade all relics from wireframe skeletons to styled, themed production components using Throttler's theme library.
* **Key Tasks**:
  1. Audit and migrate all 10+ harvested relics in `src/surface/relics/` to use Throttler's RGB CSS variables.
  2. Implement the central `ThemeRegistry` supporting Throttler's full palette: `theme-light`, `theme-dark`, `theme-midnight`, `theme-nord`, `theme-solarized`, and `theme-steel`.
  3. Bind the `stateTokens` vocabulary across all 6 themes with $\ge 2$-channel distinctness (EAC-4) to prevent degraded states from re-normalizing on theme switches.
  4. Integrate dynamic theme queries into the Canvas/SVG renderers (Aegis state nodes, graph edges, gauge dials).

### Phase 5: Visual Surface Builder & Full-View Runtime Mounting (Weeks 9–10)
* **Goal**: Deliver the visual WYSIWYG DesignIR/ViewSpec builder and full-screen view mounting.
* **Key Tasks**:
  1. Build the drag-and-drop region layout canvas with adjustable grid splits.
  2. Create the Widget Vocabulary Palette with live relic drag-and-drop.
  3. Implement the visual event wiring tool connecting widget outputs to sibling inputs.
  4. Add live AST code synchronization (Visual Canvas $\longleftrightarrow$ DesignIR JSON).
  5. Implement **"Mount as Full View"** and VFS surface persistence (`.viewspec.json`).

---

## 9. Key File Artifacts & Repository Locations

| Component | Target File Location | Description |
| :--- | :--- | :--- |
| **Context Snapshot Utility** | `src/surface/core/contextSnapshot.ts` | Freezes immutable context snapshots for SOLScript evaluations. |
| **Unified Container Scope** | `src/surface/core/containerScope.ts` | Bridges Aegis visual groups, Surface sandboxes, and SOL frame dimensions. |
| **Ingested Aegis State Machine Relic** | `src/surface/relics/AegisStateMachineRelic.tsx` | Interactive TLA+/TLC state machine designer and formal validator. |
| **Shared Canvas Engine** | `src/components/canvas/DiagramSurface.tsx` | Virtualized viewport with pan/zoom and lineage visual language. |
| **Universal Shell Navigator** | `src/components/navigation/UniversalNavigator.tsx` | Multimodal tree for VFS, Ontologies, States, and EAV objects. |
| **Universal Inspector** | `src/components/inspector/UniversalContextInspector.tsx` | Polymorphic selection inspector and property sheet. |
| **Governed Admission Affordance** | `src/components/dialogs/GovernedMutationAffordance.tsx` | Canonical reference template for Category-B pre-commit UI. |
| **Visual Surface Builder** | `src/surface/components/SurfaceStudioBuilder.tsx` | Visual drag-and-drop WYSIWYG builder for ViewSpec surfaces. |
| **Theme System & Tokens** | ⚠️ **NOT YET BUILT** — see B-4 | No `ThemeRegistry` and no per-theme `stateTokens` map exist. §6.2 remains a proposal. **Do not cite `src/services/ui-preferences.service.ts`; it is an orphaned Angular service (B-7).** |

### 9.1 Path-Bridge Specification (Appendix A — F-3 Resolution) — CORRECTED

> **Target convention is `widgets/<name>/`.** The original table mapped every subsystem to
> `angular/projects/<name>/`, which was the old Angular-CLI convention; **no `angular/projects/` directory
> exists.** All subsystems target `widgets/` directly. No top-level `widgets/` exists in the monorepo yet —
> today the subsystems are nested under `angular/throttler-ui/widgets/` (commit `95801ba`). The left column
> is the verified working-tree location; the right column is the canonical target.

| Subsystem | Verified working-tree path (now) | Canonical target path | Subsystem role |
| :--- | :--- | :--- | :--- |
| Throttler unified shell | `angular/throttler-ui/src/` | `widgets/unified-shell/` | Host app, canvas, dockable drawer, theme surface |
| ViewSpec VM + compiler core | `angular/throttler-ui/widgets/surface-ui/src/core/` | `widgets/surface-ui/` | `designIR.ts`, `compiler.ts`, `widgetSelector.ts`, `runtime.ts` (166-line superset) |
| SOL WorkSpace | `angular/throttler-ui/widgets/SOL WorkSpace/` | `widgets/sol-workspace/` | Ontology workbench, AST editors, graph views |
| Aegis | `angular/throttler-ui/widgets/aegis-ui/` | `widgets/aegis-ui/` | State machine designer, TLA+/TLC verification |
| PEB | `angular/throttler-ui/widgets/peb-ui/` | `widgets/peb-ui/` | PEB admission governance, causal trace logs |
| Semantics | `angular/throttler-ui/widgets/semantics-ui/` | `widgets/semantics-ui/` | Graph database editor and node inspector |
| Shrapnel | `angular/throttler-ui/widgets/shrapnel-ui/` | `widgets/shrapnel-ui/` | Relational EAV console and entity explorer |
| SOLScript backend | `python/SOLScript/` | `python/SOLScript` | Frame evaluation and rule reasoning |
| Projection (was `projection-core`) | ⚠️ **THREE COPIES — see B-1.** Canonical target is the 166-line superset; the `@nexus/projection-core` alias currently points at the 96-line copy. | `widgets/projection/` | Design IR types, ViewSpec compile, runtime gates, `modes.ts` |

> **Note:** `angular/surface-ui/` also exists at the nexus root, separate from
> `angular/throttler-ui/widgets/surface-ui/`, with a differing `package.json`. Treat the nested copy as the
> live one for this toolspace and confirm before editing either.

---

## 10. Verification & Binding Architectural Acceptance Gates

Ratified by Architect Decision `fc18dee1`, the following **Five Binding Architectural Conditions** govern implementation acceptance:

1. **State Envelope Everywhere & Authority Projection (Condition 1, Synthesist F-1, Ontologist)**:
   * Every datum, metric, and `widget_response` carries an explicit authority envelope: `live | degraded | unknown | demo`.
   * The envelope reflects **provenance and gating only, NEVER visual health**. Visual treatment keys off $\mathbf{Envelope} \times \mathbf{ServerStatus} \times \mathbf{RefusalReason}$.
   * Authoritative mapping: `complete` $\rightarrow$ `live`; `refusal` $\rightarrow$ `live` (rendered as blocking rose with verbatim refusal predicate); `stale`/`drift`/`duplicate_retry` $\rightarrow$ `degraded`; `missing_lineage`/indeterminate $\rightarrow$ `unknown`.
   * Ungrounded data (neither server-anchored nor labeled demo) is strictly prohibited from rendering.
2. **Container Type is a Perceptual Channel (Condition 2 & Mechanic U-1)**:
   * `governance-boundary`, `execution-sandbox`, and `spatial-group` must be distinguishable across $\ge 2$ independent visual channels (border style, badge glyph, surface tint).
   * Admission semantics (`governance-boundary`) must never share a rendering channel with dev/demo (`execution-sandbox`).
   * Dragging a visual group (Category A) assembles a proposed grouping and **never** mints authority or creates an evaluation frame without an explicit Category-B admission affordance and receipt (F-2).
3. **One Canonical Category-B Affordance Pattern (Condition 3, Mechanic U-2, Synthesist F-2)**:
   * Ephemeral Category A actions never show governed markers.
   * Every Category B (governed mutation) routes through the **Category-B admission-affordance pattern exemplified by Governed-Rename**, requiring an explicit admission receipt before state commits.
4. **In-Chat ViewSpec Authority Disclosure & Composite Provenance (Condition 4, Mechanic U-3, Synthesist S-2/F-4)**:
   * Every conversational widget carries a permanent, non-dismissible monospace caption: `LIVE · source=<server-id> · generatedAt=...` or `DEMO · fixture · non-authoritative`.
   * Composite chat widgets declare **per-section source captions**, preventing provenance blurring across heterogeneous providers.
   * Chat bubbles cannot render live-looking widgets without an explicit server provenance anchor.
5. **One Admission Path & Broker Discipline (Condition 5)**:
   * All Category B actions proceed through the existing PEB admission contract; `Asserted` $\neq$ `Admitted`.
   * Cross-service envelopes (`governed-mutation`, `widget_response`) receive complete TypeSpec schema coverage under standing broker contract discipline.
