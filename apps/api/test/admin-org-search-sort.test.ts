/**
 * Regression tests for feat/admin-org-search-api (W1) and feat/admin-org-list-ux (W2).
 *
 * Tests marked "(fails until W1)" will FAIL against main — the route does not yet
 * parse `search` or `sort` from the query string. They define the acceptance
 * criteria for W1 and serve as regression guards once the feature lands.
 *
 * Tests marked "(baseline)" verify existing contract and should pass on main.
 *
 * Service fake strategy: a custom `boardManagementService` is wired here that
 * implements the EXPECTED post-W1 search/sort logic against an in-memory fixture.
 * Once W1 changes the route to pass those params to the service, these tests pass.
 */

import { describe, expect, test } from "bun:test";

import type { BoardManagementService, OrganizationSummary } from "../src/admin/board-management";
import type { AdminRbacContext } from "../src/auth/rbac";
import type { PageRequest } from "../src/http/pagination";
import { toPage, encodeCursor } from "../src/http/pagination";
import { createTestApp } from "../src/app";
import {
  createFakeAuthService,
  createFakeBoardManagementService,
  createFakeOrgManagementService,
  ORG_A,
  ORG_B,
  organizationsFixture,
  sessionCookie,
} from "./admin-fixtures";
import { testAppConfig } from "./test-config";

// ── Fixtures ─────────────────────────────────────────────────────────────────
//
// sortTestOrgs: three orgs ordered so that createdAt_desc and name_asc give
// DIFFERENT first-element results, making sort tests meaningful.
//
// createdAt_desc: Zeta Corp → Bravo Ltd → Acme Inc
// name_asc:       Acme Inc  → Bravo Ltd → Zeta Corp

const sortTestOrgs: OrganizationSummary[] = [
  {
    id: "00000000-0000-4000-8000-000000000091",
    slug: "zeta-corp",
    name: "Zeta Corp",
    createdAt: new Date("2026-06-03T00:00:00.000Z"),
    updatedAt: new Date("2026-06-03T00:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8000-000000000092",
    slug: "bravo-ltd",
    name: "Bravo Ltd",
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8000-000000000093",
    slug: "acme-inc",
    name: "Acme Inc",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  },
];

// Forward-compat type: W1 is expected to extend PageRequest (or pass separately)
// with search and sort params. This type mirrors that expected interface.
type OrgListPage = PageRequest & { search?: string; sort?: string };

function applyOrgPage(
  items: OrganizationSummary[],
  page: OrgListPage,
): { items: OrganizationSummary[]; nextCursor: string | null } {
  let visible = items.slice();

  if (page.search) {
    const q = page.search.toLowerCase();
    visible = visible.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }

  if (page.sort === "name_asc") {
    visible.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    visible.sort((a, b) => {
      const diff = b.createdAt.getTime() - a.createdAt.getTime();
      return diff !== 0 ? diff : b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
    });
  }

  if (page.cursor) {
    const curAt = page.cursor.createdAt.getTime();
    const curId = page.cursor.id;
    visible = visible.filter((o) => {
      const oAt = o.createdAt.getTime();
      return oAt < curAt || (oAt === curAt && o.id < curId);
    });
  }

  return toPage(visible, page.limit);
}

function makeApp(orgs: OrganizationSummary[], isSuperAdmin = true) {
  const boardManagementService: BoardManagementService = {
    ...createFakeBoardManagementService(),
    async listOrganizations(rbac: AdminRbacContext, page: PageRequest) {
      // ponytail: cast to OrgListPage — W1 will pass search/sort via this param
      const p = page as OrgListPage;
      const visible = rbac.isSuperAdmin
        ? orgs.slice()
        : orgs.filter((o) => rbac.memberships.some((m) => m.organizationId === o.id));
      return applyOrgPage(visible, p);
    },
  };

  return createTestApp({
    config: testAppConfig,
    adminAuthService: createFakeAuthService([], { isSuperAdmin }),
    boardManagementService,
    orgManagementService: createFakeOrgManagementService(),
    checkDatabase: async () => true,
  });
}

// ── Baseline (should pass on main) ───────────────────────────────────────────

describe("org list baseline", () => {
  test("(baseline) super-admin with no search sees all orgs", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ id: string }>; nextCursor: string | null };
    };
    expect(data.organizations.map((o) => o.id).sort()).toEqual(
      organizationsFixture.map((o) => o.id).sort(),
    );
  });

  test("(baseline) nextCursor is null when all results fit in one page", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as { ok: true; data: { nextCursor: string | null } };
    expect(data.nextCursor).toBeNull();
  });

  test("(baseline) returns 401 without session", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(new Request("http://localhost/api/admin/organizations"));
    expect(res.status).toBe(401);
  });
});

