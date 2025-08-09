import "@style/styles";
import { Plugin, Notice } from "obsidian";
import { UsageStatsCommandManager } from "./commands/CommandManager";
import { USAGE_STATS_VIEW_TYPE, UsageStatsView } from "./components/PluginView";
import { UsageStatsSettingsTab } from "./components/SettingsTab";
import {
	DEFAULT_SETTINGS,
	UsageStatsSettings,
	DailyStats,
	TrackingState,
	TrackingSession,
} from "./core/types";
// import { TimeTracker } from "./core/TimeTracker";
import { DataManager } from "./storage/DataManager";
import { StatusBarManager } from "./ui/StatusBarManager";
import { t, i18n } from "./i18n/i18n";
import {
	AuthService,
	ApiService,
	SyncResult,
	UsageDataPayload,
	OAuthUserInfo,
} from "./api";
import { AuthStorage } from "./storage/AuthStorage";

export default class UsageStatsPlugin extends Plugin {
	settings: UsageStatsSettings;
	private commandManager: UsageStatsCommandManager;
	// private timeTracker: TimeTracker;
	private dataManager: DataManager;
	private statusBarManager: StatusBarManager;
	private statusBarEl: HTMLElement;
	private authStorage: AuthStorage;
	private authService: AuthService;
	private apiService: ApiService;
	// private devSaveTimer?: NodeJS.Timeout; // 已删除开发模式自动保存功能

