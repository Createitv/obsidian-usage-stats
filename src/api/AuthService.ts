/**
 * OAuth authentication service for Obtime integration
 */

import { Component, Notice } from "obsidian";
import { HttpClient } from "./HttpClient";
import { OAUTH_CONFIG, STORAGE_KEYS } from "./config";
import {
	OAuthTokenResponse,
	OAuthUserInfo,
	AuthState,
	PKCEParams,
	AuthStatus,
	AuthError,
} from "./types";
import { t } from "../i18n/i18n";

// Declare electron API types for better TypeScript support
declare global {
	interface Window {
		electronAPI?: {
			shell?: {
				openExternal: (url: string) => Promise<void>;
			};
			registerProtocol?: (
				protocol: string,
				handler: (url: string) => void
			) => void;
		};
	}
}

export class AuthService extends Component {
	private httpClient: HttpClient;
	private authState: AuthState;
	private statusChangeCallbacks: Array<(status: AuthStatus) => void> = [];
	private storageAdapter: {
		getItem: (key: string) => Promise<string | null>;
		setItem: (key: string, value: string) => Promise<void>;
		removeItem: (key: string) => Promise<void>;
	};

	constructor(storageAdapter?: typeof AuthService.prototype.storageAdapter) {
		super();
		this.httpClient = new HttpClient(OAUTH_CONFIG.API_BASE_URL);
		this.authState = {
			isAuthenticated: false,
			accessToken: null,
			refreshToken: null,
			expiresAt: null,
			userInfo: null,
		};

		// Use provided storage adapter or fall back to localStorage
		this.storageAdapter = storageAdapter || {
			getItem: async (key: string) => localStorage.getItem(key),
			setItem: async (key: string, value: string) => {
				localStorage.setItem(key, value);
			},
			removeItem: async (key: string) => {
				localStorage.removeItem(key);
			},
		};
	}

	async onload(): Promise<void> {
		await this.loadStoredAuth();
		this.register(() => this.cleanup());
	}

	onunload(): void {
		// this.cleanup();
	}

	// Public API
	public getAuthState(): AuthState {
		return { ...this.authState };
	}

	public isAuthenticated(): boolean {
		return (
			this.authState.isAuthenticated &&
			this.authState.accessToken !== null &&
			!this.isTokenExpired()
		);
	}

	public getUserInfo(): OAuthUserInfo | null {
		return this.authState.userInfo;
	}

	public onAuthStatusChange(callback: (status: AuthStatus) => void): void {
		this.statusChangeCallbacks.push(callback);
	}

	public offAuthStatusChange(callback: (status: AuthStatus) => void): void {
		const index = this.statusChangeCallbacks.indexOf(callback);
		if (index > -1) {
			this.statusChangeCallbacks.splice(index, 1);
		}
	}

	// OAuth flow methods
	public async startAuthorization(): Promise<void> {
		try {
			const pkceParams = await this.generatePKCEParams();

			await this.storeCodeVerifier(pkceParams.codeVerifier);

			// Verify it was stored
			const storedVerifier = await this.getStoredCodeVerifier();

			const authUrl = this.buildAuthorizationUrl(pkceParams);

			// Open browser for authorization
			await this.openAuthorizationUrl(authUrl);

			new Notice(t("auth.authorizationStarted"));
		} catch (error) {
			this.notifyStatusChange(AuthStatus.ERROR);
			new Notice(t("auth.authorizationFailed"));
			throw error;
		}
	}

