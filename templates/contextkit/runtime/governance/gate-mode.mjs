/**
 * One fail-open resolver for every ContextDevKit 4 governance gate (ADR-0158).
 */
import { normalizeEnforcementMode } from '../execution/enforcement-modes.mjs';
import { loadConfigSync } from '../config/load.mjs';
import {
  GATE_IDS,
  GATE_POLICY_HASH,
  GATE_POLICY_VERSION,
  GUARDED_GATE_IDS,
  OVERRIDE_METADATA_FIELDS,
  canGateDeny,
  getGateDefinition,
} from './gate-registry.mjs';

const CONTINUE_POLICY = 'continue';
export const DEFAULT_OVERRIDE_TTL_MS = 15 * 60 * 1000;

/**
 * Resolves one gate from project config. Missing, invalid, or throwing config
 * always becomes canary/continue; guarded is clamped to the explicit allowlist.
 *
 * @param {object|null|undefined} config project config after normal loading
 * @param {string} gateId canonical gate id
 * @returns {{gateId:string, mode:'off'|'shadow'|'canary'|'guarded', source:string,
 *   failurePolicy:'continue', humanAuthority:'owner-wins', warnings:string[],
 *   override:{allowed:boolean, requiredMetadata:readonly string[]}}}
 */
export function resolveGateMode(config, gateId) {
  const warnings = [];
  const definition = getGateDefinition(gateId);
  if (!definition) {
    return fallbackResolution(gateId, warnings, `unknown gate '${String(gateId)}'`);
  }

  try {
    const governance = config?.governance;
    if (!governance || typeof governance !== 'object') {
      return fallbackResolution(gateId, warnings, 'governance config missing');
    }

    const configuredGates = governance.gates;
    const hasGateMode = configuredGates
      && typeof configuredGates === 'object'
      && Object.hasOwn(configuredGates, gateId);
    const candidate = hasGateMode ? configuredGates[gateId] : governance.defaultMode;
    const source = hasGateMode ? 'gate-config' : 'default-mode';
    const normalized = normalizeEnforcementMode(candidate);
    if (normalized.warning) warnings.push(`${gateId}: ${normalized.warning}`);
    if (normalized.source === 'fallback') {
      return fallbackResolution(gateId, warnings, `mode ${String(candidate)} is missing or invalid`);
    }

    let mode = normalized.mode;
    if (mode === 'guarded' && !GUARDED_GATE_IDS.includes(gateId)) {
      warnings.push(`${gateId}: guarded is outside the blocking allowlist; using canary`);
      mode = 'canary';
    }
    if (governance.failurePolicy !== CONTINUE_POLICY) {
      warnings.push(`${gateId}: failurePolicy must be continue; using continue`);
    }
    if (governance.humanAuthority !== 'owner-wins') {
      warnings.push(`${gateId}: humanAuthority must be owner-wins; using owner-wins`);
    }

    return resolution(gateId, definition, mode, source, warnings);
  } catch (error) {
    return fallbackResolution(gateId, warnings, `resolver error: ${error?.message ?? error}`);
  }
}

/**
 * Resolves the complete registry once for dispatch to all handlers.
 *
 * @param {object|null|undefined} config project config
 * @returns {{policyVersion:string, policyHash:string, failurePolicy:'continue',
 *   modes:Record<string,string>, counts:Record<string,number>,
 *   gates:Record<string,object>, warnings:string[]}}
 */
export function resolveGovernanceMatrix(config) {
  const gates = Object.freeze(Object.fromEntries(GATE_IDS.map((gateId) => [gateId, resolveGateMode(config, gateId)])));
  const modes = Object.freeze(Object.fromEntries(GATE_IDS.map((gateId) => [gateId, gates[gateId].mode])));
  const counts = { off: 0, shadow: 0, canary: 0, guarded: 0 };
  for (const mode of Object.values(modes)) counts[mode]++;
  return Object.freeze({
    policyVersion: GATE_POLICY_VERSION,
    policyHash: GATE_POLICY_HASH,
    failurePolicy: CONTINUE_POLICY,
    modes,
    counts: Object.freeze(counts),
    gates,
    warnings: Object.freeze(Object.values(gates).flatMap((gate) => gate.warnings)),
  });
}

/**
 * Resolves the production gate plan for one of the four host moments. Project
 * config is loaded from `root`; payload gate lists are intentionally ignored so
 * test injection cannot become a second production authority.
 *
 * @param {{moment:'prompt-preflight'|'write-preflight'|'postflight'|'completion',
 *   payload?:object,root?:string,env?:object}} context normalized event context
 * @returns {{policyVersion:string,policyHash:string,failurePolicy:'continue',
 *   moment:string,gates:ReadonlyArray<object>,warnings:string[]}}
 */
