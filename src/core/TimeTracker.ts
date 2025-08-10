/**
 * Core time tracking functionality
 */

import { Component, TFile, Workspace, debounce, App } from 'obsidian'
import {
	TrackingSession,
	TrackingState,
	TimeEntry,
	TrackingEvent,
	UsageStatsSettings,
	FileTrackerData,
	FileTrackingStats,
	FolderTrackingStats,
	TagTrackingStats,
	TimelineEntry,
	DailySummary,
} from './types'

export class TimeTracker extends Component {
	private workspace: Workspace
	private app: App
	private settings: UsageStatsSettings
	private state: TrackingState
	private idleTimer?: NodeJS.Timeout
	private saveTimer?: NodeJS.Timeout
	private eventListeners: Array<(event: TrackingEvent) => void> = []
	private lastOpenTabs: Set<string> = new Set() // Track currently open tabs

	constructor(app: App, workspace: Workspace, settings: UsageStatsSettings) {
		super()
		this.app = app
		this.workspace = workspace
		this.settings = settings
		this.state = {
			isTracking: false,
			lastActiveTime: Date.now(),
			totalTodayTime: 0,
			isPaused: false,
		}
	}

	onload(): void {
		this.registerWorkspaceEvents()
		this.registerDocumentEvents()
		this.startIdleDetection()
		this.initializeOpenTabs()

		if (this.settings.enableTracking) {
			this.startTracking()
		}
	}

	onunload(): void {
		this.stopTracking()
		this.clearTimers()
	}

	// Event listener management
	public addEventListener(listener: (event: TrackingEvent) => void): void {
		this.eventListeners.push(listener)
	}

	public removeEventListener(listener: (event: TrackingEvent) => void): void {
		const index = this.eventListeners.indexOf(listener)
		if (index > -1) {
			this.eventListeners.splice(index, 1)
		}
	}

	private emitEvent(event: TrackingEvent): void {
		this.eventListeners.forEach((listener) => {
			try {
				listener(event)
			} catch (error) {
				console.error('Error in tracking event listener:', error)
			}
		})
	}

	// Core tracking methods
	public startTracking(): void {
		if (this.state.isTracking) return

		this.state.isTracking = true
		this.state.isPaused = false
		this.state.lastActiveTime = Date.now()

		// Start tracking current file if available
		const activeFile = this.workspace.getActiveFile()
		if (activeFile) {
			console.log('开始记录文件', activeFile.path)
			this.startNewSession(activeFile)
		}

		this.emitEvent({
			type: 'start',
			timestamp: Date.now(),
		})
	}

	public stopTracking(): void {
		if (!this.state.isTracking) return

		this.endCurrentSession()
		this.state.isTracking = false
		this.state.isPaused = false
		console.log('停止记录文件')

		this.emitEvent({
			type: 'stop',
			timestamp: Date.now(),
		})
	}

	public pauseTracking(reason?: string): void {
		if (!this.state.isTracking || this.state.isPaused) return

		this.state.isPaused = true
		this.state.pauseReason = reason

		if (this.state.currentSession) {
			this.state.currentSession.isActive = false
		}

		this.emitEvent({
			type: 'pause',
			timestamp: Date.now(),
			data: { reason },
		})
	}

	public resumeTracking(): void {
		if (!this.state.isTracking || !this.state.isPaused) return

		this.state.isPaused = false
		this.state.pauseReason = undefined
		this.state.lastActiveTime = Date.now()

		if (this.state.currentSession) {
			this.state.currentSession.isActive = true
			this.state.currentSession.lastActiveTime = Date.now()
		}

		this.emitEvent({
			type: 'resume',
			timestamp: Date.now(),
		})
	}

	public isTracking(): boolean {
		return this.state.isTracking && !this.state.isPaused
	}

	public getState(): TrackingState {
		return { ...this.state }
	}

	public getCurrentSession(): TrackingSession | undefined {
		return this.state.currentSession
			? { ...this.state.currentSession }
			: undefined
	}

