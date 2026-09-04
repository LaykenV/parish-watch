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
import type * as analytics_contracts from "../analytics/contracts.js";
import type * as analytics_events from "../analytics/events.js";
import type * as analytics_http from "../analytics/http.js";
import type * as analytics_report from "../analytics/report.js";
import type * as analytics_retention from "../analytics/retention.js";
import type * as ask_answer from "../ask/answer.js";
import type * as ask_contracts from "../ask/contracts.js";
import type * as ask_evidence from "../ask/evidence.js";
import type * as ask_ledger from "../ask/ledger.js";
import type * as ask_limits from "../ask/limits.js";
import type * as ask_sessions from "../ask/sessions.js";
import type * as ask_threads from "../ask/threads.js";
import type * as auth from "../auth.js";
import type * as auth_authorization from "../auth/authorization.js";
import type * as auth_users from "../auth/users.js";
import type * as changes_material from "../changes/material.js";
import type * as changes_source from "../changes/source.js";
import type * as coverage_candidates from "../coverage/candidates.js";
import type * as coverage_classifier from "../coverage/classifier.js";
import type * as coverage_contracts from "../coverage/contracts.js";
import type * as coverage_discovery from "../coverage/discovery.js";
import type * as coverage_discoveryLedger from "../coverage/discoveryLedger.js";
import type * as coverage_ledger from "../coverage/ledger.js";
import type * as coverage_operations from "../coverage/operations.js";
import type * as coverage_redirectWalk from "../coverage/redirectWalk.js";
import type * as coverage_rootGate from "../coverage/rootGate.js";
import type * as coverage_roots from "../coverage/roots.js";
import type * as coverage_verifyRoot from "../coverage/verifyRoot.js";
import type * as crons from "../crons.js";
import type * as emailReplies_answer from "../emailReplies/answer.js";
import type * as emailReplies_contracts from "../emailReplies/contracts.js";
import type * as emailReplies_delivery from "../emailReplies/delivery.js";
import type * as emailReplies_intake from "../emailReplies/intake.js";
import type * as emailReplies_recovery from "../emailReplies/recovery.js";
import type * as extraction_contractV1 from "../extraction/contractV1.js";
import type * as extraction_extract from "../extraction/extract.js";
import type * as extraction_ledger from "../extraction/ledger.js";
import type * as extraction_prepare from "../extraction/prepare.js";
import type * as extraction_promptV1 from "../extraction/promptV1.js";
import type * as extraction_textMatch from "../extraction/textMatch.js";
import type * as extraction_validate from "../extraction/validate.js";
import type * as extraction_workflow from "../extraction/workflow.js";
import type * as follows_agentmailClient from "../follows/agentmailClient.js";
import type * as follows_contracts from "../follows/contracts.js";
import type * as follows_enrollment from "../follows/enrollment.js";
import type * as follows_enrollmentContracts from "../follows/enrollmentContracts.js";
import type * as follows_management from "../follows/management.js";
import type * as follows_retention from "../follows/retention.js";
import type * as follows_roundupTime from "../follows/roundupTime.js";
import type * as follows_savedSetup from "../follows/savedSetup.js";
import type * as follows_secrets from "../follows/secrets.js";
import type * as follows_targets from "../follows/targets.js";
import type * as follows_webhook from "../follows/webhook.js";
import type * as http from "../http.js";
import type * as issues_build from "../issues/build.js";
import type * as issues_contractV1 from "../issues/contractV1.js";
import type * as issues_ledger from "../issues/ledger.js";
import type * as issues_promptV1 from "../issues/promptV1.js";
import type * as issues_review from "../issues/review.js";
import type * as issues_scoringV1 from "../issues/scoringV1.js";
import type * as issues_workflow from "../issues/workflow.js";
import type * as operations_discover from "../operations/discover.js";
import type * as operations_extract from "../operations/extract.js";
import type * as operations_ingest from "../operations/ingest.js";
import type * as operations_issues from "../operations/issues.js";
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
import type * as resident_discovery from "../resident/discovery.js";
import type * as resident_evidence from "../resident/evidence.js";
import type * as resident_meetingKey from "../resident/meetingKey.js";
import type * as review_completionBudget from "../review/completionBudget.js";
import type * as review_contractV1 from "../review/contractV1.js";
import type * as review_ledger from "../review/ledger.js";
import type * as review_prepare from "../review/prepare.js";
import type * as review_promptV1 from "../review/promptV1.js";
import type * as review_review from "../review/review.js";
import type * as sourceReports_reports from "../sourceReports/reports.js";
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
  "analytics/contracts": typeof analytics_contracts;
  "analytics/events": typeof analytics_events;
  "analytics/http": typeof analytics_http;
  "analytics/report": typeof analytics_report;
  "analytics/retention": typeof analytics_retention;
  "ask/answer": typeof ask_answer;
  "ask/contracts": typeof ask_contracts;
  "ask/evidence": typeof ask_evidence;
  "ask/ledger": typeof ask_ledger;
  "ask/limits": typeof ask_limits;
  "ask/sessions": typeof ask_sessions;
  "ask/threads": typeof ask_threads;
  auth: typeof auth;
  "auth/authorization": typeof auth_authorization;
  "auth/users": typeof auth_users;
  "changes/material": typeof changes_material;
  "changes/source": typeof changes_source;
  "coverage/candidates": typeof coverage_candidates;
  "coverage/classifier": typeof coverage_classifier;
  "coverage/contracts": typeof coverage_contracts;
  "coverage/discovery": typeof coverage_discovery;
  "coverage/discoveryLedger": typeof coverage_discoveryLedger;
  "coverage/ledger": typeof coverage_ledger;
  "coverage/operations": typeof coverage_operations;
  "coverage/redirectWalk": typeof coverage_redirectWalk;
  "coverage/rootGate": typeof coverage_rootGate;
  "coverage/roots": typeof coverage_roots;
  "coverage/verifyRoot": typeof coverage_verifyRoot;
  crons: typeof crons;
  "emailReplies/answer": typeof emailReplies_answer;
  "emailReplies/contracts": typeof emailReplies_contracts;
  "emailReplies/delivery": typeof emailReplies_delivery;
  "emailReplies/intake": typeof emailReplies_intake;
  "emailReplies/recovery": typeof emailReplies_recovery;
  "extraction/contractV1": typeof extraction_contractV1;
  "extraction/extract": typeof extraction_extract;
  "extraction/ledger": typeof extraction_ledger;
  "extraction/prepare": typeof extraction_prepare;
  "extraction/promptV1": typeof extraction_promptV1;
  "extraction/textMatch": typeof extraction_textMatch;
  "extraction/validate": typeof extraction_validate;
  "extraction/workflow": typeof extraction_workflow;
  "follows/agentmailClient": typeof follows_agentmailClient;
  "follows/contracts": typeof follows_contracts;
  "follows/enrollment": typeof follows_enrollment;
  "follows/enrollmentContracts": typeof follows_enrollmentContracts;
  "follows/management": typeof follows_management;
  "follows/retention": typeof follows_retention;
  "follows/roundupTime": typeof follows_roundupTime;
  "follows/savedSetup": typeof follows_savedSetup;
  "follows/secrets": typeof follows_secrets;
  "follows/targets": typeof follows_targets;
  "follows/webhook": typeof follows_webhook;
  http: typeof http;
  "issues/build": typeof issues_build;
  "issues/contractV1": typeof issues_contractV1;
  "issues/ledger": typeof issues_ledger;
  "issues/promptV1": typeof issues_promptV1;
  "issues/review": typeof issues_review;
  "issues/scoringV1": typeof issues_scoringV1;
  "issues/workflow": typeof issues_workflow;
  "operations/discover": typeof operations_discover;
  "operations/extract": typeof operations_extract;
  "operations/ingest": typeof operations_ingest;
  "operations/issues": typeof operations_issues;
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
  "resident/discovery": typeof resident_discovery;
  "resident/evidence": typeof resident_evidence;
  "resident/meetingKey": typeof resident_meetingKey;
  "review/completionBudget": typeof review_completionBudget;
  "review/contractV1": typeof review_contractV1;
  "review/ledger": typeof review_ledger;
  "review/prepare": typeof review_prepare;
  "review/promptV1": typeof review_promptV1;
  "review/review": typeof review_review;
  "sourceReports/reports": typeof sourceReports_reports;
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
  auth: import("@convex-dev/auth/core/_generated/component.js").ComponentApi<"auth">;
  oauthGoogle: import("@convex-dev/auth/providers/oauth/_generated/component.js").ComponentApi<"oauthGoogle">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  agentmail: import("@agentmail/convex/_generated/component.js").ComponentApi<"agentmail">;
  firecrawl: import("@firecrawl/firecrawl-convex/_generated/component.js").ComponentApi<"firecrawl">;
};
