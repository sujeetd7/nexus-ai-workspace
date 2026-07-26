## Batch 1

Modified

- backend/services/ai-kernel/src/execution/interfaces/execution-step.interface.ts
- backend/services/ai-kernel/src/planner/types/execution-plan.interface.ts
- backend/services/ai-kernel/src/planner/planner.service.ts
- backend/services/ai-kernel/src/pipeline/types/pipeline-payload.interface.ts
- backend/services/ai-kernel/src/pipeline/stages/planner-executor.stage.ts
- backend/services/ai-kernel/src/execution/engine/execution-context.ts
- backend/services/ai-kernel/src/execution/engine/execution-engine.ts
- backend/services/ai-kernel/src/execution/scheduler/parallel.scheduler.ts

Deleted

- backend/services/ai-kernel/src/execution/interfaces/execution-plan.interface.ts
- backend/services/ai-kernel/src/execution/interfaces/execution-result.interface.ts
- backend/services/ai-kernel/src/pipeline/types/execution-plan.interface.ts
- backend/services/ai-kernel/src/planner/types/execution-step.interface.ts

Reason

- Collapse duplicate execution plan and step models into a single canonical planner/execution contract set.
- Keep the active kernel/pipeline flow compiling while removing dead duplicate definitions.

Impact

- Planner and pipeline now share one execution plan model.
- Legacy execution engine now uses the unified plan shape and can fall back to step type when action is absent.
- Unused duplicate plan/result/step files were removed after import verification.

Migration Notes

- Existing compatibility aliases for executor interfaces remain in place.
- The active runtime pipeline continues to function with the canonical execution plan model.

## Batch 2

Modified

- backend/services/ai-kernel/src/execution/executor/executor.interface.ts
- backend/services/ai-kernel/src/execution/executor/executor-registry.interface.ts
- backend/services/ai-kernel/src/execution/interfaces/executor.interface.ts

Deleted

- backend/services/ai-kernel/src/execution/executors/llm.executor.ts
- backend/services/ai-kernel/src/execution/executors/memory.executor.ts
- backend/services/ai-kernel/src/execution/executors/tool.executor.ts

Reason

- Remove the unused legacy step-executor implementation folder after confirming no imports remained.
- Drop compatibility aliases now that the active execution flow uses the clear canonical executor names.

Impact

- The execution folder now contains the canonical execution-engine executor contract only.
- The interfaces folder now contains the step-executor contract only.
- No active code paths import the deleted legacy executor-variant files.

Migration Notes

- No import migration was required because the deleted files were not referenced.
- The active execution engine continues to use IExecutionExecutor and IExecutorRegistry.
