/**
 * API service for data synchronization with Obtime backend
 */

import { Component, Notice } from "obsidian";
import { HttpClient } from "./HttpClient";
import { AuthService } from "./AuthService";
import { API_ENDPOINTS, OAUTH_CONFIG } from "./config";
import {
	OAuthUserInfo,
	UserDataUpdate,
	UploadResponse,
	ApiResponse,
	AuthError,
	PingResponse,
} from "./types";
import { pingWithAuth } from "../utils";
import { TimeEntry, DailyStats } from "../core/types";
import { t } from "../i18n/i18n";

export interface SyncResult {
	success: boolean;
	uploaded: number;
	downloaded: number;
	errors: string[];
}

export interface UsageDataPayload {
	entries?: TimeEntry[];
	dailyStats?: DailyStats[];
	lastSyncTime: number;
	pluginVersion: string;
}

export class ApiService extends Component {
	private httpClient: HttpClient;
	private authService: AuthService;
	private isSyncing: boolean = false;

	constructor(authService: AuthService) {
		super();
		this.authService = authService;
		this.httpClient = new HttpClient(OAUTH_CONFIG.API_BASE_URL); // Base URL will be set from auth service
	}

	async onload(): Promise<void> {
		// Update HTTP client when auth state changes
		this.authService.onAuthStatusChange((status) => {
			const authState = this.authService.getAuthState();
			if (authState.accessToken) {
				this.httpClient.setAuthToken(authState.accessToken);
			} else {
				this.httpClient.setAuthToken(null);
			}
		});
	}

	// User data operations
	public async getUserData(): Promise<OAuthUserInfo | null> {
		try {
			await this.ensureAuthenticated();

			const response = await this.httpClient.get<OAuthUserInfo>(
				API_ENDPOINTS.USER_DATA
			);

			if (response.success && response.data) {
				return response.data;
			}

			return null;
		} catch (error) {
			console.error("Failed to get user data:", error);
			this.handleApiError(error);
			return null;
		}
	}

	public async updateUserData(updates: UserDataUpdate): Promise<boolean> {
		try {
			await this.ensureAuthenticated();

			const response = await this.httpClient.put<OAuthUserInfo>(
				API_ENDPOINTS.USER_DATA,
				updates
			);

			if (response.success) {
				new Notice(t("auth.userDataUpdated"));
				return true;
			}

			return false;
		} catch (error) {
			console.error("Failed to update user data:", error);
			this.handleApiError(error);
			return false;
		}
	}

	// Usage data synchronization
	public async syncUsageData(data: UsageDataPayload): Promise<SyncResult> {
		if (this.isSyncing) {
			throw new Error("Sync already in progress");
		}

		this.isSyncing = true;
		const result: SyncResult = {
			success: false,
			uploaded: 0,
			downloaded: 0,
			errors: [],
		};

		try {
			await this.ensureAuthenticated();

			// Upload local data
			const uploadResult = await this.uploadUsageData(data);
			result.uploaded = uploadResult.count;

			// Download remote data (if needed)
			const downloadResult = await this.downloadUsageData(
				data.lastSyncTime
			);
			result.downloaded = downloadResult.count;

			result.success = true;

			if (result.uploaded > 0 || result.downloaded > 0) {
				new Notice(
					t("sync.syncComplete", {
						uploaded: result.uploaded.toString(),
						downloaded: result.downloaded.toString(),
					})
				);
			}
		} catch (error) {
			console.error("Sync failed:", error);
			result.errors.push(error.message || "Unknown sync error");
			this.handleApiError(error);
		} finally {
			this.isSyncing = false;
		}

		return result;
	}

	public async downloadUsageData(
		lastSyncTime: number
	): Promise<{ data: UsageDataPayload; count: number }> {
		try {
			await this.ensureAuthenticated();

			const response = await this.httpClient.get<UsageDataPayload>(
				`${API_ENDPOINTS.USER_DATA}/usage?since=${lastSyncTime}`
			);

			if (response.success && response.data) {
				return {
					data: response.data,
					count:
						(response.data.entries &&
							response.data.entries.length) ||
						0,
				};
			}

			return {
				data: {
					entries: [],
					dailyStats: [],
					lastSyncTime: Date.now(),
					pluginVersion: "1.0.0",
				},
				count: 0,
			};
		} catch (error) {
			console.error("Failed to download usage data:", error);
			throw error;
		}
	}

