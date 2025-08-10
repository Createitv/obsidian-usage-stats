import '@style/styles'
import { Plugin, Notice } from 'obsidian'
import { UsageStatsCommandManager } from './commands/CommandManager'
import { USAGE_STATS_VIEW_TYPE, UsageStatsView } from './components/PluginView'
import { UsageStatsSettingsTab } from './components/SettingsTab'
import {
	DEFAULT_SETTINGS,
	UsageStatsSettings,
	DailyStats,
	TrackingState,
	TrackingSession,
} from './core/types'
// import { TimeTracker } from "./core/TimeTracker";
import { StatusBarManager } from './ui/StatusBarManager'
import { t, i18n } from './i18n/i18n'
import {
	AuthService,
	ApiService,
	SyncResult,
	UsageDataPayload,
	OAuthUserInfo,
} from './api'
import { AuthStorage } from './storage/AuthStorage'
import { DataManager } from './storage/DataManager'
import { FileTrackerManager } from './storage/FileTrackerManager'
import { PingResponse } from './api/types'
import { TimeTracker } from './core/TimeTracker'

export default class UsageStatsPlugin extends Plugin {
	settings: UsageStatsSettings
	private commandManager: UsageStatsCommandManager
	private timeTracker: TimeTracker
	private dataManager: DataManager
	private fileTrackerManager: FileTrackerManager
	private statusBarManager: StatusBarManager
	private statusBarEl: HTMLElement
	private authStorage: AuthStorage
	private authService: AuthService
	private apiService: ApiService

	async onload() {
		await this.loadSettings()

		// Initialize new AuthStorage system
		this.authStorage = new AuthStorage(this)

		// Initialize AuthService with new storage system only
		this.authService = new AuthService(this.authStorage)
		this.addChild(this.authService)
		await this.authService.onload() // 确保AuthService初始化完成

		// Verify cache integrity on startup and attempt recovery if needed
		// First check if AuthService thinks we're authenticated
		const isAuthServiceAuth = this.authService.isAuthenticated()

		// Final verification
		if (this.authService.isAuthenticated()) {
			const cacheValid = await this.authService.verifyCacheIntegrity()
			if (!cacheValid) {
				console.warn(
					'Plugin startup: ⚠️ Authentication cache integrity check failed'
				)
			}
		}

		// Listen for auth status changes
		this.authService.onAuthStatusChange(async (status) => {
			// Force save settings when auth status changes (important for dev mode)
			if (status === 'authenticated') {
				await this.updateUserInfoInSettings()
			}

			// Give a small delay to ensure all updates are complete
			setTimeout(() => {
				this.refreshSettingsPage()
			}, 100)
		})

		this.apiService = new ApiService(this.authService)
		this.addChild(this.apiService)

		// Register OAuth callback handler
		this.registerOAuthCallbackHandler()

		// Initialize core components
		this.dataManager = new DataManager(this.app.vault, this.settings)
		this.addChild(this.dataManager)

		// Initialize FileTrackerManager
		this.fileTrackerManager = new FileTrackerManager(this.app.vault)
		this.addChild(this.fileTrackerManager)
		await this.fileTrackerManager.initialize()

		this.timeTracker = new TimeTracker(
			this.app,
			this.app.workspace,
			this.settings
		)
		this.addChild(this.timeTracker)

		// Set up status bar
		this.statusBarEl = this.addStatusBarItem()
		this.statusBarManager = new StatusBarManager(
			this.statusBarEl,
			this.settings
		)
		this.addChild(this.statusBarManager)

		// Initialize commands manager
		this.commandManager = new UsageStatsCommandManager(this)

		// Register view
		this.registerView(
			USAGE_STATS_VIEW_TYPE,
			(leaf) =>
				new UsageStatsView(
					leaf,
					this.dataManager,
					this.fileTrackerManager,
					this.settings
				)
		)

		// Add ribbon icon
		this.addRibbonIcon('clock', t('view.title'), () => {
			this.openUsageStatsView()
		})

		// Add settings tab
		this.addSettingTab(new UsageStatsSettingsTab(this.app, this))

		// Set up event listeners
		this.setupEventListeners()

		// Setup integration between TimeTracker and DataManager
		this.dataManager.setupTimeTrackerIntegration(this.timeTracker)

		// Initialize view if enabled
		if (this.settings.enableView) {
			this.initializeView()
		}
	}

