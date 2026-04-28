/**
 *
 * const accessToken = useStorageAsync('access.token', '', SomeAsyncStorage)
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'

type MaybePromise<T> = T | Promise<T>

export interface AsyncStorageLike {
  getItem: (key: string) => MaybePromise<string | null | undefined>
  setItem: (key: string, value: string) => MaybePromise<void>
  removeItem?: (key: string) => MaybePromise<void>
}

export interface UseStorageAsyncOptions<T> {
  serializer?: (value: T) => string
  deserializer?: (value: string) => T
  deep?: boolean
  writeDefaults?: boolean
  onError?: (error: unknown) => void
}

export type UseStorageAsyncReturn<T> = Ref<T> & {
  isReady: Ref<boolean>
  error: Ref<unknown>
  refresh: () => Promise<void>
  remove: () => Promise<void>
}

function guessSerializer<T>(initialValue: T) {
  return (value: T) => {
    if (typeof initialValue === 'string')
      return String(value)

    return JSON.stringify(value)
  }
}

function guessDeserializer<T>(initialValue: T) {
  return (value: string) => {
    if (typeof initialValue === 'string')
      return value as T

    return JSON.parse(value) as T
  }
}

export function useStorageAsync<T>(
  key: string,
  initialValue: T,
  storage: AsyncStorageLike,
  options: UseStorageAsyncOptions<T> = {},
): UseStorageAsyncReturn<T> {
  const {
    serializer = guessSerializer(initialValue),
    deserializer = guessDeserializer(initialValue),
    deep = true,
    writeDefaults = false,
    onError,
  } = options

  const state = ref(initialValue) as Ref<T>
  const isReady = ref(false)
  const error = ref<unknown>()
  let isApplyingStorageValue = false
  let hasLocalChange = false

  function handleError(cause: unknown) {
    error.value = cause
    onError?.(cause)
  }

  async function write(value: T) {
    try {
      await storage.setItem(key, serializer(value))
    }
    catch (cause) {
      handleError(cause)
    }
  }

  async function readStorage(skipWhenLocallyChanged: boolean) {
    try {
      const rawValue = await storage.getItem(key)

      if (rawValue == null) {
        if (writeDefaults)
          await write(state.value)

        return
      }

      if (skipWhenLocallyChanged && hasLocalChange)
        return

      isApplyingStorageValue = true
      state.value = deserializer(rawValue)
      hasLocalChange = false
    }
    catch (cause) {
      handleError(cause)
    }
    finally {
      isApplyingStorageValue = false
      isReady.value = true
    }
  }

  async function refresh() {
    await readStorage(false)
  }

  async function remove() {
    hasLocalChange = true

    try {
      if (storage.removeItem)
        await storage.removeItem(key)
      else
        await storage.setItem(key, '')
    }
    catch (cause) {
      handleError(cause)
    }
  }

  watch(
    state,
    (value) => {
      if (isApplyingStorageValue)
        return

      void write(value)
    },
    { deep },
  )

  void readStorage(true)

  return new Proxy(Object.assign(state, {
    isReady,
    error,
    refresh,
    remove,
  }), {
    set(target, property, value, receiver) {
      if (property === 'value' && !isApplyingStorageValue)
        hasLocalChange = true

      return Reflect.set(target, property, value, receiver)
    },
  })
}
