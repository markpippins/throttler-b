# sol API — REST Reference for Frontend

The sol API is a single REST service over the standalone `sol` database
(schemas `semantics`, `resolution`, `shrapnel`). This document is the
contract for the frontend team: every endpoint, every request envelope,
every response envelope.

**Live base URL:** `http://localhost:8111`

Three surfaces share one service:

| Surface | Prefix | Purpose |
|---|---|---|
| **Gateway** | `/health`, `/api/schemas`, `/api/{schema}/{table}[/{pk}]` | Liveness, schema inventory, uniform CRUD on any table in the three schemas |
| **Shrapnel** | `/api/shrapnel/*` | Value-family objects: typed field encode/decode (the `value` + `value_<type>` polymorphism) |
| **Evaluate** | `/api/evaluate/*` | SOLScript evaluation: propositions, invariant checks, deterministic/hybrid reasoning |

> **Machine-readable artifact:** the same surface is defined in TypeSpec
> (`typespec/`) and compiles to OpenAPI 3.1 at `typespec/tsp-output/schema/openapi.yaml`.
> Use this document for reading; use the OpenAPI file for codegen/tooling.

---

## Conventions

### Transport

- `Content-Type: application/json` on all requests with a body.
- Success responses are `200 OK` (GET/PUT/DELETE) or `201 Created` (POST inserts).
- No authentication is currently enforced — the API is localhost-only.

### Error envelope

Every error is a JSON object with a `detail` field:

```json
{ "detail": "row not found" }
```

