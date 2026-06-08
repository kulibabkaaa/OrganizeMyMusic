# Organize Your Music — Platform-First UI/Product Roadmap for Codex

## Superseded scope note

This file captured an earlier platform-first direction where Sorts remained reusable projects and payment unlocked individual Sorts. The current direction narrows `Sort` to full-library organization and makes persistent playlists plus playlist recipes the recurring product surface.

Use `docs/PLATFORM_FIRST_MVP_MIGRATION.md` as the active source for migration work.

## Purpose

This document rewrites the UI/product roadmap around the chosen platform-first user flow.

The goal is to move Organize Your Music from the current working Apple Music MVP into a dashboard-based product where users can return over time, manage connected libraries, create multiple Sorts, draft Playlist Recipes, preview results, unlock a Sort with payment, review generated playlists, and export reviewed playlists to Apple Music.

This is not a strict onboarding tunnel. Onboarding exists only as setup states inside the app platform.

Important scope note: this roadmap does not redesign the public landing page. The existing landing page should be preserved visually. Only CTA routing may be changed so the landing page enters the new `/auth` → `/app` platform flow.

Codex should implement this roadmap ticket by ticket. Do not rewrite the working Apple Music backend pipeline unless a ticket explicitly requires it.

---

## Product decision

Build Organize Your Music as a dashboard-based platform.

Use this canonical flow:

```text
Landing page
→ Auth
→ Dashboard empty state
→ Connect Apple Music
→ Dashboard syncing state
→ Dashboard ready
→ Create Sort
→ Build Playlist Recipes
→ Generate preview
→ Paywall
→ Payment
→ Sort processing
→ Review playlists
→ Export to Apple Music
→ Export complete
```

After Apple Music authorization, return to the dashboard with an active sync state. Do not redirect users to a standalone onboarding or sync page.

The dashboard is the home base for:

- Libraries
- Sorts
- Drafts
- Payments
- Processing jobs
- Reviews
- Exports
- Settings

---

## Non-negotiable UX rules

1. Do not make the product feel like a one-time onboarding wizard.
2. Onboarding is limited to setup states inside the platform: auth, connect Apple Music, sync library.
3. After Apple Music OAuth/MusicKit authorization, redirect to `/app?connected=apple_music` and show dashboard sync progress.
4. If sync takes more than 10-15 seconds, allow users to create a Sort draft while sync continues.
5. Disable only the final `Preview Sort` action until the library index is ready.
6. Do not show a paywall immediately after signup or library connection.
7. Always show a lightweight preview before asking for payment.
8. Payment belongs to a specific Sort, not to the whole onboarding flow.
9. Do not start the full paid sorting job until payment is confirmed.
10. Do not export playlists automatically after sorting.
11. Always require review and explicit export before creating playlists in Apple Music.
12. Apple Music is the only active provider for MVP.
13. Spotify and YouTube Music may appear only as disabled `Coming later` cards.
14. Existing Apple Music library content must not be destructively modified.
15. Existing app/account/backend safety rules remain in force: encrypted Apple Music user tokens, server-side developer tokens, RLS, no raw token logging, and explicit write-back confirmation.

---

## Canonical product terms

Use these terms consistently in UI, code, and docs.

### Library

A connected music source. MVP supports only Apple Music.

### Sort

One reusable sorting session/project. A user can create multiple Sorts over time.

Examples:

- `My Apple Music cleanup`
- `Road trip cleanup`
- `Night music system`

### Playlist Recipe

One playlist the user wants created inside a Sort. A Sort contains one or more Playlist Recipes.

Examples:

- `Sad late-night songs`
- `Spanish pop reset`
- `Indie commute`

### Tag

A structured instruction that describes what belongs in a Playlist Recipe.

Supported categories:

- Mood
- Genre
- Language
- Era
- Region
- Energy
- Activity
- Artist style
- Custom

### Tag Note

Optional user explanation for a specific tag in a specific Playlist Recipe.

Example:

```text
Tag: Mood · Sad
Note: Melancholic, slow, intimate songs. Avoid angry or aggressive tracks.
```

Tag Notes are local to the Playlist Recipe, not global across all Sorts.

### Preview

A lightweight estimate shown before payment. It should include estimated track counts, tags used, sample tracks, and locked rows.

### Paywall / Checkout

The one-time unlock step for a specific Sort.

### Generated Playlist

The full playlist result produced after payment and processing.

### Review

The page where users inspect, edit, remove tracks, rename playlists, and decide what should be exported.

### Export

The explicit action that creates reviewed playlists in Apple Music.

---

## Canonical routes

The target route structure should use `/app` as the platform home. Keep redirects from existing legacy routes so current links do not break.

```text
/                                  Landing page
/auth                              Auth page
/login                             Redirect to /auth, or temporary alias during migration
/app                               Dashboard
/dashboard                         Redirect to /app
/app/sorts                         Sorts index
/app/sorts/new                     Create Sort draft
/app/sorts/[sortId]                Status-aware redirect
/app/sorts/[sortId]/builder        Build/edit Playlist Recipes
/app/sorts/[sortId]/preview        Lightweight preview + start panel
/app/sorts/[sortId]/start          Full organization start page
/app/sorts/[sortId]/checkout       Legacy redirect to /start
/app/sorts/[sortId]/processing     Full-organization progress
/app/sorts/[sortId]/review         Review generated playlists/tracks
/app/sorts/[sortId]/exporting      Apple Music export progress
/app/sorts/[sortId]/complete       Export complete
/app/library                       Connected library overview
/app/settings/libraries            Provider management
/app/billing                       Deferred billing and historical records
/admin/sort-runs                   Admin/developer diagnostics only
```

The current codebase already uses some routes such as `/dashboard`, `/login`, and `/sorts/[id]`. Do not break them immediately. Add redirects/aliases first, then gradually move links to the canonical `/app` routes.

---

## Status model

Use these user-facing lifecycle statuses:

```text
Draft
Preview generating
Preview ready
Awaiting payment
Paid
Processing
Ready for review
Exporting
Exported
Failed
```

Recommended internal mapping for the current codebase:

```text
Draft
  Current sort_runs.state = draft
  No preview job completed yet.

Preview generating
  A preview job is queued/running.
  Existing schema may need a new state or a derived UI status from job_events.

Preview ready
  Lightweight preview exists.
  payment_status is pending.

Awaiting payment
  User has reached checkout but payment is not confirmed.

Paid
  Payment confirmed, full-organization job not yet started or just queued.

Processing
  Full sort job is running.
  Can map from paid/syncing/classifying or a new processing state.

Ready for review
  Full generated playlists exist and payment is paid, but no Apple Music export is queued.

Exporting
  Apple Music playlist creation/add-track job is running.
  Current state may map to creating_playlists.

Exported
  Apple Music playlist IDs exist and job completed.
  Current state may map to completed.

Failed
  Any blocking sync, preview, payment, processing, or export failure.
```

