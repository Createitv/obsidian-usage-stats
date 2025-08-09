/**
 * HTTP请求工具函数，自动携带localStorage中的AccessToken
 */

import { OAUTH_CONFIG } from "../api";
import { LocalStorageUtil } from "./localStorage";

export interface AuthenticatedRequestOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	body?: any;
	timeout?: number;
	baseUrl?: string;
}

export interface AuthenticatedResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	status: number;
}

/**
 * 发送携带AccessToken的HTTP请求
 */
export async function requestWithAuth<T = any>(
	endpoint: string,
	options: AuthenticatedRequestOptions = {}
): Promise<AuthenticatedResponse<T>> {
	const {
		method = "GET",
		headers = {},
		body,
		timeout = 10000,
		baseUrl = OAUTH_CONFIG.API_BASE_URL,
	} = options;

	try {
		// 自动获取localStorage中的认证头
		const authHeaders = LocalStorageUtil.getAuthHeaders();

		// 如果没有认证token，返回未认证错误
		if (!authHeaders.Authorization) {
			return {
				success: false,
				error: "No access token found in localStorage",
				status: 401,
			};
		}

		// 构建完整URL
		const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;

		// 合并请求头
		const requestHeaders: Record<string, string> = {
			"Content-Type": "application/json",
			...authHeaders, // 自动添加Authorization header
			...headers, // 允许覆盖默认headers
		};

		// 创建AbortController用于超时控制
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		// 发送请求
		const response = await fetch(url, {
			method,
			headers: requestHeaders,
			body: body ? JSON.stringify(body) : undefined,
			signal: controller.signal,
		});

		// 清除超时定时器
		clearTimeout(timeoutId);

		// 尝试解析响应
		let data: T | undefined;
		try {
			const responseText = await response.text();
			data = responseText ? JSON.parse(responseText) : undefined;
		} catch (parseError) {
			console.warn("Failed to parse response as JSON:", parseError);
		}

		return {
			success: response.ok,
			data,
			error: response.ok
				? undefined
				: `HTTP ${response.status}: ${response.statusText}`,
			status: response.status,
		};
	} catch (error) {
		console.error("Authenticated request failed:", error);

		if (error instanceof Error) {
			if (error.name === "AbortError") {
				return {
					success: false,
					error: "Request timeout",
					status: 408,
				};
			}
			return {
				success: false,
				error: error.message,
				status: 0,
			};
		}

		return {
			success: false,
			error: "Unknown error occurred",
			status: 0,
		};
	}
}

/**
 * GET请求快捷函数
 */
export async function getWithAuth<T = any>(
	endpoint: string,
	options: Omit<AuthenticatedRequestOptions, "method"> = {}
): Promise<AuthenticatedResponse<T>> {
	return requestWithAuth<T>(endpoint, { ...options, method: "GET" });
}

/**
 * POST请求快捷函数
 */
export async function postWithAuth<T = any>(
	endpoint: string,
	body?: any,
	options: Omit<AuthenticatedRequestOptions, "method" | "body"> = {}
): Promise<AuthenticatedResponse<T>> {
	return requestWithAuth<T>(endpoint, { ...options, method: "POST", body });
}

/**
 * PUT请求快捷函数
 */
export async function putWithAuth<T = any>(
	endpoint: string,
	body?: any,
	options: Omit<AuthenticatedRequestOptions, "method" | "body"> = {}
): Promise<AuthenticatedResponse<T>> {
	return requestWithAuth<T>(endpoint, { ...options, method: "PUT", body });
}

/**
 * DELETE请求快捷函数
 */
export async function deleteWithAuth<T = any>(
	endpoint: string,
	options: Omit<AuthenticatedRequestOptions, "method"> = {}
): Promise<AuthenticatedResponse<T>> {
	return requestWithAuth<T>(endpoint, { ...options, method: "DELETE" });
}

/**
 * 测试连接到ping端点（专用函数）
 */
export async function pingWithAuth(): Promise<{
	success: boolean;
	data?: any;
	latency?: string;
	error?: string;
}> {
	const startTime = Date.now();

	try {
		const response = await getWithAuth("/ping");
		const endTime = Date.now();
		const latency = `${endTime - startTime}ms`;

		if (response.success && response.data) {
			return {
				success: true,
				data: response.data,
				latency: latency,
			};
		}

		return {
			success: false,
			error: response.error || "Ping failed",
			latency: latency,
		};
	} catch (error) {
		const endTime = Date.now();
		const latency = `${endTime - startTime}ms`;

		return {
			success: false,
			error: error instanceof Error ? error.message : "Ping failed",
			latency: latency,
		};
	}
}
