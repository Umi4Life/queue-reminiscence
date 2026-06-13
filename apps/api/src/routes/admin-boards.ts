import { Elysia } from "elysia";

import { parseCreateBoardBody, parsePatchBoardBody } from "../admin/board-input";
import type { BoardManagementService } from "../admin/board-management";
import type { AdminAuthService } from "../auth/admin-sessions";
import { requireAdminSession } from "../auth/admin-route-auth";
import { forbiddenError, notFoundError, validationError } from "../http/errors";
import { apiSuccess } from "../http/response";

export interface AdminBoardsRouteDeps {
  authService: AdminAuthService;
  boardManagementService: BoardManagementService;
}

function conflictMessage(field: "slug" | "publicSlug"): string {
  if (field === "slug") {
    return "A board with this slug already exists in the venue.";
  }

  return "A board with this public slug already exists.";
}

export function adminBoardsRoutes(deps: AdminBoardsRouteDeps) {
  return new Elysia({ name: "admin-boards-routes" })
    .get("/api/admin/boards", async ({ request }) => {
      const session = await requireAdminSession(deps.authService, request.headers);
      const boards = await deps.boardManagementService.listBoards({
        memberships: session.memberships,
      });

      return apiSuccess({ boards });
    })
    .post("/api/admin/boards", async ({ request, body }) => {
      const session = await requireAdminSession(deps.authService, request.headers);
      const input = parseCreateBoardBody(body);
      const result = await deps.boardManagementService.createBoard(
        { memberships: session.memberships },
        input,
      );

      if (result.status === "venue_not_found") {
        throw notFoundError();
      }

      if (result.status === "forbidden") {
        throw forbiddenError();
      }

      if (result.status === "conflict") {
        throw validationError(conflictMessage(result.field));
      }

      return apiSuccess({ board: result.board });
    })
    .get("/api/admin/boards/:boardId", async ({ request, params }) => {
      const session = await requireAdminSession(deps.authService, request.headers);
      const board = await deps.boardManagementService.getBoard(
        { memberships: session.memberships },
        params.boardId,
      );

      if (!board) {
        throw notFoundError();
      }

      return apiSuccess({ board });
    })
    .patch("/api/admin/boards/:boardId", async ({ request, params, body }) => {
      const session = await requireAdminSession(deps.authService, request.headers);
      const patch = parsePatchBoardBody(body);
      const result = await deps.boardManagementService.updateBoard(
        { memberships: session.memberships },
        params.boardId,
        patch,
      );

      if (result.status === "not_found") {
        throw notFoundError();
      }

      if (result.status === "forbidden") {
        throw forbiddenError();
      }

      if (result.status === "conflict") {
        throw validationError(conflictMessage(result.field));
      }

      return apiSuccess({ board: result.board });
    });
}