Do not rename database states in the first UI tickets. First create a `getSortUiStatus()` adapter that derives user-facing status from the current database state, payment status, preview snapshot, generated playlist counts, Apple playlist IDs, and job events. Add database state migrations only when necessary.

---

## Target dashboard states

### 1. Signed out

Unauthenticated users should not see private music data.

Primary action:

```text
Create account / Sign in
```

### 2. Signed in, no library connected

Route:

```text
/app
```

Primary card:

```text
Connect your first music library
Connect Apple Music so Organize Your Music can read your library and prepare it for sorting.
```

Primary button:

```text
Connect Apple Music
```

Provider cards:

```text
Apple Music — Available now
Spotify — Coming later
YouTube Music — Coming later
```

Disabled dashboard modules:

```text
Recent Sorts — empty
Library Status — not connected
Create Sort — connect a library first
```

### 3. Apple Music connected and syncing

After MusicKit authorization succeeds:

```text
Apple Music OAuth/MusicKit → /app?connected=apple_music
```

Dashboard should show:

```text
Apple Music connected
Syncing your library so you can create your first Sort.
```

Progress steps:

```text
Importing songs
Reading metadata
Preparing library index
Ready to sort
```

Primary action:

```text
Create Sort Draft
```

The final `Preview Sort` action stays disabled until the library index is ready.

### 4. Library ready, no Sorts yet

Dashboard should show:

```text
Your music workspace
Create your first Sort
Build playlists by mood, genre, language, era, region, or custom rules.
```

Primary action:

```text
Create a Sort
```

Cards:

```text
Library Status
Active Sorts
Recent Activity
Recent Sorts empty state
```

### 5. Returning dashboard

Dashboard should show:

```text
Library Status
Active Sorts counts
Recent Activity
Recent Sorts
Create a Sort
```

Recent Sort cards should show the right next action:

```text
Draft → Continue editing
Processing → View progress
Ready for review → Review playlists
Exported → View export
Failed → View issue / Retry
```

---

## Visual system and design references

Use `/Users/illiakulibaba/Desktop/Desighn` as directional design reference.
These files are not mandatory implementation specs and should not be copied
wholesale. Use them to understand product posture, density, route anatomy,
component families, and state hierarchy.

Primary references:

```text
brand-spec.md                 Visual tokens and typography posture.
css_styles.css                Shared static prototype styles.
landing.html                  Direction only. Preserve the existing app landing page unless FLOW-006 changes CTA routing.
auth.html                     FLOW-007 auth card direction.
dashboard-empty.html          FLOW-009 no-library dashboard state.
dashboard-syncing.html        FLOW-010 post-connection syncing state.
dashboard-ready.html          FLOW-011 ready/returning dashboard.
sort-builder.html             FLOW-016 builder workspace.
playlist-tags.html            FLOW-017 inline Tag Note state.
preview-paywall.html          FLOW-019 preview and unlock panel.
checkout.html                 FLOW-020 checkout summary.
processing.html               FLOW-022 processing page.
review-playlists.html         FLOW-023 three-pane review workspace.
export-complete.html          FLOW-025 complete state.
settings-libraries.html       FLOW-012 library/settings page.
billing.html                  FLOW-026 historical billing surface.
```

Reference interpretation rules:

- Treat the designs as direction, not pixel-locked truth.
- Keep real app text, inputs, buttons, tables, and controls code-native.
- Do not ship static screenshots as UI.
- Do not paste the prototype CSS into production without translating it into
  reusable Tailwind tokens/components.
- Keep the existing public landing page visuals. The prototype landing file is
  useful only for CTA-routing intent unless a later ticket explicitly approves a
  landing redesign.
- If a prototype screen conflicts with existing security/backend constraints,
  the backend constraint wins.
- If a prototype link points to a static `.html` file, map it to the canonical
  route listed in this document.

Core posture:

- Near-black canvas.
- Quiet burgundy/red radial light.
- Glass cards with 1px translucent borders.
- Pink/red gradient reserved for primary CTAs, progress, and key state marks.
- Preserve the existing public landing page visuals; this roadmap must not redesign the landing page.
- Structured, calm, functional app screens after auth.
- Sidebar app shell for dashboard and app routes.
- Rounded cards and pill actions.
- Clear grid alignment.

Token source:

```css
--bg: #030103;
--burgundy: #19040a;
--card: rgba(255, 255, 255, 0.055);
--card-elevated: rgba(255, 255, 255, 0.08);
--border: rgba(255, 255, 255, 0.12);
--fg: #ffffff;
--secondary: #b9aeb5;
--muted: #7e747a;
--pink: #ff2d55;
--red: #ff174c;
--success: #39d98a;
--warning: #ffb020;
--danger: #ff4d6d;
```

The `brand-spec.md` file also includes OKLCH token equivalents. It is fine to
use hex or OKLCH tokens as long as the rendered UI remains visually consistent.

Implementation guidance from current code review:

- `src/app/globals.css` still defaults the document to a light color scheme and
  white body background. FLOW-003 should change global defaults carefully and
  verify the existing landing page is not visually regressed.
- `src/components/app/app-shell.tsx` is currently a top-nav shell with
  Dashboard/Admin links. FLOW-005 should introduce the sidebar shell from the
  references for app routes, while keeping Admin out of normal user navigation.
- `src/components/ui/button.tsx` and `src/components/ui/status-pill.tsx`
  already exist but have limited variants. FLOW-004 should extend these instead
  of creating parallel button/pill systems.
- Current app cards already use rounded glass styling. Keep that family and
  make spacing, tokens, and responsive behavior consistent rather than starting
  from scratch.

---

## Current codebase constraints to preserve

The current app already has a real MVP pipeline. Preserve it while redesigning.

Do not break:

- Supabase Auth.
- Apple Music MusicKit connection.
- Server-side Apple Music developer token generation.
- Encrypted Apple Music user-token persistence.
- Library sync worker.
- Track normalization/dedupe/classification.
- Preview generation.
- Explicit confirmation before Apple Music write-back.
- Retry/failure handling.
- Admin diagnostics.

The main gaps this roadmap addresses:

1. The UI is still pipeline/developer-oriented instead of platform/product-oriented.
2. Auth route is currently `/login`; target flow wants `/auth`.
3. App home is currently `src/app/(app)/dashboard/page.tsx`; target flow wants `/app`.
4. Current preview route is `src/app/(app)/sorts/[id]/page.tsx`; target flow wants status-aware `/app/sorts/[sortId]` routes.
5. Legacy playlist request UI has been retired; target flow uses structured Playlist Recipes and Tags.
6. Current preview/review/write-back UI is too combined; target flow separates Preview, Checkout, Processing, Review, Exporting, and Complete.
7. Stripe/payment is deferred or incomplete; target flow needs one-time unlock per Sort.
8. Billing/settings/sorts index should become first-class platform surfaces.
9. Normal dashboard UI still exposes implementation details such as schema
   pending states, service-role configuration, raw UUIDs, and "sort run" copy.
   FLOW-027 should move those details to admin/developer diagnostics.

