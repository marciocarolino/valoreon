export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/** POST /auth/login — { accessToken, email } */
export interface LoginResponse {
  accessToken: string;
  email: string;
}

/** POST /auth/refresh — { accessToken } */
export interface RefreshResponse {
  accessToken: string;
}
