import { describe, expect, it, vi } from 'vitest'
import { computed, ref, watch } from 'vue'
import { createGlobalState } from './createGlobalState.js'

describe('createGlobalState', () => {
  it('creates state once and reuses it across calls', () => {
    const stateFactory = vi.fn((initial: number) => {
      const count = ref(initial)
      const double = computed(() => count.value * 2)

      return {
        count,
        double,
      }
    })
    const useCounter = createGlobalState(stateFactory)

    const first = useCounter(1)
    const second = useCounter(10)

    expect(stateFactory).toHaveBeenCalledTimes(1)
    expect(stateFactory).toHaveBeenCalledWith(1)
    expect(second).toBe(first)
    expect(second.count.value).toBe(1)

    first.count.value = 2

    expect(second.count.value).toBe(2)
    expect(second.double.value).toBe(4)
  })

  it('keeps watchers alive in a detached effect scope', async () => {
    const onChange = vi.fn()
    const useCounter = createGlobalState(() => {
      const count = ref(0)

      watch(count, value => onChange(value))

      return {
        count,
      }
    })

    const state = useCounter()
    state.count.value = 1

    await Promise.resolve()

    expect(onChange).toHaveBeenCalledWith(1)
  })
})
