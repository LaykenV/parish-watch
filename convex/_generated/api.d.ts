/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as operations_ingest from "../operations/ingest.js";
import type * as operations_seed from "../operations/seed.js";
import type * as pipeline_runs from "../pipeline/runs.js";
import type * as pipeline_state from "../pipeline/state.js";
import type * as sources_domains from "../sources/domains.js";
import type * as sources_hashing from "../sources/hashing.js";
import type * as sources_registries from "../sources/registries.js";
import type * as sources_snapshots from "../sources/snapshots.js";
import type * as system_aiGateway from "../system/aiGateway.js";
import type * as system_status from "../system/status.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "operations/ingest": typeof operations_ingest;
  "operations/seed": typeof operations_seed;
  "pipeline/runs": typeof pipeline_runs;
  "pipeline/state": typeof pipeline_state;
  "sources/domains": typeof sources_domains;
  "sources/hashing": typeof sources_hashing;
  "sources/registries": typeof sources_registries;
  "sources/snapshots": typeof sources_snapshots;
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
  firecrawl: import("@firecrawl/firecrawl-convex/_generated/component.js").ComponentApi<"firecrawl">;
};
