import { BaseMessage } from "../types";

const translations: BaseMessage = {
	// General
	"plugin.name": "使用统计",
	"plugin.description": "追踪在 Obsidian 中的时间分配并显示详细统计信息",

	// Status bar
	"statusBar.tracking": "{{time}} - {{category}}",
	"statusBar.paused": "已暂停",
	"statusBar.idle": "空闲中",
	"statusBar.inactive": "未活跃",
	"statusBar.active": "追踪中",
	"statusBar.clickForActions": "点击快捷操作",

	// Commands
	"commands.startTracking": "开始时间追踪",
	"commands.stopTracking": "停止时间追踪",
	"commands.pauseTracking": "暂停时间追踪",
	"commands.resumeTracking": "恢复时间追踪",
	"commands.openView": "打开使用统计",
	"commands.exportData": "导出使用数据",
	"commands.toggleTracking": "切换时间追踪",
	"commands.showTodayStats": "显示今日统计",
	"commands.showCurrentSession": "显示当前会话信息",
	"commands.resetTodayData": "重置今日数据",
	"commands.quickToggle": "快速切换追踪",
	"commands.viewWeekly": "查看周统计",
	"commands.viewMonthly": "查看月统计",
	"commands.forceSave": "强制保存使用数据",
	"commands.debugState": "调试：显示追踪状态",

	// View
	"view.title": "使用统计",
	"view.today": "今天",
	"view.week": "本周",
	"view.month": "本月",
	"view.year": "今年",
	"view.all": "全部时间",
	"view.noData": "该时间段暂无数据",

	// Charts
	"chart.totalTime": "总时间",
	"chart.activeTime": "活跃时间",
	"chart.idleTime": "空闲时间",
	"chart.categories": "分类",
	"chart.files": "文件",
	"chart.tags": "标签",
	"chart.byCategory": "按分类统计时间",
	"chart.byFile": "按文件统计时间",
	"chart.byTag": "按标签统计时间",
	"chart.daily": "日常使用",
	"chart.weekly": "每周使用",

	// Statistics
	"stats.totalSessions": "总会话数",
	"stats.averageSession": "平均会话时长",
	"stats.longestSession": "最长会话",
	"stats.mostActiveFile": "最活跃文件",
	"stats.mostActiveFolder": "最活跃文件夹",
	"stats.topTags": "热门标签",
	"stats.productivity": "生产力",

	// Time format
	"time.seconds": "{{count}}秒",
	"time.minutes": "{{count}}分钟",
	"time.hours": "{{count}}小时",
	"time.hoursMinutes": "{{hours}}小时{{minutes}}分钟",
	"time.minutesSeconds": "{{minutes}}分钟{{seconds}}秒",
	"time.full": "{{hours}}小时{{minutes}}分钟{{seconds}}秒",
	"time.todayTotal": "今日：{{time}}",
	"time.intelligentlyInactive": "智能空闲时间",

	// Settings
	"settings.title": "使用统计设置",
	"settings.general": "通用",
	"settings.tracking": "追踪",
	"settings.display": "显示",
	"settings.data": "数据与隐私",
	"settings.advanced": "高级",

	"settings.enableTracking": "启用时间追踪",
	"settings.enableTracking.desc": "自动追踪在不同文件和文件夹中花费的时间",
	"settings.language": "语言",
	"settings.language.desc": "插件界面语言",

	"settings.enableView": "启用视图",
	"settings.enableView.desc": "启用使用统计视图",
	"settings.idleThreshold": "空闲阈值",
	"settings.idleThreshold.desc": "多少秒后认为用户处于空闲状态",
	"settings.trackInactiveTime": "追踪非活跃时间",
	"settings.trackInactiveTime.desc": "当 Obsidian 失去焦点时继续追踪",
	"settings.autoSaveInterval": "自动保存间隔",
	"settings.autoSaveInterval.desc": "多长时间保存一次数据（以秒为单位）",

	"settings.enableTagTracking": "启用标签追踪",
	"settings.enableTagTracking.desc": "基于笔记标签追踪时间",
	"settings.enableFolderTracking": "启用文件夹追踪",
	"settings.enableFolderTracking.desc": "追踪在不同文件夹中花费的时间",
	"settings.trackedFolders": "追踪的文件夹",
	"settings.trackedFolders.desc": "要追踪的特定文件夹（留空则追踪所有）",
	"settings.excludedFolders": "排除的文件夹",
	"settings.excludedFolders.desc": "从追踪中排除的文件夹",

	"settings.showStatusBar": "显示状态栏",
	"settings.showStatusBar.desc": "在状态栏中显示当前追踪状态",
	"settings.statusBarFormat": "状态栏格式",
	"settings.statusBarFormat.desc":
		"状态栏显示格式（使用 {{time}} 和 {{category}}）",
	"settings.defaultChartType": "默认图表类型",
	"settings.defaultChartType.desc": "统计信息的默认可视化类型",
	"settings.timeFormat": "时间格式",
	"settings.timeFormat.desc": "12小时制或24小时制",

	"settings.dataRetentionDays": "数据保留天数",
	"settings.dataRetentionDays.desc": "保留使用数据的时长（0 = 永久保留）",
	"settings.enableDataExport": "启用数据导出",
	"settings.enableDataExport.desc": "允许将使用数据导出为各种格式",
	"settings.autoBackup": "自动备份",
	"settings.autoBackup.desc": "自动创建使用数据的备份",

	"settings.enableSyncToCloud": "启用云端同步",
	"settings.enableSyncToCloud.desc": "同步数据到云服务（即将推出）",
	"settings.resetData": "重置所有数据",
	"settings.resetData.desc": "永久删除所有使用统计数据",
	"settings.resetData.button": "重置数据",
	"settings.resetData.confirm": "确定要删除所有使用数据吗？此操作无法撤销。",

	// Additional settings
	"settings.cleanupOldData": "清理旧数据",
	"settings.cleanupOldData.desc": "删除超过保留期的数据",
	"settings.cleanupOldData.button": "清理",
	"settings.exportAllData": "导出所有数据",
	"settings.exportAllData.desc": "将所有使用统计数据导出到文件",
	"settings.resetAllSettings": "重置所有设置",
	"settings.resetAllSettings.desc": "将所有插件设置重置为默认值",
	"settings.resetAllSettings.confirm":
		"确定要重置所有设置吗？此操作无法撤销。",

	// Debug section
	"debug.title": "调试信息",
	"debug.pluginVersion": "插件版本",
	"debug.settingsFile": "设置文件",
	"debug.currentLanguage": "当前语言",
	"debug.trackingActive": "追踪状态",
	"debug.todaySessions": "今日会话数",
	"debug.todayTotalTime": "今日总时间",

	// Notifications for settings
	"notification.dataCleanedUp": "旧数据清理成功",

	// Command notifications and messages
	"message.cannotPause": "无法暂停：追踪未激活",
	"message.cannotResume": "无法恢复：追踪未激活",
	"message.noActiveSession": "无活跃会话",
	"message.todayDataReset": "今日数据已重置",
	"message.dataSaved": "数据保存成功",
	"message.dataSaveFailed": "数据保存失败",
	"message.resetTodayConfirm": "确定要重置今日使用数据吗？此操作无法撤销。",

	// Session info labels
	"label.fileName": "文件",
	"label.category": "分类",
	"label.elapsed": "已用时间",
	"label.status": "状态",
	"label.active": "活跃",
	"label.inactive": "非活跃",
	"label.unknown": "未知",
	"label.uncategorized": "未分类",

	// Debug info labels
	"debug.currentSession": "当前会话",
	"debug.trackingStateActive": "追踪状态",
	"debug.isPaused": "已暂停",
	"debug.totalTime": "总时间",

	// Authentication
	"auth.login": "登录",
	"auth.logout": "登出",
	"auth.loginRequired": "需要登录",
	"auth.loginDescription": "连接到 Obtime 服务以同步您的使用数据",
	"auth.authorizationStarted": "授权已开始。请在浏览器中完成登录。",
	"auth.authorizationFailed": "授权失败。请重试。",
	"auth.loginSuccess": "刷新显示登录信息！",
	"auth.loginFailed": "登录失败。请重试。",
	"auth.logoutSuccess": "登出成功",
	"auth.sessionExpired": "会话已过期。请重新登录。",
	"auth.insufficientPermissions": "此操作权限不足",
	"auth.userDataUpdated": "用户数据更新成功",
	"auth.connectionTest": "测试连接",
	"auth.connectionTestSuccess": "连接测试成功",
	"auth.connectionTestFailed": "连接测试失败",
	"auth.connectionTestDescription": "测试与Obtime服务的连接",
	"auth.logoutDescription": "断开与Obtime服务的连接",
	"auth.logoutConfirm": "确定要登出吗？这将停止数据同步。",
	"auth.callbackFailed": "OAuth回调处理失败",
	"auth.callbackMissingCode": "OAuth回调缺少授权码",
	"auth.loginAndSyncSuccess": "登录成功！数据已与云服务同步。",

	// Sync
	"sync.cloudSync": "云端同步",
	"sync.enableSync": "启用数据同步",
	"sync.enableSync.desc": "与 Obtime 云服务同步使用数据",
	"sync.syncNow": "立即同步",
	"sync.syncNow.desc": "手动与云端服务同步数据",
	"sync.syncInProgress": "同步进行中...",
	"sync.syncComplete":
		"同步完成：已上传 {{uploaded}} 条，已下载 {{downloaded}} 条",
	"sync.syncError": "同步错误：{{error}}",
	"sync.networkError": "网络错误。请检查您的连接。",
	"sync.serverError": "服务器错误。请稍后重试。",
	"sync.lastSync": "上次同步",
	"sync.autoSync": "自动同步",
	"sync.autoSync.desc": "定期自动同步数据",
	"sync.syncInterval": "同步间隔",
	"sync.syncInterval.desc": "自动同步数据的频率（分钟）",

	// Upload
	"upload.fileUploaded": "文件已上传：{{filename}}",
	"upload.uploadFailed": "上传失败",

	// User
	"user.profile": "用户资料",
	"user.nickname": "昵称",
	"user.email": "邮箱",
	"user.locale": "语言",
	"user.notLoggedIn": "未登录",

	// Actions
	"action.refresh": "刷新",

	// Chart types
	"chartType.pie": "饼图",
	"chartType.bar": "柱状图",
	"chartType.line": "线图",
	"chartType.doughnut": "环形图",

	// Time formats
	"timeFormat.12h": "12小时制",
	"timeFormat.24h": "24小时制",

	// Languages
	"language.en": "English",
	"language.zh": "中文",

	// Notifications
	"notification.trackingStarted": "时间追踪已开始",
	"notification.trackingStopped": "时间追踪已停止",
	"notification.trackingPaused": "时间追踪已暂停",
	"notification.trackingResumed": "时间追踪已恢复",
	"notification.dataExported": "数据导出成功",
	"notification.dataReset": "所有数据已重置",
	"notification.settingsSaved": "设置已保存",

	// Errors
	"error.exportFailed": "数据导出失败",
	"error.dataLoadFailed": "加载使用数据失败",
	"error.dataSaveFailed": "保存使用数据失败",
	"error.invalidTimeFormat": "无效的时间格式",
	"error.invalidSettings": "无效的设置配置",

	// Export
	"export.title": "导出使用数据",
	"export.format": "导出格式",
	"export.period": "时间段",
	"export.filename": "文件名",
	"export.button": "导出",
	"export.json": "JSON",
	"export.csv": "CSV",
	"export.markdown": "Markdown",

	// Reports
	"report.title": "使用报告",
	"report.period": "时间段：{{period}}",
	"report.generatedAt": "生成时间：{{date}}",
	"report.summary": "概要",
	"report.details": "详情",
	"report.noData": "所选时间段没有可用数据",

	// Categories
	"category.uncategorized": "未分类",
	"category.notes": "笔记",
	"category.projects": "项目",
	"category.research": "研究",
	"category.writing": "写作",
	"category.planning": "规划",

	// Common actions
	"action.save": "保存",
	"action.cancel": "取消",
	"action.delete": "删除",
	"action.edit": "编辑",
	"action.export": "导出",
	"action.import": "导入",
	"action.close": "关闭",
	"action.confirm": "确认",
	"action.reset": "重置",
	"action.testing": "测试中...",
	"action.connecting": "连接中...",
};

export default translations;
