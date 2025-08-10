/**
 * File Tracker Manager for handling file-tracker.json data
 */

import { Component, Vault, TFile } from 'obsidian'
import {
	FileTrackerData,
	FileTrackingStats,
	FolderTrackingStats,
	TagTrackingStats,
	TimelineEntry,
	DailySummary,
	TrackerSummary,
} from '../core/types'

export class FileTrackerManager extends Component {
	private vault: Vault
	private data: FileTrackerData | null = null
	private readonly FILE_PATH =
		'.obsidian/plugins/obsidian-usage-stats/file-tracker.json'

	constructor(vault: Vault) {
		super()
		this.vault = vault
	}

	onload(): void {
		this.loadData()
	}

	/**
	 * 初始化并加载数据
	 */
	async initialize(): Promise<void> {
		await this.loadData()

		// 如果没有找到数据，使用示例数据进行测试
		if (!this.data || Object.keys(this.data.summary || {}).length === 0) {
			console.log(
				'FileTrackerManager: No data found, using sample data for testing'
			)
			await this.loadSampleData()
		}
	}

	/**
	 * 加载示例数据用于测试
	 */
	private async loadSampleData(): Promise<void> {
		const sampleData = {
			version: '1.0.0',
			lastUpdated: 1754807332884,
			files: {
				'日记/2025-W27.md': {
					fileName: '2025-W27.md',
					filePath: '日记/2025-W27.md',
					folderPath: '日记',
					totalTime: 1.5,
					sessionCount: 1,
					lastAccessed: 1754807332852,
					lastAccessedReadable: '2025-08-10 14:28:52',
					firstAccessed: 1754807332884,
					firstAccessedReadable: '2025-08-10 14:28:52',
					tags: [],
					averageSessionTime: 1.5,
				},
				'日记/2025-07-30.md': {
					fileName: '2025-07-30.md',
					filePath: '日记/2025-07-30.md',
					folderPath: '日记',
					totalTime: 12.3,
					sessionCount: 1,
					lastAccessed: 1754807345170,
					lastAccessedReadable: '2025-08-10 14:29:05',
					firstAccessed: 1754807345251,
					firstAccessedReadable: '2025-08-10 14:29:05',
					tags: [],
					averageSessionTime: 12.3,
				},
				'template/笔记模版.md': {
					fileName: '笔记模版.md',
					filePath: 'template/笔记模版.md',
					folderPath: 'template',
					totalTime: 1.8,
					sessionCount: 1,
					lastAccessed: 1754807347017,
					lastAccessedReadable: '2025-08-10 14:29:07',
					firstAccessed: 1754807347018,
					firstAccessedReadable: '2025-08-10 14:29:07',
					tags: [],
					averageSessionTime: 1.8,
				},
				'记录笔记.md': {
					fileName: '记录笔记.md',
					filePath: '记录笔记.md',
					folderPath: '/',
					totalTime: 15.6,
					sessionCount: 1,
					lastAccessed: 1754807366779,
					lastAccessedReadable: '2025-08-10 14:29:26',
					firstAccessed: 1754807366783,
					firstAccessedReadable: '2025-08-10 14:29:26',
					tags: [],
					averageSessionTime: 15.6,
				},
			},
			folders: {
				日记: {
					folderPath: '日记',
					totalTime: 13.8,
					fileCount: 2,
					sessionCount: 2,
					lastAccessed: 1754807345170,
					lastAccessedReadable: '2025-08-10 14:29:05',
					firstAccessed: 1754807332884,
					firstAccessedReadable: '2025-08-10 14:28:52',
					files: ['2025-W27.md', '2025-07-30.md'],
					averageSessionTime: 6.9,
				},
				template: {
					folderPath: 'template',
					totalTime: 1.8,
					fileCount: 1,
					sessionCount: 1,
					lastAccessed: 1754807347017,
					lastAccessedReadable: '2025-08-10 14:29:07',
					firstAccessed: 1754807347018,
					firstAccessedReadable: '2025-08-10 14:29:07',
					files: ['笔记模版.md'],
					averageSessionTime: 1.8,
				},
				'/': {
					folderPath: '/',
					totalTime: 15.6,
					fileCount: 1,
					sessionCount: 1,
					lastAccessed: 1754807366779,
					lastAccessedReadable: '2025-08-10 14:29:26',
					firstAccessed: 1754807366783,
					firstAccessedReadable: '2025-08-10 14:29:26',
					files: ['记录笔记.md'],
					averageSessionTime: 15.6,
				},
			},
			tags: {},
			timeline: [
				{
					id: 'session-1754807351169-m2h9dqlox',
					fileName: '记录笔记.md',
					filePath: '记录笔记.md',
					folderPath: '/',
					startTime: 1754807351169,
					startTimeReadable: '2025-08-10 14:29:11',
					endTime: 1754807366779,
					endTimeReadable: '2025-08-10 14:29:26',
					duration: 15.6,
					tags: [],
					sessionType: 'edit',
				},
				{
					id: 'session-1754807345171-havdl7fze',
					fileName: '笔记模版.md',
					filePath: 'template/笔记模版.md',
					folderPath: 'template',
					startTime: 1754807345171,
					startTimeReadable: '2025-08-10 14:29:05',
					endTime: 1754807347017,
					endTimeReadable: '2025-08-10 14:29:07',
					duration: 1.8,
					tags: [],
					sessionType: 'edit',
				},
				{
					id: 'session-1754807332852-pbfi7u8ws',
					fileName: '2025-07-30.md',
					filePath: '日记/2025-07-30.md',
					folderPath: '日记',
					startTime: 1754807332852,
					startTimeReadable: '2025-08-10 14:28:52',
					endTime: 1754807345170,
					endTimeReadable: '2025-08-10 14:29:05',
					duration: 12.3,
					tags: [],
					sessionType: 'edit',
				},
				{
					id: 'session-1754807331355-c69riefar',
					fileName: '2025-W27.md',
					filePath: '日记/2025-W27.md',
					folderPath: '日记',
					startTime: 1754807331355,
					startTimeReadable: '2025-08-10 14:28:51',
					endTime: 1754807332852,
					endTimeReadable: '2025-08-10 14:28:52',
					duration: 1.5,
					tags: [],
					sessionType: 'edit',
				},
			],
			summary: {
				'2025-08-10': {
					date: '2025-08-10',
					dateReadable: '2025年08月10日',
					totalFiles: 4,
					totalFolders: 3,
					totalTags: 0,
					totalTimeSpent: 31.2,
					lastActiveFile: '记录笔记.md',
					lastActiveFolder: '/',
					mostUsedTag: '',
					lastUpdated: 1754807366783,
					lastUpdatedReadable: '2025-08-10 14:29:26',
				},
			},
		}

		this.data = sampleData as FileTrackerData
		console.log(
			'FileTrackerManager: Sample data loaded with summary keys:',
			Object.keys(this.data.summary)
		)
	}

