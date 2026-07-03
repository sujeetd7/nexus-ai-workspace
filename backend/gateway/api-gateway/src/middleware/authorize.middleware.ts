type UserRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | string;

export function authorize(roles: UserRole[]) {
  return async (req: any, reply: any) => {
    if (!req.user) {
      return reply.status(401).send();
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return reply.status(403).send({
        error: "Forbidden",
      });
    }
  };
}
