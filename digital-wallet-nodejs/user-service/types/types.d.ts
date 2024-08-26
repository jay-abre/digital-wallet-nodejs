import { Request } from 'express';
import { File } from 'multer';

interface UserWithRole {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;

    }
  }
}

interface MulterRequest extends Request {
  file: File;
  user?: UserWithRole;
}