	public async handleCallback(code: string, state?: string): Promise<void> {
		try {
			const codeVerifier = await this.getStoredCodeVerifier();
			console.log(
				"[UsageStats/Auth] Code verifier found:",
				!!codeVerifier
			);

			if (codeVerifier) {
				console.log(
					"[UsageStats/Auth] Code verifier length:",
					codeVerifier.length
				);
			} else {
				console.error("[UsageStats/Auth] No code verifier found!");
			}

			if (!codeVerifier) {
				throw new AuthError(
					"Missing code verifier. Please start OAuth flow from plugin settings first."
				);
			}

			const tokenResponse = await this.exchangeCodeForToken(
				code,
				codeVerifier
			);
			console.log("AuthService: Token response received:", {
				hasAccessToken: !!tokenResponse.access_token,
				hasRefreshToken: !!tokenResponse.refresh_token,
				expiresIn: tokenResponse.expires_in,
			});

			await this.handleTokenResponse(tokenResponse);

			// Clear stored verifier
			await this.clearCodeVerifier();

			// Fetch user info
			console.log("AuthService: Fetching user info...");
			await this.fetchUserInfo();

			// Verify cache integrity after all data is stored
			console.log("AuthService: Verifying complete cache after OAuth...");
			const cacheValid = await this.verifyCacheIntegrity();

			if (cacheValid) {
				console.log(
					"AuthService: ✅ All authentication data cached successfully"
				);
			} else {
				console.warn(
					"AuthService: ⚠️ Cache verification failed - some data may not be stored"
				);
			}

			this.notifyStatusChange(AuthStatus.AUTHENTICATED);
			new Notice(t("auth.loginSuccess"));
			console.log(
				"AuthService: Callback handling completed successfully"
			);
		} catch (error) {
			console.error("OAuth callback failed:", error);
			this.notifyStatusChange(AuthStatus.ERROR);
			new Notice(t("auth.loginFailed"));
			throw error;
		}
	}

	public async logout(): Promise<void> {
		try {
			if (this.authState.accessToken) {
				// Attempt to revoke token on server
				await this.revokeToken();
			}
		} catch (error) {
			console.warn("Token revocation failed:", error);
		} finally {
			await this.clearStoredAuth();
			this.resetAuthState();
			this.notifyStatusChange(AuthStatus.NOT_AUTHENTICATED);
			new Notice(t("auth.logoutSuccess"));
		}
	}

	public async refreshTokenIfNeeded(): Promise<boolean> {
		if (!this.isTokenExpired()) {
			return true;
		}

		if (!this.authState.refreshToken) {
			await this.logout();
			return false;
		}

		try {
			const tokenResponse = await this.refreshAccessToken();
			await this.handleTokenResponse(tokenResponse);
			return true;
		} catch (error) {
			console.error("Token refresh failed:", error);
			await this.logout();
			return false;
		}
	}

	public getAuthHeaders(): Record<string, string> {
		if (!this.authState.accessToken) {
			return {};
		}

		return {
			Authorization: `Bearer ${this.authState.accessToken}`,
		};
	}

	// Private helper methods
	private async generatePKCEParams(): Promise<PKCEParams> {
		const codeVerifier = this.generateCodeVerifier();
		const codeChallenge = await this.generateCodeChallenge(codeVerifier);
		const state = this.generateState();

		return {
			codeVerifier,
			codeChallenge,
			state,
		};
	}

	private generateCodeVerifier(): string {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");
	}

	private async generateCodeChallenge(verifier: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(verifier);
		const digest = await crypto.subtle.digest("SHA-256", data);
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");
	}

