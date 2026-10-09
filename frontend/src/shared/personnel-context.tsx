import { createContext, useContext } from "react";

export interface PersonnelUser {
  role: string;
  entity_type: string;
  entity_id: string;
  username: string;
  email: string | null;
}

export const PersonnelContext = createContext<PersonnelUser | null>(null);

export function usePersonnel() {
  return useContext(PersonnelContext);
}
