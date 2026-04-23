import { UserRole } from '@closepilot/core';

export function hasRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export function canDeleteDeal(userRole: UserRole | undefined): boolean {
  return hasRole(userRole, [UserRole.ADMIN, UserRole.MANAGER]);
}

export function canEditDeal(_userRole: UserRole | undefined): boolean {
  return _userRole !== undefined;
}
