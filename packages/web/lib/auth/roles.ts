import { UserRole } from '@closepilot/core';
import { useUser } from './UserContext';

export function useRBAC(requiredRole: UserRole): { hasAccess: boolean; isLoading: boolean } {
  const { user, isLoading } = useUser();

  let hasAccess = false;

  if (user) {
    if (user.role === UserRole.ADMIN) {
      hasAccess = true;
    } else if (user.role === requiredRole) {
      hasAccess = true;
    } else if (requiredRole === UserRole.REP && (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN)) {
       // Assuming role hierarchy: ADMIN > MANAGER > REP
       hasAccess = true;
    }
  }

  return {
    hasAccess,
    isLoading
  };
}
