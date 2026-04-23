import { describe, it, expect } from 'vitest';
import { canDeleteDeal, canEditDeal, hasRole } from './roles';
import { UserRole } from '@closepilot/core';

describe('RBAC helpers', () => {
  it('ADMIN can delete deals', () => {
    expect(canDeleteDeal(UserRole.ADMIN)).toBe(true);
  });
  it('MANAGER can delete deals', () => {
    expect(canDeleteDeal(UserRole.MANAGER)).toBe(true);
  });
  it('REP cannot delete deals', () => {
    expect(canDeleteDeal(UserRole.REP)).toBe(false);
  });
  it('undefined role cannot delete deals', () => {
    expect(canDeleteDeal(undefined)).toBe(false);
  });
  it('hasRole returns true when role is in allowed list', () => {
    expect(hasRole(UserRole.ADMIN, [UserRole.ADMIN, UserRole.MANAGER])).toBe(true);
    expect(hasRole(UserRole.REP, [UserRole.ADMIN, UserRole.MANAGER])).toBe(false);
  });
  it('all authenticated roles can edit deals', () => {
    expect(canEditDeal(UserRole.ADMIN)).toBe(true);
    expect(canEditDeal(UserRole.MANAGER)).toBe(true);
    expect(canEditDeal(UserRole.REP)).toBe(true);
  });
});
