/**
 * HTTP client for API requests
 */

import { ApiResponse, AuthError } from "./types";

export interface RequestOptions {
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	body?: any;
	timeout?: number;
}

export class HttpClient {
	private baseUrl: string;
	private defaultHeaders: Record<string, string>;
	private timeout: number;

	constructor(
		baseUrl: string,
		defaultHeaders: Record<string, string> = {},
		timeout = 10000
	) {
		this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
		this.defaultHeaders = defaultHeaders;
		this.timeout = timeout;
	}

	public setAuthToken(token: string | null): void {
		if (token) {
			this.defaultHeaders["Authorization"] = `Bearer ${token}`;
		} else {
			delete this.defaultHeaders["Authorization"];
		}
	}

	public async request<T = any>(
		endpoint: string,
		options: RequestOptions = {}
	): Promise<ApiResponse<T>> {
		const {
			method = "GET",
			headers = {},
			body,
			timeout = this.timeout,
		} = options;

		const url = `${this.baseUrl}${endpoint}`;
		const requestHeaders = {
			...this.defaultHeaders,
			...headers,
		};

		// Set content type for JSON requests
		if (body && typeof body === "object" && !(body instanceof FormData)) {
			requestHeaders["Content-Type"] = "application/json";
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				method,
				headers: requestHeaders,
				body:
					body instanceof FormData
						? body
						: body
						? JSON.stringify(body)
						: undefined,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				let errorData;
				try {
					errorData = JSON.parse(errorText);
				} catch {
					errorData = { message: errorText };
				}

				const error = new AuthError(
					errorData.message ||
						`HTTP ${response.status}: ${response.statusText}`,
					errorData.code,
					response.status
				);
				throw error;
			}

			const contentType = response.headers.get("content-type");
			let data;

			if (contentType && contentType.includes("application/json")) {
				data = await response.json();
			} else {
				data = await response.text();
			}

			return {
				success: true,
				data,
			};
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof AuthError) {
				throw error;
			}

			if (error.name === "AbortError") {
				throw new AuthError("Request timeout");
			}

			throw new AuthError(error.message || "Network request failed");
		}
	}

	public async get<T = any>(
		endpoint: string,
		headers?: Record<string, string>
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: "GET", headers });
	}

	public async post<T = any>(
		endpoint: string,
		body?: any,
		headers?: Record<string, string>
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: "POST", body, headers });
	}

	public async put<T = any>(
		endpoint: string,
		body?: any,
		headers?: Record<string, string>
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: "PUT", body, headers });
	}

	public async delete<T = any>(
		endpoint: string,
		headers?: Record<string, string>
	): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: "DELETE", headers });
	}

	public setBaseUrl(baseUrl: string): void {
		this.baseUrl = baseUrl.replace(/\/$/, "");
	}

	public getBaseUrl(): string {
		return this.baseUrl;
	}
}
