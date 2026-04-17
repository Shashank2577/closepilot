'use client';

import React, { useEffect, useState } from 'react';
import { SignInButton } from './SignInButton';
import { UserMenu } from './UserMenu';
import { TokenRefresher } from './TokenRefresher';

export function AuthNav() {
  const [user, setUser] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json() as { name?: string; email?: string; picture?: string };
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  if (loading) {
    return <div className="w-10 h-10 animate-pulse bg-gray-200 rounded-full"></div>;
  }

  if (user) {
    return (
      <>
        <TokenRefresher />
        <UserMenu userEmail={user.email} />
      </>
    );
  }

  return <SignInButton />;
}