	private async uploadUsageData(
		data: UsageDataPayload
	): Promise<{ count: number }> {
		try {
			const response = await this.httpClient.post(
				`${API_ENDPOINTS.USER_DATA}/usage`,
				data
			);

			if (response.success) {
				return { count: (data.entries && data.entries.length) || 0 };
			}

			throw new Error("Upload failed");
		} catch (error) {
			console.error("Failed to upload usage data:", error);
			throw error;
		}
	}

	// File operations
	public async uploadFile(
		file: File,
		type?: string
	): Promise<UploadResponse | null> {
		try {
			await this.ensureAuthenticated();

			const formData = new FormData();
			formData.append("file", file);
			if (type) {
				formData.append("type", type);
			}

			const response = await this.httpClient.post<UploadResponse>(
				API_ENDPOINTS.UPLOAD,
				formData
			);

			if (response.success && response.data) {
				new Notice(t("upload.fileUploaded", { filename: file.name }));
				return response.data;
			}

			return null;
		} catch (error) {
			console.error("Failed to upload file:", error);
			this.handleApiError(error);
			return null;
		}
	}

	public async exportDataAsFile(
		data: UsageDataPayload,
		filename: string
	): Promise<UploadResponse | null> {
		try {
			const jsonStr = JSON.stringify(data, null, 2);
			const blob = new Blob([jsonStr], { type: "application/json" });
			const file = new File([blob], filename, {
				type: "application/json",
			});

			return await this.uploadFile(file, "usage_data_export");
		} catch (error) {
			console.error("Failed to export data as file:", error);
			return null;
		}
	}

	// Utility methods
	public isSyncInProgress(): boolean {
		return this.isSyncing;
	}

	private async ensureAuthenticated(): Promise<void> {
		if (!this.authService.isAuthenticated()) {
			// Try to refresh token
			const refreshed = await this.authService.refreshTokenIfNeeded();
			if (!refreshed) {
				throw new AuthError("Authentication required");
			}
		}
	}

	private handleApiError(error: any): void {
		if (error instanceof AuthError) {
			if (error.statusCode && error.statusCode === 401) {
				new Notice(t("auth.sessionExpired"));
				this.authService.logout();
			} else if (error.statusCode && error.statusCode === 403) {
				new Notice(t("auth.insufficientPermissions"));
			} else if (error.statusCode && error.statusCode >= 500) {
				new Notice(t("sync.serverError"));
			} else {
				new Notice(t("sync.syncError", { error: error.message }));
			}
		} else {
			new Notice(t("sync.networkError"));
		}
	}

	// Batch operations for efficiency
	public async batchUploadEntries(
		entries: TimeEntry[],
		batchSize: number = 100
	): Promise<SyncResult> {
		const result: SyncResult = {
			success: true,
			uploaded: 0,
			downloaded: 0,
			errors: [],
		};

		try {
			await this.ensureAuthenticated();

			// Split entries into batches
			const batches: TimeEntry[][] = [];
			for (let i = 0; i < entries.length; i += batchSize) {
				batches.push(entries.slice(i, i + batchSize));
			}

			// Upload each batch
			for (const batch of batches) {
				try {
					const batchData: UsageDataPayload = {
						entries: batch,
						dailyStats: [],
						lastSyncTime: Date.now(),
						pluginVersion: "1.0.0",
					};

					const uploadResult = await this.uploadUsageData(batchData);
					result.uploaded += uploadResult.count;
				} catch (error) {
					result.errors.push(`Batch upload failed: ${error.message}`);
					result.success = false;
				}
			}
		} catch (error) {
			result.errors.push(error.message || "Batch upload failed");
			result.success = false;
		}

		return result;
	}

	public async testConnection(): Promise<PingResponse | null> {
		try {
			// 使用新的工具函数，自动从localStorage获取token
			const result = await pingWithAuth();

			if (result.success && result.data) {
				console.log(`✅ Ping successful in ${result.latency}`);
				return result.data as PingResponse;
			}

			console.warn(`❌ Ping failed: ${result.error}`);
			return null;
		} catch (error) {
			console.error("Connection test failed:", error);
			return null;
		}
	}
}