	// Session management
	private startNewSession(file: TFile): void {
		this.endCurrentSession()

		const tags = this.extractTagsFromFile(file)
		const folderPath = file.parent?.path || ''

		this.state.currentSession = {
			id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			startTime: Date.now(),
			filePath: file.path,
			fileName: file.name,
			folderPath,
			tags,
			isActive: true,
			lastActiveTime: Date.now(),
		}

		this.emitEvent({
			type: 'file_change',
			timestamp: Date.now(),
			data: {
				filePath: file.path,
				fileName: file.name,
				folderPath,
				tags,
			},
		})
	}

	private endCurrentSession(): void {
		if (!this.state.currentSession) return

		const session = this.state.currentSession
		session.endTime = Date.now()

		// Create time entry
		const entry: TimeEntry = {
			id: session.id,
			startTime: session.startTime,
			endTime: session.endTime,
			duration: session.endTime - session.startTime,
			filePath: session.filePath,
			fileName: session.fileName,
			folderPath: session.folderPath,
			tags: session.tags,
			category: this.determineCategory(session),
			isActive: session.isActive,
			metadata: {
				sessionId: session.id,
			},
		}

		// Save the entry (will be handled by data manager)
		this.saveTimeEntry(entry)

		this.state.currentSession = undefined
	}

	private extractTagsFromFile(file: TFile): string[] {
		if (!this.settings.enableTagTracking) return []

		try {
			const cache = this.app.metadataCache.getFileCache(file)
			if (!cache?.tags) return []

			return cache.tags.map((tag) => tag.tag.replace('#', ''))
		} catch (error) {
			console.error('Error extracting tags from file:', error)
			return []
		}
	}

	private determineCategory(session: TrackingSession): string {
		// Priority: Tags > Folder > Default
		if (session.tags.length > 0) {
			return session.tags[0] // Use first tag as primary category
		}

		if (session.folderPath) {
			const folderName =
				session.folderPath.split('/').pop() || session.folderPath
			return folderName
		}

		return 'Uncategorized'
	}

