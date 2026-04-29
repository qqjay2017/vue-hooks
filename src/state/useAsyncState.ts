import { ref as deepRef, shallowRef, toValue, watch } from 'vue'
import type { MaybeRef, Ref, ShallowRef, UnwrapRef } from 'vue'

type AsyncStatePromise<Data, Params extends unknown[]> = Promise<Data> | ((...args: Params) => Promise<Data>)

export interface UseAsyncStateReturnBase<Data, Params extends unknown[], Shallow extends boolean, InitialState = Data> {
  state: Shallow extends true ? ShallowRef<Data | InitialState> : Ref<UnwrapRef<Data | InitialState>>
  isReady: Ref<boolean>
  isLoading: Ref<boolean>
  error: Ref<unknown>
  execute: (delay?: number, ...args: Params) => Promise<Data | undefined>
  executeImmediate: (...args: Params) => Promise<Data | undefined>
}

export type UseAsyncStateReturn<Data, Params extends unknown[], Shallow extends boolean, InitialState = Data>
  = UseAsyncStateReturnBase<Data, Params, Shallow, InitialState>
    & PromiseLike<UseAsyncStateReturnBase<Data, Params, Shallow, InitialState>>

export interface UseAsyncStateOptions<Shallow extends boolean, Data = unknown> {
  /**
   * 首次 immediate 执行前的延迟时间，单位毫秒。
   */
  delay?: number
  /**
   * 创建 hook 后是否立即执行。
   */
  immediate?: boolean
  /**
   * Promise reject 时的回调。
   */
  onError?: (error: unknown) => void
  /**
   * Promise resolve 时的回调。
   */
  onSuccess?: (data: Data) => void
  /**
   * 每次执行前是否重置为 initialState。
   */
  resetOnExecute?: boolean
  /**
   * 默认使用 shallowRef 保存 state。
   */
  shallow?: Shallow
  /**
   * execute 捕获错误后是否继续抛出。
   */
  throwError?: boolean
}

function noop() {}

function promiseTimeout(delay: number) {
  return new Promise<void>(resolve => setTimeout(resolve, delay))
}

export function useAsyncState<
  Data,
  Params extends unknown[] = unknown[],
  Shallow extends boolean = true,
  InitialState = Data,
>(
  promise: AsyncStatePromise<Data, Params>,
  initialState: MaybeRef<InitialState>,
  options: UseAsyncStateOptions<Shallow, Data> = {},
): UseAsyncStateReturn<Data, Params, Shallow, InitialState> {
  const {
    immediate = true,
    delay = 0,
    onError = noop,
    onSuccess = noop,
    resetOnExecute = true,
    shallow = true,
    throwError = false,
  } = options

  const state = (
    shallow
      ? shallowRef(toValue(initialState))
      : deepRef(toValue(initialState))
  ) as Shallow extends true ? ShallowRef<Data | InitialState> : Ref<UnwrapRef<Data | InitialState>>
  const isReady = shallowRef(false)
  const isLoading = shallowRef(false)
  const error = shallowRef<unknown>()
  let executionsCount = 0

  async function execute(executeDelay = 0, ...args: Params) {
    const executionId = executionsCount + 1
    executionsCount = executionId

    if (resetOnExecute)
      state.value = toValue(initialState) as never

    error.value = undefined
    isReady.value = false
    isLoading.value = true

    if (executeDelay > 0)
      await promiseTimeout(executeDelay)

    const currentPromise = typeof promise === 'function'
      ? promise(...args)
      : promise

    try {
      const data = await currentPromise

      if (executionId === executionsCount) {
        state.value = data as never
        isReady.value = true
      }

      onSuccess(data)

      return data
    }
    catch (cause) {
      if (executionId === executionsCount)
        error.value = cause

      onError(cause)

      if (throwError)
        throw cause
    }
    finally {
      if (executionId === executionsCount)
        isLoading.value = false
    }
  }

  if (immediate)
    void execute(delay, ...([] as unknown as Params))

  const shell: UseAsyncStateReturnBase<Data, Params, Shallow, InitialState> = {
    state,
    isReady,
    isLoading,
    error,
    execute,
    executeImmediate: (...args: Params) => execute(0, ...args),
  }

  function waitUntilIsLoaded() {
    return new Promise<UseAsyncStateReturnBase<Data, Params, Shallow, InitialState>>((resolve) => {
      if (!isLoading.value) {
        resolve(shell)
        return
      }

      const stop = watch(isLoading, (value) => {
        if (value)
          return

        stop()
        resolve(shell)
      })
    })
  }

  return {
    ...shell,
    then(onFulfilled, onRejected) {
      return waitUntilIsLoaded().then(onFulfilled, onRejected)
    },
  }
}
