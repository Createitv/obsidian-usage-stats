/**
 * OAuth authentication service for Obtime integration
 */

import { Component, Notice } from "obsidian";
import { HttpClient } from "./HttpClient";
import { OAUTH_CONFIG } from "./config";
import {
	OAuthTokenResponse,
	OAuthUserInfo,
	AuthState,
	PKCEParams,
	AuthStatus,
	AuthError,
} from "./types";
import { t } from "../i18n/i18n";
import { AuthStorage } from "../storage/AuthStorage";
import { LocalStorageUtil, AuthStorageData } from "../utils/localStorage";

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
	private authStorage: AuthStorage;
	private temporaryCodeVerifier: string | null = "1234567890"; // 临时存储 code verifier

	constructor(authStorage: AuthStorage) {
		super();
		this.httpClient = new HttpClient(OAUTH_CONFIG.API_BASE_URL);
		this.authState = {
			isAuthenticated: false,
			accessToken: null,
			refreshToken: null,
			expiresAt: null,
			userInfo: null,
		};

		// 使用新的 AuthStorage 系统
		this.authStorage = authStorage;
	}

	async onload(): Promise<void> {
		await this.loadStoredAuth();
		this.register(() => this.cleanup());
	}

	onunload(): void {
		this.cleanup();
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

	// 处理OAuth回调
	public async handleCallback(code: string, state?: string): Promise<void> {
		try {
			const codeVerifier = await this.getStoredCodeVerifier();

			if (!codeVerifier) {
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

			await this.handleTokenResponse(tokenResponse);
			// return

			// Clear stored verifier
			await this.clearCodeVerifier();

			// Fetch user info
			await this.fetchUserInfo();

			// Verify cache integrity after all data is stored
			const cacheValid = await this.verifyCacheIntegrity();

			if (!cacheValid) {
				console.warn(
					"AuthService: ⚠️ Cache verification failed - some data may not be stored"
				);
			}

			this.notifyStatusChange(AuthStatus.AUTHENTICATED);
			new Notice(t("auth.loginSuccess"));
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

		const response = await fetch(OAUTH_CONFIG.TOKEN_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorText = await response.text();

			throw new AuthError(
				`Token exchange failed (${response.status}): ${errorText}`
			);
		}

		const tokenData = await response.json();
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

		// Update internal auth state
		this.authState = {
			isAuthenticated: true,
			accessToken: tokenResponse.access_token,
			refreshToken:
				tokenResponse.refresh_token || this.authState.refreshToken,
			expiresAt,
			userInfo: this.authState.userInfo,
		};

		// Set auth token for HTTP client
		this.httpClient.setAuthToken(tokenResponse.access_token);

		// 存储到localStorage
		const authDataForStorage: AuthStorageData = {
			isAuthenticated: true,
			accessToken: tokenResponse.access_token,
			refreshToken:
				tokenResponse.refresh_token ||
				this.authState.refreshToken ||
				undefined,
			expiresAt,
			userInfo: this.authState.userInfo
				? {
						id: this.authState.userInfo.id,
						email: this.authState.userInfo.email,
						nickname:
							this.authState.userInfo.nickname ||
							this.authState.userInfo.email,
						created_at: this.authState.userInfo.created_at,
						updated_at: this.authState.userInfo.updated_at,
				  }
				: null,
		};

		const localStorageSuccess =
			LocalStorageUtil.setAuthData(authDataForStorage);
		if (localStorageSuccess) {
			console.log("✅ Auth data saved to localStorage successfully");
		} else {
			console.warn("⚠️ Failed to save auth data to localStorage");
		}

		// 直接保存到data.json的扁平结构中
		await this.saveTokenToDataJson(tokenResponse);
	}

	/**
	 * 将token数据保存到data.json，自动适配结构化格式或扁平格式
	 */
	private async saveTokenToDataJson(
		tokenResponse: OAuthTokenResponse
	): Promise<void> {
		try {
			// 获取当前的 data.json 内容
			const currentData =
				(await this.authStorage.getPlugin().loadData()) || {};

			// 计算过期时间
			const tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

			// 准备token数据
			const tokenData = {
				isAuthenticated: true,
				accessToken: tokenResponse.access_token,
				refreshToken: tokenResponse.refresh_token,
				tokenExpiresAt: tokenExpiresAt,
				tokenType: tokenResponse.token_type,
				tokenScope: tokenResponse.scope,
				lastLoginTime: Date.now(),
			};

			let updatedData;

			// 检测数据格式并相应保存
			if (currentData?.settings) {
				// 结构化格式：保持现有结构，将token数据保存到根级别
				updatedData = {
					...currentData,
					...tokenData, // token数据保存到根级别
					lastUpdated: Date.now(),
				};
			} else {
				// 扁平格式：直接合并
				updatedData = {
					...currentData,
					...tokenData,
				};
			}

			// 保存回 data.json
			await this.authStorage.getPlugin().saveData(updatedData);
		} catch (error) {
			console.error(
				"AuthService: ❌ Failed to save token to data.json:",
				error
			);
		}
	}

	private async fetchUserInfo(): Promise<void> {
		try {
			const response = await this.httpClient.get<OAuthUserInfo>(
				"/user/data"
			);
			if (response.success && response.data) {
				// Update auth state
				this.authState.userInfo = response.data;

				// Store user info immediately for caching
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
			// 优先从localStorage读取认证数据
			const localStorageData = LocalStorageUtil.getAuthData();

			// 如果localStorage有有效数据，使用localStorage数据
			if (localStorageData && LocalStorageUtil.hasValidAuthData()) {
				console.log("📦 Loading auth data from localStorage");

				this.authState = {
					isAuthenticated: localStorageData.isAuthenticated,
					accessToken: localStorageData.accessToken || null,
					refreshToken: localStorageData.refreshToken || null,
					expiresAt: localStorageData.expiresAt || null,
					userInfo: localStorageData.userInfo || null,
				};

				if (localStorageData.accessToken) {
					this.httpClient.setAuthToken(localStorageData.accessToken);
				}

				// Check if token needs refresh
				if (this.isTokenExpired()) {
					await this.refreshTokenIfNeeded();
				} else {
					this.notifyStatusChange(AuthStatus.AUTHENTICATED);
				}
				return;
			}

			// 如果localStorage没有数据，从data.json加载认证数据（支持结构化和扁平格式）
			console.log("📄 Loading auth data from data.json");
			const currentData =
				(await this.authStorage.getPlugin().loadData()) || {};

			// 检查是否有认证数据
			if (currentData.isAuthenticated && currentData.accessToken) {
				// 构建用户信息对象
				const userInfo = currentData.userEmail
					? {
							id: currentData.userEmail,
							email: currentData.userEmail,
							nickname:
								currentData.userNickname ||
								currentData.userEmail,
							created_at: "",
							updated_at: "",
					  }
					: null;

				this.authState = {
					isAuthenticated: currentData.isAuthenticated,
					accessToken: currentData.accessToken,
					refreshToken: currentData.refreshToken || null,
					expiresAt: currentData.tokenExpiresAt || null,
					userInfo: userInfo,
				};

				this.httpClient.setAuthToken(currentData.accessToken);

				// Check if token needs refresh
				if (this.isTokenExpired()) {
					await this.refreshTokenIfNeeded();
				} else {
					this.notifyStatusChange(AuthStatus.AUTHENTICATED);
				}
			} else {
				// No stored auth data found
			}
		} catch (error) {
			console.error("AuthService: Failed to load stored auth:", error);
			// 不再自动清除认证数据，让用户手动处理
		}
	}

	private async storeCodeVerifier(verifier: string): Promise<void> {
		// Store code verifier in memory temporarily during OAuth flow
		this.temporaryCodeVerifier = verifier;
	}

	private async getStoredCodeVerifier(): Promise<string | null> {
		// Return the temporarily stored code verifier
		return this.temporaryCodeVerifier;
	}

	private async clearCodeVerifier(): Promise<void> {
		// Clear the temporarily stored code verifier
		this.temporaryCodeVerifier = null;
	}

	private async clearStoredAuth(): Promise<void> {
		try {
			// 清除localStorage中的认证数据
			const localStorageCleared = LocalStorageUtil.clearAuthData();
			if (localStorageCleared) {
				console.log("🗑️ Auth data cleared from localStorage");
			} else {
				console.warn("⚠️ Failed to clear auth data from localStorage");
			}

			// 获取当前数据
			const currentData =
				(await this.authStorage.getPlugin().loadData()) || {};

			// 清除认证相关字段
			const tokenFields = [
				"accessToken",
				"refreshToken",
				"tokenExpiresAt",
				"tokenType",
				"tokenScope",
				"lastLoginTime",
				"userEmail",
				"userNickname",
			];
			const updatedData = { ...currentData };

			// 清除token字段
			tokenFields.forEach((field) => {
				delete updatedData[field];
			});

			// 更新认证状态
			updatedData.isAuthenticated = false;

			// 如果是结构化格式，也更新lastUpdated
			if (currentData?.settings) {
				updatedData.lastUpdated = Date.now();
			}

			await this.authStorage.getPlugin().saveData(updatedData);
		} catch (error) {
			console.error("AuthService: Failed to clear stored auth:", error);
		}
	}

	/**
	 * Comprehensive cache verification method
	 * Verifies that all authentication data is properly cached
	 */
	public async verifyCacheIntegrity(): Promise<boolean> {
		try {
			// 检查localStorage中的认证数据
			const localStorageValid = LocalStorageUtil.hasValidAuthData();

			// 直接从data.json验证认证数据完整性
			const currentData =
				(await this.authStorage.getPlugin().loadData()) || {};

			// 检查必需字段是否存在
			const hasRequiredFields = !!(
				currentData.isAuthenticated &&
				currentData.accessToken &&
				currentData.userEmail
			);

			// 检查token是否过期
			const isNotExpired =
				!currentData.tokenExpiresAt ||
				Date.now() < currentData.tokenExpiresAt - 60000; // 1分钟缓冲

			const dataJsonValid = hasRequiredFields && isNotExpired;

			// 如果localStorage或data.json任一有效，则认为缓存完整
			const isValid = localStorageValid || dataJsonValid;

			console.log("🔍 Cache integrity check:", {
				localStorage: localStorageValid,
				dataJson: dataJsonValid,
				overall: isValid,
			});

			return isValid;
		} catch (error) {
			return false;
		}
	}
}
