import { UserRole } from "@prisma/client";
import type { JwtPayload } from "jsonwebtoken";

export interface TokenPayload extends JwtPayload {
  userId: string;
  role: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email?: string | null;
    role: string;
  };
  token: Tokens;
}

export interface GetProfileResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
