/**
 * (public) route group — marketing, legal, and informational pages.
 *
 * Folder structure now mirrors the runtime classification in
 * `src/config/routes.ts`. Routes inside this group:
 *
 *   - Are accessible to anonymous users
 *   - Do NOT show the in-app sidebar (enforced by AppShell via
 *     `getRouteSurface(pathname) === 'public'`)
 *   - DO show the marketing footer
 *   - DO show the marketing top-nav variant of Header
 *
 * No chrome is mounted here — AppShell (mounted by the root layout)
 * is the SSOT for shell composition. This group exists for source-tree
 * navigability: marketing pages are findable by structure, not by
 * grepping a runtime classifier.
 *
 * When adding a new marketing route: drop the folder in here, then
 * confirm `getRouteSurface(yourPath) === 'public'` (it will, because
 * everything not in APP_SURFACES or AUTH_SURFACES falls through to
 * 'public').
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
