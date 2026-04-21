export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  REP = 'REP',
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  orgId: number;
}