	async onload() {
		await this.loadSettings();

		// Initialize new AuthStorage system
		console.log("Plugin: Initializing AuthStorage system...");
		this.authStorage = new AuthStorage(this);

		// Initialize AuthService with new storage system only
		this.authService = new AuthService(this.authStorage);
		this.addChild(this.authService);
		await this.authService.onload(); // 确保AuthService初始化完成

		// Verify cache integrity on startup and attempt recovery if needed
		console.log("Plugin startup: Checking authentication status...");

		// First check if AuthService thinks we're authenticated
		const isAuthServiceAuth = this.authService.isAuthenticated();
		console.log(
			"Plugin startup: AuthService authenticated:",
			isAuthServiceAuth
		);

		// Check if we have any stored auth data in the new storage format
		const authStorageStats = await this.authStorage.getStorageStats();
		console.log("Plugin startup: Auth storage stats:", authStorageStats);

		// Final verification
		if (this.authService.isAuthenticated()) {
			const cacheValid = await this.authService.verifyCacheIntegrity();
			if (cacheValid) {
				console.log("Plugin startup: ✅ Authentication cache is valid");
			} else {
				console.warn(
					"Plugin startup: ⚠️ Authentication cache integrity check failed"
				);
			}
		}

		// Listen for auth status changes
		this.authService.onAuthStatusChange(async (status) => {
			console.log("Auth status changed:", status);

			// Force save settings when auth status changes (important for dev mode)
			if (status === "authenticated") {
				console.log(
					"Auth status: Forcing settings save for persistence..."
				);
				await this.updateUserInfoInSettings();
				await this.forceSaveAllData();
			}

			// Give a small delay to ensure all updates are complete
			setTimeout(() => {
				this.refreshSettingsPage();
			}, 100);
		});

		this.apiService = new ApiService(this.authService);
		this.addChild(this.apiService);

		// Register OAuth callback handler
		this.registerOAuthCallbackHandler();

		// Initialize core components
		this.dataManager = new DataManager(this.app.vault, this.settings);
		this.addChild(this.dataManager);

		// this.timeTracker = new TimeTracker(
		// 	this.app,
		// 	this.app.workspace,
		// 	this.settings
		// );
		// this.addChild(this.timeTracker);

		// Set up status bar
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarManager = new StatusBarManager(
			this.statusBarEl,
			this.settings
		);
		this.addChild(this.statusBarManager);

		// Initialize commands manager
		this.commandManager = new UsageStatsCommandManager(this);
		this.commandManager.registerCommands();

		// Add debug command to check auth status
		this.addCommand({
			id: "check-auth-status",
			name: "Check Authentication Status",
			callback: async () => {
				console.log("[UsageStats] === Authentication Status Check ===");

				// Check plugin settings
				console.log("Plugin settings auth status:", {
					isAuthenticated: this.settings.isAuthenticated,
					userEmail: this.settings.userEmail,
					userNickname: this.settings.userNickname,
				});

				// Check AuthService status
				console.log("AuthService status:", {
					isAuthenticated: this.authService.isAuthenticated(),
					userInfo: this.authService.getUserInfo(),
				});

				// Check stored data
				const allData = await this.loadData();
				console.log("Stored data keys:", Object.keys(allData || {}));
				console.log("AuthStorage exists:", !!allData?.authStorage);

				if (allData?.authStorage) {
					console.log(
						"AuthStorage keys:",
						Object.keys(allData.authStorage)
					);
					console.log(
						"Has access token:",
						!!allData.authStorage.oauth_access_token
					);
					console.log(
						"Has refresh token:",
						!!allData.authStorage.oauth_refresh_token
					);
					console.log(
						"Has user info:",
						!!allData.authStorage.oauth_user_info
					);
				}

				// Verify cache integrity
				const cacheValid =
					await this.authService.verifyCacheIntegrity();
				console.log(
					"Cache integrity check:",
					cacheValid ? "✅ VALID" : "❌ INVALID"
				);
			},
		});

		// Add development mode cache recovery command
		this.addCommand({
			id: "dev-recover-auth-cache",
			name: "Dev: Recover Authentication Cache",
			callback: async () => {
				console.log("[UsageStats] === Development Cache Recovery ===");

				try {
					// Force reload auth from storage
					await this.authService.loadStoredAuth();

					// Update plugin settings
					await this.updateUserInfoInSettings();

					// Force save everything
					await this.forceSaveAllData();

					// Verify recovery
					const isAuth = this.authService.isAuthenticated();
					const userInfo = this.authService.getUserInfo();

					console.log("Recovery result:", {
						isAuthenticated: isAuth,
						userEmail: userInfo?.email || "none",
						hasUserInfo: !!userInfo,
					});

					if (isAuth) {
						new Notice(
							"✅ Authentication cache recovered successfully!"
						);
						// Refresh settings page
						this.refreshSettingsPage();
					} else {
						new Notice("❌ Failed to recover authentication cache");
					}
				} catch (error) {
					console.error("Cache recovery failed:", error);
					new Notice(
						"❌ Cache recovery failed - check console for details"
					);
				}
			},
		});

		// Add command to display complete token information
		this.addCommand({
			id: "debug-token-info",
			name: "Debug: Show Complete Token Information",
			callback: async () => {
				console.log("[UsageStats] === Complete Token Information ===");

				try {
					// Get token details from storage
					const tokenInfo = await this.authStorage.getTokenInfo();
					const storageStats =
						await this.authStorage.getStorageStats();

					if (tokenInfo) {
						console.log("🔑 Token Details:", {
							tokenType: tokenInfo.tokenType,
							scope: tokenInfo.scope,
							hasAccessToken: !!tokenInfo.accessToken,
							hasRefreshToken: !!tokenInfo.refreshToken,
							expiresAt: tokenInfo.expiresAt?.toISOString(),
							isExpired: tokenInfo.isExpired,
							accessTokenLength:
								tokenInfo.accessToken?.length || 0,
							refreshTokenLength:
								tokenInfo.refreshToken?.length || 0,
						});

						console.log("📊 Storage Stats:", storageStats);

						if (tokenInfo.originalResponse) {
							console.log("📄 Original Token Response:", {
								token_type:
									tokenInfo.originalResponse.token_type,
								scope: tokenInfo.originalResponse.scope,
								expires_in:
									tokenInfo.originalResponse.expires_in,
								received_at: new Date(
									tokenInfo.originalResponse.received_at
								).toISOString(),
							});
						}

						new Notice(
							`Token Type: ${tokenInfo.tokenType}, Scope: ${
								tokenInfo.scope
							}, Expires: ${tokenInfo.expiresAt?.toLocaleString()}`
						);
					} else {
						console.log("❌ No token information found");
						new Notice("❌ No token information found");
					}
				} catch (error) {
					console.error("Failed to get token info:", error);
					new Notice("❌ Failed to get token info - check console");
				}
			},
		});

		// 注意：模拟token测试命令已删除，JSON存储功能已经稳定

		// Register view
		this.registerView(
			USAGE_STATS_VIEW_TYPE,
			(leaf) => new UsageStatsView(leaf, this.dataManager, this.settings)
		);

		// Add ribbon icon
		this.addRibbonIcon("clock", t("view.title"), () => {
			this.openUsageStatsView();
		});

		// Add settings tab
		this.addSettingTab(new UsageStatsSettingsTab(this.app, this));

		// Set up event listeners
		this.setupEventListeners();

		// Initialize view if enabled
		if (this.settings.enableView) {
			this.initializeView();
		}

		// Initialize sync settings
		this.updateSyncSettings();
	}

