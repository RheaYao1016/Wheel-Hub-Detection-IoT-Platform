export type UserRole = "admin" | "user";

export type LoginResponse = {
  success: boolean;
  username: string;
  role: UserRole;
  token: string;
  displayName: string;
  message: string;
};

export type RegisterResponse = {
  success: boolean;
  username: string;
  message: string;
};
