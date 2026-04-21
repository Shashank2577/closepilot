import type { AuthUser } from '@closepilot/core';

export type AppVariables = {
  user: AuthUser;
};

export type AppContext = {
  Variables: AppVariables;
};