	onunload() {
		// Clean up sync interval
		this.stopAutoSync();

		// Clean up view
		this.app.workspace.detachLeavesOfType(USAGE_STATS_VIEW_TYPE);
		// console.log("Usage Statistics Plugin unloaded");
	}

	private setupEventListeners(): void {
		// Listen to status bar quick actions
		window.addEventListener("usage-stats-action", (event: CustomEvent) => {
			this.commandManager.handleStatusBarAction(event.detail.action);
		});

		// TODO: 重新实现TimeTracker时，恢复事件监听
		// this.timeTracker.addEventListener((event) => { ... });
	}

	// Settings management
	async loadSettings() {
		const savedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

		// If no language preference saved, use the i18n detected language
		if (!savedData?.language) {
			this.settings.language = i18n.getLocale();
		}

		// Ensure i18n uses the settings language
		i18n.setLocale(this.settings.language);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Force save all plugin data (useful in dev mode to ensure persistence)
	 */
	async forceSaveAllData(): Promise<void> {
		try {
			console.log("ForceSave: Saving all plugin data...");

			// Save plugin settings
			await this.saveSettings();

			// Get current data and verify it includes auth storage
			const currentData = await this.loadData();
			console.log(
				"ForceSave: Current data keys:",
				Object.keys(currentData || {})
			);
			console.log(
				"ForceSave: Has authStorage:",
				!!currentData?.authStorage
			);

			if (currentData?.authStorage) {
				console.log(
					"ForceSave: AuthStorage keys:",
					Object.keys(currentData.authStorage)
				);
			}

			// Force another save to ensure persistence
			await this.saveData(currentData);
			console.log("ForceSave: ✅ All data saved successfully");
		} catch (error) {
			console.error("ForceSave: ❌ Failed to save data:", error);
		}
	}

	getDefaultSettings(): UsageStatsSettings {
		return { ...DEFAULT_SETTINGS };
	}

	// View management
	updateViewVisibility(): void {
		if (this.settings.enableView) {
			this.initializeView();
		} else {
			this.app.workspace.detachLeavesOfType(USAGE_STATS_VIEW_TYPE);
		}
	}

	private initializeView(): void {
		const existingView = this.app.workspace.getLeavesOfType(
			USAGE_STATS_VIEW_TYPE
		);
		if (existingView.length === 0) {
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				leaf.setViewState({
					type: USAGE_STATS_VIEW_TYPE,
					active: true,
				});
			}
		}
	}

