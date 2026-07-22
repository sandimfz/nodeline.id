export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "god";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
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
