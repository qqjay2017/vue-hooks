import { defineComponent, h, markRaw, ref, shallowRef } from 'vue'
import type { Component, Ref, ShallowRef } from 'vue'

export type AsyncComponentData = Record<string, unknown>

export interface UseAsyncComponentDataOptions {
  /**
   * 是否在创建 hook 后立即执行初始化。
   */
  immediate?: boolean
  /**
   * 指定后会把初始化数据作为单个 prop 传入组件。
   * 未指定时会把初始化数据展开为组件 props。
   */
  propName?: string
  /**
   * 初始化失败时的回调。
   */
  onError?: (error: unknown) => void
}

export interface UseAsyncComponentDataReturn<TData extends AsyncComponentData> {
  data: ShallowRef<TData | undefined>
  isLoading: Ref<boolean>
  isReady: Ref<boolean>
  error: Ref<unknown>
  init: () => Promise<TData>
  component: Component
}

export function useAsyncComponentData<TData extends AsyncComponentData>(
  loader: () => Promise<TData>,
  sourceComponent: Component,
  options: UseAsyncComponentDataOptions = {},
): UseAsyncComponentDataReturn<TData> {
  const { immediate = false, propName, onError } = options
  const rawComponent = markRaw(sourceComponent)
  const data = shallowRef<TData>()
  const isLoading = ref(false)
  const isReady = ref(false)
  const error = ref<unknown>()

  async function init() {
    isLoading.value = true
    error.value = undefined

    try {
      const nextData = await loader()

      data.value = nextData
      isReady.value = true

      return nextData
    }
    catch (cause) {
      error.value = cause
      isReady.value = false
      onError?.(cause)

      throw cause
    }
    finally {
      isLoading.value = false
    }
  }

  const component = defineComponent({
    name: 'AsyncComponentData',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => {
        const initializedProps = data.value == null
          ? {}
          : propName
            ? { [propName]: data.value }
            : data.value

        return h(rawComponent, {
          ...initializedProps,
          ...attrs,
        }, slots)
      }
    },
  })

  if (immediate)
    void init()

  return {
    data,
    isLoading,
    isReady,
    error,
    init,
    component,
  }
}
