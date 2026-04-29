import { effectScope } from 'vue'
import type { AnyFn } from '../utils/index.js'

export type CreateGlobalStateReturn<Fn extends AnyFn = AnyFn> = Fn

/**
 * Keep states in the global scope to be reusable across Vue instances.
 *
 * @param stateFactory A factory function to create the state.
 */
export function createGlobalState<Fn extends AnyFn>(
  stateFactory: Fn,
): CreateGlobalStateReturn<Fn> {
  let initialized = false
  let state: ReturnType<Fn>
  const scope = effectScope(true)

  return ((...args: Parameters<Fn>) => {
    if (!initialized) {
      state = scope.run(() => stateFactory(...args)) as ReturnType<Fn>
      initialized = true
    }

    return state
  }) as CreateGlobalStateReturn<Fn>
}
