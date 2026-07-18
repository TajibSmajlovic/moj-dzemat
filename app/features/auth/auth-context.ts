import { createContext } from "react-router";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

/**
   Authenticated admin for the current React Router request.

   There is deliberately no default value: protected loaders and actions
   fail closed when they are invoked outside the admin middleware chain.
 */
export const adminUserContext = createContext<CurrentUser>();
