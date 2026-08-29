/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_chatCompletions from "../ai/chatCompletions.js";
import type * as ai_provider from "../ai/provider.js";
import type * as ai_types from "../ai/types.js";
import type * as extraction_contractV1 from "../extraction/contractV1.js";
import type * as extraction_extract from "../extraction/extract.js";
import type * as extraction_ledger from "../extraction/ledger.js";
import type * as extraction_prepare from "../extraction/prepare.js";
import type * as extraction_promptV1 from "../extraction/promptV1.js";
import type * as extraction_textMatch from "../extraction/textMatch.js";
import type * as extraction_validate from "../extraction/validate.js";
import type * as extraction_workflow from "../extraction/workflow.js";
import type * as http from "../http.js";
import type * as operations_discover from "../operations/discover.js";
import type * as operations_extract from "../operations/extract.js";
import type * as operations_ingest from "../operations/ingest.js";
import type * as operations_publication from "../operations/publication.js";
import type * as operations_seed from "../operations/seed.js";
import type * as pipeline_keys from "../pipeline/keys.js";
import type * as pipeline_runs from "../pipeline/runs.js";
import type * as pipeline_state from "../pipeline/state.js";
import type * as pipeline_workflowManager from "../pipeline/workflowManager.js";
import type * as publication_evidenceRulesV1 from "../publication/evidenceRulesV1.js";
import type * as publication_ledger from "../publication/ledger.js";
import type * as publication_policyV1 from "../publication/policyV1.js";
import type * as publication_workflow from "../publication/workflow.js";
import type * as review_contractV1 from "../review/contractV1.js";
import type * as review_ledger from "../review/ledger.js";
import type * as review_prepare from "../review/prepare.js";
import type * as review_promptV1 from "../review/promptV1.js";
import type * as review_review from "../review/review.js";
import type * as sources_discovery from "../sources/discovery.js";
import type * as sources_domains from "../sources/domains.js";
import type * as sources_hashing from "../sources/hashing.js";
import type * as sources_metadata from "../sources/metadata.js";
import type * as sources_rawArtifact from "../sources/rawArtifact.js";
import type * as sources_registries from "../sources/registries.js";
import type * as sources_snapshots from "../sources/snapshots.js";
import type * as sources_storageCleanup from "../sources/storageCleanup.js";
import type * as system_aiGateway from "../system/aiGateway.js";
import type * as system_status from "../system/status.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/chatCompletions": typeof ai_chatCompletions;
  "ai/provider": typeof ai_provider;
  "ai/types": typeof ai_types;
  "extraction/contractV1": typeof extraction_contractV1;
  "extraction/extract": typeof extraction_extract;
  "extraction/ledger": typeof extraction_ledger;
  "extraction/prepare": typeof extraction_prepare;
  "extraction/promptV1": typeof extraction_promptV1;
  "extraction/textMatch": typeof extraction_textMatch;
  "extraction/validate": typeof extraction_validate;
  "extraction/workflow": typeof extraction_workflow;
  http: typeof http;
  "operations/discover": typeof operations_discover;
  "operations/extract": typeof operations_extract;
  "operations/ingest": typeof operations_ingest;
  "operations/publication": typeof operations_publication;
  "operations/seed": typeof operations_seed;
  "pipeline/keys": typeof pipeline_keys;
  "pipeline/runs": typeof pipeline_runs;
  "pipeline/state": typeof pipeline_state;
  "pipeline/workflowManager": typeof pipeline_workflowManager;
  "publication/evidenceRulesV1": typeof publication_evidenceRulesV1;
  "publication/ledger": typeof publication_ledger;
  "publication/policyV1": typeof publication_policyV1;
  "publication/workflow": typeof publication_workflow;
  "review/contractV1": typeof review_contractV1;
  "review/ledger": typeof review_ledger;
  "review/prepare": typeof review_prepare;
  "review/promptV1": typeof review_promptV1;
  "review/review": typeof review_review;
  "sources/discovery": typeof sources_discovery;
  "sources/domains": typeof sources_domains;
  "sources/hashing": typeof sources_hashing;
  "sources/metadata": typeof sources_metadata;
  "sources/rawArtifact": typeof sources_rawArtifact;
  "sources/registries": typeof sources_registries;
  "sources/snapshots": typeof sources_snapshots;
  "sources/storageCleanup": typeof sources_storageCleanup;
  "system/aiGateway": typeof system_aiGateway;
  "system/status": typeof system_status;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  firecrawl: import("@firecrawl/firecrawl-convex/_generated/component.js").ComponentApi<"firecrawl">;
};
