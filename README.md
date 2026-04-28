# vue-hooks

Reusable Vue 3 composition hooks written in TypeScript.

## Usage

```ts
import { useEditableList } from 'vue-hooks'

const editableList = useEditableList([{ name: 'first' }], {
  maxRows: 5,
})

editableList.create({ name: 'second' })
editableList.edit(0, { name: 'updated' })
editableList.remove(1)
```

## Scripts

```bash
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` uses tsup to generate ESM JavaScript and TypeScript declarations in `dist`.
