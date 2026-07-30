import { api } from "./client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", { email, password });
}

export function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", { email, password, name });
}

export function refreshToken(
  refresh_token: string
): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/refresh", { refresh_token });
}

export function getMe(): Promise<User> {
  return api.get<User>("/auth/me");
}

export function logout(): Promise<{ message: string }> {
  return api.post<{ message: string }>("/auth/logout");
}