	private openUsageStatsView(): void {
		const { workspace } = this.app;

		const existingView = workspace.getLeavesOfType(USAGE_STATS_VIEW_TYPE);
		if (existingView.length > 0) {
			workspace.revealLeaf(existingView[0]);
			return;
		}

		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			leaf.setViewState({
				type: USAGE_STATS_VIEW_TYPE,
				active: true,
			});
			workspace.revealLeaf(leaf);
		}
	}

	public isTrackingActive(): boolean {
		// TODO: 重新实现TimeTracker时恢复
		return false; // this.timeTracker.isTracking();
	}

	public isTrackingPaused(): boolean {
		// TODO: 重新实现TimeTracker时恢复
		return false; // const state = this.timeTracker.getState(); return state.isPaused;
	}

	public getTrackingState(): TrackingState {
		// TODO: 重新实现TimeTracker时恢复
		return {
			isTracking: false,
			lastActiveTime: Date.now(),
			totalTodayTime: 0,
			isPaused: false,
		}; // this.timeTracker.getState();
	}

	public getCurrentSession(): TrackingSession | undefined {
		// TODO: 重新实现TimeTracker时恢复
		return undefined; // this.timeTracker.getCurrentSession();
	}

	// Data access methods
	public getTodayStats(): DailyStats {
		return this.dataManager.getTodayStats();
	}

	public async forceSaveData(): Promise<void> {
		await this.dataManager.saveData();
	}

	public async resetTodayData(): Promise<void> {
		// TODO: 实现重置今日数据功能
		new Notice("Reset today data feature not yet implemented");
	}

	public async resetAllData(): Promise<void> {
		// TODO: 实现重置所有数据功能
		// await this.dataManager.resetAllData();
		// 同时清除认证数据
		await this.authStorage.clearAuthData();
		new Notice("Authentication data has been reset");
	}

	public async cleanupOldData(): Promise<void> {
		await this.dataManager.cleanupOldData();
	}

	public showExportModal(): void {
		new Notice("Export modal feature not yet implemented");
	}

	public getDataFilePath(): string {
		return "/.obsidian/plugins/obsidian-usage-stats/tracked_data.json";
	}

	public updateDataManagerSettings(): void {
		this.dataManager.updateSettings(this.settings);
	}

	public updateStatusBarVisibility(): void {
		this.statusBarManager.updateSettings(this.settings);
	}

	public updateStatusBarSettings(): void {
		this.statusBarManager.updateSettings(this.settings);
	}

	public updateViewSettings(): void {
		// Update all open views with new settings
		const views = this.app.workspace.getLeavesOfType(USAGE_STATS_VIEW_TYPE);
		views.forEach((leaf) => {
			const view = leaf.view as UsageStatsView;
			if (view.updateSettings) {
				view.updateSettings(this.settings);
			}
		});
	}

	// Language management
	public setLanguage(language: string): void {
		i18n.setLocale(language);
		// Update all UI components to reflect language change
		this.updateStatusBarSettings();
		this.updateViewSettings();
	}

	// OAuth callback handling
	private registerOAuthCallbackHandler(): void {
		// Test if the protocol handler registration works
		try {
			// Register protocol handler for obsidian://oauth/callback URLs
			this.registerObsidianProtocolHandler(
				"oauth/callback",
				async (params) => {
					console.log(
						"[UsageStats] Protocol handler triggered with params:",
						params
					);
					const action = params.action || "";

					// Check if this is an OAuth callback
					if (action === "oauth/callback") {
						const code = params.code;
						const state = params.state;

						console.log(
							"[UsageStats] Processing OAuth callback - state:",
							state,
							"code:",
							code
						);

						if (code) {
							try {
								await this.handleOAuthCallback(code, state);
							} catch (error) {
								console.error(
									"OAuth callback handling failed:",
									error
								);
								new Notice(t("auth.callbackFailed"));
							}
						} else {
							console.error(
								"OAuth callback missing authorization code"
							);
							new Notice(t("auth.callbackMissingCode"));
						}
					} else {
						console.warn(
							"[UsageStats] Unknown OAuth action or missing callback flag:",
							"action:",
							action,
							"Expected action='oauth/callback'"
						);
					}
				}
			);
		} catch (error) {
			console.error(
				"[UsageStats] Failed to register OAuth protocol handler:",
				error
			);
		}
	}

	async handleOAuthCallback(code: string, state?: string): Promise<void> {
		try {
			// Handle the OAuth callback through AuthService
			await this.authService.handleCallback(code, state);

			// Update plugin settings with user info
			await this.updateUserInfoInSettings();

			// Auto-start sync if it's enabled
			if (this.settings.enableSyncToCloud && this.settings.autoSync) {
				this.updateSyncSettings();
			}

			// Verify cache integrity after authentication
			console.log(
				"Main plugin: Verifying authentication cache after OAuth..."
			);
			const cacheValid = await this.authService.verifyCacheIntegrity();
			if (!cacheValid) {
				console.error(
					"Main plugin: ⚠️ Authentication cache verification failed!"
				);
			}

			// Force save all data to ensure persistence in dev mode
			await this.forceSaveAllData();

			// Try to sync current data immediately after authentication
			try {
				if (this.settings.enableSyncToCloud) {
					await this.syncNow();
					new Notice(t("auth.loginAndSyncSuccess"));
				} else {
					new Notice(t("auth.loginSuccess"));
				}
			} catch (syncError) {
				console.warn("Initial sync after login failed:", syncError);
				new Notice(t("auth.loginSuccess"));
			}

			// Refresh settings page if open
			this.refreshSettingsPage();

			// Force a status notification to trigger UI updates
			setTimeout(() => {
				console.log(
					"Force triggering auth status update for UI refresh"
				);
				this.refreshSettingsPage();

				// Dispatch a custom event to notify about auth status change
				window.dispatchEvent(
					new CustomEvent("obsidian-usage-stats-auth-changed", {
						detail: {
							isAuthenticated: true,
							userInfo: this.authService.getUserInfo(),
						},
					})
				);
			}, 200);

			console.log("OAuth callback handled successfully");
		} catch (error) {
			console.error("OAuth callback failed:", error);
			throw error;
		}
	}

	private refreshSettingsPage(): void {
		// Refresh the settings page if it's currently open

		// Try to find and refresh the settings tab directly
		try {
			const settingsModal = (this.app as any).setting;
			if (
				settingsModal &&
				settingsModal.containerEl &&
				settingsModal.containerEl.style.display !== "none"
			) {
				// Settings modal is open, try to find our plugin's tab
				const pluginTabs = settingsModal.pluginTabs;
				if (pluginTabs && pluginTabs[this.manifest.id]) {
					const ourTab = pluginTabs[this.manifest.id];
					if (ourTab instanceof UsageStatsSettingsTab) {
						console.log(
							"Found and refreshing active settings page"
						);
						ourTab.display();
						return;
					}
				}
			}
		} catch (error) {
			console.warn("Could not directly refresh settings page:", error);
		}

		console.log("Settings will be updated when settings page is reopened");
	}

	// Authentication methods
	public isAuthenticated(): boolean {
		return this.authService.isAuthenticated();
	}

	public getUserInfo(): OAuthUserInfo | null {
		return this.authService.getUserInfo();
	}

	// 公共方法：获取 AuthService 实例
	public getAuthService() {
		return this.authService;
	}

	// 公共方法：获取 AuthStorage 实例
	public getAuthStorage() {
		return this.authStorage;
	}

	// 公共方法：更新设置中的用户信息
	public async updateUserInfoInSettings(): Promise<void> {
		const userInfo = this.authService.getUserInfo();
		const isAuth = this.authService.isAuthenticated();

		console.log("Updating user info in settings:", {
			userInfo,
			isAuthenticated: isAuth,
		});

		if (userInfo && isAuth) {
			this.settings.isAuthenticated = true;
			this.settings.userEmail = userInfo.email;
			this.settings.userNickname = userInfo.nickname || userInfo.email;

			await this.saveSettings();

			console.log("User info updated in settings:", {
				email: userInfo.email,
				nickname: userInfo.nickname || userInfo.email,
				settingsUpdated: true,
			});
		} else {
			console.warn(
				"Failed to update user info - missing userInfo or not authenticated"
			);
		}
	}

	public async startAuthentication(): Promise<void> {
		return this.authService.startAuthorization();
	}

	public async logout(): Promise<void> {
		await this.authService.logout();
		// Update settings to reflect logout
		this.settings.isAuthenticated = false;
		this.settings.userEmail = undefined;
		this.settings.userNickname = undefined;
		await this.saveSettings();
	}

	public async testConnection(): Promise<boolean> {
		return this.apiService.testConnection();
	}

	// Sync methods
	public updateSyncSettings(): void {
		// Update sync settings and restart sync interval if needed
		if (this.settings.enableSyncToCloud && this.settings.autoSync) {
			this.startAutoSync();
		} else {
			this.stopAutoSync();
		}
	}

	private syncIntervalId?: number;

	private startAutoSync(): void {
		if (this.syncIntervalId) {
			clearInterval(this.syncIntervalId);
		}

		const intervalMs = this.settings.syncInterval * 60 * 1000; // Convert minutes to milliseconds
		this.syncIntervalId = window.setInterval(async () => {
			try {
				await this.syncNow();
			} catch (error) {
				console.error("Auto sync failed:", error);
			}
		}, intervalMs);
	}

	private stopAutoSync(): void {
		if (this.syncIntervalId) {
			clearInterval(this.syncIntervalId);
			this.syncIntervalId = undefined;
		}
	}

	public isSyncInProgress(): boolean {
		return this.apiService.isSyncInProgress();
	}

	public async syncNow(): Promise<SyncResult> {
		if (!this.isAuthenticated()) {
			throw new Error("Authentication required");
		}

		const todayStats = this.getTodayStats();
		const allEntries = await this.dataManager.getAllEntries();

		const payload: UsageDataPayload = {
			entries: allEntries,
			dailyStats: [todayStats],
			lastSyncTime: this.settings.lastSyncTime,
			pluginVersion: "1.0.0",
		};

		const result = await this.apiService.syncUsageData(payload);

		if (result.success) {
			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();
		}

		return result;
	}
}
