# Admin List Pagination Implementation Plan

> **For Hermes:** Use subagent-driven-development or drone-delegation to implement this plan task-by-task. Keep Hermes as controller: dispatch, verify gates, and open/track PRs.

**Goal:** Add cursor pagination to the admin list endpoints without regressing RBAC filtering, generated API types, or the existing admin-web screens.

**Architecture:** Use keyset pagination ordered by `(createdAt DESC, id DESC)`, with an opaque base64url cursor containing the last row's `createdAt` and `id`. Backend services return a shared internal `Page<T>` shape; route responses preserve each endpoint's existing named list key and add `nextCursor` to minimize frontend churn.

**Tech Stack:** Bun 1.2.23-compatible TypeScript, Elysia/TypeBox, Eden Treaty, Drizzle ORM, PostgreSQL, SvelteKit admin web.

---

## Current Evidence

- `bun run format:check` currently fails only because `docs/plans/pagination-refactor.md` is not Prettier-formatted.
- Admin list services are unpaginated:
  - `apps/api/src/admin/board-management.ts` lists organizations, venues, and boards.
  - `apps/api/src/admin/admin-management.ts` lists admins and fetches all memberships in the super-admin path.
- RBAC scoping is already part of the SQL query path for organizations, venues, boards, and scoped admin users. Pagination should add cursor predicates to those existing filters, not move authorization into memory.
- Existing admin-web callers expect named keys: `{ organizations }`, `{ venues }`, `{ boards }`, and `{ admins }` from `apps/admin-web/src/lib/api.ts`.

## API Contract

Add `limit` and `cursor` query parameters to these routes:

| Route                          | Response data shape                                         |
| ------------------------------ | ----------------------------------------------------------- | ------- |
| `GET /api/admin/organizations` | `{ organizations: OrganizationSummary[], nextCursor: string | null }` |
| `GET /api/admin/venues`        | `{ venues: VenueSummary[], nextCursor: string               | null }` |
| `GET /api/admin/boards`        | `{ boards: BoardSummary[], nextCursor: string               | null }` |
| `GET /api/admin/admins`        | `{ admins: AdminUserSummary[], nextCursor: string           | null }` |

Defaults and limits:

- `limit` defaults to `20`.
- `limit` accepts `1..100`.
- Missing `cursor` means the first page.
- Malformed cursors should fail with `400 validation_error`, not silently return page 1.

Cursor rule for descending order:

```ts
or(
  lt(table.createdAt, cursor.createdAt),
  and(eq(table.createdAt, cursor.createdAt), lt(table.id, cursor.id)),
);
```

Fetch `limit + 1` rows. If the extra row exists, drop it and emit a `nextCursor` built from the last kept row. Otherwise emit `nextCursor: null`.

---

## Task 1: Remove the broken quality-gate plan

**Objective:** Delete the stale plan that currently fails Prettier.

**Files:**

- Delete: `docs/plans/pagination-refactor.md`

**Steps:**

1. Remove `docs/plans/pagination-refactor.md`.
2. Run `bun run format:check`.
3. Expected result: Prettier no longer reports `docs/plans/pagination-refactor.md`.
4. Commit with `docs: replace pagination plan` after Task 2 is also complete.

---

## Task 2: Add shared pagination helpers

**Objective:** Centralize cursor parsing, encoding, and page trimming.

**Files:**

- Create: `apps/api/src/http/pagination.ts`
- Modify: `apps/api/src/http/schemas.ts`
- Modify: `apps/api/src/http/models.ts`
- Test: `apps/api/test/pagination.test.ts`

**Implementation notes:**

1. Add constants:
   - `DEFAULT_PAGE_LIMIT = 20`
   - `MAX_PAGE_LIMIT = 100`
2. Add TypeBox query schema:

   ```ts
   export const PaginationQuery = t.Object({
     limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_PAGE_LIMIT })),
     cursor: t.Optional(t.String({ minLength: 1 })),
   });
   ```

3. Add response data helpers only if they remain simple:

   ```ts
   export const paginatedNamed = <K extends string, T extends TSchema>(key: K, item: T) =>
     t.Object({ [key]: t.Array(item), nextCursor: t.Nullable(t.String()) });
   ```

   If TypeScript inference gets spicy, skip the helper and inline `t.Object({ organizations: ..., nextCursor: ... })` in each route. Boring and explicit is acceptable.

4. Add runtime helpers:
   - `encodeCursor({ createdAt, id })`
   - `decodeCursor(raw)` that returns `{ ok: true, cursor: PageCursor | null } | { ok: false, message: string }`
   - `buildPage(rows, limit, toCursor)`
   - `cursorWhere(table.createdAt, table.id, cursor)` if the Drizzle types stay clean; otherwise use the explicit predicate in each service.

5. Register `PaginationQuery` in `apiModels`.

**Tests:**

- `decodeCursor(undefined)` returns first-page/null cursor.
- encode then decode round-trips an ISO timestamp and id.
- malformed base64, missing separator, invalid date, and empty id are rejected.
- `buildPage` returns `nextCursor` only when `rows.length > limit`.

