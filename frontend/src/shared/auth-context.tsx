import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import {
  AuthContext,
  setGlobalAuthContext,
  type AuthContextValue,
  type PersonnelAuthUser,
} from "./auth-context-global";

export default function AuthContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [authContext, setAuthContextState] = useState<AuthContextValue>(null);
  const [personnelUser, setPersonnelUser] = useState<PersonnelAuthUser | null>(null);

  const setAuthContext = useCallback((ctx: AuthContextValue) => {
    setAuthContextState(ctx);
    setGlobalAuthContext(ctx);
  }, []);

  return (
      <AuthContext.Provider value={{ authContext, setAuthContext, personnelUser, setPersonnelUser }}>
      {children}
    </AuthContext.Provider>
  );
}
