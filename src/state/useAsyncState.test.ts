import { describe, expect, it, vi } from 'vitest'
import { isRef, nextTick, ref, watch } from 'vue'
import { useAsyncState } from './useAsyncState.js'

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('useAsyncState', () => {
  it('returns initial state synchronously and updates after the promise resolves', async () => {
    const asyncState = useAsyncState(
      Promise.resolve({ id: 1, title: 'todo' }),
      { id: null },
    )

    expect(isRef(asyncState.state)).toBe(true)
    expect(asyncState.state.value).toEqual({ id: null })
    expect(asyncState.isReady.value).toBe(false)
    expect(asyncState.isLoading.value).toBe(true)
    expect(asyncState.error.value).toBeUndefined()

    await flushPromises()

    expect(asyncState.state.value).toEqual({ id: 1, title: 'todo' })
    expect(asyncState.isReady.value).toBe(true)
    expect(asyncState.isLoading.value).toBe(false)
  })

  it('uses shallowRef by default', async () => {
    const asyncState = useAsyncState(
      Promise.resolve({ nested: { count: 1 } }),
      { nested: { count: 0 } },
    )
    const listener = vi.fn()

    watch(asyncState.state, listener)
    asyncState.state.value.nested.count = 2
    await nextTick()

    expect(listener).not.toHaveBeenCalled()
  })

  it('can use a deep ref when shallow is disabled', async () => {
    const asyncState = useAsyncState(
      Promise.resolve({ nested: { count: 1 } }),
      { nested: { count: 0 } },
      { shallow: false },
    )
    const listener = vi.fn()

    watch(asyncState.state, listener, { deep: true })
    asyncState.state.value.nested.count = 2
    await nextTick()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('captures promise errors and calls onError', async () => {
    const error = new Error('request failed')
    const onError = vi.fn()
    const asyncState = useAsyncState(
      Promise.reject(error),
      { id: null },
      { onError },
    )

    await flushPromises()

    expect(asyncState.state.value).toEqual({ id: null })
    expect(asyncState.isReady.value).toBe(false)
    expect(asyncState.isLoading.value).toBe(false)
    expect(asyncState.error.value).toBe(error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('supports manual execution with async functions and params', async () => {
    const loader = vi.fn(async (id: number) => ({ id }))
    const asyncState = useAsyncState(loader, { id: null }, { immediate: false })

    expect(asyncState.isLoading.value).toBe(false)
    expect(loader).not.toHaveBeenCalled()

    await expect(asyncState.executeImmediate(2)).resolves.toEqual({ id: 2 })

    expect(loader).toHaveBeenCalledWith(2)
    expect(asyncState.state.value).toEqual({ id: 2 })
    expect(asyncState.isReady.value).toBe(true)
  })

  it('resets state before execute by default and can keep current state', async () => {
    const loader = vi
      .fn<() => Promise<{ id: number }>>()
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })
    const asyncState = useAsyncState(loader, { id: null }, { immediate: false })

    await asyncState.executeImmediate()
    expect(asyncState.state.value).toEqual({ id: 1 })

    const promise = asyncState.executeImmediate()
    expect(asyncState.state.value).toEqual({ id: null })
    await promise

    const keepState = useAsyncState(loader, { id: null }, {
      immediate: false,
      resetOnExecute: false,
    })
    keepState.state.value = { id: 10 }

    const keepStatePromise = keepState.executeImmediate()
    expect(keepState.state.value).toEqual({ id: 10 })
    await keepStatePromise
  })

  it('supports delayed immediate execution', async () => {
    vi.useFakeTimers()
    const asyncState = useAsyncState(
      Promise.resolve({ id: 1 }),
      { id: null },
      { delay: 100 },
    )

    await Promise.resolve()
    expect(asyncState.state.value).toEqual({ id: null })
    expect(asyncState.isLoading.value).toBe(true)

    await vi.advanceTimersByTimeAsync(100)

    expect(asyncState.state.value).toEqual({ id: 1 })
    expect(asyncState.isReady.value).toBe(true)
    vi.useRealTimers()
  })

  it('can throw execute errors when throwError is enabled', async () => {
    const error = new Error('request failed')
    const asyncState = useAsyncState(
      async () => {
        throw error
      },
      null,
      {
        immediate: false,
        throwError: true,
      },
    )

    await expect(asyncState.executeImmediate()).rejects.toBe(error)
    expect(asyncState.error.value).toBe(error)
  })

  it('is promise-like and resolves with the shell after loading', async () => {
    const asyncState = useAsyncState(
      Promise.resolve({ id: 1 }),
      { id: null },
    )

    const shell = await asyncState

    expect(shell).toMatchObject({
      state: asyncState.state,
      isReady: asyncState.isReady,
      isLoading: asyncState.isLoading,
      error: asyncState.error,
    })
    expect(shell.state.value).toEqual({ id: 1 })
  })

  it('resolves maybe-ref initial state before reset', async () => {
    const initialState = ref({ id: null as number | null })
    const asyncState = useAsyncState(
      async () => ({ id: 1 }),
      initialState,
      { immediate: false },
    )

    initialState.value = { id: 2 }
    const promise = asyncState.executeImmediate()

    expect(asyncState.state.value).toEqual({ id: 2 })
    await promise
  })
})
