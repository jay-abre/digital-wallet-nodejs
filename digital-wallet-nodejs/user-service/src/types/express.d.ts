import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
      // Add any other properties your user object might have
    }

    interface UserWithRole extends User {
      // Add any additional properties specific to UserWithRole
    }

    interface Request {
      user?: UserWithRole;
    }
  }
}