import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useEditableList } from './useEditableList.js'

describe('useEditableList', () => {
  it('initializes with the provided rows', () => {
    const editableList = useEditableList([{ id: 1 }, { id: 2 }])

    expect(editableList.list.value).toEqual([{ id: 1 }, { id: 2 }])
    expect(editableList.rows).toBe(editableList.list)
    expect(editableList.count.value).toBe(2)
  })

  it('creates rows at the end or at a specific index', () => {
    const editableList = useEditableList([{ id: 1 }])

    expect(editableList.create({ id: 3 })).toBe(true)
    expect(editableList.add({ id: 2 }, 1)).toBe(true)

    expect(editableList.list.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('edits and updates existing rows', () => {
    const editableList = useEditableList([{ id: 1, name: 'first' }])

    expect(editableList.edit(0, { id: 1, name: 'changed' })).toBe(true)
    expect(editableList.update(0, row => ({ ...row, name: row.name.toUpperCase() }))).toBe(true)

    expect(editableList.list.value).toEqual([{ id: 1, name: 'CHANGED' }])
  })

  it('removes and clears rows', () => {
    const editableList = useEditableList([{ id: 1 }, { id: 2 }])

    expect(editableList.remove(0)).toBe(true)
    expect(editableList.list.value).toEqual([{ id: 2 }])
    expect(editableList.clear()).toBe(true)
    expect(editableList.list.value).toEqual([])
  })

  it('rejects invalid indexes', () => {
    const editableList = useEditableList([{ id: 1 }])

    expect(editableList.edit(-1, { id: 2 })).toBe(false)
    expect(editableList.update(1, row => row)).toBe(false)
    expect(editableList.remove(1)).toBe(false)
    expect(editableList.list.value).toEqual([{ id: 1 }])
  })

  it('prevents creating rows when maxRows is reached', () => {
    const maxRows = ref(2)
    const editableList = useEditableList([{ id: 1 }, { id: 2 }], { maxRows })

    expect(editableList.isMaxRows.value).toBe(true)
    expect(editableList.canCreate.value).toBe(false)
    expect(editableList.create({ id: 3 })).toBe(false)
    expect(editableList.list.value).toEqual([{ id: 1 }, { id: 2 }])

    maxRows.value = 3

    expect(editableList.create({ id: 3 })).toBe(true)
    expect(editableList.list.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('prevents editing when rows exceed maxRows', () => {
    const editableList = useEditableList([{ id: 1 }, { id: 2 }, { id: 3 }], { maxRows: 2 })

    expect(editableList.isOverMaxRows.value).toBe(true)
    expect(editableList.canEdit.value).toBe(false)
    expect(editableList.edit(0, { id: 10 })).toBe(false)
    expect(editableList.update(0, () => ({ id: 10 }))).toBe(false)
    expect(editableList.list.value).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('prevents write operations when disabled', () => {
    const disabled = ref(true)
    const editableList = useEditableList([{ id: 1 }], { disabled })

    expect(editableList.create({ id: 2 })).toBe(false)
    expect(editableList.edit(0, { id: 2 })).toBe(false)
    expect(editableList.remove(0)).toBe(false)
    expect(editableList.clear()).toBe(false)
    expect(editableList.list.value).toEqual([{ id: 1 }])

    disabled.value = false

    expect(editableList.edit(0, { id: 2 })).toBe(true)
    expect(editableList.list.value).toEqual([{ id: 2 }])
  })

  it('resets to the original or next value and uses clone when provided', () => {
    const original = [{ id: 1, nested: { value: 1 } }]
    const editableList = useEditableList(original, {
      clone: row => ({ ...row, nested: { ...row.nested } }),
    })

    expect(editableList.list.value[0]).not.toBe(original[0])
    editableList.edit(0, { id: 2, nested: { value: 2 } })
    editableList.reset()
    expect(editableList.list.value).toEqual(original)

    editableList.reset([{ id: 3, nested: { value: 3 } }])
    expect(editableList.list.value).toEqual([{ id: 3, nested: { value: 3 } }])
  })
})
