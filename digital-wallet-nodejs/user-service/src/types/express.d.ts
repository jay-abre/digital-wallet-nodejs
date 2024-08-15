// src/types/express.d.ts
import 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
    }

    interface UserWithRole extends User {
    }

    interface Request {
      user?: UserWithRole;
    }
  }
}