export function resolveGatePlan({ moment, payload = {}, root = process.cwd(), env = process.env }) {
  void payload;
  void env;
  let config;
  try {
    config = loadConfigSync(root);
  } catch {
    config = null;
  }
  const matrix = resolveGovernanceMatrix(config);
  const gates = GATE_IDS
    .map((gateId) => {
      const definition = getGateDefinition(gateId);
      if (!definition.evaluationMoments.includes(moment)) return null;
      return Object.freeze({
        id: gateId,
        evaluatorId: definition.evaluatorId,
        evidenceKind: definition.evidenceKind,
        blockingMoments: definition.blockingMoments,
        evaluationMoments: definition.evaluationMoments,
        ...matrix.gates[gateId],
      });
    })
    .filter(Boolean);
  return Object.freeze({
    policyVersion: matrix.policyVersion,
    policyHash: matrix.policyHash,
    failurePolicy: CONTINUE_POLICY,
    moment,
    gates: Object.freeze(gates),
    warnings: Object.freeze(gates.flatMap((gate) => gate.warnings)),
  });
}

/**
 * Applies one resolved gate to its domain observation. Domain evaluators only
 * produce facts; this function is the sole policy decision point.
 *
 * @param {{gate:object,moment:string,observation?:object}} input evaluation input
 * @returns {{decision:'allow'|'silent'|'warn'|'deny',gateId:string,mode:string,
 *   overridden:boolean,reason:string,visibleMessage?:string,problemKey?:string}}
 */
export function evaluateGateObservation({ gate, moment, observation = {} }) {
  const gateId = gate?.id ?? gate?.gateId;
  const normalized = normalizeEnforcementMode(gate?.mode);
  const mode = normalized.mode === 'guarded' && !GUARDED_GATE_IDS.includes(gateId)
    ? 'canary'
    : normalized.mode;
  if (mode === 'off') return gateVerdict('allow', gateId, mode, false, 'gate disabled');

  const override = validateHumanOverrideMetadata(gateId, observation?.override, {
    currentRevision: observation?.currentRevision ?? observation?.revision,
    scope: observation?.currentScope ?? observation?.scope,
    now: observation?.evaluationTime,
  });
  if (override.valid) return gateVerdict('allow', gateId, mode, true, 'human owner override accepted');

  const status = observation?.status ?? 'unknown';
  if (status === 'passed') {
    return gateVerdict(mode === 'shadow' ? 'silent' : 'allow', gateId, mode, false, 'gate passed');
  }
  if (mode === 'shadow') return gateVerdict('silent', gateId, mode, false, `gate ${status}`);
  if (status === 'violated' && mode === 'guarded' && canGateDeny(gateId, moment, observation)) {
    return gateVerdict('deny', gateId, mode, false, 'applicable deterministic violation', observation);
  }
  return gateVerdict('warn', gateId, mode, false, `gate ${status}; continuing`, observation);
}

/**
 * Builds the complete audit metadata for a simple owner override. It asks only
 * for audit facts; autonomy grade, agent receipts, councils, and quorums are not
 * inputs and therefore cannot become accidental preconditions.
 *
 * @param {string} gateId guarded gate id
 * @param {{actor:string,reason:string,scope:object|string,baseRevision:string|number,
 *   outcome:string,timestamp?:string,expiresAt?:string}} input override facts
 * @returns {Readonly<object>} complete immutable audit metadata
 * @throws {TypeError|RangeError} when a required audit fact is absent
 */
export function buildHumanOverrideMetadata(gateId, input) {
  const definition = getGateDefinition(gateId);
  if (!definition?.overrideAllowed || !GUARDED_GATE_IDS.includes(gateId)) {
    throw new RangeError(`gate '${String(gateId)}' does not support a guarded override`);
  }
  if (!input || typeof input !== 'object') throw new TypeError('override input must be an object');

  const timestamp = input.timestamp ?? new Date().toISOString();
  const timestampMs = Date.parse(timestamp);
  if (Number.isNaN(timestampMs)) throw new TypeError('override timestamp must be ISO-8601 compatible');
  const expiresAt = input.expiresAt ?? new Date(timestampMs + DEFAULT_OVERRIDE_TTL_MS).toISOString();
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) throw new TypeError('override expiresAt must be ISO-8601 compatible');
  if (expiresAtMs <= timestampMs) throw new RangeError('override expiresAt must be after timestamp');
  const candidate = {
    actor: input.actor,
    reason: input.reason,
    scope: input.scope,
    policyVersion: GATE_POLICY_VERSION,
    policyHash: GATE_POLICY_HASH,
    baseRevision: input.baseRevision,
    timestamp,
    expiresAt,
    outcome: input.outcome,
  };
  const missing = OVERRIDE_METADATA_FIELDS.filter((field) => !hasAuditValue(candidate[field]));
  if (missing.length > 0) throw new TypeError(`override metadata missing: ${missing.join(', ')}`);
  return Object.freeze({ gateId, ...candidate });
}