	onunload() {
		// Clean up view
		this.app.workspace.detachLeavesOfType(USAGE_STATS_VIEW_TYPE)
		// console.log("Usage Statistics Plugin unloaded");
	}

	private setupEventListeners(): void {
		// Listen to status bar quick actions
		window.addEventListener('usage-stats-action', (event: CustomEvent) => {})
	}

	// Settings management
	async loadSettings() {
		const savedData = await this.loadData()

		// Handle different data structures
		let settingsData
		if (savedData?.settings) {
			// New structure: { version, lastUpdated, dailyStats, settings: {...} }
			settingsData = savedData.settings
		} else {
			// Old structure: settings directly in root
			settingsData = savedData
		}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, settingsData)

		// If no language preference saved, use the i18n detected language
		if (!settingsData?.language) {
			this.settings.language = i18n.getLocale()
		}

		// Ensure i18n uses the settings language
		i18n.setLocale(this.settings.language)
	}

	async saveSettings() {
		// Load existing data to preserve other sections (including token data)
		const existingData = await this.loadData()

		// Maintain the structured format if it exists
		if (existingData?.settings) {
			// Preserve existing structure
			const updatedData = {
				...existingData,
				settings: this.settings,
				lastUpdated: Date.now(),
			}
			await this.saveData(updatedData)
		} else {
			// For flat structure, merge settings with existing data to preserve token fields
			const updatedData = {
				...existingData, // 保留现有数据，包括token信息
				...this.settings, // 覆盖设置数据
			}
			await this.saveData(updatedData)
		}
	}

	getDefaultSettings(): UsageStatsSettings {
		return { ...DEFAULT_SETTINGS }
	}

	// View management
	updateViewVisibility(): void {
		if (this.settings.enableView) {
			this.initializeView()
		} else {
			this.app.workspace.detachLeavesOfType(USAGE_STATS_VIEW_TYPE)
		}
	}

	private initializeView(): void {
		const existingView = this.app.workspace.getLeavesOfType(
			USAGE_STATS_VIEW_TYPE
		)
		if (existingView.length === 0) {
			const leaf = this.app.workspace.getRightLeaf(false)
			if (leaf) {
				leaf.setViewState({
					type: USAGE_STATS_VIEW_TYPE,
					active: true,
				})
			}
		}
	}

	private openUsageStatsView(): void {
		const { workspace } = this.app

		const existingView = workspace.getLeavesOfType(USAGE_STATS_VIEW_TYPE)
		if (existingView.length > 0) {
			workspace.revealLeaf(existingView[0])
			return
		}

		const leaf = workspace.getRightLeaf(false)
		if (leaf) {
			leaf.setViewState({
				type: USAGE_STATS_VIEW_TYPE,
				active: true,
			})
			workspace.revealLeaf(leaf)
		}
	}

	public isTrackingActive(): boolean {
		return this.timeTracker.isTracking()
	}

	public isTrackingPaused(): boolean {
		const state = this.timeTracker.getState()
		return state.isPaused
	}

	public getTrackingState(): TrackingState {
		return this.timeTracker.getState()
	}

	public getCurrentSession(): TrackingSession | undefined {
		return this.timeTracker.getCurrentSession()
	}

	// Data access methods
	public getTodayStats(): DailyStats {
		return this.dataManager.getTodayStats()
	}

	public async forceSaveData(): Promise<void> {
		await this.dataManager.saveData()
	}

	public async resetTodayData(): Promise<void> {
		// TODO: 实现重置今日数据功能
		new Notice('Reset today data feature not yet implemented')
	}

	public async resetAllData(): Promise<void> {
		// TODO: 实现重置所有数据功能
		// await this.dataManager.resetAllData();
		// 同时清除认证数据
		await this.authStorage.clearAuthData()
		new Notice('Authentication data has been reset')
	}

	public async cleanupOldData(): Promise<void> {
		await this.dataManager.cleanupOldData()
	}

	public async clearAllTrackingData(): Promise<void> {
		await this.dataManager.clearAllTrackingData()
	}

	public showExportModal(): void {
		new Notice('Export modal feature not yet implemented')
	}

	public getDataFilePath(): string {
		return '/.obsidian/plugins/obsidian-usage-stats/tracked_data.json'
	}

	public updateDataManagerSettings(): void {
		this.dataManager.updateSettings(this.settings)
	}

	public updateStatusBarVisibility(): void {
		this.statusBarManager.updateSettings(this.settings)
	}

	public updateStatusBarSettings(): void {
		this.statusBarManager.updateSettings(this.settings)
	}

	public updateViewSettings(): void {
		// Update all open views with new settings
		const views = this.app.workspace.getLeavesOfType(USAGE_STATS_VIEW_TYPE)
		views.forEach((leaf) => {
			const view = leaf.view as UsageStatsView
			if (view.updateSettings) {
				view.updateSettings(this.settings)
			}
		})
	}

	// File tracker access methods
	public async getFileTrackerData() {
		return await this.timeTracker.getFileTrackerData()
	}

	public async getTopFiles(limit: number = 10) {
		return await this.timeTracker.getTopFiles(limit)
	}

	public async getTopFolders(limit: number = 10) {
		return await this.timeTracker.getTopFolders(limit)
	}

	public async getTopTags(limit: number = 10) {
		return await this.timeTracker.getTopTags(limit)
	}

	public async clearFileTrackerData(): Promise<void> {
		await this.timeTracker.clearFileTrackerData()
	}

	public async exportFileTrackerData(
		format: 'json' | 'csv' = 'json'
	): Promise<string> {
		return await this.timeTracker.exportFileTrackerData(format)
	}

	public updateTimeTrackerSettings(): void {
		this.timeTracker.updateSettings(this.settings)
	}

	// Timeline access methods
	public async getTimeline(limit: number = 50) {
		return await this.timeTracker.getTimeline(limit)
	}

	public async getTodayTimeline() {
		return await this.timeTracker.getTodayTimeline()
	}

	public async getTimelineByDate(dateString: string) {
		return await this.timeTracker.getTimelineByDate(dateString)
	}

	public async exportTimelineAsCsv(): Promise<string> {
		return await this.timeTracker.exportTimelineAsCsv()
	}

	// Daily summary access methods
	public async getDailySummaries() {
		return await this.timeTracker.getDailySummaries()
	}

	public async getTodaySummary() {
		return await this.timeTracker.getTodaySummary()
	}

	public async getSummaryByDate(dateString: string) {
		return await this.timeTracker.getSummaryByDate(dateString)
	}

	// Language management
	public setLanguage(language: string): void {
		i18n.setLocale(language)
		// Update all UI components to reflect language change
		this.updateStatusBarSettings()
		this.updateViewSettings()
	}

	// OAuth callback handling
	private registerOAuthCallbackHandler(): void {
		// Test if the protocol handler registration works
		try {
			// Register protocol handler for obsidian://oauth/callback URLs
			this.registerObsidianProtocolHandler('oauth/callback', async (params) => {
				const action = params.action || ''

				// Check if this is an OAuth callback
				if (action === 'oauth/callback') {
					const code = params.code
					const state = params.state

					if (code) {
						try {
							await this.handleOAuthCallback(code, state)
						} catch (error) {
							console.error('OAuth callback handling failed:', error)
							new Notice(t('auth.callbackFailed'))
						}
					} else {
						console.error('OAuth callback missing authorization code')
						new Notice(t('auth.callbackMissingCode'))
					}
				} else {
					console.warn(
						'[UsageStats] Unknown OAuth action or missing callback flag:',
						'action:',
						action,
						"Expected action='oauth/callback'"
					)
				}
			})
		} catch (error) {
			console.error(
				'[UsageStats] Failed to register OAuth protocol handler:',
				error
			)
		}
	}

	async handleOAuthCallback(code: string, state?: string): Promise<void> {
		try {
			// Handle the OAuth callback through AuthService
			await this.authService.handleCallback(code, state)

			// Verify cache integrity after authentication
			const cacheValid = await this.authService.verifyCacheIntegrity()
			if (!cacheValid) {
				console.error(
					'Main plugin: ⚠️ Authentication cache verification failed!'
				)
			}

			// Refresh settings page if open
			this.refreshSettingsPage()

			// Force a status notification to trigger UI updates
			setTimeout(() => {
				this.refreshSettingsPage()

				// Dispatch a custom event to notify about auth status change
				window.dispatchEvent(
					new CustomEvent('obsidian-usage-stats-auth-changed', {
						detail: {
							isAuthenticated: true,
							userInfo: this.authService.getUserInfo(),
						},
					})
				)
			}, 200)
		} catch (error) {
			console.error('OAuth callback failed:', error)
			throw error
		}
	}

	private refreshSettingsPage(): void {
		// Refresh the settings page if it's currently open

		// Try to find and refresh the settings tab directly
		try {
			const settingsModal = (this.app as any).setting
			if (
				settingsModal &&
				settingsModal.containerEl &&
				settingsModal.containerEl.style.display !== 'none'
			) {
				// Settings modal is open, try to find our plugin's tab
				const pluginTabs = settingsModal.pluginTabs
				if (pluginTabs && pluginTabs[this.manifest.id]) {
					const ourTab = pluginTabs[this.manifest.id]
					if (ourTab instanceof UsageStatsSettingsTab) {
						ourTab.display()
						return
					}
				}
			}
		} catch (error) {
			console.warn('Could not directly refresh settings page:', error)
		}

		// Settings will be updated when settings page is reopened
	}

	// Authentication methods
	public isAuthenticated(): boolean {
		// 直接从data.json中的设置读取认证状态，包括token检查
		const hasBasicAuth =
			!!this.settings.isAuthenticated && !!this.settings.userEmail
		const hasValidToken =
			!!this.settings.accessToken &&
			(!this.settings.tokenExpiresAt ||
				Date.now() < this.settings.tokenExpiresAt - 60000)

		const dataJsonAuth = hasBasicAuth && hasValidToken
		return dataJsonAuth
	}

	public getUserInfo(): OAuthUserInfo | null {
		// 直接从data.json中的设置读取用户信息
		if (this.settings.isAuthenticated && this.settings.userEmail) {
			const userInfoFromDataJson: OAuthUserInfo = {
				id: this.settings.userEmail, // 使用 email 作为 id
				email: this.settings.userEmail,
				nickname: this.settings.userNickname || this.settings.userEmail,
				created_at: '', // 暂时留空
				updated_at: '', // 暂时留空
			}
			return userInfoFromDataJson
		}
		return null
	}

	// 获取token信息（直接从data.json读取）
	public getTokenInfo(): {
		accessToken?: string
		refreshToken?: string
		tokenType?: string
		scope?: string
		expiresAt?: Date
		isExpired: boolean
	} | null {
		if (!this.settings.accessToken) {
			return null
		}

		const expiresAt = this.settings.tokenExpiresAt
			? new Date(this.settings.tokenExpiresAt)
			: undefined
		const isExpired = this.settings.tokenExpiresAt
			? Date.now() >= this.settings.tokenExpiresAt - 60000
			: false

		return {
			accessToken: this.settings.accessToken,
			refreshToken: this.settings.refreshToken,
			tokenType: this.settings.tokenType,
			scope: this.settings.tokenScope,
			expiresAt,
			isExpired,
		}
	}

	// 公共方法：获取 AuthService 实例
	public getAuthService() {
		return this.authService
	}

	// 公共方法：获取 AuthStorage 实例
	public getAuthStorage() {
		return this.authStorage
	}

	// 公共方法：更新设置中的用户信息
	public async updateUserInfoInSettings(): Promise<void> {
		const userInfo = this.authService.getUserInfo()
		const isAuth = this.authService.isAuthenticated()

		if (userInfo && isAuth) {
			this.settings.isAuthenticated = true
			this.settings.userEmail = userInfo.email
			this.settings.userNickname = userInfo.nickname || userInfo.email

			await this.saveSettings()
		} else {
			console.warn(
				'Failed to update user info - missing userInfo or not authenticated'
			)
		}
	}

	public async startAuthentication(): Promise<void> {
		return this.authService.startAuthorization()
	}

	public async logout(): Promise<void> {
		await this.authService.logout()
		// Update settings to reflect logout
		this.settings.isAuthenticated = false
		this.settings.userEmail = undefined
		this.settings.userNickname = undefined
		await this.saveSettings()
	}

	public async testConnection(): Promise<boolean> {
		try {
			const pingResponse = await this.apiService.testConnection()
			return pingResponse !== null && pingResponse.status === 'healthy'
		} catch (error) {
			console.error('Connection test failed:', error)
			return false
		}
	}

	// Sync methods
	public isSyncInProgress(): boolean {
		return this.apiService.isSyncInProgress()
	}

	public async syncNow(): Promise<SyncResult> {
		if (!this.isAuthenticated()) {
			throw new Error('Authentication required')
		}

		const allEntries = await this.dataManager.getAllEntries()

		const payload: UsageDataPayload = {
			entries: allEntries,
			lastSyncTime: this.settings.lastSyncTime,
			pluginVersion: '1.0.0',
		}

		const result = await this.apiService.syncUsageData(payload)

		if (result.success) {
			this.settings.lastSyncTime = Date.now()
			await this.saveSettings()
		}

		return result
	}
}
