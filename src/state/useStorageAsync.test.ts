import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useStorageAsync } from './useStorageAsync.js'
import type { AsyncStorageLike } from './useStorageAsync.js'

function createStorage(initialEntries: Record<string, string> = {}) {
  const data = new Map(Object.entries(initialEntries))

  const storage: AsyncStorageLike = {
    getItem: vi.fn(async key => data.get(key) ?? null),
    setItem: vi.fn(async (key, value) => {
      data.set(key, value)
    }),
    removeItem: vi.fn(async (key) => {
      data.delete(key)
    }),
  }

  return { data, storage }
}

describe('useStorageAsync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with the default value and hydrates from storage', async () => {
    const { storage } = createStorage({ token: 'stored-token' })
    const token = useStorageAsync('token', '', storage)

    expect(token.value).toBe('')

    await token.refresh()

    expect(token.value).toBe('stored-token')
    expect(token.isReady.value).toBe(true)
    expect(token.error.value).toBeUndefined()
  })

  it('writes string values when value changes', async () => {
    const { data, storage } = createStorage()
    const accessToken = useStorageAsync('access.token', '', storage)

    accessToken.value = 'xxx'
    await nextTick()

    expect(data.get('access.token')).toBe('xxx')
    expect(storage.setItem).toHaveBeenCalledWith('access.token', 'xxx')
  })

  it('serializes and deserializes non-string values as JSON by default', async () => {
    const { data, storage } = createStorage({
      settings: JSON.stringify({ theme: 'dark', count: 2 }),
    })
    const settings = useStorageAsync('settings', { theme: 'light', count: 0 }, storage)

    await settings.refresh()
    expect(settings.value).toEqual({ theme: 'dark', count: 2 })

    settings.value = { theme: 'system', count: 3 }
    await nextTick()

    expect(data.get('settings')).toBe(JSON.stringify({ theme: 'system', count: 3 }))
  })

  it('supports custom serializer and deserializer', async () => {
    const { data, storage } = createStorage({ count: '10' })
    const count = useStorageAsync('count', 0, storage, {
      serializer: value => String(value),
      deserializer: value => Number(value),
    })

    await count.refresh()
    expect(count.value).toBe(10)

    count.value = 12
    await nextTick()

    expect(data.get('count')).toBe('12')
  })

  it('can write the default value when storage is empty', async () => {
    const { data, storage } = createStorage()
    const token = useStorageAsync('token', 'default-token', storage, {
      writeDefaults: true,
    })

    await token.refresh()

    expect(data.get('token')).toBe('default-token')
  })

  it('does not let slow initial hydration overwrite an immediate local write', async () => {
    let resolveGetItem: (value: string) => void = () => {}
    const data = new Map<string, string>()
    const storage: AsyncStorageLike = {
      getItem: vi.fn(() => new Promise<string>((resolve) => {
        resolveGetItem = resolve
      })),
      setItem: vi.fn(async (key, value) => {
        data.set(key, value)
      }),
    }

    const accessToken = useStorageAsync('access.token', '', storage)
    accessToken.value = 'xxx'
    resolveGetItem('old-token')

    await nextTick()
    await Promise.resolve()

    expect(accessToken.value).toBe('xxx')
    expect(data.get('access.token')).toBe('xxx')
  })

  it('removes values from storage', async () => {
    const { data, storage } = createStorage({ token: 'stored-token' })
    const token = useStorageAsync('token', '', storage)

    await token.remove()

    expect(data.has('token')).toBe(false)
    expect(storage.removeItem).toHaveBeenCalledWith('token')
  })

  it('captures storage errors and calls onError', async () => {
    const error = new Error('storage failed')
    const onError = vi.fn()
    const storage: AsyncStorageLike = {
      getItem: vi.fn(async () => {
        throw error
      }),
      setItem: vi.fn(async () => {}),
    }

    const token = useStorageAsync('token', '', storage, { onError })

    await token.refresh()

    expect(token.error.value).toBe(error)
    expect(onError).toHaveBeenCalledWith(error)
  })
})