---

# Ticketed roadmap

## Phase A — Documentation and routing foundation

### FLOW-000 — Add this roadmap to repo docs

Goal: make the platform-first flow the source of truth for Codex.

Files:

```text
docs/UI_PLATFORM_FLOW_ROADMAP.md
docs/ROADMAP_TO_MVP.md
AGENTS.md
```

Tasks:

- Add this document to `docs/UI_PLATFORM_FLOW_ROADMAP.md`.
- Link it from `docs/ROADMAP_TO_MVP.md` as the next UI/product phase after the current MVP stabilization work.
- Add a short note to `AGENTS.md`: for UI work, read this roadmap before changing app routes/components.
- State clearly that the `/Users/illiakulibaba/Desktop/Desighn` HTML/CSS files
  are visual references only.

Acceptance criteria:

- The document exists in repo docs.
- Existing backend roadmap remains intact.
- Codex has explicit instruction to implement this ticket by ticket.
- No runtime behavior changes.

Checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

---

### FLOW-001 — Add canonical `/auth` and `/app` routes with legacy redirects

Status: complete on 2026-05-26.

Update on 2026-05-26: new Sort creation now immediately persists a draft
linked to the latest completed Apple Music sync when available. The builder
autosaves Sort name and Playlist Recipe changes; the manual `Save draft` button
was removed.

Goal: align routes with the platform-first flow without breaking existing links.

Files:

```text
src/app/auth/page.tsx
src/app/login/page.tsx
src/app/app/page.tsx or src/app/(app)/app/page.tsx depending route organization
src/app/dashboard/page.tsx or existing dashboard route
src/middleware.ts if needed
```

Tasks:

- Add `/auth` as the canonical auth page.
- Keep `/login` as a redirect or alias to `/auth` during migration.
- Add `/app` as the canonical dashboard route.
- Keep `/dashboard` as a redirect or alias to `/app` during migration.
- Update marketing CTA links gradually to `/auth` and `/app`.
- Ensure authenticated users who hit `/auth` are redirected to `/app`.
- Ensure unauthenticated users who hit `/app` see the signed-out app/auth state or are redirected to `/auth`, depending the chosen auth guard pattern.

Acceptance criteria:

- `/auth` works.
- `/app` works.
- `/login` and `/dashboard` do not 404.
- Existing Apple Music connection flow still works.
- Existing sort links still resolve.

---

### FLOW-002 — Create `getSortUiStatus()` and status-aware route helper

Status: complete on 2026-05-26.

Goal: create a stable adapter between current backend states and the target UI lifecycle.

Files:

```text
src/modules/sorts/ui-status.ts
src/modules/sorts/ui-status.test.ts
src/app/(app)/sorts/[id]/page.tsx
```

Tasks:

- Create `SortUiStatus` union:

```ts
export type SortUiStatus =
  | "draft"
  | "preview_generating"
  | "preview_ready"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "ready_for_review"
  | "exporting"
  | "exported"
  | "failed";
```

- Implement `getSortUiStatus(input)` using current data:
  - `sort_runs.state`
  - `payment_status`
  - preview snapshot presence
  - generated playlist count
  - Apple playlist ID count
  - active job events where available
- Implement `getSortPrimaryRoute(sortId, status)`.
- Convert `/app/sorts/[sortId]` or legacy `/sorts/[id]` to a status-aware redirect.

Acceptance criteria:

- Draft Sorts route to builder.
- Preview-ready Sorts route to preview.
- Paid/processing Sorts route to processing.
- Ready-for-review Sorts route to review.
- Exporting Sorts route to exporting.
- Completed/exported Sorts route to complete.
- Failed Sorts route to the best recovery page.
- Unit tests cover mappings.

---

## Phase B — Design system and app shell

### FLOW-003 — Replace global theme with dark platform tokens

Status: complete on 2026-05-26.

Goal: make the real app match the desired visual system.

Files:

```text
src/app/globals.css
tailwind.config.ts
```

Tasks:

- Change global color scheme to dark.
- Remove white body background.
- Add dark background radial gradients.
- Add product tokens:
  - background
  - burgundy
  - card
  - elevated card
  - border
  - foreground
  - secondary text
  - muted text
  - pink/red accents
  - success/warning/danger
- Update font stacks to the brand spec.
- Keep or map old color names only if needed for backwards compatibility.

Acceptance criteria:

- No new app/auth/platform page defaults to a white background.
- App/auth/platform routes share the same visual language.
- The existing public landing page remains visually unchanged except for
  approved CTA routing work.
- Existing components still render after token changes.

---

### FLOW-004 — Build reusable UI primitives

Status: complete on 2026-05-26.

Goal: avoid copying static HTML classes into every screen.

Files:

```text
src/components/ui/button.tsx
src/components/ui/status-pill.tsx
src/components/ui/card.tsx
src/components/ui/page-header.tsx
src/components/ui/progress.tsx
src/components/ui/tag-chip.tsx
src/components/ui/metric-card.tsx
src/components/ui/empty-state.tsx
src/components/ui/track-table.tsx
```

Tasks:

- Update `Button` variants:
  - primary
  - secondary/glass
  - ghost
  - danger
  - disabled
- Update `StatusPill` tones:
  - neutral
  - pink
  - success
  - warning
  - danger
  - muted
- Add `Card`, `PageHeader`, `Progress`, `TagChip`, `MetricCard`, `EmptyState`, `TrackTable`.
- Keep components accessible with correct labels, button types, disabled states, and focus rings.

Acceptance criteria:

- New pages can use shared primitives instead of repeated Tailwind strings.
- Existing UI components that import Button/StatusPill continue to compile.
- Components work on dark background.

---

### FLOW-005 — Replace app shell with platform navigation

Status: complete on 2026-05-26.

Goal: make the app feel like a platform workspace.

Files:

```text
src/components/app/app-shell.tsx
src/components/app/app-sidebar.tsx
src/components/app/app-mobile-nav.tsx
```

Tasks:

- Replace the current top-only Dashboard/Admin app shell with a sidebar app shell.
- Navigation:

```text
Dashboard → /app
Sorts → /app/sorts
Library → /app/library
Billing → /app/billing
Settings → /app/settings/libraries
```

- Keep Admin out of normal user navigation.
- Use active states based on pathname.
- Add responsive behavior:
  - desktop sidebar
  - tablet/mobile top or horizontal navigation

Acceptance criteria:

- Dashboard and all app subpages use one shell.
- Admin remains accessible only by direct/admin route.
- Sidebar matches visual reference.
- No duplicated shell layouts in new app pages.

---

## Phase C — Entry routing and auth

### FLOW-006 — Preserve landing page and fix CTA routing only

Status: complete on 2026-05-26.

Goal: keep the existing public landing page visually unchanged. This roadmap starts the redesign after auth, inside the app platform.

Files allowed:

