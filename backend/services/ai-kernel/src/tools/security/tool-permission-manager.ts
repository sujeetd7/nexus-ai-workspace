export class ToolPermissionManager {
  validate(permissions: string[], userPermissions: string[]) {
    return permissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
