import { UserRole, UserStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