// ── Search (fails until W1 lands) ────────────────────────────────────────────
//
// These tests call GET /api/admin/organizations?search=X and assert filtered
// results. On main the route ignores `search`, returning all orgs → tests FAIL.
// Once W1 adds `search` to the query schema and passes it to the service,
// the custom fake above filters correctly → tests PASS.

describe("org list search (fails until W1: feat/admin-org-search-api)", () => {
  test("search by name prefix returns only the matching org", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=Organization+A", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ id: string }> };
    };
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0]?.id).toBe(ORG_A);
  });

  test("search by slug returns only the matching org", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=org-b", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ id: string }> };
    };
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0]?.id).toBe(ORG_B);
  });

  test("search with no matches returns empty list and null nextCursor", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=nonexistent-zzz", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: unknown[]; nextCursor: string | null };
    };
    expect(data.organizations).toHaveLength(0);
    expect(data.nextCursor).toBeNull();
  });

  test("search is case-insensitive", async () => {
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })));

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=ORGANIZATION+A", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ id: string }> };
    };
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0]?.id).toBe(ORG_A);
  });

  test("search matches substring of name — 'corp' matches Zeta Corp only", async () => {
    const app = makeApp(sortTestOrgs);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=corp", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ slug: string }> };
    };
    expect(data.organizations.map((o) => o.slug)).toEqual(["zeta-corp"]);
  });

  test("search matches substring of slug — 'acme' matches Acme Inc only", async () => {
    const app = makeApp(sortTestOrgs);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=acme", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ slug: string }> };
    };
    expect(data.organizations.map((o) => o.slug)).toEqual(["acme-inc"]);
  });

  test("super-admin search filters within global scope (not just member orgs)", async () => {
    // Super-admin gets all orgs even without memberships; search still filters.
    const app = makeApp(organizationsFixture.map((o) => ({ ...o })), true);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=org-a", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ id: string }> };
    };
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0]?.id).toBe(ORG_A);
  });
});

// ── Sort (fails until W1 lands) ───────────────────────────────────────────────
//
// The fixture has three orgs in createdAt_desc order: Zeta Corp, Bravo Ltd, Acme Inc.
// With name_asc the order reverses to: Acme Inc, Bravo Ltd, Zeta Corp.
// On main the route ignores `sort`, always returning createdAt_desc → tests FAIL.

describe("org list sort (fails until W1: feat/admin-org-search-api)", () => {
  test("name_asc sort returns orgs alphabetically by name", async () => {
    const app = makeApp(sortTestOrgs);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?sort=name_asc", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ name: string }> };
    };
    const names = data.organizations.map((o) => o.name);
    expect(names).toEqual(["Acme Inc", "Bravo Ltd", "Zeta Corp"]);
  });

  test("createdAt_desc sort (default) returns newest first", async () => {
    // On main this passes because createdAt_desc is the only sort mode.
    // After W1 it should still pass (no regression in default sort).
    const app = makeApp(sortTestOrgs);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?sort=createdAt_desc", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ name: string }> };
    };
    const names = data.organizations.map((o) => o.name);
    expect(names).toEqual(["Zeta Corp", "Bravo Ltd", "Acme Inc"]);
  });

  test("unknown sort value returns 400", async () => {
    // On main: route ignores unknown query params → 200 returned → FAILS.
    // After W1: sort enum validation rejects invalid value → 400.
    const app = makeApp(sortTestOrgs);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?sort=invalid_sort_value", {
        headers: { cookie: sessionCookie },
      }),
    );

    expect(res.status).toBe(400);
  });
});

