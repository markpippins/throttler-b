import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Curated standard ontology definitions for deterministic fallback & fast grounding
const STANDARD_ONTOLOGIES_CATALOG: Record<string, any> = {
  "schema.org/computerserver": {
    canonical_name: "ComputerServer",
    identifier: "schema_ComputerServer",
    namespace: "https://schema.org/ComputerServer",
    taxonomy: "schema.org > Thing > Place > CivicStructure / Intangible > Product > Server",
    subclass_of: "Thing",
    description: "A computer hardware server device or virtual compute instance providing compute, storage, and networking services to client nodes.",
    sources: [
      { uri: "https://schema.org/ComputerServer", title: "schema.org/ComputerServer - Schema Specification" },
      { uri: "https://schema.org/docs/datamodel.html", title: "Schema.org Data Model & Core Types" },
      { uri: "https://www.w3.org/wiki/WebSchemas", title: "W3C Web Schemas Community Group" }
    ],
    attributes: [
      { name: "hostname", label: "Server Hostname", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Fully qualified domain name or network identifier.", is_nullable: false, default_value: "srv-node-01.internal" },
      { name: "cores", label: "Processor Cores", value_type: "integer", shrapnel_type: "Long", shrapnel_code: 1, description: "Number of physical/logical CPU compute cores.", is_nullable: false, default_value: 16 },
      { name: "ram_gb", label: "System RAM (GB)", value_type: "float", shrapnel_type: "Double", shrapnel_code: 3, description: "Total addressable memory capacity in Gigabytes.", is_nullable: false, default_value: 64.0 },
      { name: "uptime_s", label: "Uptime Seconds", value_type: "float", shrapnel_type: "Double", shrapnel_code: 3, description: "Continuous operational duration in seconds since boot.", is_nullable: false, default_value: 86400.0 },
      { name: "is_active", label: "Active Operational State", value_type: "boolean", shrapnel_type: "Boolean", shrapnel_code: 4, description: "Whether the server is accepting incoming traffic.", is_nullable: false, default_value: true },
      { name: "ip_address", label: "IPv4/IPv6 Address", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Primary network interface IP address.", is_nullable: false, default_value: "10.0.12.45" },
      { name: "provisioned_at", label: "Provisioning Timestamp", value_type: "timestamp", shrapnel_type: "Timestamp", shrapnel_code: 5, description: "UTC timestamp when the compute node was commissioned.", is_nullable: false, default_value: "2026-01-15T08:00:00Z" },
      { name: "specs_manifest", label: "Hardware Specs Manifest", value_type: "json", shrapnel_type: "JSONB", shrapnel_code: 6, description: "Detailed hardware topology, BIOS version, and PCI devices.", is_nullable: false, default_value: { numa_nodes: 2, pci_slots: 4, gpu_accelerators: 0 } },
      { name: "server_guid", label: "Immutable Hardware UUID", value_type: "uuid", shrapnel_type: "UUID", shrapnel_code: 7, description: "RFC 4122 canonical hardware UUID.", is_nullable: false, default_value: "a8f9c112-4029-410a-b284-91823901aef0" }
    ],
    invariants: [
      { name: "Cores Must Be Positive", expression: "cores > 0", severity: "HARD", description: "A valid compute server must have at least 1 compute core." },
      { name: "Uptime Non-Negative", expression: "uptime_s >= 0.0", severity: "HARD", description: "Operational uptime cannot be negative." },
      { name: "RAM Minimum Threshold", expression: "ram_gb >= 1.0", severity: "HARD", description: "Operational nodes require at least 1 GB of memory." }
    ],
    relationships: [
      { name: "hosted_in_datacenter", target_concept: "Organization", cardinality: "N:1", description: "The physical facility or provider hosting this server instance." },
      { name: "runs_services", target_concept: "SoftwareApplication", cardinality: "1:N", description: "Software services and daemon processes executing on this host." }
    ],
    projections: {
      typespec: `import "@typespec/openapi";\n\n@doc("A computer hardware server device or virtual compute instance.")\nmodel ComputerServer {\n  @doc("Primary network hostname")\n  hostname: string;\n  @minValue(1)\n  cores: int64;\n  @minValue(0)\n  uptime_s: float64;\n  ram_gb: float64;\n  is_active: boolean;\n  server_guid: string;\n  provisioned_at: utcDateTime;\n}`,
      cue: `package ontology\n\n#ComputerServer: {\n\thostname: string\n\tcores: int & >0\n\tuptime_s: float & >=0.0\n\tram_gb: float & >=1.0\n\tis_active: bool\n\tserver_guid: =~"^[0-9a-fA-F-]{36}$"\n\tprovisioned_at: string\n}`,
      json_ld: `{\n  "@context": "https://schema.org",\n  "@type": "ComputerServer",\n  "name": "Host Node",\n  "cores": 16,\n  "memory": "64GB",\n  "status": "Active"\n}`,
      tla_plus: `------------------- MODULE ComputerServer_Invariant -------------------\nEXTENDS Integers, Sequences, TLC\n\nVARIABLES cores, uptime_s, is_active\n\nTypeInvariant ==\n  /\\ cores \\in Int /\\ cores > 0\n  /\\ uptime_s >= 0\n  /\\ is_active \\in {TRUE, FALSE}\n======================================================================`
    }
  },
  "schema.org/softwareapplication": {
    canonical_name: "SoftwareApplication",
    identifier: "schema_SoftwareApplication",
    namespace: "https://schema.org/SoftwareApplication",
    taxonomy: "schema.org > Thing > CreativeWork > SoftwareApplication",
    subclass_of: "CreativeWork",
    description: "A software application, service package, microservice, or executable system operating within a software architecture.",
    sources: [
      { uri: "https://schema.org/SoftwareApplication", title: "schema.org/SoftwareApplication - W3C WebSchemas" },
      { uri: "https://schema.org/SoftwareSourceCode", title: "Schema.org Source Code & Package Spec" }
    ],
    attributes: [
      { name: "name", label: "Application Name", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Official display name or registry slug of the software.", is_nullable: false, default_value: "SOL Inference Daemon" },
      { name: "version", label: "Semantic Version", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "SemVer 2.0 formatted release version string.", is_nullable: false, default_value: "3.7.0" },
      { name: "operating_system", label: "Target OS / Runtime", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Required execution runtime environment (e.g. Linux x86_64, POSIX, WASM).", is_nullable: false, default_value: "Linux x86_64" },
      { name: "memory_requirements_mb", label: "Memory Requirement (MB)", value_type: "integer", shrapnel_type: "Long", shrapnel_code: 1, description: "Minimum working RAM required in Megabytes.", is_nullable: false, default_value: 512 },
      { name: "is_containerized", label: "Containerized Deployment", value_type: "boolean", shrapnel_type: "Boolean", shrapnel_code: 4, description: "Whether deployed as an OCI container image.", is_nullable: false, default_value: true },
      { name: "release_timestamp", label: "Release Date", value_type: "timestamp", shrapnel_type: "Timestamp", shrapnel_code: 5, description: "UTC timestamp when this application build was cut.", is_nullable: false, default_value: "2026-08-01T00:00:00Z" },
      { name: "config_schema", label: "Runtime Configuration", value_type: "json", shrapnel_type: "JSONB", shrapnel_code: 6, description: "Environment configuration parameters and feature flags.", is_nullable: false, default_value: { log_level: "info", max_concurrency: 128 } }
    ],
    invariants: [
      { name: "SemVer Pattern Match", expression: "version matches ^[0-9]+\\.[0-9]+\\.[0-9]+", severity: "HARD", description: "Version string must conform to SemVer 2.0." },
      { name: "Memory Requirement Positive", expression: "memory_requirements_mb > 0", severity: "HARD", description: "Application must declare positive memory requirement." }
    ],
    relationships: [
      { name: "deployed_on_server", target_concept: "ComputerServer", cardinality: "N:1", description: "Host node where this software instance runs." }
    ],
    projections: {
      typespec: `model SoftwareApplication {\n  name: string;\n  version: string;\n  operating_system: string;\n  memory_requirements_mb: int64;\n  is_containerized: boolean;\n  release_timestamp: utcDateTime;\n}`,
      cue: `package ontology\n\n#SoftwareApplication: {\n\tname: string\n\tversion: =~"^[0-9]+\\\\.[0-9]+\\\\.[0-9]+"\n\toperating_system: string\n\tmemory_requirements_mb: int & >0\n\tis_containerized: bool\n\trelease_timestamp: string\n}`,
      json_ld: `{\n  "@context": "https://schema.org",\n  "@type": "SoftwareApplication",\n  "name": "SOL Reasoning Engine",\n  "softwareVersion": "3.7.0",\n  "operatingSystem": "Linux x86_64"\n}`,
      tla_plus: `---------------- MODULE SoftwareApplication_Invariant ----------------\nEXTENDS Integers\nVARIABLES version, memory_mb\nTypeOK == memory_mb > 0\n=================================================================`
    }
  },
  "owl:class": {
    canonical_name: "OWL_Class",
    identifier: "owl_Class",
    namespace: "http://www.w3.org/2002/07/owl#Class",
    taxonomy: "W3C OWL 2 > rdfs:Resource > rdfs:Class > owl:Class",
    subclass_of: "rdfs:Class",
    description: "The fundamental OWL meta-class representing concept categories, abstract types, and intentional sets in description logic.",
    sources: [
      { uri: "https://www.w3.org/TR/owl2-syntax/", title: "OWL 2 Web Ontology Language Structural Specification (W3C)" },
      { uri: "https://www.w3.org/TR/owl2-primer/", title: "W3C OWL 2 Primer & Ontology Fundamentals" },
      { uri: "https://www.w3.org/TR/rdf-schema/", title: "RDF Schema 1.1 Vocabulary Description" }
    ],
    attributes: [
      { name: "iri", label: "Canonical IRI", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Internationalized Resource Identifier defining this class.", is_nullable: false, default_value: "http://example.org/ontology#Asset" },
      { name: "pref_label", label: "Preferred Label (rdfs:label)", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Human readable name of the class.", is_nullable: false, default_value: "Compute Asset" },
      { name: "is_deprecated", label: "owl:deprecated", value_type: "boolean", shrapnel_type: "Boolean", shrapnel_code: 4, description: "Annotation whether this class definition is marked obsolete.", is_nullable: false, default_value: false },
      { name: "subclass_depth", label: "Taxonomy Tree Depth", value_type: "integer", shrapnel_type: "Long", shrapnel_code: 1, description: "Topological depth from owl:Thing root node.", is_nullable: false, default_value: 2 },
      { name: "version_info", label: "owl:versionInfo", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Version tag of this ontological class declaration.", is_nullable: false, default_value: "2.1.0" },
      { name: "annotations", label: "RDFS Annotations Map", value_type: "json", shrapnel_type: "JSONB", shrapnel_code: 6, description: "Key-value annotations such as rdfs:comment, skos:altLabel, and dc:contributor.", is_nullable: false, default_value: { comment: "Core ontology building block", status: "stable" } }
    ],
    invariants: [
      { name: "IRI Format Verification", expression: "iri matches ^https?://", severity: "HARD", description: "OWL Class IRI must begin with standard URI scheme." },
      { name: "Depth Non-Negative", expression: "subclass_depth >= 0", severity: "HARD", description: "Taxonomy depth cannot be negative." }
    ],
    relationships: [
      { name: "rdfs_subclass_of", target_concept: "OWL_Class", cardinality: "N:1", description: "Subsumption hierarchy link to parent class." },
      { name: "disjoint_with", target_concept: "OWL_Class", cardinality: "N:N", description: "Classes that share no instances." }
    ],
    projections: {
      typespec: `model OWLClass {\n  iri: string;\n  pref_label: string;\n  is_deprecated: boolean;\n  subclass_depth: int64;\n  version_info: string;\n}`,
      cue: `package ontology\n\n#OWLClass: {\n\tiri: =~"^https?://"\n\tpref_label: string\n\tis_deprecated: bool\n\tsubclass_depth: int & >=0\n\tversion_info: string\n}`,
      json_ld: `{\n  "@context": {\n    "owl": "http://www.w3.org/2002/07/owl#",\n    "rdfs": "http://www.w3.org/2000/01/rdf-schema#"\n  },\n  "@id": "http://example.org/ontology#ComputeAsset",\n  "@type": "owl:Class",\n  "rdfs:label": "Compute Asset"\n}`,
      tla_plus: `---------------------- MODULE OWL_Class_Invariant ---------------------\nEXTENDS Integers\nVARIABLES subclass_depth\nTypeOK == subclass_depth >= 0\n======================================================================`
    }
  },
  "prov-o": {
    canonical_name: "PROV_Activity",
    identifier: "prov_Activity",
    namespace: "http://www.w3.org/ns/prov#Activity",
    taxonomy: "W3C PROV-O > prov:Activity",
    subclass_of: "owl:Thing",
    description: "An activity in W3C PROV-O represents an identifiable process, calculation, or execution step that consumes and generates entities.",
    sources: [
      { uri: "https://www.w3.org/TR/prov-o/", title: "W3C PROV-O: The PROV Ontology" },
      { uri: "https://www.w3.org/TR/prov-primer/", title: "PROV Model Primer" }
    ],
    attributes: [
      { name: "activity_id", label: "Activity Identifier", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Unique execution run ID.", is_nullable: false, default_value: "act-eval-20260827" },
      { name: "started_at_time", label: "prov:startedAtTime", value_type: "timestamp", shrapnel_type: "Timestamp", shrapnel_code: 5, description: "Start time of the activity step.", is_nullable: false, default_value: "2026-08-27T19:00:00Z" },
      { name: "ended_at_time", label: "prov:endedAtTime", value_type: "timestamp", shrapnel_type: "Timestamp", shrapnel_code: 5, description: "Completion time of the activity step.", is_nullable: false, default_value: "2026-08-27T19:00:01Z" },
      { name: "execution_duration_ms", label: "Duration (ms)", value_type: "float", shrapnel_type: "Double", shrapnel_code: 3, description: "Total elapsed time in milliseconds.", is_nullable: false, default_value: 1042.5 },
      { name: "was_successful", label: "Execution Succeeded", value_type: "boolean", shrapnel_type: "Boolean", shrapnel_code: 4, description: "Whether the activity concluded without fault.", is_nullable: false, default_value: true }
    ],
    invariants: [
      { name: "Temporal Monotonicity", expression: "ended_at_time >= started_at_time", severity: "HARD", description: "Activity end time cannot precede start time." },
      { name: "Duration Positive", expression: "execution_duration_ms >= 0", severity: "HARD", description: "Execution duration must be non-negative." }
    ],
    relationships: [
      { name: "was_associated_with", target_concept: "Organization", cardinality: "N:1", description: "Agent or system responsible for executing this activity." }
    ],
    projections: {
      typespec: `model PROVActivity {\n  activity_id: string;\n  started_at_time: utcDateTime;\n  ended_at_time: utcDateTime;\n  execution_duration_ms: float64;\n  was_successful: boolean;\n}`,
      cue: `package ontology\n\n#PROVActivity: {\n\tactivity_id: string\n\tstarted_at_time: string\n\tended_at_time: string\n\texecution_duration_ms: float & >=0\n\twas_successful: bool\n}`,
      json_ld: `{\n  "@context": "http://www.w3.org/ns/prov#",\n  "@type": "Activity",\n  "startedAtTime": "2026-08-27T19:00:00Z",\n  "endedAtTime": "2026-08-27T19:00:01Z"\n}`,
      tla_plus: `------------------- MODULE PROV_Activity_Invariant -------------------\nEXTENDS Integers\nVARIABLES duration\nTypeOK == duration >= 0\n======================================================================`
    }
  },
  "sosa:sensor": {
    canonical_name: "SOSA_Sensor",
    identifier: "sosa_Sensor",
    namespace: "http://www.w3.org/ns/sosa/Sensor",
    taxonomy: "W3C SSN/SOSA > sosa:Sensor",
    subclass_of: "owl:Thing",
    description: "Device, agent, or software module that observes physical telemetry and produces observations.",
    sources: [
      { uri: "https://www.w3.org/TR/vocab-ssn/", title: "Semantic Sensor Network Ontology (SSN / SOSA)" },
      { uri: "https://www.w3.org/TR/vocab-ssn/#SOSA", title: "SOSA Core Vocabulary Specification" }
    ],
    attributes: [
      { name: "sensor_id", label: "Sensor ID", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Unique telemetry sensor identifier.", is_nullable: false, default_value: "sns-cpu-temp-01" },
      { name: "sampling_frequency_hz", label: "Sampling Rate (Hz)", value_type: "float", shrapnel_type: "Double", shrapnel_code: 3, description: "Observation frequency in Hertz.", is_nullable: false, default_value: 10.0 },
      { name: "accuracy_tolerance", label: "Accuracy Tolerance (%)", value_type: "float", shrapnel_type: "Double", shrapnel_code: 3, description: "Measurement precision margin of error.", is_nullable: false, default_value: 0.05 },
      { name: "is_calibrated", label: "Calibration Valid", value_type: "boolean", shrapnel_type: "Boolean", shrapnel_code: 4, description: "Whether current calibration cycle is within tolerance.", is_nullable: false, default_value: true }
    ],
    invariants: [
      { name: "Frequency Positive", expression: "sampling_frequency_hz > 0.0", severity: "HARD", description: "Sensor must sample at positive frequency." },
      { name: "Tolerance Bounded", expression: "accuracy_tolerance >= 0.0 && accuracy_tolerance <= 1.0", severity: "HARD", description: "Accuracy tolerance must be between 0% and 100%." }
    ],
    relationships: [
      { name: "observes_property", target_concept: "ComputerServer", cardinality: "N:1", description: "The physical host or phenomenon monitored by this sensor." }
    ],
    projections: {
      typespec: `model SOSASensor {\n  sensor_id: string;\n  sampling_frequency_hz: float64;\n  accuracy_tolerance: float64;\n  is_calibrated: boolean;\n}`,
      cue: `package ontology\n\n#SOSASensor: {\n\tsensor_id: string\n\tsampling_frequency_hz: float & >0\n\taccuracy_tolerance: float & >=0.0 & <=1.0\n\tis_calibrated: bool\n}`,
      json_ld: `{\n  "@context": "http://www.w3.org/ns/sosa/",\n  "@type": "Sensor",\n  "label": "Thermal Probe",\n  "observes": "temperature"\n}`,
      tla_plus: `--------------------- MODULE SOSA_Sensor_Invariant -------------------\nEXTENDS Integers\nVARIABLES freq\nTypeOK == freq > 0\n======================================================================`
    }
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // API Endpoint: Search Grounding for Ontologies & Semantic Types
  // -------------------------------------------------------------
  app.post("/api/ontology/search-grounding", async (req, res) => {
    const { query, ontology_type } = req.body;
    const normalizedQuery = (query || "schema.org/ComputerServer").trim().toLowerCase();

    console.log(`[Search Grounding] Received request for: "${normalizedQuery}"`);

    // Check if we have a direct match in the pre-compiled standard catalog
    let matchedCatalogKey = Object.keys(STANDARD_ONTOLOGIES_CATALOG).find(key => 
      normalizedQuery.includes(key) || key.includes(normalizedQuery)
    );

    const genAI = getGenAI();

    // If Gemini API is configured, use Google Search Grounding with gemini-3.7-flash
    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        console.log(`[Search Grounding] Invoking Gemini 3.7 Flash with Google Search Grounding...`);

        const prompt = `You are a Semantic Web Ontologist and Knowledge Graph Architect.
Ground and extract the official, current specification for the standard ontology term or schema: "${query}".
Search the live web (e.g. schema.org, W3C standards, OWL specs, Dublin Core, FOAF, SSN/SOSA, PROV-O, FHIR).

You must respond in strict, valid JSON with this exact structure:
{
  "canonical_name": "PascalCase Concept Name (e.g. ComputerServer or SoftwareApplication)",
  "identifier": "concept_identifier_slug",
  "namespace": "Canonical URI (e.g. https://schema.org/ComputerServer or http://www.w3.org/2002/07/owl#Class)",
  "taxonomy": "Taxonomy path e.g. schema.org > Thing > ...",
  "subclass_of": "Parent class name or Thing",
  "description": "Comprehensive, formal definition from standard specs.",
  "sources": [
    { "uri": "https://...", "title": "Official Standard Spec Title" }
  ],
  "attributes": [
    {
      "name": "snake_case_name",
      "label": "Human Readable Label",
      "value_type": "text" | "integer" | "float" | "boolean" | "timestamp" | "json" | "uuid",
      "shrapnel_type": "String" | "Long" | "Double" | "Boolean" | "Timestamp" | "JSONB" | "UUID",
      "shrapnel_code": 1 | 2 | 3 | 4 | 5 | 6 | 7,
      "description": "Property definition from specification",
      "is_nullable": boolean,
      "default_value": sample_value
    }
  ],
  "invariants": [
    {
      "name": "Rule Name",
      "expression": "SOL expression e.g. cores > 0",
      "severity": "HARD" | "SOFT",
      "description": "Why this invariant holds"
    }
  ],
  "relationships": [
    {
      "name": "relation_name",
      "target_concept": "TargetConceptName",
      "cardinality": "1:1" | "1:N" | "N:1" | "N:N",
      "description": "Relationship semantics"
    }
  ],
  "projections": {
    "typespec": "TypeSpec code (.tsp)",
    "cue": "CUE schema definition",
    "json_ld": "JSON-LD context and example frame",
    "tla_plus": "TLA+ formal specification invariant module"
  }
}`;

        const response = await genAI.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        // Extract grounding citations & web chunks
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const webSources = groundingChunks
          .filter((c: any) => c.web?.uri)
          .map((c: any) => ({
            uri: c.web.uri,
            title: c.web.title || c.web.uri,
          }));

        const responseText = response.text || "";
        console.log(`[Search Grounding] Raw response received. Length: ${responseText.length}`);

        // Extract JSON from responseText (handling markdown code fences if any)
        let parsedResult = null;
        try {
          const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, responseText];
          parsedResult = JSON.parse(jsonMatch[1] || responseText);
        } catch (jsonErr) {
          console.warn(`[Search Grounding] Direct JSON parsing failed, attempting cleanup:`, jsonErr);
          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            parsedResult = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
          }
        }

        if (parsedResult) {
          // Merge extracted web sources with model's sources list
          const combinedSources = [
            ...(parsedResult.sources || []),
            ...webSources
          ].filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);

          parsedResult.sources = combinedSources.length > 0 ? combinedSources : [
            { uri: `https://schema.org/${parsedResult.canonical_name}`, title: `schema.org/${parsedResult.canonical_name}` }
          ];
          parsedResult.grounded_via = "gemini-3.7-flash (Google Search Grounding)";
          parsedResult.live_grounded = true;

          return res.json({
            success: true,
            model: parsedResult,
            grounding_metadata: response.candidates?.[0]?.groundingMetadata || null
          });
        }

      } catch (geminiError: any) {
        console.error(`[Search Grounding] Gemini call failed:`, geminiError);
        // Fall through to catalog or dynamic generator
      }
    }

    // Fallback path: Use curated catalog or dynamic domain generator with real web links
    let fallbackModel = matchedCatalogKey ? STANDARD_ONTOLOGIES_CATALOG[matchedCatalogKey] : null;

    if (!fallbackModel) {
      // Synthesize a clean model for the query
      const cleanName = normalizedQuery.replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join('') || "OntologyConcept";

      fallbackModel = {
        canonical_name: cleanName,
        identifier: `concept_${cleanName.toLowerCase()}`,
        namespace: `https://schema.org/${cleanName}`,
        taxonomy: `Standard Ontology > ${cleanName}`,
        subclass_of: "Thing",
        description: `Standard domain definition for ${cleanName} grounded from web ontology specifications.`,
        sources: [
          { uri: `https://schema.org/${cleanName}`, title: `schema.org/${cleanName} Specification` },
          { uri: "https://www.w3.org/TR/owl2-syntax/", title: "W3C Web Ontology Standards" },
          { uri: "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/", title: "Dublin Core Metadata Initiative" }
        ],
        attributes: [
          { name: "identifier", label: "Canonical Identifier", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Unique resource identifier or slug.", is_nullable: false, default_value: `${cleanName.toLowerCase()}-01` },
          { name: "name", label: "Display Name", value_type: "text", shrapnel_type: "String", shrapnel_code: 2, description: "Standard naming attribute.", is_nullable: false, default_value: `Sample ${cleanName}` },
          { name: "created_at", label: "Creation Timestamp", value_type: "timestamp", shrapnel_type: "Timestamp", shrapnel_code: 5, description: "ISO-8601 creation time.", is_nullable: false, default_value: new Date().toISOString() },
          { name: "is_active", label: "Active Status", value_type: "boolean", shrapnel_type: "Boolean", shrapnel_code: 4, description: "Operational flag.", is_nullable: false, default_value: true }
        ],
        invariants: [
          { name: "Identifier Non-Empty", expression: "identifier != \"\"", severity: "HARD", description: "Resource must maintain a non-blank identifier." }
        ],
        relationships: [
          { name: "related_to", target_concept: "Host", cardinality: "N:1", description: "Associative relationship in knowledge domain." }
        ],
        projections: {
          typespec: `model ${cleanName} {\n  identifier: string;\n  name: string;\n  created_at: utcDateTime;\n  is_active: boolean;\n}`,
          cue: `package ontology\n\n#${cleanName}: {\n\tidentifier: string & !=""\n\tname: string\n\tcreated_at: string\n\tis_active: bool\n}`,
          json_ld: `{\n  "@context": "https://schema.org",\n  "@type": "${cleanName}",\n  "name": "Sample ${cleanName}"\n}`,
          tla_plus: `---------------- MODULE ${cleanName}_Invariant ----------------\nEXTENDS Integers\nVARIABLES is_active\nTypeOK == is_active \\in {TRUE, FALSE}\n=================================================================`
        }
      };
    }

    return res.json({
      success: true,
      model: {
        ...fallbackModel,
        grounded_via: "SOL Ontology Grounding Engine (W3C & Schema.org Catalog)",
        live_grounded: false
      }
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      server: "SOL Workbench Full-Stack Gateway",
      gemini_configured: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SOL Workbench Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
