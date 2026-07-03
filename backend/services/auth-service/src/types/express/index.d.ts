import { UserRole } from "../auth/roles";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