```text
src/app/page.tsx
src/components/marketing/site-header.tsx
src/components/marketing/hero.tsx
src/components/marketing/preview-showcase.tsx
src/components/marketing/value-sections.tsx
src/components/marketing/pricing-cta.tsx
src/lib/auth/session.ts if needed
```

Allowed tasks:

- Fix CTA routing only where required.
- Primary CTA `Start a sort` should route unauthenticated users to `/auth`.
- Top-right CTA `Open app` should route unauthenticated users to `/auth`.
- Authenticated users should be routed into the platform:
  - `Start a sort` → `/app/sorts/new` when allowed, or `/app` if Sort creation is blocked until library setup.
  - `Open app` → `/app`.
- Keep `See preview` as the current marketing anchor/preview behavior unless a route is already broken.
- Add a small auth-aware redirect helper if needed, but do not redesign the landing UI.

Do not touch:

- Landing hero layout.
- Landing headline/copy unless a link label is broken.
- Landing typography.
- Landing colors.
- Landing spacing.
- Landing product preview visuals.
- Marketing sections.
- Pricing section.
- FAQ.
- Overall public marketing visual style.

Acceptance criteria:

- Unauthenticated `Start a sort` goes to `/auth`.
- Unauthenticated `Open app` goes to `/auth`.
- Authenticated users go to `/app` or `/app/sorts/new` according to the rules above.
- The landing page looks visually the same before and after this ticket.
- No marketing redesign is included in this ticket.

---

### FLOW-007 — Redesign auth page with Apple, Google, and email/password

Status: complete on 2026-05-26.

Goal: make auth feel like the first step into the app workspace, not an isolated developer login.

Files:

```text
src/app/auth/page.tsx
src/app/login/page.tsx
src/app/login/actions.ts or src/app/auth/actions.ts
src/lib/auth/oauth.ts if needed
```

Tasks:

- Use centered dark auth card.
- Title: `Create your account`.
- Add auth options:
  - Continue with Apple
  - Continue with Google
  - Email
  - Password
- Keep current email/password flow working.
- Implement Supabase OAuth actions if providers are configured.
- If OAuth providers are not configured, show disabled provider buttons with clear copy.
- Add legal copy:

```text
By continuing, you agree to Terms and Privacy Policy.
```

- After successful auth, redirect to `/app`.

Acceptance criteria:

- Email/password sign-in and signup still work.
- Apple/Google options appear without breaking if not configured.
- Authenticated users redirect to `/app`.
- Auth page matches visual reference.

---

## Phase D — Dashboard and library setup states

### FLOW-008 — Rebuild dashboard state controller

Status: complete on 2026-05-26.

Goal: make `/app` render the correct platform setup/ready state.

Files:

```text
src/app/(app)/app/page.tsx or src/app/app/page.tsx
src/components/app/dashboard/dashboard-state-controller.tsx
src/modules/dashboard/get-dashboard-state.ts
```

Tasks:

Create a server-side dashboard state function that returns:

```ts
type DashboardState =
  | "signed_out"
  | "no_library_connected"
  | "library_syncing"
  | "library_ready_no_sorts"
  | "library_ready_with_sorts";
```

Inputs:

- Auth session.
- Apple Music connection status.
- Latest library sync status.
- Recent Sort count.
- Active processing job count.

Acceptance criteria:

- `/app` displays one coherent state, not all possible states at once.
- No pipeline/developer glossary appears on user-facing dashboard.
- Missing config errors are handled but not shown as normal product copy.

---

### FLOW-009 — Dashboard empty state: no library connected

Status: complete on 2026-05-26.

Goal: implement the first signed-in platform screen.

Files:

```text
src/components/app/dashboard/dashboard-empty.tsx
src/components/app/library/provider-card.tsx
```

Tasks:

- Header:

```text
Your music workspace
```

- Disabled primary action:

```text
Create a Sort
```

- Main card:

```text
Connect your first music library
Connect Apple Music so Organize Your Music can read your library and prepare it for sorting.
```

- Button:

```text
Connect Apple Music
```

- Provider cards:
  - Apple Music — Available now
  - Spotify — Coming later
  - YouTube Music — Coming later
- Disabled modules:
  - Recent Sorts
  - Library Status
  - Create Sort

Acceptance criteria:

- User understands this is a dashboard setup state.
- Create Sort is disabled or explains why it is unavailable.
- Spotify/YouTube are disabled.

---

### FLOW-010 — Auto-start or prompt library sync after Apple Music connection

Status: complete on 2026-05-26.

Goal: implement the desired post-connection behavior.

Files:

```text
src/components/app/apple-music-connect-card.tsx
src/app/api/apple-music/connections/route.ts or current connection endpoint
src/app/api/library-syncs/route.ts
src/modules/library-syncs/queue.ts
src/components/app/dashboard/dashboard-syncing.tsx
```

Tasks:

- After Apple Music authorization succeeds and token is persisted, redirect/refresh to `/app?connected=apple_music`.
- Preferred behavior: queue a library sync automatically after successful connection.
- If auto-queue fails, show a prominent `Start sync` fallback on the dashboard.
- Dashboard syncing state should show:
  - progress percent
  - current step
  - track counts if known
  - estimated remaining time if known
  - `Create Sort Draft` action
- Explain:

```text
You can name a Sort and draft Playlist Recipes now. Preview stays locked until the library index is ready.
```

Acceptance criteria:

- User returns to dashboard after connection.
- User sees active sync state or a clear sync-start fallback.
- No separate sync onboarding page is introduced.
- Sync continues if user navigates away.

---

### FLOW-011 — Dashboard ready and returning-user dashboard

Status: complete on 2026-05-26.

Goal: create the main home base after library sync.

Files:

```text
src/components/app/dashboard/dashboard-ready-empty.tsx
src/components/app/dashboard/dashboard-returning.tsx
src/components/app/dashboard/library-status-card.tsx
src/components/app/dashboard/active-sorts-card.tsx
src/components/app/dashboard/recent-activity-card.tsx
src/components/app/dashboard/recent-sort-card.tsx
src/modules/sorts/list-sort-runs.ts
src/modules/activity/list-activity.ts
```

Tasks:

- First-time ready dashboard:
  - Library Status card.
  - Create your first Sort card.
  - Recent Sorts empty state.
- Returning dashboard:
  - Library Status card.
  - Active Sorts counts.
  - Recent Activity.
  - Recent Sorts grid.
- Recent Sorts show:
  - title
  - status
  - provider
  - recipe count
  - next action
- Link every Sort card to `getSortPrimaryRoute()`.

Acceptance criteria:

- Ready dashboard does not mix “first Sort” and existing Sorts inconsistently.
- Returning users can quickly resume drafts, progress, review, and export.
- Dashboard is action-oriented, not implementation-oriented.

---

### FLOW-012 — Connected libraries/settings page

Status: complete on 2026-05-26.

Goal: make provider management a real platform area.

Files:

