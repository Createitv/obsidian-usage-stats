/**
 * 专门用于处理认证数据存储的服务
 * 遵循Obsidian插件数据存储最佳实践
 */

import { Plugin } from "obsidian";
import { OAuthUserInfo, OAuthTokenResponse } from "../api/types";

export interface AuthData {
	// 认证状态
	isAuthenticated: boolean;

	// Token信息（完整存储）
	accessToken?: string;
	refreshToken?: string;
	tokenExpiresAt?: number;
	tokenType?: string;
	tokenScope?: string;

	// Token原始响应信息（用于调试和完整性）
	tokenResponse?: {
		access_token: string;
		token_type: string;
		expires_in: number;
		refresh_token?: string;
		scope: string;
		received_at: number; // 接收时间
	};

	// 用户信息
	userInfo?: OAuthUserInfo;

	// 元数据
	lastLoginTime?: number;
	loginCount?: number;

	// 版本控制
	version: string;
}

export interface PluginStorageData {
	// 插件主要数据
	version: string;
	lastUpdated: number;

	// 认证数据（独立存储区域）
	auth?: AuthData;

	// 其他插件数据...
	[key: string]: any;
}

export class AuthStorage {
	private plugin: Plugin;
	private readonly STORAGE_VERSION = "1.0.0";

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	/**
	 * 获取认证数据
	 */
	async getAuthData(): Promise<AuthData | null> {
		try {
			const pluginData =
				(await this.plugin.loadData()) as PluginStorageData;

			if (!pluginData?.auth) {
				console.log("AuthStorage: No auth data found");
				return null;
			}

			// 版本兼容性检查
			if (pluginData.auth.version !== this.STORAGE_VERSION) {
				console.warn(
					"AuthStorage: Version mismatch, may need migration"
				);
			}

			console.log("AuthStorage: Auth data loaded successfully");
			return pluginData.auth;
		} catch (error) {
			console.error("AuthStorage: Failed to load auth data:", error);
			return null;
		}
	}

	/**
	 * 保存完整的token响应信息
	 */
	async saveTokenResponse(
		tokenResponse: OAuthTokenResponse
	): Promise<boolean> {
		console.log(
			"AuthStorage: 🔐 Processing token exchange JSON for persistent storage..."
		);
		console.log(
			"AuthStorage: Original JSON response:",
			JSON.stringify(tokenResponse, null, 2)
		);

		const tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

		const tokenData: Partial<AuthData> = {
			isAuthenticated: true,
			accessToken: tokenResponse.access_token,
			refreshToken: tokenResponse.refresh_token,
			tokenExpiresAt,
			tokenType: tokenResponse.token_type,
			tokenScope: tokenResponse.scope,
			tokenResponse: {
				access_token: tokenResponse.access_token,
				token_type: tokenResponse.token_type,
				expires_in: tokenResponse.expires_in,
				refresh_token: tokenResponse.refresh_token,
				scope: tokenResponse.scope,
				received_at: Date.now(),
			},
		};

		console.log("AuthStorage: 📦 Structured token data for storage:", {
			hasAccessToken: !!tokenData.accessToken,
			hasRefreshToken: !!tokenData.refreshToken,
			tokenType: tokenData.tokenType,
			scope: tokenData.tokenScope,
			expiresAt: new Date(tokenData.tokenExpiresAt!).toISOString(),
			originalJsonPreserved: !!tokenData.tokenResponse,
		});

		console.log(
			"AuthStorage: 💾 Saving to persistent storage (data.json)..."
		);
		const saveResult = await this.saveAuthData(tokenData);

		if (saveResult) {
			console.log(
				"AuthStorage: ✅ Token exchange JSON successfully stored to persistent storage!"
			);
			console.log(
				"AuthStorage: 📄 Complete token response preserved as:",
				JSON.stringify(tokenData.tokenResponse, null, 2)
			);
		} else {
			console.error(
				"AuthStorage: ❌ Failed to save token exchange JSON to persistent storage"
			);
		}

		return saveResult;
	}

	/**
	 * 保存认证数据
	 */
	async saveAuthData(authData: Partial<AuthData>): Promise<boolean> {
		try {
			// 获取现有的插件数据
			const pluginData =
				((await this.plugin.loadData()) as PluginStorageData) || {
					version: "1.0.0",
					lastUpdated: Date.now(),
				};

			// 合并认证数据
			const currentAuth = pluginData.auth || {
				isAuthenticated: false,
				version: this.STORAGE_VERSION,
				loginCount: 0,
			};

			const updatedAuth: AuthData = {
				...currentAuth,
				...authData,
				version: this.STORAGE_VERSION,
				lastLoginTime: authData.isAuthenticated
					? Date.now()
					: currentAuth.lastLoginTime,
				loginCount: authData.isAuthenticated
					? (currentAuth.loginCount || 0) + 1
					: currentAuth.loginCount,
			};

			// 更新插件数据
			pluginData.auth = updatedAuth;
			pluginData.lastUpdated = Date.now();

			// 保存到Obsidian
			await this.plugin.saveData(pluginData);

			// 验证保存成功
			const verifyData =
				(await this.plugin.loadData()) as PluginStorageData;
			const saved =
				!!verifyData?.auth?.isAuthenticated ===
				!!updatedAuth.isAuthenticated;

			console.log(
				"AuthStorage: Save result:",
				saved ? "✅ Success" : "❌ Failed"
			);
			return saved;
		} catch (error) {
			console.error("AuthStorage: Failed to save auth data:", error);
			return false;
		}
	}

