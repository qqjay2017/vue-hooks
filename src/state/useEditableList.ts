/**
 * useEditableList
 * 操作数组
 * 新建
 * 编辑
 * 删除
 * max-rows超过,不允许编辑
 * 禁用
 * 初始化值
 */
import { computed, ref, unref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

type MaybeRef<T> = T | Ref<T>
type ListIndex = number

export interface UseEditableListOptions<T> {
  /**
   * 初始化列表数据。
   */
  initialValue?: MaybeRef<readonly T[] | undefined>
  /**
   * 最大行数。超过后新增会被拦截。
   */
  maxRows?: MaybeRef<number | undefined>
  /**
   * 禁用后所有写操作都会被拦截。
   */
  disabled?: MaybeRef<boolean | undefined>
  /**
   * 用于拷贝列表项，避免 reset 或初始化时复用外部引用。
   */
  clone?: (item: T) => T
}

export interface UseEditableListReturn<T> {
  list: Ref<T[]>
  rows: Ref<T[]>
  count: ComputedRef<number>
  disabled: ComputedRef<boolean>
  isMaxRows: ComputedRef<boolean>
  isOverMaxRows: ComputedRef<boolean>
  canCreate: ComputedRef<boolean>
  canEdit: ComputedRef<boolean>
  create: (row: T, index?: ListIndex) => boolean
  add: (row: T, index?: ListIndex) => boolean
  edit: (index: ListIndex, row: T) => boolean
  update: (index: ListIndex, updater: (current: T) => T) => boolean
  remove: (index: ListIndex) => boolean
  reset: (nextValue?: readonly T[]) => void
  clear: () => boolean
}

function isOptions<T>(
  value: readonly T[] | UseEditableListOptions<T> | undefined,
): value is UseEditableListOptions<T> {
  return value != null && !Array.isArray(value)
}

function toInteger(value: number | undefined) {
  if (value == null)
    return undefined

  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : undefined
}

function isValidIndex(index: number, length: number) {
  return Number.isInteger(index) && index >= 0 && index < length
}

function resolveInitialValue<T>(options: UseEditableListOptions<T>) {
  return unref(options.initialValue) ?? []
}

function cloneRows<T>(rows: readonly T[], clone?: (item: T) => T) {
  return clone ? rows.map(clone) : [...rows]
}

export function useEditableList<T = unknown>(
  options?: UseEditableListOptions<T>,
): UseEditableListReturn<T>
export function useEditableList<T = unknown>(
  initialValue?: readonly T[],
  options?: Omit<UseEditableListOptions<T>, 'initialValue'>,
): UseEditableListReturn<T>
export function useEditableList<T = unknown>(
  initialValueOrOptions?: readonly T[] | UseEditableListOptions<T>,
  options: Omit<UseEditableListOptions<T>, 'initialValue'> = {},
): UseEditableListReturn<T> {
  const resolvedOptions: UseEditableListOptions<T> = isOptions(initialValueOrOptions)
    ? initialValueOrOptions
    : {
        ...options,
        initialValue: initialValueOrOptions,
      }

  const list = ref<T[]>(cloneRows(resolveInitialValue(resolvedOptions), resolvedOptions.clone)) as Ref<T[]>

  const disabled = computed(() => Boolean(unref(resolvedOptions.disabled)))
  const maxRows = computed(() => toInteger(unref(resolvedOptions.maxRows)))
  const count = computed(() => list.value.length)
  const isMaxRows = computed(() => {
    const limit = maxRows.value

    return limit != null && count.value >= limit
  })
  const isOverMaxRows = computed(() => {
    const limit = maxRows.value

    return limit != null && count.value > limit
  })
  const canCreate = computed(() => !disabled.value && !isMaxRows.value)
  const canEdit = computed(() => !disabled.value && !isOverMaxRows.value)

  function create(row: T, index = list.value.length) {
    if (!canCreate.value)
      return false

    const insertIndex = Number.isInteger(index)
      ? Math.min(Math.max(index, 0), list.value.length)
      : list.value.length

    list.value.splice(insertIndex, 0, row)

    return true
  }

  function edit(index: ListIndex, row: T) {
    if (!canEdit.value || !isValidIndex(index, list.value.length))
      return false

    list.value[index] = row

    return true
  }

  function update(index: ListIndex, updater: (current: T) => T) {
    if (!canEdit.value || !isValidIndex(index, list.value.length))
      return false

    list.value[index] = updater(list.value[index])

    return true
  }

  function remove(index: ListIndex) {
    if (disabled.value || !isValidIndex(index, list.value.length))
      return false

    list.value.splice(index, 1)

    return true
  }

  function reset(nextValue = resolveInitialValue(resolvedOptions)) {
    list.value = cloneRows(nextValue, resolvedOptions.clone)
  }

  function clear() {
    if (disabled.value)
      return false

    list.value = []

    return true
  }

  return {
    list,
    rows: list,
    count,
    disabled,
    isMaxRows,
    isOverMaxRows,
    canCreate,
    canEdit,
    create,
    add: create,
    edit,
    update,
    remove,
    reset,
    clear,
  }
}
