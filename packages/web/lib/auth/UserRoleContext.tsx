'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@closepilot/core';

interface UserRoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  role: UserRole.ADMIN,
  setRole: () => {},
});

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(UserRole.ADMIN);

  useEffect(() => {
    const stored = localStorage.getItem('cp_user_role') as UserRole | null;
    if (stored && Object.values(UserRole).includes(stored)) {
      setRoleState(stored);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    localStorage.setItem('cp_user_role', newRole);
    setRoleState(newRole);
  };

  return (
    <UserRoleContext.Provider value={{ role, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  return useContext(UserRoleContext);
}