**Verify:**

```bash
bun test apps/api/test/pagination.test.ts
bun run typecheck
```

---

## Task 3: Paginate organizations end to end first

**Objective:** Establish the template with the simplest list endpoint.

**Files:**

- Modify: `apps/api/src/admin/board-management.ts`
- Modify: `apps/api/src/routes/admin-organizations.ts`
- Test: add or extend `apps/api/test/admin-board-management.test.ts` if it exists; otherwise create `apps/api/test/admin-list-pagination.test.ts`

**Service changes:**

- Change `BoardManagementService.listOrganizations` to accept `page: PageRequest` and return `Promise<Page<OrganizationSummary>>`.
- Preserve current RBAC behavior:
  - super-admin can see all organizations.
  - non-super-admin sees organizations from `getAccessibleOrganizationIds`.
  - no accessible ids returns an empty page.
- Apply `cursorWhere(organizations.createdAt, organizations.id, page.cursor)` with the RBAC predicate using `and(...)`.
- Order by `desc(organizations.createdAt), desc(organizations.id)`.
- Fetch `page.limit + 1`.

**Route changes:**

- Add `query: "PaginationQuery"`.
- Parse query with pagination helper; throw `validationError(...)` on malformed cursors.
- Return `apiSuccess({ organizations: page.items, nextCursor: page.nextCursor })`.
- Change response schema to include `nextCursor`.

**Tests:**

- First page returns at most `limit` organizations plus `nextCursor` when more exist.
- Second page using `nextCursor` has no overlap with the first page.
- Same-`createdAt` fixtures sort and page deterministically by `id`.
- Scoped admin cannot page into organizations outside their RBAC scope.
- Malformed cursor returns a validation error.

**Verify:**

```bash
bun test apps/api/test/admin-list-pagination.test.ts
bun run typecheck
```

---

## Task 4: Paginate venues and boards

**Objective:** Apply the proven template to the remaining board-management lists.

**Files:**

- Modify: `apps/api/src/admin/board-management.ts`
- Modify: `apps/api/src/routes/admin-venues.ts`
- Modify: `apps/api/src/routes/admin-boards.ts`
- Test: extend `apps/api/test/admin-list-pagination.test.ts`

**Venue service notes:**

- Change `listVenues` to `Promise<Page<VenueSummary>>`.
- Use cursor columns `venues.createdAt` and `venues.id`.
- Keep existing scope conditions for org-owner and assigned venue visibility.
- Order by `desc(venues.createdAt), desc(venues.id)`.

**Board service notes:**

- Change `listBoards` to `Promise<Page<BoardSummary>>`.
- Use cursor columns `boards.createdAt` and `boards.id`, not the joined `venues` table.
- Keep existing joins and RBAC access conditions.
- Order by `desc(boards.createdAt), desc(boards.id)`.

**Route notes:**

- Preserve response keys: `venues` and `boards`.
- Include `nextCursor` in each success envelope.

**Tests:**

- Venue pages do not overlap and respect RBAC scope.
- Board pages do not overlap and respect joined venue/org scope.
- Board cursor tie-breaker uses `boards.id`.

**Verify:**

```bash
bun test apps/api/test/admin-list-pagination.test.ts
bun run typecheck
```

---

## Task 5: Paginate admin users without over-fetching memberships

**Objective:** Paginate admin users and load memberships only for the page where possible.

**Files:**

- Modify: `apps/api/src/admin/admin-management.ts`
- Modify: `apps/api/src/routes/admin-users.ts`
- Test: extend `apps/api/test/admin-users.test.ts` or `apps/api/test/admin-list-pagination.test.ts`

**Service changes:**

- Change `AdminManagementService.listAdmins(rbac, page)` to return:

  ```ts
  Promise<{ status: "ok"; page: Page<AdminUserSummary> } | { status: "forbidden" }>;
  ```

- Super-admin branch:
  1. Query `adminUsers` ordered by `desc(createdAt), desc(id)` with cursor and `limit + 1`.
  2. Build the page from admin rows.
  3. Fetch `adminMemberships` only where `adminUserId in pageAdminIds`.
  4. Map summaries with the page memberships.
- Scoped branch:
  1. Keep the scope-membership query that defines visible admin ids.
  2. Page `adminUsers` with `where(and(inArray(adminUsers.id, adminUserIds), cursorPredicate))`.
  3. Filter already-loaded `scopeMemberships` down to the page ids when building summaries.
- Preserve the current forbidden behavior when the caller has no owned orgs or managed venues.

**Route changes:**

- Add `query: "PaginationQuery"`.
- Return `apiSuccess({ admins: result.page.items, nextCursor: result.page.nextCursor })`.

**Tests:**

- Super-admin can page through admins without overlap.
- Scoped org-owner can page only through visible admins.
- Venue-manager visibility remains limited to managed venue memberships.
- Membership arrays contain only the memberships the existing logic would expose.

**Verify:**

```bash
bun test apps/api/test/admin-list-pagination.test.ts
bun run typecheck
```

---

