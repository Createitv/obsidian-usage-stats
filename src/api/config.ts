/**
 * OAuth and API configuration for Obtime service
 */

export interface OAuthConfig {
	CLIENT_ID: string
	CLIENT_SECRET: string
	AUTHORIZATION_URL: string
	TOKEN_URL: string
	USERINFO_URL: string
	REVOKE_URL: string
	API_BASE_URL: string
	REDIRECT_URI: string
	SCOPES: string
}

export const OAUTH_CONFIG: OAuthConfig = {
	CLIENT_ID: 'a5515aef-f3e9-4af0-a227-50b8b82d81af',
	CLIENT_SECRET:
		'b3f48e17a0e930a62c1814c6f66c4426fa643bd1b634e7cad9b53ba5b0cd0342',
	AUTHORIZATION_URL: 'https://obtime.tech/api/oauth/authorize',
	TOKEN_URL: 'https://obtime.tech/api/oauth/token',
	USERINFO_URL: 'https://obtime.tech/api/oauth/userinfo',
	REVOKE_URL: 'https://obtime.tech/api/oauth/revoke',
	API_BASE_URL: 'https://obtime.tech/api/v1',
	REDIRECT_URI: 'obsidian://oauth/callback',
	SCOPES: 'read,write,upload',
}

// API endpoints
export const API_ENDPOINTS = {
	USER_DATA: '/user/data',
	UPLOAD: '/upload',
	PING: '/ping',
} as const

// OAuth scopes
export const OAUTH_SCOPES = {
	READ: 'read',
	WRITE: 'write',
	UPLOAD: 'upload',
} as const
