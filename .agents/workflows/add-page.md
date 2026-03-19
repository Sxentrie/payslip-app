---
description: Step-by-step checklist for adding a new page/route to the app
---

When adding a new page to the application, follow these steps in order:

1. **Create the page component** at `src/renderer/src/pages/<PageName>.tsx`:
   - Include the standard JSDoc file header with `@file`, `@description`, `@module`, `@overview`, `@dependencies`, `@outputs`.
   - Export a single default function component.
   - Consume data via hooks from `@/hooks/useApi` — never call `window.api` directly.
   - Use existing UI primitives from `@/components/ui/`.

2. **Register the route** in `src/renderer/src/App.tsx`:
   - Import the new page component.
   - Add a `<Route path="/<url-slug>" element={<PageName />} />` inside the `<Route element={<AppLayout />}>` block.

3. **Add sidebar navigation** in `src/renderer/src/components/AppLayout.tsx`:
   - Add an entry to the `navItems` array with `to`, `icon` (Lucide), and `label`.

4. **Verify** the app compiles:
```
pnpm typecheck
```
