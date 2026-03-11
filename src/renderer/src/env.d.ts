/**
 * @file: src/renderer/src/env.d.ts
 *
 * @description:
 * Vite client type reference — enables TypeScript awareness of
 * Vite-specific module types (CSS, assets, import.meta.env).
 *
 * @module: Renderer.Types
 *
 * @overview:
 * A single triple-slash reference directive that pulls in the
 * vite/client type definitions. This allows TypeScript to resolve
 * static asset imports (images, CSS modules) and provides types
 * for import.meta.env and import.meta.hot.
 *
 * @dependencies:
 * - vite
 *
 * @outputs:
 * - None (ambient type reference)
 */

/// <reference types="vite/client" />
