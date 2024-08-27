export const roles = {
  SUPER_ADMIN: 'super admin',
  ADMIN: 'admin',
  USER: 'user',
};

export const rolePermissions = {
  [roles.SUPER_ADMIN]: ['assignRoles', 'manageContent', 'createWallet'],
  [roles.ADMIN]: ['manageContent', 'createWallet'],
  [roles.USER]: ['viewContent', 'createWallet'], // Ensure 'createWallet' is included
};