`detail` is a string for HTTP errors raised by the service, or an **array of
validation objects** (shape below) when FastAPI's request validation rejects
the body:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "entity_id"],
      "msg": "Field required"
    }
  ]
}
```

### Status codes you will see

| Code | Meaning | Example |
|---|---|---|
| `200` | OK | list / read / update / delete |
| `201` | Created | POST insert / encode |
| `400` | Bad request | unknown column filter, bad type code, empty body, non-integer id |
| `404` | Not found | unknown schema/table, missing row, unknown entity/proposition |
| `409` | Conflict | unique-key violation on insert (duplicate row) |
| `422` | Unprocessable | request-validation failure, proposition evaluation error |
| `503` | Unavailable | database unreachable (health only) |

### Field-type registry (shrapnel)

Shrapnel values are typed. `field_type_code` is authoritative:

| Code | Name | JSON representation | PG type |
|---|---|---|---|
| 1 | `Long` | integer | `bigint` |
| 2 | `String` | string | `text` |
| 3 | `Double` | number | `double precision` |
| 4 | `Boolean` | boolean | `boolean` |
| 5 | `Timestamp` | ISO-8601 string (`2026-08-27T10:00:00Z`) | `timestamptz` |
| 6 | `JSONB` | object / array | `jsonb` |
| 7 | `UUID` | canonical UUID string | `uuid` |

---

## 1. Gateway

### 1.1 `GET /health`

Liveness + database check.

**Response 200:**

```json
{
  "status": "ok",
  "database": "sol",
  "schemas": ["semantics", "resolution", "shrapnel"]
}
```

**Errors:** `503` when the database is unreachable — `{"detail": "database unreachable: ..."}`.

### 1.2 `GET /api/schemas`

Schema inventory: every table exposed by the gateway, grouped by schema.

**Response 200:**

```json
{
  "schemas": {
    "resolution": ["assertion_evaluation", "assessment", "concept", "..."],
    "semantics": ["evidence_item", "evidence_type", "snapshot", "..."],
    "shrapnel": ["field", "field_type", "object_attribute_value", "object_instance", "value", "..."]
  },
  "tableCount": 77
}
```

---

### 1.3 Generic table CRUD

The gateway derives CRUD from `information_schema` — every base table in the
three schemas is addressable. There is **no per-table code**; schemas and
tables are validated against the live catalog.

**Schema/table validation:** any schema outside `semantics | resolution |
shrapnel`, or any table that does not exist, is a `404`:

```json
{ "detail": "unknown schema: foo" }
{ "detail": "unknown table: semantics.concept" }
```

Rows are returned as **arbitrary JSON** — column names become keys, values
are native JSON. Composite-primary-key tables are not addressable by `{pk}`
(see 1.3.2 — returns `400`).

#### 1.3.1 `GET /api/{schema}/{table}` — list rows

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int | `1` | 1-based; `ge=1` |
| `per_page` | int | `50` | `1..1000` |
| any other param | — | — | equality filter: `?name=host-a` → `WHERE "name" = 'host-a'`. Must be a real column of the table or `400` |

**Response 200:**

```json
{
  "schema": "resolution",
  "table": "concept",
  "page": 1,
  "per_page": 50,
  "total": 2,
  "items": [
    { "id": "d3a4...", "name": "Host", "description": "A compute host", "created_at": "2026-08-27T10:00:00Z" }
  ]
}
```

**Errors:** `404` unknown schema/table; `400` unknown column filter.

#### 1.3.2 `GET /api/{schema}/{table}/{pk}` — fetch one row

Primary key value in the path (string; the API compares against the PK
column, so a UUID works as-is).

**Response 200:** the row as a flat JSON object (no wrapper):

```json
{ "id": "d3a4...", "name": "Host", "description": "A compute host", "created_at": "2026-08-27T10:00:00Z" }
```

**Errors:** `404` `{"detail": "row not found"}`; `400` if the table has no PK
or a composite PK (`{"detail": "composite key not supported: ..."}`).

#### 1.3.3 `POST /api/{schema}/{table}` — insert a row

**Request body:** a flat JSON object of column → value. Omit columns that
have DB defaults. Nested objects are **not** supported (columns are scalar).

```json
{ "name": "host-b", "description": "Second host", "cores": 4 }
```

**Response 201:** the inserted row, including DB-generated values:

```json
{ "id": "9f2c...", "name": "host-b", "description": "Second host", "cores": 4, "created_at": "2026-08-27T10:00:00Z" }
```

**Errors:** `400` empty body or missing NOT NULL column
(`{"detail": "missing required field: ..."}`); `409` duplicate key
(`{"detail": "duplicate row: ..."}`); `400` data-shape errors
(`{"detail": "invalid data: ..."}`).

#### 1.3.4 `PUT /api/{schema}/{table}/{pk}` — update a row

**Request body:** flat object of the columns to change. The PK column is
ignored if present.

```json
{ "cores": 8, "description": "Second host, upgraded" }
```

**Response 200:** the updated row (flat object). **Errors:** `404` row not
found; `400` no updatable fields / composite PK.

#### 1.3.5 `DELETE /api/{schema}/{table}/{pk}` — delete a row

**Response 200:**

```json
{ "deleted": "9f2c..." }
```

**Errors:** `404` `{"detail": "row not found"}`.

---

## 2. Shrapnel — value-family objects

The generic gateway cannot resolve the value polymorphism: a logical value
lives in `shrapnel.value` (type code) **plus** one of seven typed extension
tables (`value_long`, `value_string`, …). The shrapnel routes are the
purpose-built surface that encodes and decodes this. The DB enforces the
type/extension pairing with triggers, so a mismatched payload is rejected
server-side.

**Envelope rules:**

- Every response wraps its payload: `{"field_types": [...]}`, `{"field": {...}}`, `{"objects": [...]}`, `{"object": {...}}`, `{"object_id": ..., "values": [...]}`.
- `id`/`code` path params that are not integers → `400 {"detail": "id must be integer"}` / `{"detail": "code must be integer"}`.
- Unknown ids → `404 {"detail": "not_found"}`.
- Invalid type names or codes → `400 {"detail": "unknown type 'X'. Valid: Long, String, Double, Boolean, Timestamp, JSONB, UUID"}`.

### 2.1 Field types

#### `GET /api/shrapnel/field-types`

**Response 200:**

```json
{
  "field_types": [
    { "code": 1, "name": "Long", "description": "64-bit integer", "pg_type": "bigint" },
    { "code": 2, "name": "String", "description": "variable-length text (varchar/text)", "pg_type": "text" },
    { "code": 3, "name": "Double", "description": "IEEE double precision", "pg_type": "double precision" },
    { "code": 4, "name": "Boolean", "description": "true / false", "pg_type": "boolean" },
    { "code": 5, "name": "Timestamp", "description": "timestamptz", "pg_type": "timestamptz" },
    { "code": 6, "name": "JSONB", "description": "arbitrary JSON", "pg_type": "jsonb" },
    { "code": 7, "name": "UUID", "description": "universally unique identifier", "pg_type": "uuid" }
  ]
}
```

#### `GET /api/shrapnel/field-types/{code}`

**Response 200:**

```json
{ "field_type": { "code": 3, "name": "Double", "description": "IEEE double precision", "pg_type": "double precision" } }
```

**Errors:** `404` `{"detail": "not_found"}`; `400` non-integer code.

### 2.2 Fields

A field is a named, typed slot. Fields are **upserted by `property_name`** —
POSTing a field with an existing `property_name` updates it rather than
duplicating.

#### `GET /api/shrapnel/fields`

**Query params:** `limit` (default 100, `1..500`), `offset` (default 0),
`type_code` (optional int — filter by `field_type_code`).

**Response 200:**

```json
{
  "fields": [
    {
      "id": 12,
      "is_calculated": false,
      "field_index": 1,
      "label": "CPU cores",
      "name": "cores",
      "property_name": "cores",
      "field_type_code": 1
    }
  ]
}
```

> Note: `shrapnel.field` has **no** `created_at`/`updated_at` columns.

#### `GET /api/shrapnel/fields/{field_id}`

**Response 200:** `{"field": { ...same shape as above... }}` — **Errors:**
`404` `{"detail": "not_found"}`, `400` non-integer id.

#### `POST /api/shrapnel/fields` — create or upsert a field

**Request body (`FieldSpec`):** `property_name` is required; the type may be
given as a name or a code. `label` defaults to `property_name`; `name`
defaults to `property_name`; `field_index` defaults to 0; `is_calculated`
defaults to false.

```json
{
  "property_name": "cores",
  "label": "CPU cores",
  "type": "Long",
  "field_index": 1
}
```

Type can alternatively be given by code:

```json
{ "property_name": "uptime_s", "field_type_code": 3 }
```

**Response 201:**

```json
{
  "field": { "id": 12, "is_calculated": false, "field_index": 1, "label": "CPU cores", "name": "cores", "property_name": "cores", "field_type_code": 1 }
}
```

**Errors:** `400` missing `property_name`, missing/unknown type
(`{"detail": "field spec 'cores' missing type"}`), or invalid identifier.

### 2.3 Objects

An object is an instance: one `object_instance` row plus one binding per
field (`object_attribute_value` → typed `value` row).

#### `GET /api/shrapnel/objects`

**Query params:** `limit` (default 100), `offset` (default 0), `decode`
(boolean, default false). With `decode=true`, each entry gains a `values`
object with the typed, decoded payload.

**Response 200 (without decode):**

```json
{
  "objects": [
    { "id": 41, "created_at": "2026-08-27T10:00:00Z" }
  ]
}
```

**Response 200 (with `?decode=true`):**

```json
{
  "objects": [
    { "id": 41, "created_at": "2026-08-27T10:00:00Z", "values": { "cores": 4, "uptime_s": 123.5, "healthy": true } }
  ]
}
```

#### `GET /api/shrapnel/objects/{object_id}`

**Response 200:** always decoded:

```json
{
  "object": {
    "id": 41,
    "created_at": "2026-08-27T10:00:00Z",
    "values": { "cores": 4, "uptime_s": 123.5, "healthy": true }
  }
}
```

**Errors:** `404` `{"detail": "not_found"}`.

#### `GET /api/shrapnel/objects/{object_id}/values` — raw bindings

The undecoded join rows — one entry per bound field. Useful for debugging or
for rendering the type alongside the value.

**Response 200:**

```json
{
  "object_id": 41,
  "values": [
    { "field_id": 12, "property_name": "cores", "label": "CPU cores", "name": "cores", "field_type_code": 1, "value_id": 88, "bound_at": "2026-08-27T10:00:01Z" }
  ]
}
```

**Errors:** `404` `{"detail": "not_found"}` if the object does not exist.

#### `POST /api/shrapnel/objects` — create an object

Creates (upserting) the referenced fields and stores one typed value per
field, in one transaction.

**Request body (`EncodePayload`):** `values` is required. `fields` is
optional — when omitted, types are **inferred** from the values (int →
Long, float → Double, bool → Boolean, ISO timestamp → Timestamp, UUID →
UUID, object/array → JSONB, else String).

```json
{
  "fields": [
    { "property_name": "cores", "type": "Long" },
    { "property_name": "uptime_s", "type": "Double" },
    { "property_name": "healthy", "type": "Boolean" },
    { "property_name": "meta", "type": "JSONB" }
  ],
  "values": {
    "cores": 4,
    "uptime_s": 123.5,
    "healthy": true,
    "meta": { "env": "prod", "region": "us-east" }
  }
}
```

**Response 201:** the stored object's id and the normalized field specs
(types resolved to codes):

```json
{
  "object_id": 41,
  "fields": [
    { "is_calculated": false, "field_index": 1, "label": "cores", "name": "cores", "property_name": "cores", "field_type_code": 1 },
    { "is_calculated": false, "field_index": 2, "label": "uptime_s", "name": "uptime_s", "property_name": "uptime_s", "field_type_code": 3 },
    { "is_calculated": false, "field_index": 3, "label": "healthy", "name": "healthy", "property_name": "healthy", "field_type_code": 4 },
    { "is_calculated": false, "field_index": 4, "label": "meta", "name": "meta", "property_name": "meta", "field_type_code": 6 }
  ]
}
```

**Encode semantics to know:**

- `null` values are **skipped** (not stored) — the extension tables do not
  allow NULL. A `null` with an explicit field spec still creates the field,
  just no value row.
- A `null` value **without** explicit fields is a `400` — the type cannot be
  inferred from null.
- Type coercion is strict per code: a `"Long"` spec with a string value
  coerces via `int(...)`; a failure is a `400` `{"detail": "invalid data: ..."}`.
- `fields[].property_name` must match a key in `values` to be stored;
  specs for missing keys create the field but store nothing.

#### `DELETE /api/shrapnel/objects/{object_id}`

Deletes the object and its value bindings. **Response 200:**

```json
{ "deleted": 41 }
```

**Errors:** `404` `{"detail": "not_found"}`.

### 2.4 `POST /api/shrapnel/encode` — encode + return decoded view

Identical to `POST /api/shrapnel/objects` but the response also echoes the
decoded object — the round-trip check. Use this when the frontend needs to
confirm what was actually stored (e.g. coercion results).

**Request body:** same `EncodePayload` as 2.3.

**Response 201:**

```json
{
  "object_id": 41,
  "fields": [ ...same normalized field specs as above... ],
  "decoded": { "cores": 4, "uptime_s": 123.5, "healthy": true, "meta": { "env": "prod", "region": "us-east" } }
}
```

**Errors:** same as `POST /api/shrapnel/objects`.

---

## 3. Evaluate — SOLScript

The evaluate surface wraps the live `solscript` interpreter (included
editable from `nexus/python/SOLScript`, never copied). The interpreter is a
**lazy singleton**: loaded from the `sol` database on first use, cached in
memory, and rebuilt by `POST /api/evaluate/refresh`. Because the singleton
is loaded at first use, **write data first, then call `refresh`** (or rely
on the first call after data is written).

### 3.1 `GET /api/evaluate/status`

Interpreter load status and the loaded counts.

**Response 200:**

```json
{
  "loaded": true,
  "counts": {
    "concepts": 2,
    "entities": 3,
    "propositions": 1,
    "rules": 4,
    "expressions": 6,
    "representations": 2,
    "frame_dimensions": 2
  }
}
```

### 3.2 `POST /api/evaluate/refresh`

Rebuilds the interpreter from current database state.

**Response 200:**

```json
{ "reloaded": true, "counts": { "concepts": 2, "entities": 3, "propositions": 1 } }
```

### 3.3 `POST /api/evaluate/proposition/{proposition_id}`

Evaluate a proposition against its assertion rules. Optional frame context
filters or provides the context the proposition is evaluated in.

**Request body:**

```json
{ "context": { "environment": "prod" } }
```

`context` is optional — omit or send `{}`.

**Response 200:**

```json
{
  "proposition_id": "a1b2...",
  "title": "host-b has sufficient cores",
  "disposition": "Asserted",
  "all_passed": true,
  "context_status": "scoped"
}
```

**Fields:**

| Field | Type | Values |
|---|---|---|
| `disposition` | string \| null | `Asserted` \| `Disputed` \| `Rejected` \| `Pending` \| `Proposed` \| `Stale` \| `Retracted`, or `null` |
| `all_passed` | boolean | every assertion rule passed |
| `context_status` | string | `not_scoped` \| `context_required` \| `context_mismatch` \| `scoped` |

**Errors:** `404` `{"detail": "proposition not found: {id}"}`; `422`
`{"detail": "evaluation error: ..."}` when the proposition cannot be
evaluated (e.g. missing required context).

### 3.4 `POST /api/evaluate/reason`

Run the reasoner over an entity. Deterministic by default; `hybrid: true`
uses the hybrid engine (LLM-assisted — only if an LLM is configured;
without one it degrades to deterministic and emits `__needs_llm` markers).

**Request body:**

```json
{
  "entity_id": "e1b2...",
  "context": { "environment": "prod" },
  "hybrid": false
}
```

**Response 200:** an open object — the fixed identity fields plus every
derived key the reasoner produced (rule conclusions, derived attributes,
and the markers `__confidence`, `__needs_llm`, `__unknowns` when present):

```json
{
  "entity_id": "e1b2...",
  "external_id": "host-b",
  "concept_id": "d3a4...",
  "cpu_adequate": true,
  "__confidence": 1.0,
  "__unknowns": []
}
```

**Errors:** `404` `{"detail": "entity not found: {id}"}`.

### 3.5 `POST /api/evaluate/check-entity`

Run **every invariant rule** of the entity's concept and report per-rule
pass/fail with the evaluator's reason. This is where invariant enforcement
surfaces (the `/reason` endpoint only reports derivations/conditionals, not
violations).

**Request body:**

```json
{ "entity_id": "e1b2...", "context": { "environment": "prod" } }
```

**Response 200:**

```json
{
  "entity_id": "e1b2...",
  "concept_id": "d3a4...",
  "concept_name": "Host",
  "all_passed": false,
  "rules": [
    {
      "rule_id": "r7c9...",
      "rule_name": "cores must be positive",
      "passed": true,
      "reason": "evaluated: cores = 4 > 0"
    },
    {
      "rule_id": "r8d0...",
      "rule_name": "uptime must be non-negative",
      "passed": false,
      "reason": "evaluated: uptime_s = -3.5 >= 0 → false"
    }
  ]
}
```

**Errors:** `404` `{"detail": "entity not found: {id}"}` or
`{"detail": "concept not found: {id}"}`.

---

## 4. Worked flow — what a frontend page would call

1. `GET /health` → confirm service.
2. `GET /api/schemas` → discover what's available.
3. `GET /api/shrapnel/field-types` → populate a type dropdown.
4. `POST /api/shrapnel/encode` with `{values: {...}}` → create an object,
   get back `object_id` + `decoded` (confirm coercion).
5. `GET /api/shrapnel/objects/{object_id}` → read it back decoded.
6. `POST /api/evaluate/refresh` → load the new entity into the interpreter.
7. `POST /api/evaluate/check-entity` with `{entity_id}` → render per-rule
   invariant results.
8. `POST /api/evaluate/reason` with `{entity_id}` → render derived facts.
9. `POST /api/evaluate/proposition/{proposition_id}` → show disposition.

---

## 5. Appendix — full route index

| Method | Path | Section |
|---|---|---|
| GET | `/health` | 1.1 |
| GET | `/api/schemas` | 1.2 |
| GET | `/api/{schema}/{table}` | 1.3.1 |
| GET | `/api/{schema}/{table}/{pk}` | 1.3.2 |
| POST | `/api/{schema}/{table}` | 1.3.3 |
| PUT | `/api/{schema}/{table}/{pk}` | 1.3.4 |
| DELETE | `/api/{schema}/{table}/{pk}` | 1.3.5 |
| GET | `/api/shrapnel/field-types` | 2.1 |
| GET | `/api/shrapnel/field-types/{code}` | 2.1 |
| GET | `/api/shrapnel/fields` | 2.2 |
| GET | `/api/shrapnel/fields/{field_id}` | 2.2 |
| POST | `/api/shrapnel/fields` | 2.2 |
| GET | `/api/shrapnel/objects` | 2.3 |
| GET | `/api/shrapnel/objects/{object_id}` | 2.3 |
| GET | `/api/shrapnel/objects/{object_id}/values` | 2.3 |
| POST | `/api/shrapnel/objects` | 2.3 |
| DELETE | `/api/shrapnel/objects/{object_id}` | 2.3 |
| POST | `/api/shrapnel/encode` | 2.4 |
| GET | `/api/evaluate/status` | 3.1 |
| POST | `/api/evaluate/refresh` | 3.2 |
| POST | `/api/evaluate/proposition/{proposition_id}` | 3.3 |
| POST | `/api/evaluate/reason` | 3.4 |
| POST | `/api/evaluate/check-entity` | 3.5 |

*Contract source of truth: `typespec/` (compiles to OpenAPI 3.1). Python
implementation: `sol_api/` — `main.py` (gateway), `routes/shrapnel.py`,
`routes/evaluate.py`, `shrapnel.py` (encode/decode lib).*