```text
src/app/(app)/app/library/page.tsx or src/app/app/library/page.tsx
src/app/(app)/app/settings/libraries/page.tsx
src/components/app/library/connected-libraries-page.tsx
src/components/app/library/apple-music-library-card.tsx
src/components/app/library/coming-soon-provider-card.tsx
```

Tasks:

- Show Apple Music connection status.
- Show last successful sync.
- Actions:
  - Sync now
  - Reconnect
  - Disconnect placeholder or implemented action if safe
- Show Spotify and YouTube Music as disabled Coming later cards.
- Add access note:

```text
Organize Your Music reads library metadata to classify tracks. Playlist creation requires your review and explicit export action.
```

Acceptance criteria:

- Library/provider management is not buried in dashboard only.
- Users can understand provider access and sync status.
- No non-MVP providers are accidentally enabled.

---

## Phase E — Sorts and structured Playlist Recipes

### FLOW-013 — Add Sorts index page

Status: complete on 2026-05-26.

Goal: let users browse all Sorts, not only the latest one.

Files:

```text
src/app/(app)/app/sorts/page.tsx
src/components/app/sorts/sorts-index.tsx
src/components/app/sorts/sort-card.tsx
src/components/app/sorts/sort-empty-state.tsx
src/modules/sorts/list-sort-runs.ts
```

Tasks:

- Add `/app/sorts`.
- Show all recent Sorts with status and next action.
- Add filters or tabs:
  - All
  - Draft
  - Processing
  - Ready for review
  - Exported
  - Failed
- Add primary CTA:

```text
Create a Sort
```

Acceptance criteria:

- Sorts index works with no Sorts.
- Sorts index works with mixed statuses.
- Every card links to the correct status-aware route.

---

### FLOW-014 — Add Playlist Recipe data model

Status: complete on 2026-05-26.

Goal: replace textarea-only playlist requests with structured Playlist Recipes.

Files:

```text
supabase/migrations/0002_playlist_recipes.sql
src/types/domain.ts
src/modules/playlist-recipes/schema.ts
src/modules/playlist-recipes/store.ts
src/modules/playlist-recipes/adapter.ts
src/modules/playlist-recipes/schema.test.ts
src/modules/playlist-recipes/adapter.test.ts
```

Recommended table:

```sql
create table if not exists playlist_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  position integer not null,
  name text not null,
  playlist_note text,
  target_track_min integer,
  target_track_max integer,
  duplicate_policy text not null default 'avoid_duplicates',
  allow_explicit boolean not null default true,
  include_library_only boolean not null default true,
  tags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended tag type:

```ts
export type PlaylistRecipeTagCategory =
  | "mood"
  | "genre"
  | "language"
  | "era"
  | "region"
  | "energy"
  | "activity"
  | "artist_style"
  | "custom";

