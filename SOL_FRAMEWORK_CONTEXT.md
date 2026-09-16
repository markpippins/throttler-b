# SOL Framework Architecture & Governance Context

> **Document Purpose:** Canonical reference and context bootstrap for the SOL / §10 / ViewSpec architecture. When included at the root of a project alongside the `SOL` bundle, this document provides an immediate, architect-grade understanding of the system's operational topology, boundaries, vocabulary, and implementation rules.
>
> **Core Architectural Axiom:** GAIS does not own application truth; it is the governed operator surface through which semantic state is projected, interacted with, evaluated, and reflected back into the system.

---

## 1. Executive Summary & Core Mission

The SOL architecture is not a UI framework, and ViewSpec is not a UI template language. 

**SOL is a deterministic semantic world model; ViewSpec is its renderable projection; and the ViewSpec Runtime is the semantic UI Virtual Machine that executes that projection.**

The UI is no longer where application logic lives. The UI is an **observer and operator of the governed world**.

Traditional web applications conflate business logic, database mutations, UI state, and network calls inside component event handlers. The SOL architecture enforces a strict **separation of concerns** across five distinct layers:
1. **Meaning, Validation & Invariants:** Owned by **SOL / SOLScript** (concepts, entities, propositions, read-set evaluation, and invariant rules).
2. **State Machines & Workflows:** Owned by **Aegis** (formal states, transitions, guard references, and model-checked invariants; compiles to Wind workflows).
3. **Type & Interaction IR:** Owned by **Shrapnel** (versioned data contracts, parameter structures, and interaction envelopes).
4. **Execution & Capabilities:** Owned by **Vision** (side-effect execution substrate and capability adapter dispatch).
5. **UI Projection & Interaction VM:** Owned by **DesignIR Compiler** and **ViewSpec Runtime** (pure layout synthesis, cached contract projections, and ephemeral operator interaction).

---

## 2. Subsystem Topology & Responsibility Boundaries

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                   SOL / Resolution                                │
│          Semantic Layer: Concepts · Attributes · Relationships · Rules            │
│                       Propositions · Evidence · Facts                             │
└──────────────┬────────────────────────────────────────────────────┬───────────────┘
               │ (Projection Frame)                                 │ (Evaluation Frame)
               ▼                                                    ▼
┌──────────────────────────────────────┐             ┌──────────────────────────────┐
│          DesignIR Compiler           │             │    SOLScript Evaluator       │
│  • Pure function: IR → ViewSpec AST  │             │  • Storage via semantic port │
│  • Zero runtime state, no I/O        │             │  • Pinned read-set evaluation│
│  • Emits `<unknown>` adapter stubs   │             │  • Deterministic admission   │
└──────────────┬───────────────────────┘             └──────────────▲───────────────┘
               │ (Immutable ViewSpec AST)                           │ (Interaction Envelope)
               ▼                                                    │
┌───────────────────────────────────────────────────────────────────┴───────────────┐
│                        ViewSpec Runtime (The UI VM)                               │
│  ┌───────────────────────────────┐         ┌───────────────────────────────────┐  │
│  │      ContractStateStore       │         │      InteractionContextStore      │  │
│  │  (Runtime Projection/Cache of │         │ (Ephemeral Operator Context:      │  │
│  │      Governed Contracts)      │         │   Active Pane, Focus, Selection)  │  │
│  └───────────────┬───────────────┘         └─────────────────┬─────────────────┘  │
│                  │                                           │                    │
│                  ▼                                           ▼                    │
│  ┌───────────────────────────────┐         ┌───────────────────────────────────┐  │
│  │       ActionInterpreter       │◄────────┤         Reactive EventBus         │  │
│  │ (Local vs Governed Split)     │         │                                   │  │
│  └───────────────┬───────────────┘         └─────────────────┬─────────────────┘  │
│                  │                                           │                    │
│                  ▼                                           ▼                    │
│  ┌───────────────────────────────┐         ┌───────────────────────────────────┐  │
│  │    Adapter Pipeline Engine    │         │     Widget Tree & Overlays        │  │
│  │ (Declarative Transformations) │         │ (Operator Persona & Manual Mode)  │  │
│  └───────────────────────────────┘         └───────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Authorized Typed Invocation Request
                                   ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               Vision (Capabilities)                               │
