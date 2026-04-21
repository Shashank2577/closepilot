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
    // In a real app, you would fetch the user from an API endpoint here
    // For now, we simulate a fetched user for development purposes
    const simulateFetch = async () => {
      try {
        // Mock user data for development.  A real implementation would make an API call.
        const mockUser: AuthUser = {
          id: 1,
          email: 'admin@closepilot.com',
          name: 'Admin User',
          role: UserRole.ADMIN,
          orgId: 1
        };
        setUser(mockUser);
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setIsLoading(false);
      }
    };

    simulateFetch();
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