	// Workspace event handlers
	private registerWorkspaceEvents(): void {
		this.registerEvent(
			this.workspace.on('active-leaf-change', () => {
				this.onActiveFileChange()
			})
		)

		this.registerEvent(
			this.workspace.on('file-open', (file) => {
				if (file) {
					this.onFileOpen(file)
				}
			})
		)

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile) {
					this.onFileModify(file)
				}
			})
		)

		// Monitor layout changes to detect tab closures
		this.registerEvent(
			this.workspace.on('layout-change', () => {
				this.onLayoutChange()
			})
		)
	}

	private registerDocumentEvents(): void {
		// Register focus and blur events to detect app activity
		this.registerDomEvent(window, 'focus', () => {
			this.onAppFocus()
		})

		this.registerDomEvent(window, 'blur', () => {
			this.onAppBlur()
		})

		// Register user activity events
		const debouncedActivity = debounce(
			() => {
				this.onUserActivity()
			},
			1000,
			true
		)

		this.registerDomEvent(document, 'keydown', debouncedActivity)
		this.registerDomEvent(document, 'mousedown', debouncedActivity)
		this.registerDomEvent(document, 'scroll', debouncedActivity)
	}

	private onActiveFileChange(): void {
		if (!this.isTracking()) return

		const activeFile = this.workspace.getActiveFile()
		if (activeFile && activeFile.path !== this.state.currentSession?.filePath) {
			this.startNewSession(activeFile)
		}
	}

	private onFileOpen(file: TFile): void {
		if (!this.isTracking()) return

		if (file.path !== this.state.currentSession?.filePath) {
			this.startNewSession(file)
		}
	}

	private onFileModify(file: TFile): void {
		if (!this.isTracking()) return

		// Update session activity
		if (this.state.currentSession?.filePath === file.path) {
			this.state.currentSession.lastActiveTime = Date.now()
			this.state.lastActiveTime = Date.now()
		}

		this.onUserActivity()
	}

	private onAppFocus(): void {
		if (!this.state.isTracking) return

		// Resume tracking if it was paused due to app losing focus
		if (this.state.isPaused && this.state.pauseReason === 'app_blur') {
			this.resumeTracking()
		}
	}

	private onAppBlur(): void {
		if (!this.isTracking()) return

		// Pause tracking when app loses focus (if configured)
		if (!this.settings.trackInactiveTime) {
			this.pauseTracking('app_blur')
		}
	}

	private onUserActivity(): void {
		if (!this.isTracking()) return

		this.state.lastActiveTime = Date.now()

		if (this.state.currentSession) {
			this.state.currentSession.lastActiveTime = Date.now()
		}

		// Resume from idle if necessary
		if (this.state.isPaused && this.state.pauseReason === 'idle') {
			this.resumeTracking()
		}

		this.emitEvent({
			type: 'active',
			timestamp: Date.now(),
		})

		this.resetIdleTimer()
	}

	private onLayoutChange(): void {
		if (!this.isTracking()) return

		// Get currently open tabs
		const currentTabs = new Set<string>()
		this.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view && leaf.view.getViewType() === 'markdown') {
				const file = (leaf.view as any).file
				if (file && file.path) {
					currentTabs.add(file.path)
				}
			}
		})

		// Check for closed tabs
		const closedTabs = new Set<string>()
		this.lastOpenTabs.forEach((tabPath) => {
			if (!currentTabs.has(tabPath)) {
				closedTabs.add(tabPath)
			}
		})

		// Process closed tabs
		closedTabs.forEach((closedTabPath) => {
			console.log('检测到标签页关闭:', closedTabPath)
			this.onTabClosed(closedTabPath)
		})

		// Update the tracking set
		this.lastOpenTabs = currentTabs
	}

	private initializeOpenTabs(): void {
		// Initialize the set of currently open tabs
		this.lastOpenTabs.clear()
		this.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view && leaf.view.getViewType() === 'markdown') {
				const file = (leaf.view as any).file
				if (file && file.path) {
					this.lastOpenTabs.add(file.path)
				}
			}
		})
		console.log('初始化打开的标签页:', Array.from(this.lastOpenTabs))
	}

	private onTabClosed(filePath: string): void {
		// If the closed tab is the current session, end it
		if (this.state.currentSession?.filePath === filePath) {
			console.log('当前会话的标签页被关闭，结束会话:', filePath)
			this.endCurrentSession()
		}

		// Even if it's not the current session, we might want to record
		// that this tab was closed if it was recently active
		this.recordTabClosure(filePath)
	}

	private recordTabClosure(filePath: string): void {
		// Create a minimal time entry for tab closure if we have recent activity
		// This helps track that a file was accessed even if the session ended early
		console.log('记录标签页关闭事件:', filePath)

		// If there was recent activity on this tab, we might want to create a minimal record
		// For now, we'll let the main session management handle most of the recording
	}

	// Idle detection
	private startIdleDetection(): void {
		this.resetIdleTimer()
	}

	private resetIdleTimer(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
		}

		this.idleTimer = setTimeout(() => {
			this.onIdleDetected()
		}, this.settings.idleThreshold * 1000)
	}

	private onIdleDetected(): void {
		if (!this.isTracking()) return

		this.pauseTracking('idle')

		this.emitEvent({
			type: 'idle',
			timestamp: Date.now(),
		})
	}

	// Data management
	private saveTimeEntry(entry: TimeEntry): void {
		// Emit event for data manager integration
		this.emitEvent({
			type: 'time_entry_created',
			timestamp: Date.now(),
			data: { entry },
		})

		// Also save to dedicated file tracker
		this.saveToFileTracker(entry)
	}

	private async saveToFileTracker(entry: TimeEntry): Promise<void> {
		try {
			const fileTrackerPath =
				'.obsidian/plugins/obsidian-usage-stats/file-tracker.json'
			let trackerData = await this.loadFileTrackerData(fileTrackerPath)

			// Update file statistics
			this.updateFileStatistics(trackerData, entry)

			// Update folder statistics
			this.updateFolderStatistics(trackerData, entry)

			// Update tag statistics
			this.updateTagStatistics(trackerData, entry)

			// Add timeline entry
			this.addTimelineEntry(trackerData, entry)

			// Update daily summary counts
			this.updateDailySummaryCounts(trackerData, entry)

			// Save updated data
			await this.app.vault.adapter.write(
				fileTrackerPath,
				JSON.stringify(trackerData, null, 2)
			)
		} catch (error) {
			console.error('Failed to save to file tracker:', error)
		}
	}

	private async loadFileTrackerData(
		filePath: string
	): Promise<FileTrackerData> {
		try {
			const content = await this.app.vault.adapter.read(filePath)
			return JSON.parse(content) as FileTrackerData
		} catch (error) {
			// File doesn't exist, return default structure
			return this.createDefaultFileTrackerData()
		}
	}

	private createDefaultFileTrackerData(): FileTrackerData {
		const now = Date.now()
		return {
			version: '1.0.0',
			lastUpdated: now,
			files: {},
			folders: {},
			tags: {},
			timeline: [],
			summary: {},
		}
	}

	private getOrCreateDailySummary(
		data: FileTrackerData,
		timestamp: number
	): DailySummary {
		const dateKey = this.getDateKey(timestamp)

		if (!data.summary[dateKey]) {
			data.summary[dateKey] = {
				date: dateKey,
				dateReadable: this.formatReadableDate(timestamp),
				totalFiles: 0,
				totalFolders: 0,
				totalTags: 0,
				totalTimeSpent: 0,
				lastActiveFile: '',
				lastActiveFolder: '',
				mostUsedTag: '',
				lastUpdated: timestamp,
				lastUpdatedReadable: this.formatReadableTime(timestamp),
			}
		}

		return data.summary[dateKey]
	}

	private getDateKey(timestamp: number): string {
		const date = new Date(timestamp)
		return date.toISOString().split('T')[0] // YYYY-MM-DD
	}

	private formatReadableDate(timestamp: number): string {
		const date = new Date(timestamp)
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')

		return `${year}年${month}月${day}日`
	}

	private updateFileStatistics(data: FileTrackerData, entry: TimeEntry): void {
		if (!entry.filePath || !entry.fileName) return

		const fileKey = entry.filePath
		const totalTimeSeconds = Math.round((entry.duration / 1000) * 10) / 10 // 转换为秒，保留一位小数
		const now = Date.now()

		if (!data.files[fileKey]) {
			data.files[fileKey] = {
				fileName: entry.fileName,
				filePath: entry.filePath,
				folderPath: entry.folderPath || '',
				totalTime: 0,
				sessionCount: 0,
				lastAccessed: entry.endTime,
				lastAccessedReadable: this.formatReadableTime(entry.endTime),
				firstAccessed: now,
				firstAccessedReadable: this.formatReadableTime(now),
				tags: entry.tags || [],
				averageSessionTime: 0,
			}
		}

		const fileStats = data.files[fileKey]
		fileStats.totalTime += totalTimeSeconds
		fileStats.sessionCount++
		fileStats.lastAccessed = entry.endTime
		fileStats.lastAccessedReadable = this.formatReadableTime(entry.endTime)
		fileStats.averageSessionTime =
			Math.round((fileStats.totalTime / fileStats.sessionCount) * 10) / 10

		// Update tags for this file
		if (entry.tags && entry.tags.length > 0) {
			fileStats.tags = [...new Set([...fileStats.tags, ...entry.tags])]
		}

		// Update daily summary
		const dailySummary = this.getOrCreateDailySummary(data, entry.endTime)
		dailySummary.totalTimeSpent += totalTimeSeconds
		dailySummary.lastActiveFile = entry.fileName
		dailySummary.lastUpdated = now
		dailySummary.lastUpdatedReadable = this.formatReadableTime(now)
	}

	private updateFolderStatistics(
		data: FileTrackerData,
		entry: TimeEntry
	): void {
		if (!entry.folderPath) return

		const folderKey = entry.folderPath
		const totalTimeSeconds = Math.round((entry.duration / 1000) * 10) / 10 // 转换为秒，保留一位小数
		const now = Date.now()

		if (!data.folders[folderKey]) {
			data.folders[folderKey] = {
				folderPath: entry.folderPath,
				totalTime: 0,
				fileCount: 0,
				sessionCount: 0,
				lastAccessed: entry.endTime,
				lastAccessedReadable: this.formatReadableTime(entry.endTime),
				firstAccessed: now,
				firstAccessedReadable: this.formatReadableTime(now),
				files: [],
				averageSessionTime: 0,
			}
		}

		const folderStats = data.folders[folderKey]
		folderStats.totalTime += totalTimeSeconds
		folderStats.sessionCount++
		folderStats.lastAccessed = entry.endTime
		folderStats.lastAccessedReadable = this.formatReadableTime(entry.endTime)
		folderStats.averageSessionTime =
			Math.round((folderStats.totalTime / folderStats.sessionCount) * 10) / 10

		// Track unique files in this folder
		if (entry.fileName && !folderStats.files.includes(entry.fileName)) {
			folderStats.files.push(entry.fileName)
			folderStats.fileCount = folderStats.files.length
		}

		// Update daily summary
		const dailySummary = this.getOrCreateDailySummary(data, entry.endTime)
		dailySummary.lastActiveFolder = entry.folderPath

		// Folder count will be updated at the end
	}

	private updateTagStatistics(data: FileTrackerData, entry: TimeEntry): void {
		if (!entry.tags || entry.tags.length === 0) return

		const totalTimeSeconds = Math.round((entry.duration / 1000) * 10) / 10 // 转换为秒，保留一位小数
		const now = Date.now()

		entry.tags.forEach((tag) => {
			if (!data.tags[tag]) {
				data.tags[tag] = {
					tagName: tag,
					totalTime: 0,
					sessionCount: 0,
					fileCount: 0,
					lastUsed: entry.endTime,
					lastUsedReadable: this.formatReadableTime(entry.endTime),
					firstUsed: now,
					firstUsedReadable: this.formatReadableTime(now),
					files: [],
					folders: [],
					averageSessionTime: 0,
				}
			}

			const tagStats = data.tags[tag]
			tagStats.totalTime += totalTimeSeconds
			tagStats.sessionCount++
			tagStats.lastUsed = entry.endTime
			tagStats.lastUsedReadable = this.formatReadableTime(entry.endTime)
			tagStats.averageSessionTime =
				Math.round((tagStats.totalTime / tagStats.sessionCount) * 10) / 10

			// Track unique files and folders for this tag
			if (entry.fileName && !tagStats.files.includes(entry.fileName)) {
				tagStats.files.push(entry.fileName)
				tagStats.fileCount = tagStats.files.length
			}

			if (entry.folderPath && !tagStats.folders.includes(entry.folderPath)) {
				tagStats.folders.push(entry.folderPath)
			}

			// Update daily summary most used tag
			const dailySummary = this.getOrCreateDailySummary(data, entry.endTime)
			if (
				!dailySummary.mostUsedTag ||
				tagStats.totalTime >
					(data.tags[dailySummary.mostUsedTag]?.totalTime || 0)
			) {
				dailySummary.mostUsedTag = tag
			}

			// Tag count will be updated at the end
		})
	}

	private updateDailySummaryCounts(
		data: FileTrackerData,
		entry: TimeEntry
	): void {
		const dailySummary = this.getOrCreateDailySummary(data, entry.endTime)
		const dateKey = this.getDateKey(entry.endTime)
		const dayStart = new Date(dateKey).getTime()
		const dayEnd = dayStart + 24 * 60 * 60 * 1000

		// Count files accessed today
		const todayFiles = new Set<string>()
		Object.values(data.files).forEach((file) => {
			if (file.lastAccessed >= dayStart && file.lastAccessed < dayEnd) {
				todayFiles.add(file.filePath)
			}
		})
		dailySummary.totalFiles = todayFiles.size

		// Count folders accessed today
		const todayFolders = new Set<string>()
		Object.values(data.folders).forEach((folder) => {
			if (folder.lastAccessed >= dayStart && folder.lastAccessed < dayEnd) {
				todayFolders.add(folder.folderPath)
			}
		})
		dailySummary.totalFolders = todayFolders.size

		// Count tags used today
		const todayTags = new Set<string>()
		Object.values(data.tags).forEach((tag) => {
			if (tag.lastUsed >= dayStart && tag.lastUsed < dayEnd) {
				todayTags.add(tag.tagName)
			}
		})
		dailySummary.totalTags = todayTags.size
	}

	private addTimelineEntry(data: FileTrackerData, entry: TimeEntry): void {
		if (!entry.filePath || !entry.fileName) return

		const timelineEntry: TimelineEntry = {
			id: entry.id,
			fileName: entry.fileName,
			filePath: entry.filePath,
			folderPath: entry.folderPath || '',
			startTime: entry.startTime,
			startTimeReadable: this.formatReadableTime(entry.startTime),
			endTime: entry.endTime,
			endTimeReadable: this.formatReadableTime(entry.endTime),
			duration: Math.round((entry.duration / 1000) * 10) / 10, // 转换为秒，保留一位小数
			tags: entry.tags || [],
			sessionType: entry.isActive ? 'edit' : 'view', // 根据是否活跃判断是编辑还是查看
		}

		// 添加到时间线开头，保持最新的在前面
		data.timeline.unshift(timelineEntry)

		// 限制时间线条目数量，保留最近的1000条记录
		if (data.timeline.length > 1000) {
			data.timeline = data.timeline.slice(0, 1000)
		}
	}

	private clearTimers(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer)
			this.idleTimer = undefined
		}

		if (this.saveTimer) {
			clearTimeout(this.saveTimer)
			this.saveTimer = undefined
		}
	}

	// Settings updates
	public updateSettings(newSettings: UsageStatsSettings): void {
		const oldSettings = this.settings
		this.settings = newSettings

		// Handle tracking enable/disable
		if (oldSettings.enableTracking !== newSettings.enableTracking) {
			if (newSettings.enableTracking) {
				this.startTracking()
			} else {
				this.stopTracking()
			}
		}

		// Update idle threshold
		if (oldSettings.idleThreshold !== newSettings.idleThreshold) {
			this.resetIdleTimer()
		}
	}

	// Utility methods
	public getTodayTime(): number {
		return this.state.totalTodayTime
	}

	public getActiveTime(): number {
		if (!this.state.currentSession) return 0
		return Date.now() - this.state.currentSession.startTime
	}

	public getFormattedTime(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`
		} else {
			return `${seconds}s`
		}
	}

	// File tracker utility methods
	public async getFileTrackerData(): Promise<FileTrackerData | null> {
		try {
			const fileTrackerPath =
				'.obsidian/plugins/obsidian-usage-stats/file-tracker.json'
			return await this.loadFileTrackerData(fileTrackerPath)
		} catch (error) {
			console.error('Failed to load file tracker data:', error)
			return null
		}
	}

	public async getTopFiles(limit: number = 10): Promise<FileTrackingStats[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		return Object.values(data.files)
			.sort((a, b) => b.totalTime - a.totalTime)
			.slice(0, limit)
	}

	public async getTopFolders(
		limit: number = 10
	): Promise<FolderTrackingStats[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		return Object.values(data.folders)
			.sort((a, b) => b.totalTime - a.totalTime)
			.slice(0, limit)
	}

	public async getTopTags(limit: number = 10): Promise<TagTrackingStats[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		return Object.values(data.tags)
			.sort((a, b) => b.totalTime - a.totalTime)
			.slice(0, limit)
	}

	public async clearFileTrackerData(): Promise<void> {
		try {
			const fileTrackerPath =
				'.obsidian/plugins/obsidian-usage-stats/file-tracker.json'
			const defaultData = this.createDefaultFileTrackerData()
			await this.app.vault.adapter.write(
				fileTrackerPath,
				JSON.stringify(defaultData, null, 2)
			)
		} catch (error) {
			console.error('Failed to clear file tracker data:', error)
		}
	}

	public async exportFileTrackerData(
		format: 'json' | 'csv' = 'json'
	): Promise<string> {
		const data = await this.getFileTrackerData()
		if (!data) return ''

		if (format === 'csv') {
			return this.exportFileTrackerAsCsv(data)
		}

		return JSON.stringify(data, null, 2)
	}

	public async getTimeline(limit: number = 50): Promise<TimelineEntry[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		return data.timeline.slice(0, limit)
	}

	public async getTodayTimeline(): Promise<TimelineEntry[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		const today = new Date()
		const todayStart = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate()
		).getTime()
		const todayEnd = todayStart + 24 * 60 * 60 * 1000

		return data.timeline.filter(
			(entry) => entry.startTime >= todayStart && entry.startTime < todayEnd
		)
	}

	public async getTimelineByDate(dateString: string): Promise<TimelineEntry[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		const targetDate = new Date(dateString)
		const dayStart = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate()
		).getTime()
		const dayEnd = dayStart + 24 * 60 * 60 * 1000

		return data.timeline
			.filter(
				(entry) => entry.startTime >= dayStart && entry.startTime < dayEnd
			)
			.sort((a, b) => a.startTime - b.startTime) // 按时间正序排列
	}

	public async getDailySummaries(): Promise<DailySummary[]> {
		const data = await this.getFileTrackerData()
		if (!data) return []

		return Object.values(data.summary).sort((a, b) =>
			b.date.localeCompare(a.date)
		) // 按日期倒序排列
	}

	public async getTodaySummary(): Promise<DailySummary | null> {
		const data = await this.getFileTrackerData()
		if (!data) return null

		const today = this.getDateKey(Date.now())
		return data.summary[today] || null
	}

	public async getSummaryByDate(
		dateString: string
	): Promise<DailySummary | null> {
		const data = await this.getFileTrackerData()
		if (!data) return null

		return data.summary[dateString] || null
	}

	private exportFileTrackerAsCsv(data: FileTrackerData): string {
		const headers = [
			'Type',
			'Name',
			'Path',
			'TotalTime(seconds)',
			'SessionCount',
			'LastAccessed',
			'LastAccessedReadable',
			'AverageSessionTime(seconds)',
		]

		const rows: string[][] = [headers]

		// Add file data
		Object.values(data.files).forEach((file) => {
			rows.push([
				'File',
				file.fileName,
				file.filePath,
				file.totalTime.toString(),
				file.sessionCount.toString(),
				new Date(file.lastAccessed).toISOString(),
				file.lastAccessedReadable,
				file.averageSessionTime.toString(),
			])
		})

		// Add folder data
		Object.values(data.folders).forEach((folder) => {
			rows.push([
				'Folder',
				folder.folderPath.split('/').pop() || folder.folderPath,
				folder.folderPath,
				folder.totalTime.toString(),
				folder.sessionCount.toString(),
				new Date(folder.lastAccessed).toISOString(),
				folder.lastAccessedReadable,
				folder.averageSessionTime.toString(),
			])
		})

		// Add tag data
		Object.values(data.tags).forEach((tag) => {
			rows.push([
				'Tag',
				tag.tagName,
				`#${tag.tagName}`,
				tag.totalTime.toString(),
				tag.sessionCount.toString(),
				new Date(tag.lastUsed).toISOString(),
				tag.lastUsedReadable,
				tag.averageSessionTime.toString(),
			])
		})

		return rows.map((row) => row.join(',')).join('\n')
	}

	public async exportTimelineAsCsv(): Promise<string> {
		const data = await this.getFileTrackerData()
		if (!data) return ''

		const headers = [
			'FileName',
			'FilePath',
			'FolderPath',
			'StartTime',
			'StartTimeReadable',
			'EndTime',
			'EndTimeReadable',
			'Duration(seconds)',
			'Tags',
			'SessionType',
		]

		const rows: string[][] = [headers]

		data.timeline.forEach((entry) => {
			rows.push([
				entry.fileName,
				entry.filePath,
				entry.folderPath,
				new Date(entry.startTime).toISOString(),
				entry.startTimeReadable,
				new Date(entry.endTime).toISOString(),
				entry.endTimeReadable,
				entry.duration.toString(),
				entry.tags.join(';'),
				entry.sessionType,
			])
		})

		return rows.map((row) => row.join(',')).join('\n')
	}

	// 格式化可读时间 (年-月-日 时:分:秒)
	private formatReadableTime(timestamp: number): string {
		const date = new Date(timestamp)
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		const hours = String(date.getHours()).padStart(2, '0')
		const minutes = String(date.getMinutes()).padStart(2, '0')
		const seconds = String(date.getSeconds()).padStart(2, '0')

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
	}
}
