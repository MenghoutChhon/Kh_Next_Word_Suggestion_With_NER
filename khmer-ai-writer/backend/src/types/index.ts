import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    sub: string; // user id
    id?: string; // optional id alias
    role?: string;
    organizationId?: string;
  };
}

export default AuthRequest;