	/**
	 * 清除认证数据
	 */
	async clearAuthData(): Promise<boolean> {
		try {
			const pluginData =
				((await this.plugin.loadData()) as PluginStorageData) || {};

			// 清除认证数据但保留其他插件数据
			if (pluginData.auth) {
				delete pluginData.auth;
				pluginData.lastUpdated = Date.now();

				await this.plugin.saveData(pluginData);
				console.log("AuthStorage: Auth data cleared successfully");
			}

			return true;
		} catch (error) {
			console.error("AuthStorage: Failed to clear auth data:", error);
			return false;
		}
	}

	/**
	 * 检查认证数据完整性
	 */
	async verifyIntegrity(): Promise<boolean> {
		const authData = await this.getAuthData();

		if (!authData) {
			console.log("AuthStorage: No auth data to verify");
			return false;
		}

		const hasRequiredFields = !!(
			authData.isAuthenticated &&
			authData.accessToken &&
			authData.userInfo?.email
		);

		const isNotExpired =
			!authData.tokenExpiresAt ||
			Date.now() < authData.tokenExpiresAt - 60000; // 1分钟缓冲

		const isValid = hasRequiredFields && isNotExpired;

		console.log("AuthStorage: Integrity check:", {
			hasRequiredFields,
			isNotExpired,
			isValid,
		});

		return isValid;
	}

	/**
	 * 获取token详细信息
	 */
	async getTokenInfo(): Promise<{
		accessToken?: string;
		refreshToken?: string;
		tokenType?: string;
		scope?: string;
		expiresAt?: Date;
		isExpired: boolean;
		originalResponse?: any;
	} | null> {
		const authData = await this.getAuthData();

		if (!authData?.accessToken) {
			return null;
		}

		const expiresAt = authData.tokenExpiresAt
			? new Date(authData.tokenExpiresAt)
			: undefined;
		const isExpired = authData.tokenExpiresAt
			? Date.now() >= authData.tokenExpiresAt - 60000
			: false;

		return {
			accessToken: authData.accessToken,
			refreshToken: authData.refreshToken,
			tokenType: authData.tokenType,
			scope: authData.tokenScope,
			expiresAt,
			isExpired,
			originalResponse: authData.tokenResponse,
		};
	}

	/**
	 * 验证JSON响应存储的完整性
	 */
	async verifyTokenResponseStorage(): Promise<{
		hasOriginalJson: boolean;
		originalResponse?: any;
		accessTokenMatch: boolean;
		tokenTypeMatch: boolean;
		scopeMatch: boolean;
		storageIntegrity: boolean;
	}> {
		const authData = await this.getAuthData();

		if (!authData || !authData.tokenResponse) {
			return {
				hasOriginalJson: false,
				accessTokenMatch: false,
				tokenTypeMatch: false,
				scopeMatch: false,
				storageIntegrity: false,
			};
		}

		const originalResponse = authData.tokenResponse;
		const accessTokenMatch =
			authData.accessToken === originalResponse.access_token;
		const tokenTypeMatch =
			authData.tokenType === originalResponse.token_type;
		const scopeMatch = authData.tokenScope === originalResponse.scope;

		console.log("AuthStorage: 🔍 Token response storage verification:", {
			hasOriginalJson: true,
			accessTokenMatch,
			tokenTypeMatch,
			scopeMatch,
			originalJsonKeys: Object.keys(originalResponse),
			receivedAt: new Date(originalResponse.received_at).toISOString(),
		});

		return {
			hasOriginalJson: true,
			originalResponse,
			accessTokenMatch,
			tokenTypeMatch,
			scopeMatch,
			storageIntegrity: accessTokenMatch && tokenTypeMatch && scopeMatch,
		};
	}

	/**
	 * 获取存储统计信息
	 */
	async getStorageStats(): Promise<{
		hasAuth: boolean;
		userEmail?: string;
		lastLogin?: Date;
		loginCount?: number;
		tokenExpiry?: Date;
		tokenType?: string;
		tokenScope?: string;
	}> {
		const authData = await this.getAuthData();

		return {
			hasAuth: !!authData?.isAuthenticated,
			userEmail: authData?.userInfo?.email,
			lastLogin: authData?.lastLoginTime
				? new Date(authData.lastLoginTime)
				: undefined,
			loginCount: authData?.loginCount || 0,
			tokenExpiry: authData?.tokenExpiresAt
				? new Date(authData.tokenExpiresAt)
				: undefined,
			tokenType: authData?.tokenType,
			tokenScope: authData?.tokenScope,
		};
	}
}
