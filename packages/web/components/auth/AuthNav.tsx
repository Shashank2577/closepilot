'use client';

import { usePathname } from 'next/navigation';
import { SignInButton } from './SignInButton';
import { UserMenu } from './UserMenu';

interface AuthNavProps {
  isAuthenticated: boolean;
}

export function AuthNav({ isAuthenticated }: AuthNavProps) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    pathname === href
      ? 'text-primary-600 font-semibold'
      : 'text-text-secondary hover:text-text-primary transition-colors duration-200';

  return (
    <nav className="flex items-center space-x-4">
      <a href="/" className={linkClass('/')}>
        Dashboard
      </a>
      <a href="/approvals" className={linkClass('/approvals')}>
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
