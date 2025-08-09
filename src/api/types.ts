/**
 * Types for OAuth and API services
 */

export interface OAuthTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
}

export interface OAuthUserInfo {
	id: string;
	email: string;
	nickname?: string;
	locale?: string;
	avatar_url?: string;
	created_at: string;
	updated_at: string;
}

export interface PingResponse {
	message: string;
	latency: string;
	timestamp: string;
	status: string;
	method?: string;
	echo?: any;
	user?: {
		uuid: string;
		scopes: {
			read: boolean;
			write: boolean;
			upload: boolean;
		};
	};
	server?: {
		name: string;
		version: string;
		environment: string;
	};
	client?: {
		userAgent: string;
		hasAuth: boolean;
		ip: string;
	};
}

export interface OAuthTokenInfo {
	id: string;
	client_id: string;
	user_id: string;
	scopes: string[];
	expires_at: string;
	created_at: string;
	last_used_at?: string;
}

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface UserDataUpdate {
	nickname?: string;
	locale?: string;
}

export interface UploadResponse {
	file_id: string;
	filename: string;
	size: number;
	url: string;
	type?: string;
}

export interface AuthState {
	isAuthenticated: boolean;
	accessToken: string | null;
	refreshToken: string | null;
	expiresAt: number | null;
	userInfo: OAuthUserInfo | null;
}

export interface PKCEParams {
	codeVerifier: string;
	codeChallenge: string;
	state: string;
}

export enum AuthStatus {
	NOT_AUTHENTICATED = "not_authenticated",
	AUTHENTICATING = "authenticating",
	AUTHENTICATED = "authenticated",
	TOKEN_EXPIRED = "token_expired",
	ERROR = "error",
}

export class AuthError extends Error {
	public code?: string;
	public statusCode?: number;

	constructor(message: string, code?: string, statusCode?: number) {
		super(message);
		this.name = "AuthError";
		this.code = code;
		this.statusCode = statusCode;
	}
}
