'use client';

import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface UserMenuProps {
  userEmail?: string;
}

export function UserMenu({ userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(userEmail || '');

  useEffect(() => {
    // Fetch user info if not provided
    if (!email) {
      fetchUserInfo();
    }
  }, [email]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setEmail(data.email);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
          {email?.charAt(0).toUpperCase() || 'U'}
        </div>
        {email && <span className="hidden sm:inline">{email}</span>}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
            <div className="px-4 py-2 border-b">
              <p className="text-sm font-medium text-gray-900">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
