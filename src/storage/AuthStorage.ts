/**
 * 专门用于处理认证数据存储的服务
 * 遵循Obsidian插件数据存储最佳实践
 */

import { Plugin } from "obsidian";
import { OAuthUserInfo, OAuthTokenResponse } from "../api/types";

export interface AuthData {
	// 认证状态
	isAuthenticated: boolean;

	// Token信息（简化存储）
	accessToken?: string;
	refreshToken?: string;
	tokenExpiresAt?: number;
	tokenType?: string;
	tokenScope?: string;

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
	 * 获取插件实例（用于直接访问data.json）
	 */
	public getPlugin(): Plugin {
		return this.plugin;
	}

	/**
	 * 获取认证数据
	 */
	async getAuthData(): Promise<AuthData | null> {
		try {
			const pluginData =
				(await this.plugin.loadData()) as PluginStorageData;

			if (!pluginData?.auth) {
				return null;
			}

			return pluginData.auth;
		} catch (error) {
			return null;
		}
	}

	/**
	 * 保存token响应信息（简化版）
	 */
	async saveTokenResponse(
		tokenResponse: OAuthTokenResponse
	): Promise<boolean> {
		const tokenExpiresAt = Date.now() + tokenResponse.expires_in * 1000;

		const tokenData: Partial<AuthData> = {
			isAuthenticated: true,
			accessToken: tokenResponse.access_token,
			refreshToken: tokenResponse.refresh_token,
			tokenExpiresAt,
			tokenType: tokenResponse.token_type,
			tokenScope: tokenResponse.scope,
		};

		const saveResult = await this.saveAuthData(tokenData);
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
					lastUpdated: Date.now(),
				};

			// 合并认证数据
			const currentAuth: AuthData = pluginData.auth || {
				isAuthenticated: false,
				version: this.STORAGE_VERSION,
				loginCount: 0,
			};

			const updatedAuth: AuthData = {
				...currentAuth,
				...authData,
				lastLoginTime: authData.isAuthenticated
					? Date.now()
					: currentAuth.lastLoginTime,
				loginCount: authData.isAuthenticated
					? (currentAuth.loginCount || 0) + 1
					: currentAuth.loginCount || 0,
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

		return isValid;
	}

	/**
	 * 获取token详细信息（简化版）
	 */
	async getTokenInfo(): Promise<{
		accessToken?: string;
		refreshToken?: string;
		tokenType?: string;
		scope?: string;
		expiresAt?: Date;
		isExpired: boolean;
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
		};
	}

	/**
	 * 获取存储统计信息（简化版）
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
