/**
 * @file: src/renderer/src/main.tsx
 *
 * @description:
 * React DOM entry point — mounts the root App component into the
 * HTML document and imports global stylesheets.
 *
 * @module: Renderer.Entry
 *
 * @overview:
 * This is the renderer process bootstrap file referenced by
 * index.html. It imports the global CSS (design tokens, Tailwind
 * base, print media rules), then renders the App component inside
 * React.StrictMode to enable development-time diagnostics. No
 * business logic resides here.
 *
 * @dependencies:
 * - react
 * - react-dom
 * - src/renderer/src/assets/globals.css
 * - src/renderer/src/App.tsx
 *
 * @outputs:
 * - None (side-effect-only entry point)
 */

import './assets/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
