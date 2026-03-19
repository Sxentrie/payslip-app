---
description: Step-by-step checklist for adding a new IPC channel to the app
---

When adding a new IPC channel, you MUST update all three layers of the IPC contract in exact order:

1. **Define the type signature** in `src/shared/types.ts`:
   - Add the new method to the `PayslipAPI` interface.
   - Add or update any required input/output interfaces.

2. **Implement the main-process handler** in `src/main/ipc/<domain>.ts`:
   - Import `getDatabase` from `../database`.
   - Register with `ipcMain.handle('<domain>:<action>', ...)`.
   - If this is a new domain, create a new file and export a `register<Domain>Handlers()` function.
   - If new domain: register the handler function inside `src/main/index.ts` in the `app.whenReady()` block.

3. **Expose via the preload bridge** in `src/preload/index.ts`:
   - Add the corresponding method to the `api` object, wrapping `ipcRenderer.invoke('<domain>:<action>', ...)`.
   - Import any new types from `../shared/types`.

4. **Consume in the renderer** via `src/renderer/src/hooks/useApi.ts`:
   - Add a new custom hook or extend an existing one using the `useApiCall` pattern.
   - The hook must call `window.api.<newMethod>()` — never call `window.api` from a page directly.

5. **Verify** by running type checks:
```
pnpm typecheck
```
