/**
 * Core types for Obsidian Usage Statistics Plugin
 */

// Plugin settings interface
export interface UsageStatsSettings {
	// General settings
	enableTracking: boolean;
	enableView: boolean;
	language: string;

	// Tracking settings
	idleThreshold: number; // in seconds
	autoSaveInterval: number; // in seconds
	trackInactiveTime: boolean;

	// Category settings
	enableTagTracking: boolean;
	enableFolderTracking: boolean;
	trackedFolders: string[];
	excludedFolders: string[];

	// Chart and display settings
	defaultChartType: ChartType;
	timeFormat: TimeFormat;
	showStatusBar: boolean;
	statusBarFormat: string;

	// Privacy and data
	dataRetentionDays: number;
	enableDataExport: boolean;

	// Cloud sync settings
	enableSyncToCloud: boolean;
	autoSync: boolean;
	syncInterval: number; // in minutes
	lastSyncTime: number;

	// OAuth settings (stored separately for security)
	isAuthenticated?: boolean;
	userEmail?: string;
	userNickname?: string;

	// Auth storage for tokens (separate from main settings)
	authStorage?: Record<string, string>;
}

export const DEFAULT_SETTINGS: UsageStatsSettings = {
	enableTracking: true,
	enableView: true,
	language: "en",

	idleThreshold: 300, // 5 minutes
	autoSaveInterval: 30000, // minutes
	trackInactiveTime: false,

	enableTagTracking: true,
	enableFolderTracking: true,
	trackedFolders: [],
	excludedFolders: [".trash", ".obsidian"],

	defaultChartType: "pie",
	timeFormat: "24h",
	showStatusBar: true,
	statusBarFormat: "{{time}} - {{category}}",

	dataRetentionDays: 365,
	enableDataExport: true,

	enableSyncToCloud: false,
	autoSync: false,
	syncInterval: 60, // 1 hour
	lastSyncTime: 0,

	isAuthenticated: false,
};

// Time tracking data types
export interface TimeEntry {
	id: string;
	startTime: number;
	endTime: number;
	duration: number; // in milliseconds
	filePath?: string;
	fileName?: string;
	folderPath?: string;
	tags: string[];
	category: string;
	isActive: boolean;
	metadata?: Record<string, any>;
}

export interface DailyStats {
	date: string; // YYYY-MM-DD format
	totalTime: number;
	activeTime: number;
	idleTime: number;
	entries: TimeEntry[];
	categoryStats: CategoryStats[];
	fileStats: FileStats[];
	tagStats: TagStats[];
}

export interface CategoryStats {
	category: string;
	totalTime: number;
	percentage: number;
	count: number;
}

export interface FileStats {
	filePath: string;
	fileName: string;
	totalTime: number;
	percentage: number;
	lastAccessed: number;
	accessCount: number;
}

export interface TagStats {
	tag: string;
	totalTime: number;
	percentage: number;
	fileCount: number;
}

// Chart and visualization types
export type ChartType = "pie" | "bar" | "line" | "doughnut";
export type TimeFormat = "12h" | "24h";
export type ViewPeriod = "today" | "week" | "month" | "year" | "all";

export interface ChartData {
	labels: string[];
	datasets: ChartDataset[];
}

export interface ChartDataset {
	label: string;
	data: number[];
	backgroundColor?: string[];
	borderColor?: string[];
	borderWidth?: number;
}

// Session and tracking state
export interface TrackingSession {
	id: string;
	startTime: number;
	endTime?: number;
	filePath?: string;
	fileName?: string;
	folderPath?: string;
	tags: string[];
	isActive: boolean;
	lastActiveTime: number;
}

export interface TrackingState {
	isTracking: boolean;
	currentSession?: TrackingSession;
	lastActiveTime: number;
	totalTodayTime: number;
	isPaused: boolean;
	pauseReason?: string;
}

// Events and notifications
export interface TrackingEvent {
	type:
		| "start"
		| "stop"
		| "pause"
		| "resume"
		| "file_change"
		| "idle"
		| "active";
	timestamp: number;
	data?: any;
}

// Report generation
export interface ReportConfig {
	period: ViewPeriod;
	startDate?: string;
	endDate?: string;
	categories?: string[];
	tags?: string[];
	folders?: string[];
	chartTypes: ChartType[];
	includeDetails: boolean;
}

export interface GeneratedReport {
	config: ReportConfig;
	generatedAt: number;
	summary: {
		totalTime: number;
		averageDailyTime: number;
		mostActiveFile: string;
		mostActiveFolder: string;
		topTags: string[];
	};
	dailyStats: DailyStats[];
	charts: ChartData[];
	metadata: {
		exportFormat?: string;
		filePath?: string;
	};
}