export type PlaylistRecipeTag = {
  id: string;
  category: PlaylistRecipeTagCategory;
  value: string;
  note?: string;
};
```

Tasks:

- Add RLS policies for `playlist_recipes`.
- Add Zod schema validation for recipe create/update.
- Add adapter from Playlist Recipe to existing parsed request/rules model so current planner can continue working.
- Keep existing `playlist_requests` compatibility for old Sort runs.

Acceptance criteria:

- Recipes persist per user and per Sort.
- Tags and Tag Notes persist as structured data.
- Old Sorts still load.
- Tests cover validation and recipe-to-rules conversion.

---

### FLOW-015 — Add Sort draft APIs

Status: complete on 2026-05-26.

Goal: allow Sort drafts before library sync is complete.

Files:

```text
src/app/api/app/sorts/route.ts
src/app/api/app/sorts/[sortId]/route.ts
src/app/api/app/sorts/[sortId]/recipes/route.ts
src/app/api/app/sorts/[sortId]/recipes/[recipeId]/route.ts
src/modules/sorts/drafts.ts
src/modules/playlist-recipes/store.ts
```

Tasks:

- Create Sort draft with:
  - user id
  - optional library sync id
  - source provider = Apple Music
  - name
  - state = draft
- Create/update/delete/reorder Playlist Recipes.
- Allow draft creation while sync is running.
- Prevent preview generation until completed sync exists.
- Return clear disabled reason if preview cannot run yet.

Acceptance criteria:

- User can create Sort draft while library sync runs.
- User can save recipes without completed sync.
- Preview route blocks until library sync is ready.
- API boundaries use Zod.

---

### FLOW-016 — Build Sort builder workspace

Status: complete on 2026-05-26.

Goal: implement the core builder UI.

Files:

```text
src/app/(app)/app/sorts/new/page.tsx
src/app/(app)/app/sorts/[sortId]/builder/page.tsx
src/components/app/sort-builder/sort-builder.tsx
src/components/app/sort-builder/playlist-recipe-list.tsx
src/components/app/sort-builder/playlist-recipe-editor.tsx
src/components/app/sort-builder/sort-builder-footer.tsx
src/components/app/sort-builder/sort-builder-validation.ts
```

Tasks:

Builder layout:

- Header:

```text
New Sort
Build playlist recipes
Create one or more Playlist Recipes. Each recipe becomes a playlist after sorting.
```

- Fields:
  - Sort name
  - Source library: Apple Music
  - Output behavior:
    - Create new playlists only
    - Do not modify existing playlists
    - Avoid duplicates where possible
- Left panel:
  - Playlists in this Sort
  - Add playlist
  - Recipe list
- Right panel:
  - Playlist name
  - Tags
  - Optional playlist note
  - Target size
  - Duplicate handling
  - Allow explicit tracks
  - Include library songs only
- Footer:
  - `N playlists planned`
  - Autosave status
  - Preview Sort

Rules:

- Use cards, not thin rows, for Playlist Recipes.
- Sticky footer must not overlap content.
- `Preview Sort` disabled until valid and library sync is complete.
- If sync is not complete, explain:

```text
You can save this draft now. Preview unlocks when the library index is ready.
```

Acceptance criteria:

- User can create, save, and reopen a Sort draft.
- User can add multiple Playlist Recipes.
- User can duplicate/delete/reorder recipes.
- Validation prevents empty unusable previews.

---

### FLOW-017 — Build tag picker and inline Tag Notes

Status: complete on 2026-05-26.

Goal: implement the structured tag interaction.

Files:

```text
src/components/app/sort-builder/tag-picker.tsx
src/components/app/sort-builder/tag-chip.tsx
src/components/app/sort-builder/tag-note-panel.tsx
src/modules/playlist-recipes/tags.ts
src/modules/playlist-recipes/tags.test.ts
```

Tasks:

- Tag categories:
  - Mood
  - Genre
  - Language
  - Era
  - Region
  - Energy
  - Activity
  - Artist style
  - Custom
- Add tag flow:
  - User clicks `Add tag`.
  - Small menu opens.
  - User chooses category.
  - User selects or types value.
  - Tag appears as chip.
- Tag Note flow:
  - Each chip has a small note/plus icon.
  - Clicking it opens an inline note panel attached to the selected chip.
  - Title example: `What does Sad mean to you?`
  - Placeholder: `Example: slower, melancholic, not angry, works for late-night listening.`
  - Actions: Save note, Remove note.
- Saved notes show a small visual indicator on the chip.
- Do not use modal dialogs for normal tag note editing.

Acceptance criteria:

- Tags are structured.
- Tag Notes are optional.
- Tag Notes are scoped to the recipe.
- Keyboard users can add/edit/remove tags and notes.
- Tests cover tag updates and note persistence.

---

## Phase F — Preview, paywall, and payment

### FLOW-018 — Generate lightweight preview from Playlist Recipes

Status: complete on 2026-05-26.

Update on 2026-05-26: lightweight preview shows three sample tracks per Playlist
Recipe before payment. If the temporary matching logic finds no suitable tracks,
the preview falls back to simple samples from the synced Apple Music library so
the paywall surface can be tested independently of final sorting quality.

Goal: provide value before payment without running/exporting the full paid workflow.

Files:

```text
src/app/api/app/sorts/[sortId]/preview/route.ts
src/modules/sorts/lightweight-preview.ts
src/modules/sorts/preview-snapshot.ts
src/modules/playlist-recipes/adapter.ts
src/modules/sorts/lightweight-preview.test.ts
```

Tasks:

- Add preview generation based on Playlist Recipes.
- Use completed library sync data.
- Output per recipe:
  - playlist name
  - tags used
  - estimated track count
  - 3 sample tracks
  - confidence/fit indicator
  - locked row count or locked indicator
- Store preview snapshot as immutable once payment starts.
- Do not create Apple Music playlists.
- Do not run write-back jobs.

Implementation note:

If current planner already generates full preview output, initially derive a lightweight view from the existing snapshot by showing only sample tracks and locked rows. Later split lightweight preview and full paid generation more strictly.

Acceptance criteria:

- Preview can be generated from structured recipes.
- Preview is visible before payment.
- Preview does not create playlists.
- Preview errors are clear and recoverable.

---

### FLOW-019 — Build preview/paywall page

Status: complete on 2026-05-26.

Goal: implement the pre-payment value screen.

Files:

```text
src/app/(app)/app/sorts/[sortId]/preview/page.tsx
src/components/app/preview/preview-paywall-page.tsx
src/components/app/preview/playlist-preview-card.tsx
src/components/app/preview/unlock-sort-card.tsx
```

Tasks:

- Left side: Playlist preview cards.
- Right side: Start full organization panel.
- Each preview card shows:
  - Playlist name
  - Estimated track count
  - Tags used
  - Sample tracks
  - Locked rows
  - `Preview only. Final results are generated after you start full organization.`
- Unlock card copy:

```text
Start full organization
Run the full library analysis and review every generated playlist before anything is created in Apple Music.
```

- CTA:

```text
Generate full results
```

or

```text
Continue to billing
```

Do not use vague `Continue` copy alone.

Acceptance criteria:

- User sees likely output before payment.
- Paywall is tied to this specific Sort.
- No export/write-back action is available on preview page.

---

### FLOW-020 — Implement one-time Sort checkout

Status: complete on 2026-05-26 as an explicitly approved local dev bypass path.
Real Stripe payment remains deferred.

Completion notes:

- Added the canonical `/app/sorts/[sortId]/checkout` page at the time; current
  platform-first UI uses `/app/sorts/[sortId]/start` and redirects the legacy
  checkout page there.
- Added `/api/app/sorts/[sortId]/checkout`.
- Added `PAYMENTS_ENABLED` and `PAYMENTS_DEV_BYPASS_ENABLED` flags.
- Checkout stays disabled by default.
- When `PAYMENTS_DEV_BYPASS_ENABLED=true`, the approved local bypass marks the
  Sort paid and routes to processing.
- Removed the legacy automatic mock checkout path; legacy checkout now follows
  the same payment/dev-bypass flags.
- No Apple Music export happens during checkout or bypass.

Goal: add payment as a Sort-specific unlock step.

Files:

```text
src/app/(app)/app/sorts/[sortId]/start/page.tsx
src/app/(app)/app/sorts/[sortId]/checkout/page.tsx
src/app/api/app/sorts/[sortId]/checkout/route.ts
src/app/api/stripe/webhook/route.ts
src/modules/payments/checkout.ts
src/modules/payments/webhook.ts
src/modules/payments/store.ts
```

Tasks:

- Checkout title:

```text
Unlock this Sort
```

- Subtext:

```text
Generate full playlists from your Apple Music library, review the results, and export them to Apple Music.
```

- Show summary:
  - Sort name
  - Number of Playlist Recipes
  - Connected library
  - Estimated output
  - Price
- Show included:
  - Full library analysis
  - Generated playlists from your recipes
  - Track-level review before export
  - Create Apple Music playlists and add approved tracks
- CTA:

```text
Pay and start full organization
```

Feature flag:

```text
PAYMENTS_ENABLED=true/false
```

If payments are disabled:

- Do not fake production payment.
- Do not add a dev-only payment bypass unless the user explicitly changes this
  decision.
- Keep full paid sorting blocked behind payment until a real payment path is
  implemented or the roadmap is revised.

Acceptance criteria:

- Stripe Checkout works when enabled and this ticket is unblocked.
- Webhook verifies signatures.
- Payment status updates the Sort.
- Preview snapshot freezes before checkout.
- Full organization does not start until payment is confirmed.

---

## Phase G — Full processing, review, export

### FLOW-021 — Start full-organization job after payment

Status: complete on 2026-05-26 using the explicitly approved local FLOW-020
dev-bypass payment confirmation path. Real Stripe confirmation remains deferred.

Completion notes:

- Added a `full-sort` pg-boss job that runs only for Sorts with
  `payment_status = paid`.
- Checkout dev-bypass confirmation now queues the full-organization job after the Sort
  is marked paid.
- The full-organization worker generates complete editable playlists from Playlist
  Recipes and stores them in `sort_playlists` / `sort_playlist_tracks`.
- Low-match diagnostics are preserved in `playlist_rules`.
- Review loads stored full-organization results separately from the lightweight preview
  snapshot.
- Apple Music export is not triggered by payment, checkout, or full organization.

Goal: separate pre-payment preview from paid full generation.

Files:

```text
src/modules/sorts/full-sort-job.ts
src/worker/jobs/full-sort.ts
src/app/api/app/sorts/[sortId]/start-full-sort/route.ts if needed
```

Tasks:

- When payment is confirmed, queue full-organization job.
- Set UI status to `processing`.
- Full job should generate complete editable playlists from Playlist Recipes.
- Store generated playlists and tracks in existing `sort_playlists` / `sort_playlist_tracks` tables or new versioned tables if needed.
- Preserve low-match diagnostics.
- Do not export to Apple Music.

Acceptance criteria:

- Payment confirmation queues full sort.
- Full sort result is stored separately from lightweight preview if needed.
- Apple Music write-back is not triggered.
- Failures are visible and retryable.

---

### FLOW-022 — Build processing page

Status: complete on 2026-05-26.

Goal: show progress while the paid full sort runs.

Files:

```text
src/app/(app)/app/sorts/[sortId]/processing/page.tsx
src/components/app/processing/processing-page.tsx
src/components/app/processing/processing-steps.tsx
src/modules/sorts/progress.ts
```

Tasks:

- Show page title:

```text
Sorting your library
```

- Show:
  - Progress percentage
  - Estimated time remaining if available
  - Current step
  - Playlist Recipe count
  - Track count processed
- Pipeline steps:
  - Preparing library
  - Classifying tracks
  - Building playlists
  - Removing duplicates
  - Preparing review
  - Ready
- Include message:

```text
You can leave and return later. Processing jobs stay attached to this Sort.
```

- Add `Back to dashboard`.
- Poll status or use router refresh.

Acceptance criteria:

- Processing page works if user refreshes.
- Dashboard card shows matching processing status.
- Failed state displays useful recovery action.

---

### FLOW-023 — Build review playlists page

Status: complete on 2026-05-26.

Goal: create the main editable review workspace before export.

Files:

```text
src/app/(app)/app/sorts/[sortId]/review/page.tsx
src/components/app/review/review-playlists-page.tsx
src/components/app/review/generated-playlist-list.tsx
src/components/app/review/playlist-track-table.tsx
src/components/app/review/playlist-details-panel.tsx
src/components/app/review/export-confirmation-dialog.tsx
src/modules/sorts/review-selection.ts
src/modules/sorts/review-selection.test.ts
```

Layout:

- Left panel: generated playlists list.
- Main panel: selected playlist track table.
- Right panel: playlist details/export controls.

Track table columns:

```text
Track
Artist
Album
Reason included
Matched tags
Actions
```

Track actions:

- Keep
- Remove
- Move to another playlist, optional later
- Search/add track manually, optional later

Playlist actions:

- Rename playlist
- Delete playlist
- Regenerate playlist placeholder or implemented action
- Adjust recipe
- Export this playlist
- Export all playlists

Primary CTA:

```text
Create Apple Music playlists
```

Secondary CTA:

```text
Save for later
```

Trust copy:

```text
Nothing is exported automatically. Export creates Apple Music playlists and adds approved tracks.
```

Acceptance criteria:

- User can inspect full generated playlists.
- User can remove tracks before export.
- User can exclude/delete playlists before export.
- Export requires explicit confirmation.
- Existing Apple Music write-back safety is preserved.

---

### FLOW-024 — Move Apple Music write-back behind export action

Status: complete on 2026-05-26.

Goal: ensure export happens only after review.

Files:

```text
src/app/api/app/sorts/[sortId]/export/route.ts
src/app/api/sort-runs/[id]/confirm/route.ts existing route may be adapted
src/modules/sorts/export-selection.ts
src/modules/apple-music/write-back.ts
src/worker/jobs/create-apple-playlists.ts
```

Tasks:

- Keep existing write-back logic, but expose it as `Export reviewed playlists` rather than generic confirmation.
- Confirmation dialog should say:

```text
Create X reviewed playlists in Apple Music?
Organize Your Music will create new playlists only. Existing playlists will not be modified.
```

- Submit selected playlist IDs and removed track IDs.
- Queue Apple Music playlist creation job.
- Set UI status to `exporting`.

Acceptance criteria:

- No Apple Music playlist is created from preview, checkout, or processing.
- Export action is explicit.
- Export is retry-safe and avoids duplicate playlists.
- Existing confirmed write-back tests still pass or are updated to new terminology.

---

### FLOW-025 — Build exporting and export complete pages

Status: complete on 2026-05-26.

Goal: separate export progress and success states.

Files:

```text
src/app/(app)/app/sorts/[sortId]/exporting/page.tsx
src/app/(app)/app/sorts/[sortId]/complete/page.tsx
src/components/app/export/exporting-page.tsx
src/components/app/export/export-complete-page.tsx
```

Exporting page steps:

```text
Creating playlists
Adding tracks
Finalizing
Done
```

Export complete page:

```text
Playlists created in Apple Music
Your reviewed playlists were created in Apple Music. Nothing else in your library was modified.
```

Show:

- Playlist names
- Track counts
- Export timestamp
- Open Apple Music button if URL/deep link exists
- Back to dashboard

Acceptance criteria:

- Exporting state can be refreshed.
- Export complete summarizes exactly what was created.
- Dashboard Sort card becomes `Exported`.

---

## Phase H — Billing and account surfaces

### FLOW-026 — Build Billing page for pay-per-Sort

Status: complete on 2026-05-26. Implemented as a read-only billing surface while
payment implementation remains blocked.

Goal: make billing match one-time Sort unlocks, not subscriptions.

Files:

```text
src/app/(app)/app/billing/page.tsx
src/components/app/billing/billing-page.tsx
src/components/app/billing/current-plan-card.tsx
src/components/app/billing/paid-sorts-card.tsx
src/components/app/billing/payment-history-table.tsx
src/modules/payments/list-payments.ts
```

Tasks:

- Current plan:

```text
Pay per Sort
No active subscription.
Historical billing records remain visible for existing accounts while new billing is deferred.
```

- Show historical organization billing records.
- Show payment history.
- Show receipts if Stripe provides them.
- Add Manage billing settings placeholder or Stripe customer portal if configured.

Acceptance criteria:

- No subscription-first wording.
- Empty billing state works.
- Historical organization billing records appear when payment rows exist.

---

### FLOW-027 — Remove developer/pipeline language from normal user UI

Status: complete on 2026-05-26.

Goal: make the product feel polished and non-technical.

Files:

```text
src/components/app/pipeline-overview.tsx
src/components/app/latest-sort-run-card.tsx
structured Sort Builder playlist recipe components
src/app/(app)/dashboard/page.tsx
new /app pages
```

Tasks:

Remove or hide from normal user pages:

- `Shell only`
- `Auth pending`
- `Schema pending`
- `Parser ready`
- `Sort run ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MVP-005`
- raw UUIDs unless in admin/developer context

Replace with product language:

- `Create a Sort`
- `Preview ready`
- `Processing`
- `Ready for review`
- `Exported`
- `Library needs attention`

Acceptance criteria:

- Normal users do not see implementation details.
- Admin route still exposes necessary debugging information.
- Error messages remain useful without exposing secrets or internals.

---

## Phase I — Quality, tests, and release hardening

### FLOW-028 — Responsive and accessibility pass

Status: complete on 2026-05-26.

Completion notes:

- Added a keyboard skip link and focusable main app landmark in the platform shell.
- Added accessible captions to preview, review, and billing tables.
- Added progressbar semantics to the custom Apple Music sync progress indicator.
- Connected disabled Sort builder and review controls to explanatory text.
- Added focus target and description wiring to the export confirmation dialog.

Goal: finish the platform UI safely.

Files:

```text
all new app/marketing/auth components
```

Tasks:

- Desktop target: 1440px width.
- Test tablet and mobile layouts.
- Confirm no horizontal overflow.
- Ensure sidebar becomes usable on narrow screens.
- Keyboard support for:
  - auth forms
  - sidebar links
  - tag picker
  - Tag Note editor
  - Sort builder buttons
  - review table actions
  - export confirmation dialog
- Add accessible labels to progress bars.
- Ensure disabled actions explain why.
- Ensure forms have labels.
- Ensure dialogs use `role="dialog"` and focus behavior.

Acceptance criteria:

- Pages are usable at desktop, tablet, and mobile widths.
- Primary workflows can be completed by keyboard.
- Build, typecheck, lint, and tests pass.

---

### FLOW-029 — End-to-end smoke test of the new flow

Status: partially unblocked on 2026-05-26 after real Safari Apple Music sign-in
and sync.

Blockers:

- The target account has no completed platform-first full-organization start,
  processing, review, and export path has not been executed through the UI.
- The largest verified completed sync for the target account has 378 raw tracks,
  so the 500-track smoke target remains unverified.
- Apple Music write-back requires a fresh explicit export confirmation after
  reviewing generated playlists. No export was attempted.
- A direct unauthenticated probe of `/api/apple/developer-token` was skipped
  because a successful response could expose a developer token in command
  output.

Safe preflight completed:

- Restarted FLOW-029 on 2026-05-26 and reran the required local check set:
  `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
