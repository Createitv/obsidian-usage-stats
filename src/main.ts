import "@style/styles";
import { Plugin, Notice } from "obsidian";
import { UsageStatsCommandManager } from "./commands/CommandManager";
import { USAGE_STATS_VIEW_TYPE, UsageStatsView } from "./components/PluginView";
import { UsageStatsSettingsTab } from "./components/SettingsTab";
import {
	DEFAULT_SETTINGS,
	UsageStatsSettings,
	TrackingState,
	DailyStats,
	TrackingSession,
} from "./core/types";
import { TimeTracker } from "./core/TimeTracker";
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

export default class UsageStatsPlugin extends Plugin {
	settings: UsageStatsSettings;
	private commandManager: UsageStatsCommandManager;
	private timeTracker: TimeTracker;
	private dataManager: DataManager;
	private statusBarManager: StatusBarManager;
	private statusBarEl: HTMLElement;
	private authService: AuthService;
	private apiService: ApiService;
	private devSaveTimer?: NodeJS.Timeout;

	async onload() {
		await this.loadSettings();

		// Initialize auth and API services with enhanced storage adapter
		const storageAdapter = {
			getItem: async (key: string) => {
				try {
					const authData = await this.loadData();
					const value = authData?.authStorage?.[key] || null;
					return value;
				} catch (error) {
					console.error(
						`StorageAdapter: Failed to get ${key}:`,
						error
					);
					return null;
				}
			},
			setItem: async (key: string, value: string) => {
				try {
					const currentData = (await this.loadData()) || {};
					if (!currentData.authStorage) {
						currentData.authStorage = {};
					}
					currentData.authStorage[key] = value;
					await this.saveData(currentData);

					// Verify the data was saved
					const savedData = await this.loadData();
					const verified = savedData?.authStorage?.[key] === value;
					console.log(
						`StorageAdapter: Set ${key}:`,
						verified ? "✅" : "❌"
					);

					if (!verified) {
						console.error(
							`StorageAdapter: Failed to verify ${key} was saved`
						);
					}
				} catch (error) {
					console.error(
						`StorageAdapter: Failed to set ${key}:`,
						error
					);
				}
			},
			removeItem: async (key: string) => {
				try {
					const currentData = (await this.loadData()) || {};
					if (currentData.authStorage) {
						delete currentData.authStorage[key];
						await this.saveData(currentData);
						console.log(`StorageAdapter: Removed ${key}`);
					}
				} catch (error) {
					console.error(
						`StorageAdapter: Failed to remove ${key}:`,
						error
					);
				}
			},
		};

		this.authService = new AuthService(storageAdapter);
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

		// Check if we have any stored auth data
		const storedData = await this.loadData();
		const hasStoredAuth = !!storedData?.authStorage?.oauth_access_token;
		console.log("Plugin startup: Has stored auth data:", hasStoredAuth);

		// If we have stored auth but AuthService doesn't know about it, attempt recovery
		if (hasStoredAuth && !isAuthServiceAuth) {
			console.log("Plugin startup: 🔄 Attempting auth state recovery...");

			try {
				// Force AuthService to reload stored auth
				await this.authService.loadStoredAuth();
				const recoveredAuth = this.authService.isAuthenticated();

				if (recoveredAuth) {
					console.log(
						"Plugin startup: ✅ Auth state recovered successfully!"
					);
				} else {
					console.warn(
						"Plugin startup: ❌ Auth state recovery failed"
					);
				}
			} catch (error) {
				console.error("Plugin startup: Auth recovery error:", error);
			}
		}

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

		this.timeTracker = new TimeTracker(
			this.app,
			this.app.workspace,
			this.settings
		);
		this.addChild(this.timeTracker);

		// Set up status bar
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarManager = new StatusBarManager(
			this.statusBarEl,
			this.settings
		);
		this.addChild(this.statusBarManager);

		// Initialize command manager
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

		// Clean up dev auto-save
		this.stopDevAutoSave();

		// Clean up view
		this.app.workspace.detachLeavesOfType(USAGE_STATS_VIEW_TYPE);
		// console.log("Usage Statistics Plugin unloaded");
	}

	private setupEventListeners(): void {
		// Listen to tracking events from TimeTracker
		this.timeTracker.addEventListener((event) => {
			switch (event.type) {
				case "start":
				case "stop":
				case "pause":
				case "resume":
				case "active":
				case "idle":
					this.statusBarManager.updateTrackingState(
						this.timeTracker.getState()
					);
					break;
				case "file_change":
					if (event.data?.entry) {
						this.dataManager.addTimeEntry(event.data.entry);
					}
					this.statusBarManager.updateTrackingState(
						this.timeTracker.getState()
					);
					break;
			}
		});

		// Listen to status bar quick actions
		window.addEventListener("usage-stats-action", (event: CustomEvent) => {
			this.commandManager.handleStatusBarAction(event.detail.action);
		});
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

	// Tracking control methods
	public startTracking(): void {
		this.timeTracker.startTracking();
	}

	public stopTracking(): void {
		this.timeTracker.stopTracking();
	}

	public pauseTracking(): void {
		this.timeTracker.pauseTracking();
	}

	public resumeTracking(): void {
		this.timeTracker.resumeTracking();
	}

	public isTrackingActive(): boolean {
		return this.timeTracker.isTracking();
	}

	public isTrackingPaused(): boolean {
		const state = this.timeTracker.getState();
		return state.isPaused;
	}

	public getTrackingState(): TrackingState {
		return this.timeTracker.getState();
	}

	public getCurrentSession(): TrackingSession | undefined {
		return this.timeTracker.getCurrentSession();
	}

	// Data access methods
	public getTodayStats(): DailyStats {
		return this.dataManager.getTodayStats();
	}

	public async forceSaveData(): Promise<void> {
		await this.dataManager.saveData();
	}

	public async resetTodayData(): Promise<void> {
		// Implementation would reset today's data
		new Notice("Reset today data feature not yet implemented");
	}

	public async resetAllData(): Promise<void> {
		// Implementation would reset all data
		new Notice("Reset all data feature not yet implemented");
	}

	public async cleanupOldData(): Promise<void> {
		await this.dataManager.cleanupOldData();
	}

	public showExportModal(): void {
		new Notice("Export modal feature not yet implemented");
	}

	public getDataFilePath(): string {
		return "/.obsidian/plugins/obsidian-usage-stats/data.json";
	}

	// Settings update methods
	public updateTracking(): void {
		this.timeTracker.updateSettings(this.settings);
		if (this.settings.enableTracking) {
			this.timeTracker.startTracking();
		} else {
			this.timeTracker.stopTracking();
		}
	}

	public updateTrackerSettings(): void {
		this.timeTracker.updateSettings(this.settings);
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

	private async updateUserInfoInSettings(): Promise<void> {
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

	private refreshSettingsPage(): void {
		// Refresh the settings page if it's currently open
		console.log("Attempting to refresh settings page...");

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

	private stopDevAutoSave(): void {
		if (this.devSaveTimer) {
			clearInterval(this.devSaveTimer);
			this.devSaveTimer = undefined;
			console.log("Dev auto-save: Stopped");
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
