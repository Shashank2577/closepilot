'use client';

import React from 'react';

interface UserMenuProps {
  user: {
    name?: string;
    email?: string;
    picture?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {user.picture && (
          <img src={user.picture} alt={user.name || 'User'} className="w-8 h-8 rounded-full" />
        )}
        <span className="text-sm font-medium text-gray-700">{user.name || user.email}</span>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Log out
      </button>
    </div>
  );
}
