import { UserRole } from '@closepilot/core';
import { useUser } from './UserContext';

export function useRBAC(requiredRole: UserRole): { hasAccess: boolean; isLoading: boolean } {
  const { user, isLoading } = useUser();

  let hasAccess = false;

  if (user) {
    // ADMIN always has access; MANAGER has access to REP-required routes (role hierarchy)
    const roleHierarchy: UserRole[] = [UserRole.REP, UserRole.MANAGER, UserRole.ADMIN];
    const userLevel = roleHierarchy.indexOf(user.role);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    hasAccess = userLevel >= requiredLevel;
  }

  return {
    hasAccess,
    isLoading
  };
}
