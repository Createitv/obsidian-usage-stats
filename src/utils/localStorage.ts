/**
 * LocalStorage 工具类
 * 用于在浏览器环境中安全地存储和读取认证数据
 */

export interface AuthStorageData {
	isAuthenticated: boolean;
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
	userInfo?: {
		id: string;
		email: string;
		nickname: string;
		created_at: string;
		updated_at: string;
	} | null;
}

export class LocalStorageUtil {
	private static readonly AUTH_KEY = "obsidian-usage-stats-auth";

	/**
	 * 检查是否支持localStorage
	 */
	private static isStorageAvailable(): boolean {
		try {
			return (
				typeof Storage !== "undefined" &&
				window.localStorage !== undefined
			);
		} catch (error) {
			return false;
		}
	}

	/**
	 * 存储认证数据到localStorage
	 */
	static setAuthData(authData: AuthStorageData): boolean {
		try {
			if (!this.isStorageAvailable()) {
				console.warn("localStorage is not available");
				return false;
			}

			const dataToStore = {
				...authData,
				timestamp: Date.now(), // 添加时间戳用于调试
			};

			localStorage.setItem(this.AUTH_KEY, JSON.stringify(dataToStore));
			return true;
		} catch (error) {
			console.error("Failed to save auth data to localStorage:", error);
			return false;
		}
	}

	/**
	 * 从localStorage读取认证数据
	 */
	static getAuthData(): AuthStorageData | null {
		try {
			if (!this.isStorageAvailable()) {
				return null;
			}

			const stored = localStorage.getItem(this.AUTH_KEY);
			if (!stored) {
				return null;
			}

			const parsed = JSON.parse(stored);

			// 移除时间戳字段，只返回认证数据
			const { timestamp, ...authData } = parsed;

			return authData as AuthStorageData;
		} catch (error) {
			console.error("Failed to load auth data from localStorage:", error);
			return null;
		}
	}

	/**
	 * 清除localStorage中的认证数据
	 */
	static clearAuthData(): boolean {
		try {
			if (!this.isStorageAvailable()) {
				return false;
			}

			localStorage.removeItem(this.AUTH_KEY);
			return true;
		} catch (error) {
			console.error(
				"Failed to clear auth data from localStorage:",
				error
			);
			return false;
		}
	}

	/**
	 * 检查localStorage中是否有有效的认证数据
	 */
	static hasValidAuthData(): boolean {
		const authData = this.getAuthData();

		if (!authData || !authData.isAuthenticated || !authData.accessToken) {
			return false;
		}

		// 检查token是否过期
		if (authData.expiresAt && Date.now() >= authData.expiresAt - 60000) {
			return false;
		}

		return true;
	}

	/**
	 * 获取存储统计信息（用于调试）
	 */
	static getStorageStats(): {
		hasAuth: boolean;
		userEmail?: string;
		expiresAt?: Date;
		isExpired: boolean;
	} {
		const authData = this.getAuthData();

		return {
			hasAuth: !!authData?.isAuthenticated,
			userEmail: authData?.userInfo?.email,
			expiresAt: authData?.expiresAt
				? new Date(authData.expiresAt)
				: undefined,
			isExpired: authData?.expiresAt
				? Date.now() >= authData.expiresAt - 60000
				: false,
		};
	}
}
