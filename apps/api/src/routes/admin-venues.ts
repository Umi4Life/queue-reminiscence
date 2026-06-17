import { Elysia, t } from "elysia";

import type { BoardManagementService } from "../admin/board-management";
import type { AdminAuthService } from "../auth/admin-sessions";
import { requireAdminSession } from "../auth/admin-route-auth";
import { apiSuccess } from "../http/response";
import { apiModels } from "../http/models";
import { API_TAGS } from "../http/openapi-config";
import { success, VenueSummary } from "../http/schemas";

export interface AdminVenuesRouteDeps {
  authService: AdminAuthService;
  boardManagementService: BoardManagementService;
}

export function adminVenuesRoutes(deps: AdminVenuesRouteDeps) {
  return new Elysia({ name: "admin-venues-routes" }).use(apiModels).get(
    "/api/admin/venues",
    async ({ request }) => {
      const session = await requireAdminSession(deps.authService, request.headers);
      const venues = await deps.boardManagementService.listVenues({
        memberships: session.memberships,
      });

      return apiSuccess({ venues });
    },
    {
      response: {
        200: success(t.Object({ venues: t.Array(VenueSummary) })),
        401: "ErrorResponse",
      },
      detail: {
        summary: "List accessible venues",
        description: "Returns venues the authenticated admin can access, filtered by RBAC role.",
        tags: [API_TAGS.adminVenues],
        security: [{ AdminSession: [] }],
      },
    },
  );
}