│            Executes effectful capabilities (Filesystem, Network, DB)              │
│                     Returns execution receipts and evidence                       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| Subsystem | Primary Role | What It MUST DO | What It MUST NOT DO |
| :--- | :--- | :--- | :--- |
| **Shrapnel** | Type & Interaction IR | Define reusable, versioned shapes: `UserInteraction` types, parameters, context packets, decision cards. | Define transition legality, execute side effects, or store runtime UI state. |
| **Aegis** (`aegis-srv`) | State-Machine & Workflow IR | Define formal states, transitions, guard references, and TLA+ model-checking evidence; compile into Wind workflows. | Act as general-purpose UI event sink, execute arbitrary runtime commands, or treat Wind as semantic authority. |
| **SOLScript** | Semantic Evaluator & Director | Evaluate expressions, rule invariants, and deterministic `check` guards over a pinned read-set; authoritatively construct and authorize typed `invoke` requests. | Own browser lifecycle, mutate arbitrary databases directly, or allow confidence-based inference into admission guards. |
| **Vision** | Execution Substrate | Execute authorized capability requests dispatched to registered targets, manage async I/O, and emit execution receipts. | Decide *whether* an operation should happen or maintain shadow copies of Aegis state definitions. |
| **Resolution** | Governance & Provenance | Maintain identity, propositions, dispositions, evidence chains, valid-time/record-time, and Keychains snapshots. | Dictate physical storage mechanisms (agnostic to EAV, JSONB, or memory). |
| **DesignIR Compiler** | Projection Engine | Purely transform $\text{DesignIR} \rightarrow \text{ViewSpec AST}$ through 7 deterministic phases. | Depend on runtime values, execute adapters, or access network/database. |
| **ViewSpec Runtime** | UI Virtual Machine | Maintain `ContractStateStore` (runtime projection/cache) and `InteractionContextStore`, route events, render widgets, and display overlays. | Act as authoritative domain state or mutate domain state without an authorized admission receipt. |

---

## 3. Core Vocabulary & Language Primitives

### A. The `check <conditional>` Keyword
* **Definition:** A state-transition guard for **deterministic admission and evaluation**, not a generic programming language `if` or confidence-based heuristic inference.
* **Semantics:**
  1. Resolved as a typed SOLScript expression or proposition reference.
  2. Side-effect free; strictly reads against a pinned read-set, current actor context, and Aegis registry revision.
  3. A `false`, `unknown`, or `stale` result stops the transition immediately and records a structured guard evaluation.
  4. Never allows probabilistic or fuzzy reasoning to leak into state-transition admission.
* **Normalized Result:**
  ```json
  {
    "kind": "guard-evaluation",
    "condition": "profile_is_authenticated",
    "condition_revision": "sha256:...",
    "result": "passed",
    "read_set_digest": "sha256:...",
    "evaluator": "solscript",
    "evidence_id": "evi-123"
  }
  ```

### B. The `invoke <target>(...)` Keyword
* **Definition:** A typed request constructed and authorized by SOLScript to execute a registered capability via Vision.
* **Semantics:**
  1. **Ownership:** SOLScript authorizes the invocation; Vision executes the capability. Vision does not decide *whether* the operation should happen—it answers: *"Given this authorized capability request, can I perform the effect?"*
  2. Resolves active capability revision, Shrapnel parameter types, and actor authority.
  3. Carries idempotency keys, causation IDs, and read-set fingerprints.
  4. Returns a structured receipt: `completed`, `refused`, `failed`, `unavailable`, or `stale`.

### C. Aegis $\rightarrow$ Wind Relationship
* **Compilation, Not Authority:** Aegis is the sole definition of the legal state machine. Wind is a compilation/execution target:
  ```text
  Aegis (Governed State-Machine Definition)
    ↓ compile
  Wind (Executable Workflow Realization)
    ↓ execute workflow
  Vision / Capabilities (Effectful Execution)
  ```
  Wind is never the semantic authority; it is an executable realization of a pinned Aegis revision.

### D. Distinct Failure Classification (Non-Negotiable)
When an action does not complete, the system strictly separates root causes:
* **Guard Refusal (`check` failed):** Invariant violated (e.g., duplicate filename). Handled via inline validation or Operator Persona explanation.
* **Unauthorized (`actor` authority missing):** User lacks capability role. Handled via auth challenge or permission gate.
* **Transport / Capability Failure (`Vision` error):** External network/disk error. Handled via retry banner or connectivity toast.
* **Stale Read-Set (`read_set_digest` mismatch):** State mutated concurrently. Handled via refresh/re-evaluation prompt.

---

## 4. The Interaction Sequence

```
1. UI Component Event (User Clicks "Rename")
       │
       ▼
2. Interaction Envelope Created
   {
     "interaction_type": "RenameItem",
     "subject": { "id": "file-123", "concept": "File" },
     "context": { "pane_id": 1, "path": ["Docs"] },
     "payload": { "new_name": "Report_Final.pdf" }
   }
       │
       ▼
3. Director Resolves Pinned Context
   • Loads Aegis state-machine revision
   • Reads normalized entities via SolStoragePort against defined read-set
       │
       ▼
4. SOLScript Evaluates `check` Guards (Deterministic Admission)
   ├── REFUSED ──► Returns typed refusal + evidence (UI displays explanation, stops)
   └── PASSED  ──► Continues to step 5
       │
       ▼
5. SOLScript Authorizes & Constructs Typed Invocation Request
   • Targets registered capability `filesystem.rename`
       │
       ▼
6. Vision Executes on Registered Capability
   • Performs actual filesystem / storage call
   • Emits execution receipt
       │
       ▼
7. Resolution & Keychains Governance Boundary
   • Records proposition outcome & evidence
   • Captures Keychains snapshot at transition boundary
       │
       ▼
8. ViewSpec Runtime Consumes Structured Projection
   • Updates ContractStateStore (Runtime projection/cache)
   • Rerenders widgets; Operator Persona confirms action
```

