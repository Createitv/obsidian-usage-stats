import { BaseMessage } from "../types";

// Remember [use sentence case in UI](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+sentence+case+in+UI)
const translations: BaseMessage = {
	// General
	"plugin.name": "Usage Statistics",
	"plugin.description":
		"Track time spent in Obsidian with detailed statistics",

	// Status bar
	"statusBar.tracking": "{{time}} - {{category}}",
	"statusBar.paused": "Paused",
	"statusBar.idle": "Idle",
	"statusBar.inactive": "Inactive",
	"statusBar.active": "Tracking active",
	"statusBar.clickForActions": "Click for quick actions",

	// Commands
	"commands.startTracking": "Start time tracking",
	"commands.stopTracking": "Stop time tracking",
	"commands.pauseTracking": "Pause time tracking",
	"commands.resumeTracking": "Resume time tracking",
	"commands.openView": "Open usage statistics",
	"commands.exportData": "Export usage data",
	"commands.toggleTracking": "Toggle time tracking",
	"commands.showTodayStats": "Show today's statistics",
	"commands.showCurrentSession": "Show current session info",
	"commands.resetTodayData": "Reset today's data",
	"commands.quickToggle": "Quick toggle tracking",
	"commands.viewWeekly": "View weekly statistics",
	"commands.viewMonthly": "View monthly statistics",
	"commands.forceSave": "Force save usage data",
	"commands.debugState": "Debug: Show tracking state",

	// View
	"view.title": "Usage Statistics",
	"view.today": "Today",
	"view.week": "This week",
	"view.month": "This month",
	"view.year": "This year",
	"view.all": "All time",
	"view.noData": "No data available for this period",

	// Charts
	"chart.totalTime": "Total time",
	"chart.activeTime": "Active time",
	"chart.idleTime": "Idle time",
	"chart.categories": "Categories",
	"chart.files": "Files",
	"chart.tags": "Tags",
	"chart.byCategory": "Time by category",
	"chart.byFile": "Time by file",
	"chart.byTag": "Time by tag",
	"chart.daily": "Daily usage",
	"chart.weekly": "Weekly usage",

	// Statistics
	"stats.totalSessions": "Total sessions",
	"stats.averageSession": "Average session",
	"stats.longestSession": "Longest session",
	"stats.mostActiveFile": "Most active file",
	"stats.mostActiveFolder": "Most active folder",
	"stats.topTags": "Top tags",
	"stats.productivity": "Productivity",

	// Time format
	"time.seconds": "{{count}}s",
	"time.minutes": "{{count}}m",
	"time.hours": "{{count}}h",
	"time.hoursMinutes": "{{hours}}h {{minutes}}m",
	"time.minutesSeconds": "{{minutes}}m {{seconds}}s",
	"time.full": "{{hours}}h {{minutes}}m {{seconds}}s",
	"time.todayTotal": "Today: {{time}}",
	"time.intelligentlyInactive": "Smart idle time",

	// Settings
	"settings.title": "Usage Statistics Settings",
	"settings.general": "General",
	"settings.tracking": "Tracking",
	"settings.display": "Display",
	"settings.data": "Data & Privacy",
	"settings.advanced": "Advanced",

	"settings.enableTracking": "Enable time tracking",
	"settings.enableTracking.desc":
		"Automatically track time spent in different files and folders",
	"settings.language": "Language",
	"settings.language.desc": "Plugin interface language",
	"settings.enableView": "Enabled view",
	"settings.enableView.desc": "Enable usage statistics view",

	"settings.idleThreshold": "Idle threshold",
	"settings.idleThreshold.desc":
		"Time in seconds before considering user idle",
	"settings.trackInactiveTime": "Track inactive time",
	"settings.trackInactiveTime.desc":
		"Continue tracking when Obsidian is not focused",
	"settings.autoSaveInterval": "Auto-save interval",
	"settings.autoSaveInterval.desc": "How often to save data (in seconds)",

	"settings.enableTagTracking": "Enable tag tracking",
	"settings.enableTagTracking.desc": "Track time based on note tags",
	"settings.enableFolderTracking": "Enable folder tracking",
	"settings.enableFolderTracking.desc":
		"Track time spent in different folders",
	"settings.trackedFolders": "Tracked folders",
	"settings.trackedFolders.desc":
		"Specific folders to track (leave empty to track all)",
	"settings.excludedFolders": "Excluded folders",
	"settings.excludedFolders.desc": "Folders to exclude from tracking",

	"settings.showStatusBar": "Show status bar",
	"settings.showStatusBar.desc":
		"Display current tracking status in status bar",
	"settings.statusBarFormat": "Status bar format",
	"settings.statusBarFormat.desc":
		"Format for status bar display (use {{time}} and {{category}})",
	"settings.defaultChartType": "Default chart type",
	"settings.defaultChartType.desc":
		"Default visualization type for statistics",
	"settings.timeFormat": "Time format",
	"settings.timeFormat.desc": "12-hour or 24-hour time format",

	"settings.dataRetentionDays": "Data retention (days)",
	"settings.dataRetentionDays.desc":
		"How long to keep usage data (0 = forever)",
	"settings.enableDataExport": "Enable data export",
	"settings.enableDataExport.desc":
		"Allow exporting usage data to various formats",

	"settings.enableSyncToCloud": "Enable cloud sync",
	"settings.enableSyncToCloud.desc":
		"Sync data to cloud service (coming soon)",
	"settings.resetData": "Reset all data",
	"settings.resetData.desc": "Permanently delete all usage statistics",
	"settings.resetData.button": "Reset data",
	"settings.resetData.confirm":
		"Are you sure you want to delete all usage data? This cannot be undone.",

	// Additional settings
	"settings.cleanupOldData": "Clean up old data",
	"settings.cleanupOldData.desc":
		"Remove data older than the retention period",
	"settings.cleanupOldData.button": "Clean up",
	"settings.exportAllData": "Export all data",
	"settings.exportAllData.desc": "Export all usage statistics to a file",
	"settings.resetAllSettings": "Reset all settings",
	"settings.resetAllSettings.desc":
		"Reset all plugin settings to default values",
	"settings.resetAllSettings.confirm":
		"Are you sure you want to reset all settings? This cannot be undone.",

	// Debug section
	"debug.title": "Debug Information",
	"debug.pluginVersion": "Plugin Version",
	"debug.settingsFile": "Settings File",
	"debug.currentLanguage": "Current Language",
	"debug.trackingActive": "Tracking Active",
	"debug.todaySessions": "Today's Sessions",
	"debug.todayTotalTime": "Today's Total Time",

	// Notifications for settings
	"notification.dataCleanedUp": "Old data cleaned up successfully",

	// Command notifications and messages
	"message.cannotPause": "Cannot pause: tracking is not active",
	"message.cannotResume": "Cannot resume: tracking is not active",
	"message.noActiveSession": "No active session",
	"message.todayDataReset": "Today's data has been reset",
	"message.dataSaved": "Data saved successfully",
	"message.dataSaveFailed": "Failed to save data",
	"message.resetTodayConfirm":
		"Are you sure you want to reset today's usage data? This cannot be undone.",

	// Session info labels
	"label.fileName": "File",
	"label.category": "Category",
	"label.elapsed": "Elapsed",
	"label.status": "Status",
	"label.active": "Active",
	"label.inactive": "Inactive",
	"label.unknown": "Unknown",
	"label.uncategorized": "Uncategorized",

	// Debug info labels
	"debug.currentSession": "Current Session",
	"debug.trackingStateActive": "Tracking Active",
	"debug.isPaused": "Paused",
	"debug.totalTime": "Total Time",

	// Authentication
	"auth.login": "Login",
	"auth.logout": "Logout",
	"auth.loginRequired": "Login Required",
	"auth.loginDescription":
		"Connect to Obtime service to sync your usage data",
	"auth.authorizationStarted":
		"Authorization started. Please complete login in your browser.",
	"auth.authorizationFailed": "Authorization failed. Please try again.",
	"auth.loginSuccess": "Refresh to show login information!",
	"auth.loginFailed": "Login failed. Please try again.",
	"auth.logoutSuccess": "Logged out successfully",
	"auth.sessionExpired": "Session expired. Please login again.",
	"auth.insufficientPermissions":
		"Insufficient permissions for this operation",
	"auth.userDataUpdated": "User data updated successfully",
	"auth.connectionTest": "Test Connection",
	"auth.connectionTestSuccess": "Connection test successful",
	"auth.connectionTestFailed": "Connection test failed",
	"auth.connectionTestDescription": "Test connection to Obtime service",
	"auth.logoutDescription": "Disconnect from Obtime service",
	"auth.logoutConfirm":
		"Are you sure you want to logout? This will stop data synchronization.",
	"auth.callbackFailed": "OAuth callback processing failed",
	"auth.callbackMissingCode": "OAuth callback missing authorization code",
	"auth.loginAndSyncSuccess":
		"Login successful! Data synchronized with cloud service.",

	// Sync
	"sync.cloudSync": "Cloud Synchronization",
	"sync.enableSync": "Enable data synchronization",
	"sync.enableSync.desc": "Sync usage data with Obtime cloud service",
	"sync.syncNow": "Sync Now",
	"sync.syncNow.desc": "Manually sync data with cloud service",
	"sync.syncInProgress": "Sync in progress...",
	"sync.syncComplete":
		"Sync complete: {{uploaded}} uploaded, {{downloaded}} downloaded",
	"sync.syncError": "Sync error: {{error}}",
	"sync.networkError": "Network error. Please check your connection.",
	"sync.serverError": "Server error. Please try again later.",
	"sync.lastSync": "Last sync",
	"sync.autoSync": "Auto sync",
	"sync.autoSync.desc": "Automatically sync data at regular intervals",
	"sync.syncInterval": "Sync interval",
	"sync.syncInterval.desc":
		"How often to automatically sync data (in minutes)",

	// Upload
	"upload.fileUploaded": "File uploaded: {{filename}}",
	"upload.uploadFailed": "Upload failed",

	// User
	"user.profile": "User Profile",
	"user.nickname": "Nickname",
	"user.email": "Email",
	"user.locale": "Language",
	"user.notLoggedIn": "Not logged in",

	// Actions
	"action.refresh": "Refresh",

	// Chart types
	"chartType.pie": "Pie chart",
	"chartType.bar": "Bar chart",
	"chartType.line": "Line chart",
	"chartType.doughnut": "Doughnut chart",

	// Time formats
	"timeFormat.12h": "12-hour",
	"timeFormat.24h": "24-hour",

	// Languages
	"language.en": "English",
	"language.zh": "中文",

	// Notifications
	"notification.trackingStarted": "Time tracking started",
	"notification.trackingStopped": "Time tracking stopped",
	"notification.trackingPaused": "Time tracking paused",
	"notification.trackingResumed": "Time tracking resumed",
	"notification.dataExported": "Data exported successfully",
	"notification.dataReset": "All data has been reset",
	"notification.settingsSaved": "Settings saved",

	// Errors
	"error.exportFailed": "Failed to export data",
	"error.dataLoadFailed": "Failed to load usage data",
	"error.dataSaveFailed": "Failed to save usage data",
	"error.invalidTimeFormat": "Invalid time format",
	"error.invalidSettings": "Invalid settings configuration",

	// Export
	"export.title": "Export Usage Data",
	"export.format": "Export format",
	"export.period": "Time period",
	"export.filename": "File name",
	"export.button": "Export",
	"export.json": "JSON",
	"export.csv": "CSV",
	"export.markdown": "Markdown",

	// Reports
	"report.title": "Usage Report",
	"report.period": "Period: {{period}}",
	"report.generatedAt": "Generated at: {{date}}",
	"report.summary": "Summary",
	"report.details": "Details",
	"report.noData": "No data available for the selected period",

	// Categories
	"category.uncategorized": "Uncategorized",
	"category.notes": "Notes",
	"category.projects": "Projects",
	"category.research": "Research",
	"category.writing": "Writing",
	"category.planning": "Planning",

	// Common actions
	"action.save": "Save",
	"action.cancel": "Cancel",
	"action.delete": "Delete",
	"action.edit": "Edit",
	"action.export": "Export",
	"action.import": "Import",
	"action.close": "Close",
	"action.confirm": "Confirm",
	"action.reset": "Reset",
	"action.testing": "Testing...",
	"action.connecting": "Connecting...",
};

export default translations;
