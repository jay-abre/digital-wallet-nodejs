// types/express.d.ts
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; // You can replace `any` with the actual type of `user`
    }
  }
}