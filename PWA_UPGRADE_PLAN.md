# AEGIS POS PWA Upgrade + Platform-Aware Mobile UI

## Summary
Upgrade AEGIS POS from a web app with a basic manifest into a true installable PWA, while separating the UX by surface:
- Desktop becomes an installable app-window experience optimized for large screens and no browser chrome when launched as a PWA.
- Mobile gets a redesigned app shell across the whole authenticated app, with a shared base and platform-specific polish for iOS vs Android.
- Offline support stays intentionally limited to app shell and static assets for v1; POS data and transactions remain online-first.

## Implementation Changes
### 1. PWA foundation
- Replace the current minimal manifest with a production PWA manifest tuned for app install:
  - `start_url` should target the authenticated app entrypoint, not the marketing root.
  - keep `display: "standalone"` and add stable `scope`, `id`, `name`, `short_name`, `theme_color`, `background_color`.
  - provide real PWA icon assets in raster sizes for install surfaces; do not rely on SVG-only icons for all cases.
- Add a service worker strategy for basic shell caching only:
  - cache app shell, manifest, icons, and key static assets,
  - avoid caching authenticated API responses or transaction writes by default,
  - keep network-first behavior for app data.
- Add install UX:
  - detect installability,
  - expose “Install App” entrypoint in a predictable place for desktop and mobile,
  - add fallback instructions for Safari iOS where install flow differs.
- Add PWA-aware window behavior:
  - detect standalone/app-window mode,
  - hide browser-oriented affordances in installed mode,
  - keep browser mode usable as fallback.

### 2. Desktop app-window experience
- Keep desktop as the primary dense POS workspace.
- Tune the authenticated desktop shell so installed PWA mode feels native:
  - remove reliance on browser context cues,
  - ensure header/sidebar spacing works cleanly in standalone mode,
  - avoid any design that assumes visible URL bar, tabs, or browser controls.
- Preserve current desktop navigation model; do not redesign desktop into a mobile-style surface.
- Add safe-area / title-bar considerations where relevant so standalone desktop windows do not feel cramped at the top edge.

### 3. Whole-app mobile redesign
- Introduce a dedicated mobile app shell for authenticated routes instead of reusing the desktop composition unchanged.
- Use a shared mobile component base, but branch visual behavior by platform:
  - iOS polish: larger top chrome spacing, softer sheets/cards, segmented controls, bottom-tab emphasis, lighter motion feel.
  - Android polish: stronger app bar structure, more explicit elevation, firmer action hierarchy, more material-like navigation affordances.
- Keep business logic, page data flow, and existing actions untouched; only the presentation layer changes.
- Apply the redesign across the authenticated app, not only POS:
  - navigation shell,
  - page headers,
  - list/detail patterns,
  - modal/sheet interactions,
  - forms and primary action placement.
- POS mobile should specifically move closer to the reference direction:
  - simpler top bar,
  - mobile-native category/filter treatment,
  - card/list patterns optimized for thumb interaction,
  - checkout/cart flow adapted into stacked mobile screens or sheets rather than desktop side-by-side layout.

### 4. Surface separation rules
- Desktop and mobile should share data and route behavior, but not necessarily the same layout primitives.
- Desktop remains optimized for wide-screen cashier workflows.
- Mobile becomes simplified and app-like, with platform-specific polish.
- Use responsive and device-capability checks only for presentation decisions; do not fork business logic by platform.

## Public Interfaces / App-Level Additions
- Add or update the app manifest and icon asset set used by install surfaces.
- Add a standalone-mode detector utility/hook for installed PWA behavior.
- Add a mobile platform detector/presentation layer utility used only for UI branching.
- No API contract, database schema, or POS transaction logic changes are required for this phase.

## Test Plan
- Manifest/installability:
  - app passes browser installability checks,
  - desktop install opens in standalone window without visible URL bar,
  - iOS shows correct “Add to Home Screen” fallback guidance.
- Shell caching:
  - app shell and static assets load after first visit with poor/no connection,
  - authenticated API data remains online-first and does not serve stale transaction state incorrectly.
- Desktop UX:
  - installed PWA desktop shell renders cleanly with no browser-dependent spacing issues,
  - POS desktop layout remains dense and usable.
- Mobile UX:
  - authenticated app shell switches to redesigned mobile experience on narrow screens,
  - iOS and Android polish differences render as intended while keeping the same route and action behavior,
  - POS mobile flow remains fully functional for browse, cart, and checkout entry.
- Regression:
  - search, category filters, cart behavior, and existing authenticated navigation remain unchanged functionally.

## Assumptions
- Desktop target is an installable standalone PWA window, with browser mode as fallback.
- Offline v1 is limited to cached app shell/static assets; no offline transactions or sync queue.
- Mobile redesign applies to the whole authenticated app, not just POS.
- iOS and Android will use a shared mobile UI foundation with platform-specific polish, not two completely separate design systems.
- This phase is UI/platform-shell work only; existing business logic and backend behavior stay intact.