	/**
	 * 加载 file-tracker.json 数据
	 */
	private async loadData(): Promise<void> {
		try {
			console.log('FileTrackerManager: Attempting to load', this.FILE_PATH)

			// 使用 vault.adapter.read 直接读取文件，类似 DataManager 的方式
			const content = await this.vault.adapter.read(this.FILE_PATH)
			console.log('FileTrackerManager: File content length:', content.length)
			console.log(
				'FileTrackerManager: File content preview:',
				content.substring(0, 200) + '...'
			)

			this.data = JSON.parse(content) as FileTrackerData
			console.log('FileTrackerManager: Data loaded successfully', {
				version: this.data.version,
				lastUpdated: this.data.lastUpdated,
				filesCount: Object.keys(this.data.files || {}).length,
				foldersCount: Object.keys(this.data.folders || {}).length,
				summaryKeys: Object.keys(this.data.summary || {}),
				summaryData: this.data.summary,
				timelineCount: this.data.timeline?.length || 0,
			})
		} catch (error) {
			console.warn(
				'FileTrackerManager: Failed to load file-tracker.json:',
				error
			)
			// 如果文件不存在，创建空的数据结构并尝试创建文件
			this.data = this.createEmptyData()
			await this.saveData() // 创建文件
		}
	}

	/**
	 * 保存数据到 file-tracker.json
	 */
	async saveData(): Promise<void> {
		if (!this.data) return

		try {
			this.data.lastUpdated = Date.now()
			const content = JSON.stringify(this.data, null, 2)

			// 使用 vault.adapter.write 直接写入文件，类似 DataManager 的方式
			await this.vault.adapter.write(this.FILE_PATH, content)
			console.log(
				'FileTrackerManager: Data saved successfully to',
				this.FILE_PATH
			)
		} catch (error) {
			console.error('Failed to save file-tracker.json:', error)
		}
	}