	private generateState(): string {
		return (
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15)
		);
	}

	private buildAuthorizationUrl(pkceParams: PKCEParams): string {
		const authUrl = new URL(OAUTH_CONFIG.AUTHORIZATION_URL);
		authUrl.searchParams.set("client_id", OAUTH_CONFIG.CLIENT_ID);
		authUrl.searchParams.set("redirect_uri", OAUTH_CONFIG.REDIRECT_URI);
		authUrl.searchParams.set("response_type", "code");
		authUrl.searchParams.set("scope", OAUTH_CONFIG.SCOPES);
		authUrl.searchParams.set("code_challenge", pkceParams.codeChallenge);
		authUrl.searchParams.set("code_challenge_method", "S256");
		authUrl.searchParams.set("state", pkceParams.state);

		return authUrl.toString();
	}

	private async openAuthorizationUrl(url: string): Promise<void> {
		if (window.electronAPI?.shell?.openExternal) {
			// Electron environment
			await window.electronAPI.shell.openExternal(url);
		} else {
			// Browser environment
			window.open(url, "_blank");
		}
	}

	private async exchangeCodeForToken(
		code: string,
		codeVerifier: string
	): Promise<OAuthTokenResponse> {
		const requestBody = {
			grant_type: "authorization_code",
			code,
			redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
			client_id: OAUTH_CONFIG.CLIENT_ID,
			client_secret: OAUTH_CONFIG.CLIENT_SECRET,
			code_verifier: codeVerifier,
		};

		console.log(
			"AuthService: Token exchange request to:",
			OAUTH_CONFIG.TOKEN_URL
		);
		console.log("AuthService: Request body:", {
			...requestBody,
			client_secret: "***hidden***",
			code: code.substring(0, 10) + "...",
			code_verifier: codeVerifier.substring(0, 10) + "...",
		});

		const response = await fetch(OAUTH_CONFIG.TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		console.log(
			"AuthService: Token exchange response status:",
			response.status
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"AuthService: Token exchange failed with status:",
				response.status
			);
			console.error("AuthService: Error response:", errorText);
			throw new AuthError(
				`Token exchange failed (${response.status}): ${errorText}`
			);
		}

		const tokenData = await response.json();
		console.log(
			"AuthService: Token exchange successful, received data keys:",
			tokenData
		);

		return tokenData;
	}

	private async refreshAccessToken(): Promise<OAuthTokenResponse> {
		if (!this.authState.refreshToken) {
			throw new AuthError("No refresh token available");
		}

		const response = await fetch(OAUTH_CONFIG.TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				grant_type: "refresh_token",
				refresh_token: this.authState.refreshToken,
				client_id: OAUTH_CONFIG.CLIENT_ID,
				client_secret: OAUTH_CONFIG.CLIENT_SECRET,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new AuthError(`Token refresh failed: ${errorText}`);
		}

		return response.json();
	}

	private async handleTokenResponse(
		tokenResponse: OAuthTokenResponse
	): Promise<void> {
		const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

		this.authState = {
			isAuthenticated: true,
			accessToken: tokenResponse.access_token,
			refreshToken:
				tokenResponse.refresh_token || this.authState.refreshToken,
			expiresAt,
			userInfo: this.authState.userInfo,
		};

		this.httpClient.setAuthToken(tokenResponse.access_token);

		// Store token data immediately for caching
		console.log("AuthService: Storing token data to cache...");
		await this.storeAuthData();

		// Verify token was stored
		const storedToken = await this.storageAdapter.getItem(
			STORAGE_KEYS.ACCESS_TOKEN
		);
		console.log("AuthService: Token cached successfully:", !!storedToken);
	}

	private async fetchUserInfo(): Promise<void> {
		try {
			console.log("AuthService: Fetching user info from API...");
			const response = await this.httpClient.get<OAuthUserInfo>(
				"/user/data"
			);
			if (response.success && response.data) {
				console.log("AuthService: User info received:", {
					email: response.data.email,
					nickname: response.data.nickname,
				});

				// Update auth state
				this.authState.userInfo = response.data;

				// Store user info immediately for caching
				console.log("AuthService: Storing user info to cache...");
				await this.storeUserInfo(response.data);

				// Verify user info was stored
				const storedUserInfo = await this.storageAdapter.getItem(
					STORAGE_KEYS.USER_INFO
				);
				console.log(
					"AuthService: User info cached successfully:",
					!!storedUserInfo
				);

				if (storedUserInfo) {
					const parsed = JSON.parse(storedUserInfo);
					console.log("AuthService: Cached user info verified:", {
						email: parsed.email,
						nickname: parsed.nickname,
					});
				}
			} else {
				console.warn(
					"AuthService: Failed to get user info from API response"
				);
			}
		} catch (error) {
			console.error("AuthService: Failed to fetch user info:", error);
		}
	}

	private async revokeToken(): Promise<void> {
		if (!this.authState.accessToken) {
			return;
		}

		await fetch(OAUTH_CONFIG.REVOKE_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.authState.accessToken}`,
			},
			body: JSON.stringify({
				token_id: this.authState.accessToken,
			}),
		});
	}

	private isTokenExpired(): boolean {
		if (!this.authState.expiresAt) {
			return false;
		}
		// Add 60 second buffer
		return Date.now() >= this.authState.expiresAt - 60000;
	}

	private resetAuthState(): void {
		this.authState = {
			isAuthenticated: false,
			accessToken: null,
			refreshToken: null,
			expiresAt: null,
			userInfo: null,
		};
		this.httpClient.setAuthToken(null);
	}

	private notifyStatusChange(status: AuthStatus): void {
		this.statusChangeCallbacks.forEach((callback) => {
			try {
				callback(status);
			} catch (error) {
				console.error("Auth status callback error:", error);
			}
		});
	}

	private cleanup(): void {
		this.statusChangeCallbacks = [];
	}

	// Storage methods
	public async loadStoredAuth(): Promise<void> {
		try {
			const accessToken = await this.storageAdapter.getItem(
				STORAGE_KEYS.ACCESS_TOKEN
			);
			const refreshToken = await this.storageAdapter.getItem(
				STORAGE_KEYS.REFRESH_TOKEN
			);
			const expiresAt = await this.storageAdapter.getItem(
				STORAGE_KEYS.TOKEN_EXPIRES_AT
			);
			const userInfoStr = await this.storageAdapter.getItem(
				STORAGE_KEYS.USER_INFO
			);

			if (accessToken) {
				this.authState = {
					isAuthenticated: true,
					accessToken,
					refreshToken,
					expiresAt: expiresAt ? parseInt(expiresAt) : null,
					userInfo: userInfoStr ? JSON.parse(userInfoStr) : null,
				};

				this.httpClient.setAuthToken(accessToken);

				// Check if token needs refresh
				if (this.isTokenExpired()) {
					await this.refreshTokenIfNeeded();
				} else {
					this.notifyStatusChange(AuthStatus.AUTHENTICATED);
				}
			}
		} catch (error) {
			console.error("Failed to load stored auth:", error);
			// await this.clearStoredAuth();
		}
	}

	private async storeAuthData(): Promise<void> {
		// Store access token
		if (this.authState.accessToken) {
			await this.storageAdapter.setItem(
				STORAGE_KEYS.ACCESS_TOKEN,
				this.authState.accessToken
			);
		}

		// Store refresh token if available
		if (this.authState.refreshToken) {
			await this.storageAdapter.setItem(
				STORAGE_KEYS.REFRESH_TOKEN,
				this.authState.refreshToken
			);
		}

		// Store expiration time
		if (this.authState.expiresAt) {
			await this.storageAdapter.setItem(
				STORAGE_KEYS.TOKEN_EXPIRES_AT,
				this.authState.expiresAt.toString()
			);
		}

		// Store user info if available
		if (this.authState.userInfo) {
			await this.storageAdapter.setItem(
				STORAGE_KEYS.USER_INFO,
				JSON.stringify(this.authState.userInfo)
			);
		}
	}

	private async storeUserInfo(userInfo: OAuthUserInfo): Promise<void> {
		await this.storageAdapter.setItem(
			STORAGE_KEYS.USER_INFO,
			JSON.stringify(userInfo)
		);
	}

	private async storeCodeVerifier(verifier: string): Promise<void> {
		await this.storageAdapter.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);
	}

	private async getStoredCodeVerifier(): Promise<string | null> {
		return this.storageAdapter.getItem(STORAGE_KEYS.CODE_VERIFIER);
	}

	private async clearCodeVerifier(): Promise<void> {
		await this.storageAdapter.removeItem(STORAGE_KEYS.CODE_VERIFIER);
	}

	private async clearStoredAuth(): Promise<void> {
		await this.storageAdapter.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
		await this.storageAdapter.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
		await this.storageAdapter.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
		await this.storageAdapter.removeItem(STORAGE_KEYS.USER_INFO);
		await this.storageAdapter.removeItem(STORAGE_KEYS.CODE_VERIFIER);
		console.log("123-012-093-0921-03 Ooer all cookies");
	}

	/**
	 * Comprehensive cache verification method
	 * Verifies that all authentication data is properly cached
	 */
	public async verifyCacheIntegrity(): Promise<boolean> {
		try {
			console.log("AuthService: Verifying cache integrity...");

			const accessToken = await this.storageAdapter.getItem(
				STORAGE_KEYS.ACCESS_TOKEN
			);
			const userInfo = await this.storageAdapter.getItem(
				STORAGE_KEYS.USER_INFO
			);
			const expiresAt = await this.storageAdapter.getItem(
				STORAGE_KEYS.TOKEN_EXPIRES_AT
			);

			const cacheStatus = {
				hasAccessToken: !!accessToken,
				hasUserInfo: !!userInfo,
				hasExpiresAt: !!expiresAt,
				tokenLength: accessToken?.length || 0,
				userEmail: userInfo ? JSON.parse(userInfo).email : null,
			};

			console.log("AuthService: Cache verification result:", cacheStatus);

			// Check if essential data is cached
			const isValid = !!(accessToken && userInfo && expiresAt);
			console.log(
				"AuthService: Cache integrity:",
				isValid ? "VALID" : "INVALID"
			);

			return isValid;
		} catch (error) {
			console.error("AuthService: Cache verification failed:", error);
			return false;
		}
	}
}