## Task 6: Add database indexes and migration

**Objective:** Make keyset pagination cheap at scale.

**Files:**

- Modify: `packages/db/src/schema.ts`
- Create: generated Drizzle migration under `packages/db/drizzle/`
- Modify: generated Drizzle metadata under `packages/db/drizzle/meta/`

**Indexes:**

- `organizations_created_at_id_idx` on `organizations(created_at DESC, id DESC)`
- `venues_created_at_id_idx` on `venues(created_at DESC, id DESC)`
- `venues_organization_created_at_id_idx` on `venues(organization_id, created_at DESC, id DESC)`
- `boards_created_at_id_idx` on `boards(created_at DESC, id DESC)`
- `boards_venue_created_at_id_idx` on `boards(venue_id, created_at DESC, id DESC)`
- `admin_users_created_at_id_idx` on `admin_users(created_at DESC, id DESC)`

**Notes:**

- Keep existing unique and foreign-key indexes.
- For scoped admin-user visibility, the membership-table indexes already cover organization, venue, and admin-user lookup. Do not add speculative composites unless `EXPLAIN` shows a need.

**Verify:**

```bash
bun --cwd packages/db run db:generate
bun run typecheck
```

If the repo's DB package uses a different script name, inspect `packages/db/package.json` and run the matching Drizzle generation command.

---

## Task 7: Update admin-web API helpers with backwards-compatible list-all wrappers

**Objective:** Let existing screens keep working while exposing page-aware helpers for future infinite-scroll UI.

**Files:**

- Modify: `apps/admin-web/src/lib/api.ts`
- Test: existing typecheck plus any web unit tests if present

**Implementation:**

1. Add shared client types:

   ```ts
   export interface PageParams {
     limit?: number;
     cursor?: string;
   }

   export interface NamedPage<K extends string, T> {
     nextCursor: string | null;
   }
   ```

2. Change each list helper to accept optional params and return one page:

   ```ts
   export async function listOrganizations(
     fetchFn = globalThis.fetch,
     params?: PageParams,
   ): Promise<{ organizations: OrganizationSummary[]; nextCursor: string | null }> {
     return unwrap(client(fetchFn).api.admin.organizations.get({ query: params ?? {} }));
   }
   ```

3. Add `listAllOrganizations`, `listAllVenues`, `listAllBoards`, and `listAllAdmins` helpers that loop while `nextCursor` exists.
4. Update existing route loads to use `listAll*` when they need the whole dataset for forms, selectors, dashboard summaries, or detail-page fallback lookup.
5. Leave list pages (`/organizations`, `/venues`, `/admins`, dashboard board list) on `listAll*` initially unless this PR also adds visible pagination controls. The API change should land independently from UI affordances.

**Verify:**

```bash
bun run typecheck
```

---

## Task 8: Add visible pagination controls in admin-web list pages

**Objective:** Let operators advance through list pages without loading the entire dataset on the main list screens.

**Files:**

- Modify: `apps/admin-web/src/routes/+page.ts`
- Modify: `apps/admin-web/src/routes/+page.svelte`
- Modify: `apps/admin-web/src/routes/organizations/+page.ts`
- Modify: `apps/admin-web/src/routes/organizations/+page.svelte`
- Modify: `apps/admin-web/src/routes/venues/+page.ts`
- Modify: `apps/admin-web/src/routes/venues/+page.svelte`
- Modify: `apps/admin-web/src/routes/admins/+page.ts`
- Modify: `apps/admin-web/src/routes/admins/+page.svelte`

**Implementation:**

- Read `url.searchParams.get("cursor")` in each page load.
- Request one page with `limit: 20` and that cursor.
- Return the list and `nextCursor`.
- Add a `Next page` link/button when `nextCursor` is non-null.
- Preserve empty-state behavior on the first page.
- Optional but recommended: keep a cursor stack in the query string if a `Previous page` button is needed. If that becomes clunky, ship only `Next page` in this PR and file a follow-up for richer navigation.

**Verify:**

```bash
bun run typecheck
bun run e2e
```

---

## Task 9: Full quality gate and PR split

**Objective:** Land this safely without one review monster.

**Recommended PR split:**

1. **PR A — docs cleanup:** delete `docs/plans/pagination-refactor.md`, add this implementation plan, and verify `bun run format:check`.
2. **PR B — backend pagination:** tasks 2 through 6; verify `bun run check`.
3. **PR C — admin-web pagination helpers/UI:** tasks 7 and 8; verify `bun run check` and `bun run e2e`.

**Final verification before merging implementation PRs:**

```bash
bun run check
bun run e2e
```

**Acceptance criteria:**

- All four admin list endpoints accept `limit` and `cursor`.
- All four return the existing named list key plus `nextCursor`.
- Cursor pagination is deterministic under same-timestamp rows.
- RBAC-scoped users cannot page into inaccessible data.
- Admin-user listing no longer loads all memberships in the super-admin branch.
- Admin-web existing screens still typecheck and render.
- `bun run check` passes.
- `bun run e2e` passes for the implementation PRs.
