import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export type AnyFn = (...args: any[]) => any

export type FunctionArgs<Args extends any[] = any[], Return = any> = (...args: Args) => Return

export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never

export type Promisify<T> = Promise<Awaited<T>>

export type PromisifyFn<T extends FunctionArgs> = (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>

export interface FunctionWrapperOptions<Args extends any[] = any[], This = any> {
  fn: FunctionArgs<Args>
  thisArg: This
  args: Args
}

export interface DebounceFilterOptions {
  /**
   * Reject the last pending invocation when it gets canceled by a later call.
   */
  rejectOnCancel?: boolean
  /**
   * The maximum time allowed before the latest invocation is forced to run.
   */
  maxWait?: MaybeRefOrGetter<number>
}

export type EventFilter<Args extends any[] = any[], This = any, Invoke extends AnyFn = AnyFn> = (
  invoke: Invoke,
  options: FunctionWrapperOptions<Args, This>,
) => ReturnType<Invoke> | Promisify<ReturnType<Invoke>>

export function createFilterWrapper<T extends AnyFn>(
  filter: EventFilter,
  fn: T,
): PromisifyFn<T> {
  function wrapper(this: any, ...args: ArgumentsType<T>) {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      // Always expose invocation context to the filter and normalize sync throws
      // or sync return values into the returned promise.
      Promise.resolve(filter(() => fn.apply(this, args), { fn, thisArg: this, args }))
        .then(resolve)
        .catch(reject)
    })
  }

  return wrapper as PromisifyFn<T>
}

export function debounceFilter(
  ms: MaybeRefOrGetter<number>,
  options: DebounceFilterOptions = {},
): EventFilter {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined
  let lastReject: ((reason: unknown) => void) | undefined
  let lastResolve: ((value: unknown) => void) | undefined
  let lastInvoke: AnyFn | undefined
  const { rejectOnCancel = false, maxWait } = options

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function clearMaxTimer() {
    if (maxTimer) {
      clearTimeout(maxTimer)
      maxTimer = undefined
    }
  }

  function cancelPending() {
    if (rejectOnCancel && lastReject)
      lastReject(new Error('The debounced function was canceled.'))
  }

  function flush() {
    const invoke = lastInvoke
    const resolve = lastResolve
    const reject = lastReject

    clearTimer()
    clearMaxTimer()
    lastInvoke = undefined
    lastResolve = undefined
    lastReject = undefined

    if (!invoke || !resolve)
      return

    Promise.resolve()
      .then(() => invoke())
      .then(resolve, reject)
  }

  return (invoke: AnyFn) => {
    clearTimer()
    cancelPending()

    lastInvoke = invoke

    const promise = new Promise((resolve, reject) => {
      lastResolve = resolve
      lastReject = reject
    })

    timer = setTimeout(flush, Math.max(0, toValue(ms)))

    if (maxWait !== undefined && !maxTimer)
      maxTimer = setTimeout(flush, Math.max(0, toValue(maxWait)))

    return promise
  }
}
