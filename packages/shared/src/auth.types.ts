export type RegistrationType = "GOOGLE" | "CUSTOM";

export interface Customer {
  id: number;
  email: string;
  registration_type: RegistrationType;
  provider_user_id?: string | null;
  avatar?: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  sub: string; // customer id (as string)
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  sub: string;
  email: string;
  name: string | null;
  avatar: string | null;
  registration_type: string;
}

export interface GoogleProfile {
  google_id: string;
  email: string;
  avatar_url: string;
}
