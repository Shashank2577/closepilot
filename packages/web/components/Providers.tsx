'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { UserProvider } from '@/lib/auth/UserContext';
import { UserRoleProvider } from '@/lib/auth/UserRoleContext';
import { TokenRefresher } from './auth/TokenRefresher';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <UserRoleProvider>
          <TokenRefresher />
          {children}
        </UserRoleProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
