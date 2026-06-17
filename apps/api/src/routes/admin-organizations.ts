import { Elysia, t } from "elysia";

import type { BoardManagementService } from "../admin/board-management";
import type { AdminAuthService } from "../auth/admin-sessions";
import { requireAdminSession } from "../auth/admin-route-auth";
import { apiSuccess } from "../http/response";
import { apiModels } from "../http/models";
import { API_TAGS } from "../http/openapi-config";
import { OrganizationSummary, success } from "../http/schemas";

export interface AdminOrganizationsRouteDeps {
  authService: AdminAuthService;
  boardManagementService: BoardManagementService;
}

export function adminOrganizationsRoutes(deps: AdminOrganizationsRouteDeps) {
  return new Elysia({ name: "admin-organizations-routes" }).use(apiModels).get(
    "/api/admin/organizations",
    async ({ request }) => {
      const session = await requireAdminSession(deps.authService, request.headers);
      const organizations = await deps.boardManagementService.listOrganizations({
        memberships: session.memberships,
      });

      return apiSuccess({ organizations });
    },
    {
      response: {
        200: success(t.Object({ organizations: t.Array(OrganizationSummary) })),
        401: "ErrorResponse",
      },
      detail: {
        summary: "List accessible organizations",
        description: "Returns all organizations the authenticated admin has any membership in.",
        tags: [API_TAGS.adminOrganizations],
        security: [{ AdminSession: [] }],
      },
    },
  );
}
