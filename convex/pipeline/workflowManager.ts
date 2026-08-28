import { WorkflowManager } from '@convex-dev/workflow'

import { components } from '../_generated/api'
import { MODEL_STEP_RETRY } from './state'

export const extractionWorkflowManager = new WorkflowManager(
  components.workflow,
  {
    workpoolOptions: {
      maxParallelism: 2,
      retryActionsByDefault: false,
      defaultRetryBehavior: MODEL_STEP_RETRY,
    },
  },
)
