import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useDebounceFn } from './useDebounceFn.js'

describe('useDebounceFn', () => {
  it('debounces function execution and resolves with the return value', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: number) => value * 2)
    const debounced = useDebounceFn(fn, 100)
    const promise = debounced(2)

    await vi.advanceTimersByTimeAsync(99)
    expect(fn).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    await expect(promise).resolves.toBe(4)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
    vi.useRealTimers()
  })

  it('uses the latest call arguments', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: string) => value)
    const debounced = useDebounceFn(fn, 100)

    debounced('first')
    const latest = debounced('second')

    await vi.advanceTimersByTimeAsync(100)

    await expect(latest).resolves.toBe('second')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
    vi.useRealTimers()
  })

  it('can reject canceled calls', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: string) => value)
    const debounced = useDebounceFn(fn, 100, { rejectOnCancel: true })
    const first = debounced('first')
    const second = debounced('second')

    await expect(first).rejects.toThrow('canceled')

    await vi.advanceTimersByTimeAsync(100)

    await expect(second).resolves.toBe('second')
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('runs after maxWait during repeated calls', async () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: string) => value)
    const debounced = useDebounceFn(fn, 100, { maxWait: 250 })

    debounced('first')
    await vi.advanceTimersByTimeAsync(90)
    debounced('second')
    await vi.advanceTimersByTimeAsync(90)
    const latest = debounced('third')

    await vi.advanceTimersByTimeAsync(70)

    await expect(latest).resolves.toBe('third')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('third')
    vi.useRealTimers()
  })

  it('resolves reactive delay values when called', async () => {
    vi.useFakeTimers()
    const delay = ref(100)
    const fn = vi.fn()
    const debounced = useDebounceFn(fn, delay)

    delay.value = 20
    const promise = debounced()

    await vi.advanceTimersByTimeAsync(20)
    await promise

    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
