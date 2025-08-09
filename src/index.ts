// Main plugin export
export { default as UsageStatsPlugin } from "./main";

// Core types
export { DEFAULT_SETTINGS } from "./core/types";
export type {
	UsageStatsSettings,
	TimeEntry,
	DailyStats,
	TrackingState,
	TrackingSession,
	ChartType,
	ViewPeriod,
	CategoryStats,
	FileStats,
	TagStats,
} from "./core/types";

// Core components
export { TimeTracker } from "./core/TimeTracker";
export { DataManager } from "./storage/DataManager";

// UI Components
export { USAGE_STATS_VIEW_TYPE, UsageStatsView } from "./components/PluginView";
export { UsageStatsSettingsTab } from "./components/SettingsTab";
export { StatusBarManager } from "./ui/StatusBarManager";
export { ChartRenderer } from "./ui/ChartRenderer";

// Commands
export { UsageStatsCommandManager } from "./commands/CommandManager";

// Internationalization
export { i18n, t } from "./i18n/i18n";
