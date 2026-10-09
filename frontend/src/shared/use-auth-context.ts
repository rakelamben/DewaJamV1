import { useContext } from "react";
import { AuthContext } from "./auth-context-global";

export function useAuthContext() {
  return useContext(AuthContext);
}
