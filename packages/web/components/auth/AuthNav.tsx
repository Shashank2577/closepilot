'use client';

import { SignInButton } from './SignInButton';
import { UserMenu } from './UserMenu';

interface AuthNavProps {
  isAuthenticated: boolean;
}

export function AuthNav({ isAuthenticated }: AuthNavProps) {
  return (
    <nav className="flex items-center space-x-4">
      <a href="/" className="text-gray-700 hover:text-gray-900">
        Dashboard
      </a>
      <a href="/approvals" className="text-gray-700 hover:text-gray-900">
        Approvals
      </a>
      {isAuthenticated ? (
        <UserMenu />
      ) : (
        <SignInButton />
      )}
    </nav>
  );
}