- Required local environment variable names are present in `.env.local` or
  `.env`.
- Added local env loading for standalone worker commands.
- Restored the explicitly approved local `PAYMENTS_DEV_BYPASS_ENABLED=true`
  flag in `.env.local`; it is not a default or production setting.
- `/`, `/app`, `/auth`, `/app/sorts`, and `/app/settings/libraries` were checked
  locally.
- `npm run worker:check` passed after running outside the sandbox so `tsx` could
  create its IPC pipe.
- Supabase MCP aggregate preflight found one target profile, one connected
  Apple Music connection, two completed syncs, max 378 raw tracks, max 360
  normalized tracks, two Sorts, zero historical billing records, four generated playlists, and
  six generated playlist tracks.
- No Apple Music export smoke was attempted.
- The user completed real Apple Music sign-in in Safari and local sync now
  works. Supabase aggregate preflight found one connected Apple Music
  connection, five completed syncs, max 378 raw tracks, max 360 normalized
  tracks, two Sorts, zero historical billing records, and one historical export-started Sort.

Goal: verify the redesigned platform flow works with the real backend.

Tasks:

Run through:

1. Visit landing page.
2. Click Start a sort.
3. Create/sign into account.
4. Land on `/app`.
5. Connect Apple Music.
6. Return to dashboard syncing state.
7. Create Sort draft while syncing if sync takes time.
8. Complete sync.
9. Build at least three Playlist Recipes.
10. Generate preview.
11. View paywall.
12. Complete payment or explicit dev bypass.
13. See processing page.
14. Review generated playlists.
15. Remove at least one track or playlist.
16. Export reviewed playlists to Apple Music.
17. Verify export complete page.
18. Verify dashboard shows exported Sort.

