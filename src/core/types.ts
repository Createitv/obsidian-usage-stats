/**
 * Core types for Obsidian Usage Statistics Plugin
 */

// Plugin settings interface
export interface UsageStatsSettings {
	// General settings
	enableTracking: boolean
	enableView: boolean
	language: string

	// Tracking settings
	idleThreshold: number // in seconds
	autoSaveInterval: number // in seconds
	trackInactiveTime: boolean

	// Category settings
	enableTagTracking: boolean
	enableFolderTracking: boolean
	trackedFolders: string[]
	excludedFolders: string[]

	// Chart and display settings
	defaultChartType: ChartType
	timeFormat: TimeFormat
	showStatusBar: boolean
	statusBarFormat: string

	// Privacy and data
	dataRetentionDays: number
	enableDataExport: boolean

	// Cloud sync settings
	lastSyncTime: number

	// OAuth settings (stored in data.json)
	isAuthenticated?: boolean
	userEmail?: string
	userNickname?: string

	// Token数据（直接存储在data.json中）
	accessToken?: string
	refreshToken?: string
	tokenExpiresAt?: number
	tokenType?: string
	tokenScope?: string
	lastLoginTime?: number
}

export const DEFAULT_SETTINGS: UsageStatsSettings = {
	enableTracking: true, // 默认禁用数据跟踪
	enableView: true,
	language: 'en',

	idleThreshold: 300, // 5 minutes
	autoSaveInterval: 30000, // minutes
	trackInactiveTime: false,

	enableTagTracking: true,
	enableFolderTracking: true,
	trackedFolders: [],
	excludedFolders: ['.trash', '.obsidian'],

	defaultChartType: 'pie',
	timeFormat: '24h',
	showStatusBar: true,
	statusBarFormat: '{{time}} - {{category}}',

	dataRetentionDays: 365,
	enableDataExport: true,

	lastSyncTime: 0,

	isAuthenticated: false,
	userEmail: undefined,
	userNickname: undefined,
	accessToken: undefined,
	refreshToken: undefined,
	tokenExpiresAt: undefined,
	tokenType: undefined,
	tokenScope: undefined,
	lastLoginTime: undefined,
}

// Time tracking data types
export interface TimeEntry {
	id: string
	startTime: number
	endTime: number
	duration: number // in milliseconds
	filePath?: string
	fileName?: string
	folderPath?: string
	tags: string[]
	category: string
	isActive: boolean
	metadata?: Record<string, any>
}

export interface DailyStats {
	date: string // YYYY-MM-DD format
	totalTime: number
	activeTime: number
	idleTime: number
	entries: TimeEntry[]
	categoryStats: CategoryStats[]
	fileStats: FileStats[]
	tagStats: TagStats[]
}

export interface CategoryStats {
	category: string
	totalTime: number
	percentage: number
	count: number
}

export interface FileStats {
	filePath: string
	fileName: string
	totalTime: number
	percentage: number
	lastAccessed: number
	accessCount: number
}

export interface TagStats {
	tag: string
	totalTime: number
	percentage: number
	fileCount: number
}

// Chart and visualization types
export type ChartType = 'pie' | 'bar' | 'line' | 'doughnut'
export type TimeFormat = '12h' | '24h'
export type ViewPeriod = 'today' | 'week' | 'month'

export interface ChartData {
	labels: string[]
	datasets: ChartDataset[]
}

export interface ChartDataset {
	label: string
	data: number[]
	backgroundColor?: string[]
	borderColor?: string[]
	borderWidth?: number
}

// Session and tracking state
export interface TrackingSession {
	id: string
	startTime: number
	endTime?: number
	filePath?: string
	fileName?: string
	folderPath?: string
	tags: string[]
	isActive: boolean
	lastActiveTime: number
}

export interface TrackingState {
	isTracking: boolean
	currentSession?: TrackingSession
	lastActiveTime: number
	totalTodayTime: number
	isPaused: boolean
	pauseReason?: string
}

// Events and notifications
export interface TrackingEvent {
	type:
		| 'start'
		| 'stop'
		| 'pause'
		| 'resume'
		| 'file_change'
		| 'idle'
		| 'active'
		| 'time_entry_created'
	timestamp: number
	data?: any
}

// File tracker data structures
export interface FileTrackerData {
	version: string
	lastUpdated: number
	files: Record<string, FileTrackingStats>
	folders: Record<string, FolderTrackingStats>
	tags: Record<string, TagTrackingStats>
	timeline: TimelineEntry[]
	summary: Record<string, DailySummary> // 按日期分组的汇总信息
}

export interface TimelineEntry {
	id: string
	fileName: string
	filePath: string
	folderPath: string
	startTime: number
	startTimeReadable: string
	endTime: number
	endTimeReadable: string
	duration: number // 时间单位：秒（保留一位小数）
	tags: string[]
	sessionType: 'edit' | 'view' // 编辑或查看
}

export interface FileTrackingStats {
	fileName: string
	filePath: string
	folderPath: string
	totalTime: number // 时间单位：秒（保留一位小数）
	sessionCount: number
	lastAccessed: number
	lastAccessedReadable: string // 可读时间格式
	firstAccessed: number
	firstAccessedReadable: string // 可读时间格式
	tags: string[]
	averageSessionTime: number // 时间单位：秒（保留一位小数）
}

export interface FolderTrackingStats {
	folderPath: string
	totalTime: number // 时间单位：秒（保留一位小数）
	fileCount: number
	sessionCount: number
	lastAccessed: number
	lastAccessedReadable: string // 可读时间格式
	firstAccessed: number
	firstAccessedReadable: string // 可读时间格式
	files: string[]
	averageSessionTime: number // 时间单位：秒（保留一位小数）
}

export interface TagTrackingStats {
	tagName: string
	totalTime: number // 时间单位：秒（保留一位小数）
	sessionCount: number
	fileCount: number
	lastUsed: number
	lastUsedReadable: string // 可读时间格式
	firstUsed: number
	firstUsedReadable: string // 可读时间格式
	files: string[]
	folders: string[]
	averageSessionTime: number // 时间单位：秒（保留一位小数）
}

export interface TrackerSummary {
	totalFiles: number
	totalFolders: number
	totalTags: number
	totalTimeSpent: number // 时间单位：秒（保留一位小数）
	lastActiveFile: string
	lastActiveFolder: string
	mostUsedTag: string
	lastUpdated: number
	lastUpdatedReadable: string // 可读时间格式
}

export interface DailySummary {
	date: string // YYYY-MM-DD 格式
	dateReadable: string // 可读日期格式
	totalFiles: number
	totalFolders: number
	totalTags: number
	totalTimeSpent: number // 时间单位：秒（保留一位小数）
	lastActiveFile: string
	lastActiveFolder: string
	mostUsedTag: string
	lastUpdated: number
	lastUpdatedReadable: string // 可读时间格式
}

// Report generation
export interface ReportConfig {
	period: ViewPeriod
	startDate?: string
	endDate?: string
	categories?: string[]
	tags?: string[]
	folders?: string[]
	chartTypes: ChartType[]
	includeDetails: boolean
}

export interface GeneratedReport {
	config: ReportConfig
	generatedAt: number
	summary: {
		totalTime: number
		averageDailyTime: number
		mostActiveFile: string
		mostActiveFolder: string
		topTags: string[]
	}
	dailyStats: DailyStats[]
	charts: ChartData[]
	metadata: {
		exportFormat?: string
		filePath?: string
	}
}
