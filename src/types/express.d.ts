import { IUser } from '../modules/user/user.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser | null;
    }
  }
}