Acceptance criteria:

- Full flow works once end-to-end.
- No Apple Music export happens before review/export confirmation.
- Payment gate cannot be bypassed in production unless intentionally disabled for MVP.
- Known issues are documented.

---

## Recommended implementation order

Use small PRs/branches. Do not do the full redesign in one Codex run.
Before each FLOW ticket, inspect the matching design reference file from
`/Users/illiakulibaba/Desktop/Desighn` plus the existing route/component being
changed. Implement the smallest compatible step, then run the standard checks.

```text
Batch 1: FLOW-000, FLOW-001, FLOW-002
Batch 2: FLOW-003, FLOW-004, FLOW-005
Batch 3: FLOW-006, FLOW-007
Batch 4: FLOW-008, FLOW-009, FLOW-010, FLOW-011, FLOW-012
Batch 5: FLOW-013, FLOW-014, FLOW-015
Batch 6: FLOW-016, FLOW-017
Batch 7: FLOW-018, FLOW-019, FLOW-020
Batch 8: FLOW-021, FLOW-022, FLOW-023
Batch 9: FLOW-024, FLOW-025
Batch 10: FLOW-026, FLOW-027, FLOW-028, FLOW-029
```

Risk levels:

```text
Low risk:
FLOW-000, FLOW-003, FLOW-004, FLOW-005, FLOW-006, FLOW-007, FLOW-009, FLOW-012, FLOW-026, FLOW-027

Medium risk:
FLOW-001, FLOW-002, FLOW-008, FLOW-011, FLOW-013, FLOW-016, FLOW-017, FLOW-019, FLOW-022, FLOW-025, FLOW-028

High risk:
FLOW-010, FLOW-014, FLOW-015, FLOW-018, FLOW-020, FLOW-021, FLOW-023, FLOW-024, FLOW-029
```

High-risk tickets should be separate Codex runs with tests.

---

## Codex prompt to start the work

Use this prompt when starting Codex:

```text
Read AGENTS.md, docs/ROADMAP_TO_MVP.md, and docs/UI_PLATFORM_FLOW_ROADMAP.md.

Implement the platform-first UI flow ticket by ticket. Do not rewrite the working Apple Music backend pipeline. Preserve auth, Apple Music connection, encrypted token storage, library sync, preview generation, explicit review/export, and retry-safe Apple Music write-back.

Use `/Users/illiakulibaba/Desktop/Desighn` only as visual direction. Translate
the design into reusable Next.js App Router components, Tailwind tokens, and
typed domain modules.

Start with FLOW-000 unless already complete. After each ticket, run npm run typecheck, npm run lint, npm run test, and npm run build where possible. Update docs with behavior changes, blockers, env vars, database migrations, and known limitations.
```

---

## Definition of done for the redesigned MVP

The redesigned MVP is done only when all of these are true:

- Existing landing page remains visually unchanged and routes into the app flow correctly.
- Auth page supports email/password and shows Apple/Google options.
- `/app` is the dashboard home base.
- Apple Music connection returns to dashboard, not a standalone onboarding page.
- Dashboard shows empty, syncing, ready, and returning-user states correctly.
- Users can create multiple Sorts.
- Users can create Playlist Recipes with structured Tags and optional Tag Notes.
- Users can save drafts.
- Users can preview before payment.
- Paywall appears only after preview.
- Payment belongs to one Sort.
- Full organization starts only after payment confirmation or explicit dev bypass.
- Processing can be left and resumed.
- Users review playlists before export.
- Apple Music export happens only after explicit user action.
- Export complete page shows what was created.
- Billing shows pay-per-Sort history, not subscription-first language.
- Settings/library page manages Apple Music and shows Spotify/YouTube as coming later.
- Normal user UI no longer exposes developer/pipeline language.
- Standard checks pass.
