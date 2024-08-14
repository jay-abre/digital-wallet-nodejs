export const roles = {
  SUPER_ADMIN: 'super admin',
  ADMIN: 'admin',
  USER: 'user',
};

export const rolePermissions = {
  [roles.SUPER_ADMIN]: ['assignRoles', 'manageContent'],
  [roles.ADMIN]: ['manageContent'],
  [roles.USER]: ['viewContent'],
};