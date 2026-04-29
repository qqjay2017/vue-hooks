import type { MaybeRefOrGetter } from 'vue'
import { createFilterWrapper, debounceFilter } from '../utils/index.js'
import type { DebounceFilterOptions, FunctionArgs, PromisifyFn } from '../utils/index.js'

export type UseDebounceFnReturn<T extends FunctionArgs> = PromisifyFn<T>

/**
 * Debounce execution of a function.
 *
 * @param fn A function to be executed after delay milliseconds debounced.
 * @param ms A zero-or-greater delay in milliseconds.
 * @param options Options.
 */
export function useDebounceFn<T extends FunctionArgs>(
  fn: T,
  ms: MaybeRefOrGetter<number> = 200,
  options: DebounceFilterOptions = {},
): UseDebounceFnReturn<T> {
  return createFilterWrapper(
    debounceFilter(ms, options),
    fn,
  )
}
