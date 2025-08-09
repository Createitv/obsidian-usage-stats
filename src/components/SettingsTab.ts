import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { ChartType, TimeFormat } from "../core/types";
import { t } from "../i18n/i18n";
import UsageStatsPlugin from "../main";

export class UsageStatsSettingsTab extends PluginSettingTab {
	plugin: UsageStatsPlugin;

	constructor(app: App, plugin: UsageStatsPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		// Listen for auth status changes
		window.addEventListener("obsidian-usage-stats-auth-changed", () => {
			console.log(
				"Settings tab: Received auth change event, refreshing display"
			);
			this.display();
		});
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Page title
		containerEl.createEl("h1", { text: t("settings.title") });

		// General Settings Section
		this.renderGeneralSettings(containerEl);

		// Tracking Settings Section
		this.renderTrackingSettings(containerEl);

		// Display Settings Section
		this.renderDisplaySettings(containerEl);

		// Data & Privacy Settings Section
		this.renderDataSettings(containerEl);

		// Advanced Settings Section
		this.renderAdvancedSettings(containerEl);
	}

	private renderGeneralSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: t("settings.general") });

		// Enable tracking
		new Setting(containerEl)
			.setName(t("settings.enableTracking"))
			.setDesc(t("settings.enableTracking.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableTracking)
					.onChange(async (value) => {
						this.plugin.settings.enableTracking = value;
						await this.plugin.saveSettings();
						this.plugin.updateTracking();
					})
			);

		// Language selection
		new Setting(containerEl)
			.setName(t("settings.language"))
			.setDesc(t("settings.language.desc"))
			.addDropdown((dropdown) =>
				dropdown
					.addOption("en", t("language.en"))
					.addOption("zh", t("language.zh"))
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value;
						await this.plugin.saveSettings();
						// Immediately apply language change
						this.plugin.setLanguage(value);
						new Notice(t("notification.settingsSaved"));
						// Refresh the settings page to show new language
						this.display();
					})
			);

		// Enable view
		new Setting(containerEl)
			.setName(t("settings.enableView"))
			.setDesc(t("settings.enableView.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableView)
					.onChange(async (value) => {
						this.plugin.settings.enableView = value;
						await this.plugin.saveSettings();
						this.plugin.updateViewVisibility();
					})
			);
	}

	private renderTrackingSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: t("settings.tracking") });

		// Idle threshold
		new Setting(containerEl)
			.setName(t("settings.idleThreshold"))
			.setDesc(t("settings.idleThreshold.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(60, 1800, 30) // 1 minute to 30 minutes
					.setValue(this.plugin.settings.idleThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.idleThreshold = value;
						await this.plugin.saveSettings();
						this.plugin.updateTrackerSettings();
					})
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.idleThreshold.toString())
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (
							!isNaN(numValue) &&
							numValue >= 60 &&
							numValue <= 1800
						) {
							this.plugin.settings.idleThreshold = numValue;
							await this.plugin.saveSettings();
							this.plugin.updateTrackerSettings();
						}
					})
			);

		// Track inactive time
		new Setting(containerEl)
			.setName(t("settings.trackInactiveTime"))
			.setDesc(t("settings.trackInactiveTime.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.trackInactiveTime)
					.onChange(async (value) => {
						this.plugin.settings.trackInactiveTime = value;
						await this.plugin.saveSettings();
						this.plugin.updateTrackerSettings();
					})
			);

		// Auto-save interval
		new Setting(containerEl)
			.setName(t("settings.autoSaveInterval"))
			.setDesc(t("settings.autoSaveInterval.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(10, 300, 10) // 10 seconds to 5 minutes
					.setValue(this.plugin.settings.autoSaveInterval)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.autoSaveInterval = value;
						await this.plugin.saveSettings();
						this.plugin.updateDataManagerSettings();
					})
			);

		// Enable tag tracking
		new Setting(containerEl)
			.setName(t("settings.enableTagTracking"))
			.setDesc(t("settings.enableTagTracking.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableTagTracking)
					.onChange(async (value) => {
						this.plugin.settings.enableTagTracking = value;
						await this.plugin.saveSettings();
						this.plugin.updateTrackerSettings();
					})
			);

		// Enable folder tracking
		new Setting(containerEl)
			.setName(t("settings.enableFolderTracking"))
			.setDesc(t("settings.enableFolderTracking.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableFolderTracking)
					.onChange(async (value) => {
						this.plugin.settings.enableFolderTracking = value;
						await this.plugin.saveSettings();
						this.plugin.updateTrackerSettings();
					})
			);

		// Tracked folders
		new Setting(containerEl)
			.setName(t("settings.trackedFolders"))
			.setDesc(t("settings.trackedFolders.desc"))
			.addTextArea((text) =>
				text
					.setPlaceholder("folder1\nfolder2/subfolder\nfolder3")
					.setValue(this.plugin.settings.trackedFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.trackedFolders = value
							.split("\n")
							.map((f) => f.trim())
							.filter((f) => f.length > 0);
						await this.plugin.saveSettings();
						this.plugin.updateTrackerSettings();
					})
			);

		// Excluded folders
		new Setting(containerEl)
			.setName(t("settings.excludedFolders"))
			.setDesc(t("settings.excludedFolders.desc"))
			.addTextArea((text) =>
				text
					.setPlaceholder(".trash\n.obsidian\ntemplates")
					.setValue(this.plugin.settings.excludedFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value
							.split("\n")
							.map((f) => f.trim())
							.filter((f) => f.length > 0);
						await this.plugin.saveSettings();
						this.plugin.updateTrackerSettings();
					})
			);
	}

	private renderDisplaySettings(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: t("settings.display") });

		// Show status bar
		new Setting(containerEl)
			.setName(t("settings.showStatusBar"))
			.setDesc(t("settings.showStatusBar.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showStatusBar)
					.onChange(async (value) => {
						this.plugin.settings.showStatusBar = value;
						await this.plugin.saveSettings();
						this.plugin.updateStatusBarVisibility();
					})
			);

		// Status bar format
		new Setting(containerEl)
			.setName(t("settings.statusBarFormat"))
			.setDesc(t("settings.statusBarFormat.desc"))
			.addText((text) =>
				text
					.setPlaceholder("{{time}} - {{category}}")
					.setValue(this.plugin.settings.statusBarFormat)
					.onChange(async (value) => {
						this.plugin.settings.statusBarFormat = value;
						await this.plugin.saveSettings();
						this.plugin.updateStatusBarSettings();
					})
			);

		// Default chart type
		new Setting(containerEl)
			.setName(t("settings.defaultChartType"))
			.setDesc(t("settings.defaultChartType.desc"))
			.addDropdown((dropdown) => {
				const chartTypes: ChartType[] = [
					"pie",
					"doughnut",
					"bar",
					"line",
				];
				chartTypes.forEach((type) => {
					dropdown.addOption(type, t(`chartType.${type}`));
				});

				return dropdown
					.setValue(this.plugin.settings.defaultChartType)
					.onChange(async (value) => {
						this.plugin.settings.defaultChartType =
							value as ChartType;
						await this.plugin.saveSettings();
						this.plugin.updateViewSettings();
					});
			});

		// Time format
		new Setting(containerEl)
			.setName(t("settings.timeFormat"))
			.setDesc(t("settings.timeFormat.desc"))
			.addDropdown((dropdown) =>
				dropdown
					.addOption("12h", t("timeFormat.12h"))
					.addOption("24h", t("timeFormat.24h"))
					.setValue(this.plugin.settings.timeFormat)
					.onChange(async (value) => {
						this.plugin.settings.timeFormat = value as TimeFormat;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderDataSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: t("settings.data") });

		// Data retention
		new Setting(containerEl)
			.setName(t("settings.dataRetentionDays"))
			.setDesc(t("settings.dataRetentionDays.desc"))
			.addSlider((slider) =>
				slider
					.setLimits(0, 1095, 30) // 0 days to 3 years
					.setValue(this.plugin.settings.dataRetentionDays)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.dataRetentionDays = value;
						await this.plugin.saveSettings();
						this.plugin.updateDataManagerSettings();
					})
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.dataRetentionDays.toString())
					.onChange(async (value) => {
						const numValue = parseInt(value);
						if (
							!isNaN(numValue) &&
							numValue >= 0 &&
							numValue <= 1095
						) {
							this.plugin.settings.dataRetentionDays = numValue;
							await this.plugin.saveSettings();
							this.plugin.updateDataManagerSettings();
						}
					})
			);

		// Enable data export
		new Setting(containerEl)
			.setName(t("settings.enableDataExport"))
			.setDesc(t("settings.enableDataExport.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableDataExport)
					.onChange(async (value) => {
						this.plugin.settings.enableDataExport = value;
						await this.plugin.saveSettings();
					})
			);

		// Auto backup
		new Setting(containerEl)
			.setName(t("settings.autoBackup"))
			.setDesc(t("settings.autoBackup.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoBackup)
					.onChange(async (value) => {
						this.plugin.settings.autoBackup = value;
						await this.plugin.saveSettings();
						this.plugin.updateDataManagerSettings();
					})
			);

		// Cloud sync section header
		containerEl.createEl("h3", { text: t("sync.cloudSync") });

		// User authentication status
		this.renderAuthSection(containerEl);

		// Cloud sync toggle
		new Setting(containerEl)
			.setName(t("sync.enableSync"))
			.setDesc(t("sync.enableSync.desc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableSyncToCloud)
					.setDisabled(!this.plugin.isAuthenticated())
					.onChange(async (value) => {
						this.plugin.settings.enableSyncToCloud = value;
						await this.plugin.saveSettings();
						this.plugin.updateSyncSettings();
					})
			);

		// Auto sync settings (only if sync is enabled)
		if (this.plugin.settings.enableSyncToCloud) {
			new Setting(containerEl)
				.setName(t("sync.autoSync"))
				.setDesc(t("sync.autoSync.desc"))
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.autoSync)
						.onChange(async (value) => {
							this.plugin.settings.autoSync = value;
							await this.plugin.saveSettings();
							this.plugin.updateSyncSettings();
						})
				);

			// Sync interval
			new Setting(containerEl)
				.setName(t("sync.syncInterval"))
				.setDesc(t("sync.syncInterval.desc"))
				.addSlider((slider) =>
					slider
						.setLimits(15, 1440, 15) // 15 minutes to 24 hours
						.setValue(this.plugin.settings.syncInterval)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.syncInterval = value;
							await this.plugin.saveSettings();
							this.plugin.updateSyncSettings();
						})
				);

			// Manual sync button
			new Setting(containerEl)
				.setName(t("sync.syncNow"))
				.setDesc(t("sync.syncNow.desc"))
				.addButton((button) =>
					button
						.setButtonText(t("sync.syncNow"))
						.setDisabled(this.plugin.isSyncInProgress())
						.onClick(async () => {
							button.setDisabled(true);
							button.setButtonText(t("sync.syncInProgress"));
							try {
								await this.plugin.syncNow();
								new Notice(t("sync.syncComplete"));
							} catch (error) {
								new Notice(
									t("sync.syncError", {
										error: error.message,
									})
								);
							} finally {
								button.setDisabled(false);
								button.setButtonText(t("sync.syncNow"));
							}
						})
				);

			// Last sync time display
			if (this.plugin.settings.lastSyncTime > 0) {
				const lastSyncDate = new Date(
					this.plugin.settings.lastSyncTime
				);
				const lastSyncText = lastSyncDate.toLocaleString();

				new Setting(containerEl)
					.setName(t("sync.lastSync"))
					.setDesc(lastSyncText)
					.addButton((button) =>
						button
							.setButtonText(t("action.refresh"))
							.onClick(() => {
								this.display(); // Refresh the settings page
							})
					);
			}
		}
	}

	private renderAdvancedSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h2", { text: t("settings.advanced") });

		// Data cleanup button
		new Setting(containerEl)
			.setName(t("settings.cleanupOldData"))
			.setDesc(t("settings.cleanupOldData.desc"))
			.addButton((button) =>
				button
					.setButtonText(t("settings.cleanupOldData.button"))
					.onClick(async () => {
						await this.plugin.cleanupOldData();
						new Notice(t("notification.dataCleanedUp"));
					})
			);

		// Export data button
		if (this.plugin.settings.enableDataExport) {
			new Setting(containerEl)
				.setName(t("settings.exportAllData"))
				.setDesc(t("settings.exportAllData.desc"))
				.addButton((button) =>
					button.setButtonText(t("action.export")).onClick(() => {
						this.plugin.showExportModal();
					})
				);
		}

		// Reset data button
		new Setting(containerEl)
			.setName(t("settings.resetData"))
			.setDesc(t("settings.resetData.desc"))
			.addButton((button) =>
				button
					.setButtonText(t("settings.resetData.button"))
					.setWarning()
					.onClick(async () => {
						// Show confirmation dialog
						const confirmed = confirm(
							t("settings.resetData.confirm")
						);
						if (confirmed) {
							await this.plugin.resetAllData();
							new Notice(t("notification.dataReset"));
						}
					})
			);

		// Reset settings button
		new Setting(containerEl)
			.setName(t("settings.resetAllSettings"))
			.setDesc(t("settings.resetAllSettings.desc"))
			.addButton((button) =>
				button
					.setButtonText(t("action.reset"))
					.setWarning()
					.onClick(async () => {
						const confirmed = confirm(
							t("settings.resetAllSettings.confirm")
						);
						if (confirmed) {
							this.plugin.settings =
								this.plugin.getDefaultSettings();
							await this.plugin.saveSettings();
							this.display();
							new Notice(t("notification.settingsSaved"));
						}
					})
			);

		// Debug section
		const debugSection = containerEl.createEl("details");
		debugSection.createEl("summary", { text: t("debug.title") });

		const debugContent = debugSection.createEl("div");
		debugContent.createEl("p", {
			text: `${t("debug.pluginVersion")}: 1.0.0`,
		});
		debugContent.createEl("p", {
			text: `${t(
				"debug.settingsFile"
			)}: ${this.plugin.getDataFilePath()}`,
		});
		debugContent.createEl("p", {
			text: `${t("debug.currentLanguage")}: ${
				this.plugin.settings.language
			}`,
		});
		debugContent.createEl("p", {
			text: `${t(
				"debug.trackingActive"
			)}: ${this.plugin.isTrackingActive()}`,
		});

		// Show current statistics
		const todayStats = this.plugin.getTodayStats();
		debugContent.createEl("p", {
			text: `${t("debug.todaySessions")}: ${todayStats.entries.length}`,
		});
		debugContent.createEl("p", {
			text: `${t("debug.todayTotalTime")}: ${this.formatDebugTime(
				todayStats.totalTime
			)}`,
		});
	}

	private renderAuthSection(containerEl: HTMLElement): void {
		const authContainer = containerEl.createDiv("auth-section");

		console.log(
			"Rendering auth section - isAuthenticated:",
			this.plugin.isAuthenticated()
		);
		console.log(
			"Rendering auth section - userInfo:",
			this.plugin.getUserInfo()
		);

		if (this.plugin.isAuthenticated()) {
			// User is logged in
			const userInfo = this.plugin.getUserInfo();

			authContainer.createEl("div", {
				cls: "auth-status auth-status-authenticated",
				text: t("auth.loginSuccess"),
			});

			// User profile info
			if (userInfo) {
				const profileContainer =
					authContainer.createDiv("user-profile");

				profileContainer.createEl("div", {
					cls: "user-info",
					text: `${t("user.email")}: ${userInfo.email}`,
				});

				if (userInfo.nickname) {
					profileContainer.createEl("div", {
						cls: "user-info",
						text: `${t("user.nickname")}: ${userInfo.nickname}`,
					});
				}

				console.log("User profile info rendered successfully");
			} else {
				console.warn("User is authenticated but userInfo is null");
				authContainer.createEl("div", {
					cls: "auth-status auth-status-warning",
					text: "认证成功但无法获取用户信息，请重新登录",
				});
			}

			// Logout button
			new Setting(authContainer)
				.setName(t("auth.logout"))
				.setDesc(t("auth.logoutDescription"))
				.addButton((button) =>
					button
						.setButtonText(t("auth.logout"))
						.setWarning()
						.onClick(async () => {
							const confirmed = confirm(t("auth.logoutConfirm"));
							if (confirmed) {
								await this.plugin.logout();
								this.display(); // Refresh settings page
							}
						})
				);

			// Connection test button
			new Setting(authContainer)
				.setName(t("auth.connectionTest"))
				.setDesc(t("auth.connectionTestDescription"))
				.addButton((button) =>
					button
						.setButtonText(t("auth.connectionTest"))
						.onClick(async () => {
							button.setDisabled(true);
							button.setButtonText(t("action.testing"));
							try {
								const success =
									await this.plugin.testConnection();
								if (success) {
									new Notice(t("auth.connectionTestSuccess"));
								} else {
									new Notice(t("auth.connectionTestFailed"));
								}
							} catch (error) {
								new Notice(t("auth.connectionTestFailed"));
							} finally {
								button.setDisabled(false);
								button.setButtonText(t("auth.connectionTest"));
							}
						})
				);
		} else {
			// User is not logged in
			authContainer.createEl("div", {
				cls: "auth-status auth-status-not-authenticated",
				text: t("user.notLoggedIn"),
			});

			authContainer.createEl("p", {
				cls: "auth-description",
				text: t("auth.loginDescription"),
			});

			// Login button
			new Setting(authContainer)
				.setName(t("auth.login"))
				.setDesc(t("auth.loginDescription"))
				.addButton((button) =>
					button
						.setButtonText(t("auth.login"))
						.setCta()
						.onClick(async () => {
							button.setDisabled(true);
							button.setButtonText(t("action.connecting"));
							try {
								await this.plugin.startAuthentication();
							} catch (error) {
								new Notice(t("auth.authorizationFailed"));
							} finally {
								button.setDisabled(false);
								button.setButtonText(t("auth.login"));
							}
						})
				);
		}
	}

	private formatDebugTime(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}
}