/**
 * Validates audit metadata without consulting autonomy, agents, or quorums.
 *
 * @param {string} gateId guarded gate id
 * @param {unknown} metadata override metadata
 * @param {{currentRevision?:string|number,scope?:object|string,now?:string|number|Date}} [context]
 * @returns {{valid:boolean,reason:string}}
 */
export function validateHumanOverrideMetadata(gateId, metadata, context = {}) {
  const definition = getGateDefinition(gateId);
  if (!definition?.overrideAllowed || !GUARDED_GATE_IDS.includes(gateId)) {
    return { valid: false, reason: 'gate does not support override' };
  }
  if (!metadata || typeof metadata !== 'object') return { valid: false, reason: 'override missing' };
  const missing = OVERRIDE_METADATA_FIELDS.filter((field) => !hasAuditValue(metadata[field]));
  if (missing.length > 0) return { valid: false, reason: `override metadata missing: ${missing.join(', ')}` };
  if (metadata.policyVersion !== GATE_POLICY_VERSION || metadata.policyHash !== GATE_POLICY_HASH) {
    return { valid: false, reason: 'override policy version/hash mismatch' };
  }
  const timestampMs = Date.parse(metadata.timestamp);
  const expiresAtMs = Date.parse(metadata.expiresAt);
  if (Number.isNaN(timestampMs)) return { valid: false, reason: 'override timestamp invalid' };
  if (Number.isNaN(expiresAtMs) || expiresAtMs <= timestampMs) {
    return { valid: false, reason: 'override expiry invalid' };
  }
  const nowMs = resolveAuditTime(context.now);
  if (expiresAtMs <= nowMs) return { valid: false, reason: 'override expired' };
  if (!hasAuditValue(context.currentRevision)) {
    return { valid: false, reason: 'current revision missing' };
  }
  if (String(metadata.baseRevision) !== String(context.currentRevision)) {
    return { valid: false, reason: 'override base revision mismatch' };
  }
  if (context.scope !== undefined && canonicalAuditScope(metadata.scope) !== canonicalAuditScope(context.scope)) {
    return { valid: false, reason: 'override scope mismatch' };
  }
  return { valid: true, reason: 'human owner override valid' };
}

/** @param {unknown} value @returns {number} an epoch used only for override expiry validation */
function resolveAuditTime(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return Date.parse(value);
  return Date.now();
}

/** @param {unknown} value @returns {string} deterministic scope encoding for replay protection */
function canonicalAuditScope(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return JSON.stringify(value);
  return JSON.stringify(Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

/** @param {unknown} value audit field @returns {boolean} whether the field is present */
function hasAuditValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
}

/**
 * @param {string} gateId canonical gate id
 * @param {object} definition registry definition
 * @param {string} mode canonical mode
 * @param {string} source resolution source
 * @param {string[]} warnings normalization warnings
 * @returns {Readonly<object>} immutable gate resolution
 */
function resolution(gateId, definition, mode, source, warnings) {
  return Object.freeze({
    gateId,
    mode,
    source,
    failurePolicy: CONTINUE_POLICY,
    humanAuthority: 'owner-wins',
    warnings: Object.freeze([...warnings]),
    override: Object.freeze({
      allowed: definition.overrideAllowed === true,
      requiredMetadata: definition.overrideMetadata,
    }),
  });
}

/**
 * @param {string} gateId requested gate id
 * @param {string[]} warnings accumulated warnings
 * @param {string} reason fallback reason
 * @returns {Readonly<object>} canary/continue resolution
 */
function fallbackResolution(gateId, warnings, reason) {
  warnings.push(`${String(gateId)}: ${reason}; using canary/continue`);
  const definition = getGateDefinition(gateId) ?? { overrideAllowed: false, overrideMetadata: [] };
  return resolution(String(gateId), definition, 'canary', 'fallback', warnings);
}

/**
 * @param {'allow'|'silent'|'warn'|'deny'} decision policy decision
 * @param {string} gateId canonical gate id
 * @param {string} mode canonical mode
 * @param {boolean} overridden whether a human override applied
 * @param {string} reason concise decision reason
 * @param {object|null} [observation] domain observation; only its `visibleMessage`
 *   and `problemKey` are copied, and only onto a warn/deny verdict, so a passing or
 *   silent gate never leaks text and the runtime can render one deduplicated message
 * @returns {Readonly<object>} immutable gate verdict
 */
function gateVerdict(decision, gateId, mode, overridden, reason, observation = null) {
  const verdict = { decision, gateId, mode, overridden, reason };
  if ((decision === 'warn' || decision === 'deny') && observation && typeof observation === 'object') {
    if (typeof observation.visibleMessage === 'string' && observation.visibleMessage.trim() !== '') {
      verdict.visibleMessage = observation.visibleMessage.trim();
    }
    if (typeof observation.problemKey === 'string' && observation.problemKey.trim() !== '') {
      verdict.problemKey = observation.problemKey.trim();
    }
  }
  return Object.freeze(verdict);
}
