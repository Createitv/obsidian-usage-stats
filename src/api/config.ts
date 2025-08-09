/**
 * OAuth and API configuration for Obtime service
 */

export interface OAuthConfig {
	CLIENT_ID: string;
	CLIENT_SECRET: string;
	AUTHORIZATION_URL: string;
	TOKEN_URL: string;
	USERINFO_URL: string;
	REVOKE_URL: string;
	API_BASE_URL: string;
	REDIRECT_URI: string;
	SCOPES: string;
}

export const OAUTH_CONFIG: OAuthConfig = {
	CLIENT_ID: "a5515aef-f3e9-4af0-a227-50b8b82d81af",
	CLIENT_SECRET:
		"b3f48e17a0e930a62c1814c6f66c4426fa643bd1b634e7cad9b53ba5b0cd0342",
	AUTHORIZATION_URL: "http://localhost:3000/api/oauth/authorize",
	TOKEN_URL: "http://localhost:3000/api/oauth/token",
	USERINFO_URL: "http://localhost:3000/api/oauth/userinfo",
	REVOKE_URL: "http://localhost:3000/api/oauth/revoke",
	API_BASE_URL: "http://localhost:3000/api/v1",
	REDIRECT_URI: "obsidian://oauth/callback",
	SCOPES: "read,write,upload",
};

// API endpoints
export const API_ENDPOINTS = {
	USER_DATA: "/user/data",
	UPLOAD: "/upload",
} as const;

// Storage keys for OAuth data
export const STORAGE_KEYS = {
	ACCESS_TOKEN: "oauth_access_token",
	REFRESH_TOKEN: "oauth_refresh_token",
	CODE_VERIFIER: "oauth_code_verifier",
	USER_INFO: "oauth_user_info",
	TOKEN_EXPIRES_AT: "oauth_expires_at",
} as const;

// OAuth scopes
export const OAUTH_SCOPES = {
	READ: "read",
	WRITE: "write",
	UPLOAD: "upload",
} as const;
