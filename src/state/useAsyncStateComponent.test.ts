import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useAsyncStateComponent } from './useAsyncStateComponent.js'

function renderWrapped(component: unknown, attrs: Record<string, unknown> = {}) {
  const setup = (component as { setup: (...args: unknown[]) => () => unknown }).setup

  return setup({}, {
    attrs,
    slots: {},
    emit: vi.fn(),
    expose: vi.fn(),
  })()
}

describe('useAsyncStateComponent', () => {
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
    const asyncComponent = useAsyncStateComponent(
      loader,
      { id: 0, name: 'Loading' },
      sourceComponent,
    )

    const beforeInit = renderWrapped(asyncComponent.component)
    expect(beforeInit).toMatchObject({
      type: sourceComponent,
      props: { id: 0, name: 'Loading' },
    })

    await expect(asyncComponent.init()).resolves.toEqual({ id: 1, name: 'Ada' })

    const afterInit = renderWrapped(asyncComponent.component)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(asyncComponent.data.value).toEqual({ id: 1, name: 'Ada' })
    expect(asyncComponent.state).toBe(asyncComponent.data)
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
    const asyncComponent = useAsyncStateComponent(
      async () => ({ id: 1, name: 'Ada' }),
      { id: 0, name: 'Loading' },
      sourceComponent,
      { propName: 'payload' },
    )

    const beforeInit = renderWrapped(asyncComponent.component)
    expect(beforeInit).toMatchObject({
      type: sourceComponent,
      props: {
        payload: { id: 0, name: 'Loading' },
      },
    })

    await asyncComponent.init()

    const afterInit = renderWrapped(asyncComponent.component)
    expect(afterInit).toMatchObject({
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
    const asyncComponent = useAsyncStateComponent(
      async () => ({ id: 1, disabled: false }),
      { id: 0, disabled: false },
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

  it('keeps default data in component props when initialization fails', async () => {
    const error = new Error('init failed')
    const onError = vi.fn()
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncStateComponent(
      async () => {
        throw error
      },
      { id: 0, name: 'Fallback' },
      sourceComponent,
      { onError },
    )

    await expect(asyncComponent.init()).resolves.toBeUndefined()

    const vnode = renderWrapped(asyncComponent.component)
    expect(asyncComponent.isLoading.value).toBe(false)
    expect(asyncComponent.isReady.value).toBe(false)
    expect(asyncComponent.error.value).toBe(error)
    expect(asyncComponent.data.value).toEqual({ id: 0, name: 'Fallback' })
    expect(onError).toHaveBeenCalledWith(error)
    expect(vnode).toMatchObject({
      props: { id: 0, name: 'Fallback' },
    })
  })

  it('can rethrow initialization errors when throwError is enabled', async () => {
    const error = new Error('init failed')
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncStateComponent(
      async () => {
        throw error
      },
      { id: 0 },
      sourceComponent,
      { throwError: true },
    )

    await expect(asyncComponent.init()).rejects.toBe(error)
    expect(asyncComponent.data.value).toEqual({ id: 0 })
  })

  it('supports immediate initialization', async () => {
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncStateComponent(
      async () => ({ id: 1 }),
      { id: 0 },
      sourceComponent,
      { immediate: true },
    )

    await nextTick()
    await Promise.resolve()

    expect(asyncComponent.data.value).toEqual({ id: 1 })
    expect(asyncComponent.isReady.value).toBe(true)
  })

  it('resolves maybe-ref default data before initialization', async () => {
    const initialData = ref({ id: 0 })
    const sourceComponent = defineComponent({
      name: 'UserCard',
      setup: () => () => null,
    })
    const asyncComponent = useAsyncStateComponent(
      async () => ({ id: 1 }),
      initialData,
      sourceComponent,
    )

    initialData.value = { id: 2 }
    const promise = asyncComponent.init()

    expect(asyncComponent.data.value).toEqual({ id: 2 })
    await promise
  })
})
