import { JwtPayload } from "../../types/interfaces/auth.interface";

export interface AuthenticatedRequest {
  user?: JwtPayload;
}