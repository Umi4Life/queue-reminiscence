import { forbiddenError } from "../http/errors";

export type AdminMembershipRole = "org_owner" | "venue_manager" | "venue_staff";

export type AdminMembershipContext = {
  organizationId: string;
  venueId: string | null;
  role: AdminMembershipRole;
};

export type AdminRbacContext = {
  memberships: readonly AdminMembershipContext[];
};

export type VenueResourceContext = {
  organizationId: string;
  venueId: string;
};

export type BoardResourceContext = VenueResourceContext & {
  boardId: string;
};

function hasOrgOwnerMembership(
  memberships: readonly AdminMembershipContext[],
  organizationId: string,
): boolean {
  return memberships.some(
    (membership) =>
      membership.organizationId === organizationId &&
      membership.venueId === null &&
      membership.role === "org_owner",
  );
}

function findVenueMembership(
  memberships: readonly AdminMembershipContext[],
  organizationId: string,
  venueId: string,
): AdminMembershipContext | undefined {
  return memberships.find(
    (membership) => membership.organizationId === organizationId && membership.venueId === venueId,
  );
}

function hasOrganizationMembership(
  memberships: readonly AdminMembershipContext[],
  organizationId: string,
): boolean {
  if (hasOrgOwnerMembership(memberships, organizationId)) {
    return true;
  }

  return memberships.some((membership) => membership.organizationId === organizationId);
}

export function canReadOrganization(context: AdminRbacContext, organizationId: string): boolean {
  return hasOrganizationMembership(context.memberships, organizationId);
}

export function canManageOrganization(context: AdminRbacContext, organizationId: string): boolean {
  return hasOrgOwnerMembership(context.memberships, organizationId);
}

export function canReadVenue(context: AdminRbacContext, resource: VenueResourceContext): boolean {
  if (hasOrgOwnerMembership(context.memberships, resource.organizationId)) {
    return true;
  }

  return (
    findVenueMembership(context.memberships, resource.organizationId, resource.venueId) !==
    undefined
  );
}

export function canManageVenue(context: AdminRbacContext, resource: VenueResourceContext): boolean {
  if (hasOrgOwnerMembership(context.memberships, resource.organizationId)) {
    return true;
  }

  const membership = findVenueMembership(
    context.memberships,
    resource.organizationId,
    resource.venueId,
  );

  return membership?.role === "venue_manager";
}

export function canManageBoard(context: AdminRbacContext, resource: BoardResourceContext): boolean {
  return canManageVenue(context, resource);
}

export function canOperateBoard(
  context: AdminRbacContext,
  resource: BoardResourceContext,
): boolean {
  if (hasOrgOwnerMembership(context.memberships, resource.organizationId)) {
    return true;
  }

  const membership = findVenueMembership(
    context.memberships,
    resource.organizationId,
    resource.venueId,
  );

  return membership?.role === "venue_manager" || membership?.role === "venue_staff";
}

export function assertCanReadOrganization(
  context: AdminRbacContext,
  organizationId: string,
  message?: string,
): void {
  if (!canReadOrganization(context, organizationId)) {
    throw forbiddenError(message);
  }
}

export function assertCanManageOrganization(
  context: AdminRbacContext,
  organizationId: string,
  message?: string,
): void {
  if (!canManageOrganization(context, organizationId)) {
    throw forbiddenError(message);
  }
}

export function assertCanReadVenue(
  context: AdminRbacContext,
  resource: VenueResourceContext,
  message?: string,
): void {
  if (!canReadVenue(context, resource)) {
    throw forbiddenError(message);
  }
}

export function assertCanManageVenue(
  context: AdminRbacContext,
  resource: VenueResourceContext,
  message?: string,
): void {
  if (!canManageVenue(context, resource)) {
    throw forbiddenError(message);
  }
}

export function assertCanManageBoard(
  context: AdminRbacContext,
  resource: BoardResourceContext,
  message?: string,
): void {
  if (!canManageBoard(context, resource)) {
    throw forbiddenError(message);
  }
}

export function assertCanOperateBoard(
  context: AdminRbacContext,
  resource: BoardResourceContext,
  message?: string,
): void {
  if (!canOperateBoard(context, resource)) {
    throw forbiddenError(message);
  }
}
