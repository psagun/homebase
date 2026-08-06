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

export interface RegisterResult {
  needs_verification: boolean;
  email: string;
}

export function register(
  email: string,
  password: string,
  name: string
): Promise<RegisterResult> {
  return api.post<RegisterResult>("/auth/register", { email, password, name });
}

export function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/verify", { email, code });
}

export function resendCode(email: string): Promise<{ status: string }> {
  return api.post<{ status: string }>("/auth/resend-code", { email });
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
