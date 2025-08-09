/**
 * API module exports for Obtime integration
 */

export { AuthService } from "./AuthService";
export { ApiService } from "./ApiService";
export { HttpClient } from "./HttpClient";
export { OAUTH_CONFIG, API_ENDPOINTS, OAUTH_SCOPES } from "./config";

export type {
	OAuthTokenResponse,
	OAuthUserInfo,
	OAuthTokenInfo,
	ApiResponse,
	UserDataUpdate,
	UploadResponse,
	AuthState,
	PKCEParams,
} from "./types";

export { AuthStatus, AuthError } from "./types";

export type { OAuthConfig } from "./config";

export type { SyncResult, UsageDataPayload } from "./ApiService";