	/**
	 * 获取今日统计数据
	 */
	getTodayStats(): DailySummary {
		console.log('FileTrackerManager.getTodayStats: data loaded?', !!this.data)
		if (!this.data) {
			console.warn(
				'FileTrackerManager.getTodayStats: No data available, returning empty stats'
			)
			return this.createEmptyDailySummary()
		}

		const today = this.getDateKey(Date.now())
		console.log('FileTrackerManager.getTodayStats: today key:', today)
		console.log(
			'FileTrackerManager.getTodayStats: available summary keys:',
			Object.keys(this.data.summary || {})
		)
		console.log(
			'FileTrackerManager.getTodayStats: full summary object:',
			this.data.summary
		)

		let todayData = this.data.summary[today]

		// 如果今天没有数据，使用最新的可用数据
		if (!todayData && Object.keys(this.data.summary).length > 0) {
			const latestKey = Object.keys(this.data.summary).sort().pop()
			if (latestKey) {
				todayData = this.data.summary[latestKey]
				console.log(
					'FileTrackerManager.getTodayStats: Using latest available data from:',
					latestKey
				)
			}
		}

		if (todayData) {
			console.log('FileTrackerManager.getTodayStats: found data:', todayData)
			return todayData
		} else {
			console.warn(
				'FileTrackerManager.getTodayStats: No data available, returning empty stats'
			)
			return this.createEmptyDailySummary()
		}
	}

	/**
	 * 获取指定日期的统计数据
	 */
	getStatsForDate(date: string): DailySummary | undefined {
		if (!this.data) return undefined
		return this.data.summary[date]
	}

	/**
	 * 获取所有文件统计
	 */
	getFileStats(): FileTrackingStats[] {
		if (!this.data) return []

		return Object.values(this.data.files).sort(
			(a, b) => b.totalTime - a.totalTime
		)
	}

	/**
	 * 获取所有文件夹统计
	 */
	getFolderStats(): FolderTrackingStats[] {
		if (!this.data) return []

		return Object.values(this.data.folders).sort(
			(a, b) => b.totalTime - a.totalTime
		)
	}

	/**
	 * 获取所有标签统计
	 */
	getTagStats(): TagTrackingStats[] {
		if (!this.data) return []

		return Object.values(this.data.tags).sort(
			(a, b) => b.totalTime - a.totalTime
		)
	}

	/**
	 * 获取时间线数据
	 */
	getTimeline(): TimelineEntry[] {
		if (!this.data) return []
		return this.data.timeline || []
	}

	/**
	 * 获取指定时间段的统计数据
	 */
	getStatsForPeriod(
		period: 'today' | 'week' | 'month' | 'year' | 'all'
	): DailySummary[] {
		if (!this.data) return []

		const now = new Date()
		const today = this.getDateKey(now.getTime())
		let startDate: Date

		switch (period) {
			case 'today':
				return [this.getTodayStats()]
			case 'week':
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
				break
			case 'month':
				startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
				break
			case 'year':
				startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
				break
			case 'all':
				return Object.values(this.data.summary)
			default:
				return [this.getTodayStats()]
		}

		const result: DailySummary[] = []
		const current = new Date(startDate)

		while (current <= now) {
			const dateKey = this.getDateKey(current.getTime())
			const stats = this.data.summary[dateKey]
			if (stats) {
				result.push(stats)
			}
			current.setDate(current.getDate() + 1)
		}

		return result
	}

