import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { useAsyncComponentData } from './useAsyncComponentData.js'

function renderWrapped(component: unknown, attrs: Record<string, unknown> = {}) {
  const setup = (component as { setup: (...args: unknown[]) => () => unknown }).setup

  return setup({}, {
    attrs,
    slots: {},
    emit: vi.fn(),
    expose: vi.fn(),
  })()
}

describe('useAsyncComponentData', () => {
  it('initializes data and passes it to the wrapped component as props', async () => {
    const sourceComponent = defineComponent({
      name: 'UserCard',
      props: {
        id: Number,
        name: String,
      },
      setup: () => () => null,
    })
    const loader = vi.fn(async () => ({ id: 1, name: 'Ada' }))
    const asyncComponent = useAsyncComponentData(loader, sourceComponent)

    const beforeInit = renderWrapped(asyncComponent.component)
    expect(beforeInit).toMatchObject({
      type: sourceComponent,
      props: {},
    })

    await expect(asyncComponent.init()).resolves.toEqual({ id: 1, name: 'Ada' })

    const afterInit = renderWrapped(asyncComponent.component)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(asyncComponent.data.value).toEqual({ id: 1, name: 'Ada' })
    expect(asyncComponent.isReady.value).toBe(true)
    expect(afterInit).toMatchObject({
      type: sourceComponent,
      props: { id: 1, name: 'Ada' },
    })
  })

  it('can pass initialized data as a named prop', async () => {
    const sourceComponent = defineComponent({
      name: 'PayloadView',
      props: {
        payload: Object,
      },
      setup: () => () => null,
    })
    const asyncComponent = useAsyncComponentData(
      async () => ({ id: 1, name: 'Ada' }),
      sourceComponent,
      { propName: 'payload' },
    )

    await asyncComponent.init()

    const vnode = renderWrapped(asyncComponent.component)
    expect(vnode).toMatchObject({
      type: sourceComponent,
      props: {
        payload: { id: 1, name: 'Ada' },
      },
    })
  })

  it('keeps caller attrs when rendering the wrapped component', async () => {
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncComponentData(
      async () => ({ id: 1, disabled: false }),
      sourceComponent,
    )

    await asyncComponent.init()

    const vnode = renderWrapped(asyncComponent.component, {
      class: 'card',
      disabled: true,
    })
    expect(vnode).toMatchObject({
      props: {
        id: 1,
        class: 'card',
        disabled: true,
      },
    })
  })

  it('tracks loading and captures initialization errors', async () => {
    const error = new Error('init failed')
    const onError = vi.fn()
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncComponentData(
      async () => {
        throw error
      },
      sourceComponent,
      { onError },
    )

    const promise = asyncComponent.init()

    expect(asyncComponent.isLoading.value).toBe(true)
    await expect(promise).rejects.toBe(error)

    expect(asyncComponent.isLoading.value).toBe(false)
    expect(asyncComponent.isReady.value).toBe(false)
    expect(asyncComponent.error.value).toBe(error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('supports immediate initialization', async () => {
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncComponentData(
      async () => ({ id: 1 }),
      sourceComponent,
      { immediate: true },
    )

    await nextTick()
    await Promise.resolve()

    expect(asyncComponent.data.value).toEqual({ id: 1 })
    expect(asyncComponent.isReady.value).toBe(true)
  })
})
