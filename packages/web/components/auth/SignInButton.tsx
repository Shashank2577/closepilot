'use client';

import { Button } from '@/components/ui/button';

interface SignInButtonProps {
  redirectPath?: string;
  className?: string;
}

export function SignInButton({ redirectPath, className }: SignInButtonProps) {
  const handleSignIn = () => {
    const params = new URLSearchParams();
    if (redirectPath) {
      params.set('redirect', redirectPath);
    }
    const redirectUrl = params.toString()
      ? `/auth/signin?${params.toString()}`
      : '/auth/signin';

    window.location.href = redirectUrl;
  };

  return (
    <Button onClick={handleSignIn} className={className}>
      Sign in with Google
    </Button>
  );
}
