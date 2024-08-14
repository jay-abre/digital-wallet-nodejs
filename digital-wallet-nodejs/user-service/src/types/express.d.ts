import 'express';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User {
      id: string;
      role: string;
      // Add any other properties your user object might have
    }

    interface Request {
      user?: User;
    }
  }
}