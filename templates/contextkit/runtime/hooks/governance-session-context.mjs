#!/usr/bin/env node
/**
 * Read-only governed context loader for session start, resume, compaction, and
 * handoff events. It never creates a session ledger, marker, task, or receipt.
 */
import { pathToFileURL } from 'node:url';
import {
  emitGovernanceResult,
  readGovernancePayload,
  resolveGovernanceHost,
} from './governance-host-io.mjs';
import {
  digestLatestSession,
  readGovernedWorkflowContext,
  renderGovernedWorkflowContext,
  renderOwnerGuidance,
} from './boot-context-readers.mjs';

/**
 * Loads the active workflow pack without consulting a legacy authority.
 *
 * @param {Record<string, any>} rawPayload host event payload
 * @param {{root?:string, env?:NodeJS.ProcessEnv|Record<string, any>}} [options]
 * @returns {Promise<Record<string, any>>} host-neutral context result
 */
export async function loadGovernanceSessionContext(rawPayload, {
  root = process.cwd(),
  env = process.env,
} = {}) {
  const explicitWorkflowRef = rawPayload.workflowRef
    ?? rawPayload.workflow_ref
    ?? rawPayload.workflowId
    ?? rawPayload.workflow_id
    ?? env.CONTEXTKIT_WORKFLOW_REF;

  let contextPack = null;
  if (explicitWorkflowRef) {
    contextPack = renderGovernedWorkflowContext(
      readGovernedWorkflowContext(root, String(explicitWorkflowRef)),
    );
  } else {
    const latestSession = await digestLatestSession(root);
    contextPack = latestSession?.governedContextText ?? null;
  }
  // ADR-0165: explicit owner guidance travels with every context event so the
  // written preferences stop being inert prose. Recommendation-only by contract.
  const ownerGuidance = await renderOwnerGuidance(root);
  if (ownerGuidance) contextPack = contextPack ? `${contextPack}\n\n${ownerGuidance}` : ownerGuidance;

  return {
    schemaVersion: 'governance-context/1',
    status: contextPack ? 'available' : 'not-applicable',
    allowed: true,
    evaluations: [],
    messages: [],
    diagnostics: [],
    ...(contextPack ? { contextPack } : {}),
  };
}

/** Runs one read-only context event and emits host-native additional context. */
async function main() {
  const rawPayload = await readGovernancePayload();
  if (!rawPayload) return;
  const host = resolveGovernanceHost();
  const result = await loadGovernanceSessionContext(rawPayload);
  emitGovernanceResult(result, {
    host,
    eventName: String(rawPayload.hook_event_name ?? rawPayload.hookEventName ?? 'SessionStart'),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { /* fail-safe: context diagnostics never break host work */ });
}
