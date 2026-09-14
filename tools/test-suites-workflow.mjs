/** ContextDevKit 4 Workflow v2 runtime and distribution suites. */
const WORKFLOW_DIR = 'templates/contextkit/tools/scripts/workflow';

export const WORKFLOW_ENGINE_SUITES = Object.freeze([
  {
    id: 'workflow-v2',
    file: 'tools/integration-test-workflow-v2.mjs',
    tier: 'integration:workflow',
    touches: [
      'templates/contextkit/tools/scripts/workflow-pack.mjs',
      'templates/contextkit/tools/scripts/workflow.mjs',
      `${WORKFLOW_DIR}/catalog.mjs`, `${WORKFLOW_DIR}/create.mjs`,
      `${WORKFLOW_DIR}/files.mjs`, `${WORKFLOW_DIR}/io.mjs`,
      `${WORKFLOW_DIR}/patterns.mjs`, `${WORKFLOW_DIR}/profiles.mjs`,
      `${WORKFLOW_DIR}/render.mjs`, `${WORKFLOW_DIR}/validate.mjs`,
      `${WORKFLOW_DIR}/proof-of-done.mjs`, 'templates/contextkit/tools/scripts/workflow-gate.mjs',
      'templates/contextkit/tools/scripts/tasks-store.mjs',
    ],
  },
  {
    id: 'workflow-packaging',
    file: 'tools/integration-test-workflow-packaging.mjs',
    tier: 'integration:installer',
    touches: ['install.mjs', 'tools/install/engine.mjs', `${WORKFLOW_DIR}/`],
  },
]);
