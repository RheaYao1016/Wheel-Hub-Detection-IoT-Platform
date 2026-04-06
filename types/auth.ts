export type UserRole = "admin" | "engineer" | "operator" | "viewer" | "user";

export type LoginResponse = {
  success: boolean;
  username: string;
  role: UserRole;
  token: string;
  displayName: string;
  email?: string;
  department?: string;
  expiresAt?: string;
  message: string;
};

export type RegisterResponse = {
  success: boolean;
  username: string;
  displayName?: string;
  email?: string;
  department?: string;
  role?: UserRole;
  message: string;
};

export type SessionResponse = {
  authenticated: boolean;
  username: string;
  role: UserRole;
  displayName: string;
  email?: string;
  department?: string;
  token: string;
  expiresAt: string;
  message: string;
};