	/**
	 * 获取聚合统计数据（兼容 PluginView 期望的格式）
	 */
	getAggregatedStats(period: 'today' | 'week' | 'month' | 'year' | 'all') {
		const periodStats = this.getStatsForPeriod(period)
		const fileStats = this.getFileStats()
		const folderStats = this.getFolderStats()
		const tagStats = this.getTagStats()

		// 计算总时间
		const totalTime =
			periodStats.reduce((sum, stat) => sum + (stat.totalTimeSpent || 0), 0) *
			1000 // 转换为毫秒

		// 为了兼容现有的 PluginView，我们需要将数据转换为期望的格式
		const categoryStats = folderStats.map((folder, index) => ({
			category: folder.folderPath === '/' ? 'Root' : folder.folderPath,
			totalTime: folder.totalTime * 1000, // 转换为毫秒
			percentage:
				totalTime > 0 ? ((folder.totalTime * 1000) / totalTime) * 100 : 0,
			count: folder.fileCount,
		}))

		const convertedFileStats = fileStats.map((file) => ({
			filePath: file.filePath,
			fileName: file.fileName,
			totalTime: file.totalTime * 1000, // 转换为毫秒
			percentage:
				totalTime > 0 ? ((file.totalTime * 1000) / totalTime) * 100 : 0,
			lastAccessed: file.lastAccessed,
			accessCount: file.sessionCount,
		}))

		const convertedTagStats = tagStats.map((tag) => ({
			tag: tag.tagName,
			totalTime: tag.totalTime * 1000, // 转换为毫秒
			percentage:
				totalTime > 0 ? ((tag.totalTime * 1000) / totalTime) * 100 : 0,
			fileCount: tag.fileCount,
		}))

		return {
			totalTime,
			categoryStats,
			fileStats: convertedFileStats,
			tagStats: convertedTagStats,
			folderStats: folderStats, // 保留原始文件夹统计
		}
	}

	/**
	 * 检查数据是否已加载
	 */
	isLoaded(): boolean {
		return this.data !== null
	}

	/**
	 * 获取原始数据
	 */
	getRawData(): FileTrackerData | null {
		return this.data
	}

	/**
	 * 创建空的数据结构
	 */
	private createEmptyData(): FileTrackerData {
		return {
			version: '1.0.0',
			lastUpdated: Date.now(),
			files: {},
			folders: {},
			tags: {},
			timeline: [],
			summary: {},
		}
	}

	/**
	 * 创建空的日统计
	 */
	private createEmptyDailySummary(): DailySummary {
		const today = new Date()
		const dateKey = this.getDateKey(today.getTime())

		return {
			date: dateKey,
			dateReadable: today
				.toLocaleDateString('zh-CN', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
				})
				.replace(/\//g, '年')
				.replace(/年(\d+)月/, '年$1月')
				.replace(/月(\d+)$/, '月$1日'),
			totalFiles: 0,
			totalFolders: 0,
			totalTags: 0,
			totalTimeSpent: 0,
			lastActiveFile: '',
			lastActiveFolder: '',
			mostUsedTag: '',
			lastUpdated: Date.now(),
			lastUpdatedReadable: today.toLocaleString('zh-CN'),
		}
	}

	/**
	 * 获取日期键值 (YYYY-MM-DD)
	 */
	private getDateKey(timestamp: number): string {
		const date = new Date(timestamp)
		return (
			date.getFullYear() +
			'-' +
			String(date.getMonth() + 1).padStart(2, '0') +
			'-' +
			String(date.getDate()).padStart(2, '0')
		)
	}

	/**
	 * 刷新数据
	 */
	async refresh(): Promise<void> {
		await this.loadData()
	}

	/**
	 * 导入现有的 file-tracker.json 数据
	 */
	async importExistingData(jsonContent: string): Promise<void> {
		try {
			const importedData = JSON.parse(jsonContent) as FileTrackerData
			this.data = importedData
			await this.saveData()
			console.log('FileTrackerManager: Successfully imported existing data')
		} catch (error) {
			console.error('FileTrackerManager: Failed to import data:', error)
		}
	}
}
