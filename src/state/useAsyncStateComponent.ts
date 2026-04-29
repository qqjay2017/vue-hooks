import { defineComponent, h, markRaw } from 'vue'
import type { Component, MaybeRef } from 'vue'
import { useAsyncState } from './useAsyncState.js'
import type { UseAsyncStateOptions, UseAsyncStateReturn } from './useAsyncState.js'

export type AsyncStateComponentData = Record<string, unknown>

export interface UseAsyncStateComponentOptions<TData extends AsyncStateComponentData>
  extends Omit<UseAsyncStateOptions<true, TData>, 'shallow'> {
  /**
   * 指定后会把初始化数据作为单个 prop 传入组件。
   * 未指定时会把初始化数据展开为组件 props。
   */
  propName?: string
}

export interface UseAsyncStateComponentReturn<TData extends AsyncStateComponentData>
  extends UseAsyncStateReturn<TData, [], true, TData> {
  data: UseAsyncStateReturn<TData, [], true, TData>['state']
  init: () => Promise<TData | undefined>
  component: Component
}

export function useAsyncStateComponent<TData extends AsyncStateComponentData>(
  loader: () => Promise<TData>,
  initialData: MaybeRef<TData>,
  sourceComponent: Component,
  options: UseAsyncStateComponentOptions<TData> = {},
): UseAsyncStateComponentReturn<TData> {
  const { propName, ...asyncStateOptions } = options
  const rawComponent = markRaw(sourceComponent)
  const asyncState = useAsyncState(loader, initialData, {
    ...asyncStateOptions,
    immediate: asyncStateOptions.immediate ?? false,
    shallow: true,
  })

  const component = defineComponent({
    name: 'AsyncStateComponent',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => {
        const initializedProps = propName
          ? { [propName]: asyncState.state.value }
          : asyncState.state.value

        return h(rawComponent, {
          ...initializedProps,
          ...attrs,
        }, slots)
      }
    },
  })

  return {
    ...asyncState,
    data: asyncState.state,
    init: asyncState.executeImmediate,
    component,
  }
}