// ── Cursor pagination with search (fails until W1 lands) ─────────────────────
//
// Searching "c" matches "Zeta Corp" (has 'c') and "Acme Inc" (has 'c') but not
// "Bravo Ltd". With limit=1, page 1 returns Zeta Corp and a nextCursor.
// Page 2 with the same search + that cursor should return Acme Inc.
// On main: route ignores `search`, so the cursor applies globally and may return
// Bravo Ltd on page 2 instead of Acme Inc → test FAILS.

describe("org list cursor pagination with search (fails until W1: feat/admin-org-search-api)", () => {
  test("cursor + search: page 2 is scoped to the same search term", async () => {
    const app = makeApp(sortTestOrgs);

    // Page 1: search "c", limit 1 — expect Zeta Corp (newest among matches)
    const res1 = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=c&limit=1", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(res1.status).toBe(200);
    const page1 = (await res1.json()) as {
      ok: true;
      data: { organizations: Array<{ slug: string }>; nextCursor: string | null };
    };
    expect(page1.data.organizations).toHaveLength(1);
    expect(page1.data.organizations[0]?.slug).toBe("zeta-corp");
    expect(typeof page1.data.nextCursor).toBe("string");

    const cursor = page1.data.nextCursor!;

    // Page 2: same search, use cursor — expect Acme Inc (next match), NOT Bravo Ltd
    const res2 = await app.handle(
      new Request(
        `http://localhost/api/admin/organizations?search=c&limit=1&cursor=${cursor}`,
        { headers: { cookie: sessionCookie } },
      ),
    );
    expect(res2.status).toBe(200);
    const page2 = (await res2.json()) as {
      ok: true;
      data: { organizations: Array<{ slug: string }>; nextCursor: string | null };
    };
    expect(page2.data.organizations).toHaveLength(1);
    expect(page2.data.organizations[0]?.slug).toBe("acme-inc");
    expect(page2.data.nextCursor).toBeNull();
  });

  test("cursor + sort: second page maintains name_asc sort order", async () => {
    const app = makeApp(sortTestOrgs);

    // Page 1: name_asc, limit 1 — expect Acme Inc
    const res1 = await app.handle(
      new Request("http://localhost/api/admin/organizations?sort=name_asc&limit=1", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(res1.status).toBe(200);
    const page1 = (await res1.json()) as {
      ok: true;
      data: { organizations: Array<{ slug: string }>; nextCursor: string | null };
    };
    expect(page1.data.organizations[0]?.slug).toBe("acme-inc");
    expect(page1.data.nextCursor).not.toBeNull();

    // Note: cursor encoding for name_asc sort may differ from createdAt_desc.
    // This test validates page 1 returns Acme Inc; page 2 testing requires
    // W1 to define cursor semantics for name_asc (spec TBD).
  });

  test("nextCursor is returned when search matches more results than the page limit", async () => {
    // "ltd" matches "Bravo Ltd" and "bravo-ltd" (same org). Only 1 match.
    // Using "c" which matches Zeta Corp and Acme Inc (2 matches) with limit=1.
    const app = makeApp(sortTestOrgs);

    const res = await app.handle(
      new Request("http://localhost/api/admin/organizations?search=c&limit=1", {
        headers: { cookie: sessionCookie },
      }),
    );
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      ok: true;
      data: { organizations: Array<{ slug: string }>; nextCursor: string | null };
    };
    expect(data.organizations).toHaveLength(1);
    expect(typeof data.nextCursor).toBe("string");
  });
});