---

## 5. Architectural Triaging: Preventing Abstraction Bloat

When introducing complex application features (e.g., dual-pane file management, bulk operations), apply the **three-tier distillation filter**:

```
                       Application Feature / Residual
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
[Existing Vocabulary]     [Vocabulary Extension]     [Application Implementation]
(Domain Concepts &           (True Universal              (Ephemeral Client
 Projections)                 Interaction Primitives)      Mechanics)
────────────────────────  ─────────────────────────  ────────────────────────────
• Transfer Jobs           • Invariant Resolution     • Dual-pane spatial layout
• Staged Clipboard          Forks (Negotiation)      • Drag ghost styling & CSS
• Hierarchical Paths      • Transaction Batching     • Copy suffix string formatting
• Storage Mounts            (Atomicity Policy)       • Progress bar interpolation
```

1. **Existing Vocabulary (Concepts + Projection):**
   * *Transfer Lifecycle:* Model as `Concept: TransferJob` with state machine (`QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `COMPLETED`).
   * *Clipboard / Cut Files:* Model as `Concept: StagedSelection` or local `InteractionContextStore` reference.
   * *File Paths:* Traversal over `Folder` $\xrightarrow{\text{contains}}$ `FileSystemNode` relationship edges.
   * *Storage Providers:* Model as `Concept: StorageMount` with `is_readonly` attributes.
2. **Vocabulary Extensions (Promoted to §10):**
   * *`InvariantResolutionFork`:* Interactive remediation options when a guard fails (e.g., *Overwrite*, *Auto-Rename*, *Skip*).
   * *`TransactionBatch`:* Multi-entity atomic vs. best-effort transaction semantics.
3. **Application Implementation (Client-Only):**
   * Window pane positioning, CSS hover states, lasso selection bounding boxes, and string concatenation utilities remain strictly within client components.

---

## 6. The 5 Canonical Interaction State Machines

To prevent state explosion, decompose applications into bounded state machines:

1. **Session & Connectivity:**
   $$\text{anonymous} \rightarrow \text{authenticating} \rightarrow \text{connected} \leftrightarrow \text{disconnected} \rightarrow \text{reconnecting}$$
2. **Navigation & Selection:**
   $$\text{home} \rightarrow \text{browsing} \rightarrow \text{folder-loading} \rightarrow \text{browsing} \rightarrow \text{error}$$
3. **Mutation Lifecycle:**
   $$\text{selected} \rightarrow \text{mutation-requested} \rightarrow \text{checking} \rightarrow \text{executing} \rightarrow \text{completed} \mid \text{refused} \mid \text{failed}$$
4. **Research & External Evidence:**
   $$\text{idle} \rightarrow \text{query-submitted} \rightarrow \text{collecting} \rightarrow \text{presenting} \rightarrow \text{saved} \mid \text{dismissed}$$
5. **Preference & Layout:**
   * Pure rendering / sizing changes remain in local UI state.
   * Cross-device persisted preferences dispatch typed `ChangePreference` interactions.

---

## 7. Storage Decoupling: `SolStoragePort`

SOLScript is an evaluator, not a storage engine. It never couples to concrete database tables or SQL schemas. Storage is supplied through a semantic port, and evaluation occurs against a defined read set:

```python
class SolStoragePort(Protocol):
    async def list_concepts(self) -> List[ContractConcept]: ...
    async def list_attributes(self) -> List[ContractAttribute]: ...
    async def list_relationships(self) -> List[ContractRelationship]: ...
    async def list_subjects(self, concept_id: str) -> List[ContractSubject]: ...
    async def list_shrapnel_facts(self) -> List[ContractShrapnelFact]: ...
    async def list_revisions(self, subject_id: str) -> List[ContractRevision]: ...
    async def list_evidence(self) -> List[ContractEvidence]: ...
```

Both **native SOL storage** and **Nexus / PostgreSQL datasources** plug in behind this port, guaranteeing identical semantic evaluation across environments.

---

## 8. Bootstrap Checklist for New Projects

When copying the `SOL` bundle and this document to a new application:

1. **Verify Compiler Purity:** Ensure `DesignIR` compilers contain zero references to browser `window`, network APIs, or database drivers.
2. **Register Interaction Types in Shrapnel:** Add typed interaction shapes for all user gestures (`Create`, `Rename`, `Move`, `Delete`).
3. **Define State Machines in Aegis:** Pin revisions with explicit states, transitions, and deterministic `check` guards.
4. **Bind ViewSpec to Runtime Stores:**
   * Treat `ContractStateStore` strictly as a **runtime projection/cache of governed contracts**, never as authoritative domain state.
   * Point active selection, focus, and layout modes to `InteractionContextStore`.
5. **Route All Mutations Through the Director:** Eliminate direct backend calls from UI buttons; dispatch `UserInteraction` envelopes and handle structured outcomes.
6. **Implement the Pilot First:** Begin by migrating a single high-visibility vertical slice (e.g., `RenameItem`) before converting the entire application.
