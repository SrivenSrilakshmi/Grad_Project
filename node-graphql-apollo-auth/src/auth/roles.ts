export const Roles = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
};

export const hasRole = (userRoles, requiredRole) => {
  return userRoles.includes(requiredRole);
};

export const isAdmin = (userRoles) => {
  return hasRole(userRoles, Roles.ADMIN);
};

export const isUser = (userRoles) => {
  return hasRole(userRoles, Roles.USER);
};

export const isGuest = (userRoles) => {
  return hasRole(userRoles, Roles.GUEST);
};