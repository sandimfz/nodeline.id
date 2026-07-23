export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "pro" | "admin" | "superadmin";
  isEmailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
