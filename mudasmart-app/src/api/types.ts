export type Role = 'murid' | 'guru';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  isAdmin?: boolean | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
