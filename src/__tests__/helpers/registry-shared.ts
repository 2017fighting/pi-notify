/**
 * Test-local stub of @pi-unipi/background-tasks' shared registry accessor.
 *
 * The real package publishes its live registry on globalThis under a
 * Symbol.for key; events.ts reads it directly (zero coupling). This stub
 * uses the same key so tests see identical behavior without importing the
 * sibling package.
 */

const SHARED_REGISTRY_KEY = Symbol.for("unipi.background-tasks.shared-registry");

/** Minimal shape of the shared background-task registry. */
export interface SharedTaskRegistryLike {
  allTasks(): ReadonlyArray<{ status?: string; triggerOnCompletion?: boolean }>;
}

/** Publish a registry for the duration of a test. */
export function setSharedTaskRegistry(registry: SharedTaskRegistryLike): void {
  (globalThis as unknown as Record<symbol, unknown>)[SHARED_REGISTRY_KEY] = registry;
}

/** Drop the shared reference. */
export function clearSharedTaskRegistry(): void {
  delete (globalThis as unknown as Record<symbol, unknown>)[SHARED_REGISTRY_KEY];
}
