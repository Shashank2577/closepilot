'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@closepilot/core';
import { UserRole } from '@closepilot/core';

interface UserContextType {
  user: AuthUser | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, isLoading: true });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fallbackUser: AuthUser = {
      id: 1,
      email: 'admin@closepilot.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      orgId: 1,
    };

    fetch('/api/user')
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        setUser(
          info
            ? { id: info.id ?? 1, orgId: info.orgId ?? 1, role: info.role ?? UserRole.ADMIN, email: info.email, name: info.name }
            : fallbackUser
        );
      })
      .catch(() => setUser(fallbackUser))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
