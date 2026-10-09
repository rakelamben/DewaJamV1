import { createContext } from "react";

/**
 * Module-level global auth context store and React Context definition.
 * Separated from auth-context.tsx to satisfy react-refresh/only-export-components.
 */
export type AuthContextValue = "customer" | "personnel" | null;

export interface PersonnelAuthUser {
  role: string;
  entity_type: string;
  entity_id: string;
  username: string;
  email: string | null;
}

export interface AuthContextType {
  authContext: AuthContextValue;
  setAuthContext: (ctx: AuthContextValue) => void;
  personnelUser: PersonnelAuthUser | null;
  setPersonnelUser: (user: PersonnelAuthUser | null) => void;
}

let globalAuthContext: AuthContextValue = null;

export function setGlobalAuthContext(ctx: AuthContextValue): void {
  globalAuthContext = ctx;
}

export function getGlobalAuthContext(): AuthContextValue {
  return globalAuthContext;
}

export const AuthContext = createContext<AuthContextType>({
  authContext: null,
  setAuthContext: () => {},
  personnelUser: null,
  setPersonnelUser: () => {},
});
