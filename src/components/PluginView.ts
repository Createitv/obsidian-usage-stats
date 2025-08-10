import { ItemView, WorkspaceLeaf, Setting, Notice } from 'obsidian'
import { ViewPeriod, ChartType, UsageStatsSettings } from '../core/types'
import { DataManager } from '../storage/DataManager'
import { FileTrackerManager } from '../storage/FileTrackerManager'
import { ChartRenderer } from '../ui/ChartRenderer'
import { t } from '../i18n/i18n'

export const USAGE_STATS_VIEW_TYPE = 'usage-stats-view'
export const USAGE_STATS_VIEW_ICON = 'clock'

export class UsageStatsView extends ItemView {
	private dataManager: DataManager
	private fileTrackerManager: FileTrackerManager
	private settings: UsageStatsSettings
	private currentPeriod: ViewPeriod = 'today'
	private currentChartType: ChartType = 'pie'
	private refreshInterval?: NodeJS.Timeout

	constructor(
		leaf: WorkspaceLeaf,
		dataManager: DataManager,
		fileTrackerManager: FileTrackerManager,
		settings: UsageStatsSettings
	) {
		super(leaf)
		this.dataManager = dataManager
		this.fileTrackerManager = fileTrackerManager
		this.settings = settings
		this.currentChartType = settings.defaultChartType
	}

	getViewType(): string {
		return USAGE_STATS_VIEW_TYPE
	}

	getDisplayText(): string {
		return t('view.title')
	}

	getIcon(): string {
		return USAGE_STATS_VIEW_ICON
	}

	async onOpen() {
		// Ensure FileTrackerManager is loaded before rendering
		if (!this.fileTrackerManager.isLoaded()) {
			console.log(
				'PluginView.onOpen: FileTrackerManager not loaded, waiting for initialization...'
			)
			await this.fileTrackerManager.initialize()
		}
		this.renderView()
		this.startAutoRefresh()
	}

	async onClose() {
		this.stopAutoRefresh()
	}

	public updateSettings(newSettings: UsageStatsSettings): void {
		this.settings = newSettings
		this.renderView()
	}

	private renderView(): void {
		const container = this.containerEl.children[1] as HTMLElement
		container.empty()
		container.addClass('usage-stats-view')

		// Header
		this.renderHeader(container)

		// Controls
		this.renderControls(container)

		// Main content area
		const contentEl = container.createEl('div', {
			cls: 'usage-stats-content',
		})

		// Today's overview
		this.renderTodayOverview(contentEl)

		// Timeline section
		this.renderTimelineSection(contentEl)

		// Charts section
		this.renderChartsSection(contentEl)

		// Statistics section
		this.renderStatisticsSection(contentEl)

		// Session analysis section
		this.renderSessionAnalysisSection(contentEl)
	}

	private renderHeader(container: HTMLElement): void {
		const header = container.createEl('div', { cls: 'usage-stats-header' })

		const title = header.createEl('h2', {
			text: t('view.title'),
			cls: 'usage-stats-title',
		})

		// Quick action buttons
		const actions = header.createEl('div', { cls: 'usage-stats-actions' })

		const refreshBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': t('action.refresh') },
		})
		refreshBtn.createEl('span', { cls: 'lucide-refresh-cw' })
		refreshBtn.addEventListener('click', async () => {
			await this.fileTrackerManager.refresh()
			this.renderView()
		})

		const exportBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': t('action.export') },
		})
		exportBtn.createEl('span', { cls: 'lucide-download' })
		exportBtn.addEventListener('click', () => this.showExportModal())
	}

	private renderControls(container: HTMLElement): void {
		const controls = container.createEl('div', {
			cls: 'usage-stats-controls',
		})

		// Period selector
		const periodGroup = controls.createEl('div', { cls: 'control-group' })
		periodGroup.createEl('label', { text: t('export.period') })

		const periodSelect = periodGroup.createEl('select', {
			cls: 'dropdown',
		})
		const periods: ViewPeriod[] = ['today', 'week', 'month', 'year', 'all']

		periods.forEach((period) => {
			const option = periodSelect.createEl('option', {
				text: t(`view.${period}`),
				value: period,
			})
			if (period === this.currentPeriod) {
				option.selected = true
			}
		})

		periodSelect.addEventListener('change', (e) => {
			this.currentPeriod = (e.target as HTMLSelectElement).value as ViewPeriod
			this.renderView()
		})

		// Chart type selector
		const chartGroup = controls.createEl('div', { cls: 'control-group' })
		chartGroup.createEl('label', { text: t('settings.defaultChartType') })

		const chartSelect = chartGroup.createEl('select', { cls: 'dropdown' })
		const chartTypes: ChartType[] = ['pie', 'doughnut', 'bar', 'line']

		chartTypes.forEach((type) => {
			const option = chartSelect.createEl('option', {
				text: t(`chartType.${type}`),
				value: type,
			})
			if (type === this.currentChartType) {
				option.selected = true
			}
		})

		chartSelect.addEventListener('change', (e) => {
			this.currentChartType = (e.target as HTMLSelectElement).value as ChartType
			this.renderChartsSection(
				this.containerEl.querySelector('.usage-stats-content') as HTMLElement
			)
		})
	}

	private renderTodayOverview(container: HTMLElement): void {
		const overview = container.createEl('div', { cls: 'today-overview' })

		// Header with date
		const headerEl = overview.createEl('div', { cls: 'today-header' })
		headerEl.createEl('h3', { text: t('view.today') })
		headerEl.createEl('div', {
			cls: 'today-date',
			text: new Date().toLocaleDateString('zh-CN', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			}),
		})

		// Debug info
		console.log('PluginView.renderTodayOverview: Getting today stats...')
		const todayStats = this.fileTrackerManager.getTodayStats()
		console.log(
			'PluginView.renderTodayOverview: Today stats received:',
			todayStats
		)

		const cards = overview.createEl('div', { cls: 'stats-cards' })

		// Total time card
		const totalCard = cards.createEl('div', {
			cls: 'stat-card stat-card-primary',
		})
		totalCard.createEl('div', {
			cls: 'stat-value',
			text: this.formatDuration(todayStats.totalTimeSpent * 1000), // Convert seconds to milliseconds
		})
		totalCard.createEl('div', {
			cls: 'stat-label',
			text: t('chart.totalTime'),
		})

		// Total files card
		const filesCard = cards.createEl('div', { cls: 'stat-card' })
		filesCard.createEl('div', {
			cls: 'stat-value',
			text: todayStats.totalFiles.toString(),
		})
		filesCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.totalFiles'),
		})

		// Total folders card
		const foldersCard = cards.createEl('div', { cls: 'stat-card' })
		foldersCard.createEl('div', {
			cls: 'stat-value',
			text: todayStats.totalFolders.toString(),
		})
		foldersCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.totalFolders'),
		})

		// Sessions count
		const timeline = this.fileTrackerManager.getTimeline()
		const todaySessions = timeline.filter((session) => {
			const sessionDate = new Date(session.startTime).toDateString()
			const today = new Date().toDateString()
			return sessionDate === today
		})

		const sessionsCard = cards.createEl('div', { cls: 'stat-card' })
		sessionsCard.createEl('div', {
			cls: 'stat-value',
			text: todaySessions.length.toString(),
		})
		sessionsCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.totalSessions'),
		})

		// Average session time
		const avgSessionTime =
			todaySessions.length > 0
				? todaySessions.reduce((sum, s) => sum + s.duration, 0) /
				  todaySessions.length
				: 0

		const avgCard = cards.createEl('div', { cls: 'stat-card' })
		avgCard.createEl('div', {
			cls: 'stat-value',
			text: this.formatDuration(avgSessionTime * 1000),
		})
		avgCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.averageSession'),
		})

		// Last active file card (if available)
		if (todayStats.lastActiveFile) {
			const fileCard = cards.createEl('div', {
				cls: 'stat-card stat-card-wide',
			})
			const fileInfo = fileCard.createEl('div', { cls: 'stat-file-info' })
			fileInfo.createEl('div', {
				cls: 'stat-value stat-value-small',
				text: todayStats.lastActiveFile,
			})
			fileInfo.createEl('div', {
				cls: 'stat-label',
				text: t('stats.lastActiveFile'),
			})
		}

		// Add comparison with yesterday if available
		this.renderDayComparison(overview, todayStats)
	}

	private renderTimelineSection(container: HTMLElement): void {
		const timelineSection = container.createEl('div', {
			cls: 'timeline-section',
		})
		timelineSection.createEl('h3', { text: t('view.timeline') })

		const timeline = this.fileTrackerManager.getTimeline()

		if (timeline.length === 0) {
			timelineSection.createEl('div', {
				cls: 'no-data-message',
				text: t('view.noTimelineData'),
			})
			return
		}

		// Show only last 10 sessions for readability
		const recentSessions = timeline.slice(-10).reverse()

		const timelineContainer = timelineSection.createEl('div', {
			cls: 'timeline-container',
		})

		recentSessions.forEach((session, index) => {
			const sessionEl = timelineContainer.createEl('div', {
				cls: 'timeline-item',
			})

			// Time indicator
			const timeEl = sessionEl.createEl('div', { cls: 'timeline-time' })
			timeEl.createEl('div', {
				cls: 'timeline-time-start',
				text: new Date(session.startTime).toLocaleTimeString('zh-CN', {
					hour: '2-digit',
					minute: '2-digit',
				}),
			})
			timeEl.createEl('div', {
				cls: 'timeline-duration',
				text: this.formatDuration(session.duration * 1000),
			})

			// Content
			const contentEl = sessionEl.createEl('div', { cls: 'timeline-content' })

			// File info
			const fileInfoEl = contentEl.createEl('div', {
				cls: 'timeline-file-info',
			})
			fileInfoEl.createEl('div', {
				cls: 'timeline-filename',
				text: session.fileName,
			})
			fileInfoEl.createEl('div', {
				cls: 'timeline-filepath',
				text: session.folderPath === '/' ? 'Root' : session.folderPath,
			})

			// Session type badge
			const badgeEl = contentEl.createEl('div', {
				cls: `timeline-badge timeline-badge-${session.sessionType}`,
			})
			badgeEl.setText(
				session.sessionType === 'edit' ? t('timeline.edit') : t('timeline.view')
			)

			// Add connector line (except for last item)
			if (index < recentSessions.length - 1) {
				sessionEl.createEl('div', { cls: 'timeline-connector' })
			}
		})

		// View all timeline link
		if (timeline.length > 10) {
			const viewAllEl = timelineSection.createEl('div', {
				cls: 'timeline-view-all',
			})
			const viewAllBtn = viewAllEl.createEl('button', {
				cls: 'timeline-view-all-btn',
				text: t('timeline.viewAll', { count: timeline.length.toString() }),
			})
			viewAllBtn.addEventListener('click', () => {
				this.showFullTimelineModal()
			})
		}
	}

	private renderChartsSection(container: HTMLElement): void {
		// Remove existing charts section
		const existingCharts = container.querySelector('.charts-section')
		if (existingCharts) {
			existingCharts.remove()
		}

		const chartsSection = container.createEl('div', {
			cls: 'charts-section',
		})
		chartsSection.createEl('h3', { text: t('chart.categories') })

		const stats = this.fileTrackerManager.getAggregatedStats(this.currentPeriod)

		if (stats.totalTime === 0) {
			chartsSection.createEl('div', {
				cls: 'no-data-message',
				text: t('view.noData'),
			})
			return
		}

		// Create tabs for different chart views
		const tabs = chartsSection.createEl('div', { cls: 'chart-tabs' })
		const tabButtons = tabs.createEl('div', { cls: 'tab-buttons' })
		const tabContents = chartsSection.createEl('div', {
			cls: 'tab-contents',
		})

		// Categories tab
		this.createChartTab(
			tabButtons,
			tabContents,
			'categories',
			t('chart.categories'),
			() => {
				const chartEl = tabContents.createEl('div', {
					cls: 'chart-container',
				})
				const renderer = new ChartRenderer(chartEl, {
					width: 400,
					height: 300,
				})
				renderer.renderCategoryChart(this.currentChartType, stats.categoryStats)
			},
			true
		)

		// Files tab
		this.createChartTab(
			tabButtons,
			tabContents,
			'files',
			t('chart.files'),
			() => {
				const chartEl = tabContents.createEl('div', {
					cls: 'chart-container',
				})
				const renderer = new ChartRenderer(chartEl, {
					width: 400,
					height: 300,
				})
				renderer.renderFileChart(this.currentChartType, stats.fileStats)
			}
		)

		// Tags tab
		if (
			this.settings.enableTagTracking &&
			stats.tagStats &&
			stats.tagStats.length > 0
		) {
			this.createChartTab(
				tabButtons,
				tabContents,
				'tags',
				t('chart.tags'),
				() => {
					const chartEl = tabContents.createEl('div', {
						cls: 'chart-container',
					})
					const renderer = new ChartRenderer(chartEl, {
						width: 400,
						height: 300,
					})
					renderer.renderTagChart(this.currentChartType, stats.tagStats)
				}
			)
		}

		// Daily trend tab (for non-today periods)
		if (this.currentPeriod !== 'today') {
			this.createChartTab(
				tabButtons,
				tabContents,
				'daily',
				t('chart.daily'),
				() => {
					const chartEl = tabContents.createEl('div', {
						cls: 'chart-container',
					})
					chartEl.createEl('div', {
						cls: 'no-data-message',
						text: t('view.chartNotAvailable'),
					})
				}
			)
		}
	}

	private createChartTab(
		tabButtons: HTMLElement,
		tabContents: HTMLElement,
		id: string,
		label: string,
		renderFunction: () => void,
		isActive: boolean = false
	): void {
		const button = tabButtons.createEl('button', {
			cls: `tab-button ${isActive ? 'is-active' : ''}`,
			text: label,
			attr: { 'data-tab': id },
		})

		const content = tabContents.createEl('div', {
			cls: `tab-content ${isActive ? 'is-active' : ''}`,
			attr: { 'data-tab': id },
		})

		button.addEventListener('click', () => {
			// Remove active class from all tabs
			tabButtons
				.querySelectorAll('.tab-button')
				.forEach((btn) => btn.removeClass('is-active'))
			tabContents
				.querySelectorAll('.tab-content')
				.forEach((content) => content.removeClass('is-active'))

			// Add active class to clicked tab
			button.addClass('is-active')
			content.addClass('is-active')

			// Clear and render content
			content.empty()
			renderFunction()
		})

		// Render if active
		if (isActive) {
			renderFunction()
		}
	}

	private renderStatisticsSection(container: HTMLElement): void {
		const statsSection = container.createEl('div', {
			cls: 'statistics-section',
		})
		statsSection.createEl('h3', { text: t('report.details') })

		const stats = this.fileTrackerManager.getAggregatedStats(this.currentPeriod)

		if (stats.totalTime === 0) {
			statsSection.createEl('div', {
				cls: 'no-data-message',
				text: t('view.noData'),
			})
			return
		}

		// Categories list
		if (stats.categoryStats.length > 0) {
			const categoriesEl = statsSection.createEl('div', {
				cls: 'stats-list',
			})
			categoriesEl.createEl('h4', { text: t('chart.categories') })

			const categoryList = categoriesEl.createEl('div', {
				cls: 'stats-items',
			})
			stats.categoryStats.slice(0, 10).forEach((category) => {
				const item = categoryList.createEl('div', {
					cls: 'stats-item',
				})
				item.createEl('span', {
					cls: 'stats-name',
					text: category.category,
				})
				item.createEl('span', {
					cls: 'stats-time',
					text: this.formatDuration(category.totalTime),
				})
				item.createEl('span', {
					cls: 'stats-percentage',
					text: `${category.percentage.toFixed(1)}%`,
				})
			})
		}

		// Files list
		if (stats.fileStats.length > 0) {
			const filesEl = statsSection.createEl('div', { cls: 'stats-list' })
			filesEl.createEl('h4', { text: t('chart.files') })

			const fileList = filesEl.createEl('div', { cls: 'stats-items' })
			stats.fileStats.slice(0, 10).forEach((file) => {
				const item = fileList.createEl('div', {
					cls: 'stats-item stats-file-item',
				})

				// File info container
				const fileInfo = item.createEl('div', { cls: 'stats-file-info' })
				fileInfo.createEl('div', {
					cls: 'stats-filename',
					text: file.fileName,
				})
				fileInfo.createEl('div', {
					cls: 'stats-filepath',
					text: file.filePath.includes('/')
						? file.filePath.substring(0, file.filePath.lastIndexOf('/')) ||
						  'Root'
						: 'Root',
				})

				// Time and stats container
				const statsInfo = item.createEl('div', { cls: 'stats-file-stats' })
				statsInfo.createEl('span', {
					cls: 'stats-time',
					text: this.formatDuration(file.totalTime * 1000), // Convert to milliseconds
				})
				statsInfo.createEl('span', {
					cls: 'stats-sessions',
					text: `${file.accessCount} sessions`,
				})

				// Last accessed
				item.createEl('div', {
					cls: 'stats-last-accessed',
					text: new Date(file.lastAccessed).toLocaleDateString('zh-CN'),
				})
			})
		}

		// Tags list (if enabled and available)
		if (this.settings.enableTagTracking && stats.tagStats.length > 0) {
			const tagsEl = statsSection.createEl('div', { cls: 'stats-list' })
			tagsEl.createEl('h4', { text: t('chart.tags') })

			const tagList = tagsEl.createEl('div', { cls: 'stats-items' })
			stats.tagStats.slice(0, 10).forEach((tag) => {
				const item = tagList.createEl('div', { cls: 'stats-item' })
				item.createEl('span', {
					cls: 'stats-name',
					text: `#${tag.tag}`,
				})
				item.createEl('span', {
					cls: 'stats-time',
					text: this.formatDuration(tag.totalTime * 1000), // Convert to milliseconds
				})
			})
		}
	}

	private renderSessionAnalysisSection(container: HTMLElement): void {
		const analysisSection = container.createEl('div', {
			cls: 'session-analysis-section',
		})
		analysisSection.createEl('h3', { text: t('view.sessionAnalysis') })

		const stats = this.fileTrackerManager.getAggregatedStats(this.currentPeriod)
		const timeline = this.fileTrackerManager.getTimeline()

		if (timeline.length === 0) {
			analysisSection.createEl('div', {
				cls: 'no-data-message',
				text: t('view.noAnalysisData'),
			})
			return
		}

		const analysisGrid = analysisSection.createEl('div', {
			cls: 'analysis-grid',
		})

		// Session patterns
		const patternsCard = analysisGrid.createEl('div', { cls: 'analysis-card' })
		patternsCard.createEl('h4', { text: t('analysis.sessionPatterns') })

		const totalSessions = timeline.length
		const avgDuration =
			timeline.reduce((sum, session) => sum + session.duration, 0) /
			totalSessions
		const longestSession = Math.max(...timeline.map((s) => s.duration))
		const shortestSession = Math.min(...timeline.map((s) => s.duration))

		const patternsData = patternsCard.createEl('div', { cls: 'analysis-data' })
		this.createAnalysisItem(
			patternsData,
			t('analysis.totalSessions'),
			totalSessions.toString()
		)
		this.createAnalysisItem(
			patternsData,
			t('analysis.avgSessionTime'),
			this.formatDuration(avgDuration * 1000)
		)
		this.createAnalysisItem(
			patternsData,
			t('analysis.longestSession'),
			this.formatDuration(longestSession * 1000)
		)
		this.createAnalysisItem(
			patternsData,
			t('analysis.shortestSession'),
			this.formatDuration(shortestSession * 1000)
		)

		// File activity
		const activityCard = analysisGrid.createEl('div', { cls: 'analysis-card' })
		activityCard.createEl('h4', { text: t('analysis.fileActivity') })

		const fileStats = this.fileTrackerManager.getFileStats()
		const topFiles = fileStats.slice(0, 5)

		const activityData = activityCard.createEl('div', { cls: 'analysis-data' })
		topFiles.forEach((file) => {
			const fileItem = activityData.createEl('div', {
				cls: 'analysis-file-item',
			})
			fileItem.createEl('div', {
				cls: 'analysis-file-name',
				text: file.fileName,
			})
			fileItem.createEl('div', {
				cls: 'analysis-file-stats',
				text: `${this.formatDuration(file.totalTime * 1000)} (${
					file.sessionCount
				} sessions)`,
			})
		})

		// Folder distribution
		const folderCard = analysisGrid.createEl('div', { cls: 'analysis-card' })
		folderCard.createEl('h4', { text: t('analysis.folderActivity') })

		const folderStats = this.fileTrackerManager.getFolderStats()
		const topFolders = folderStats.slice(0, 5)

		const folderData = folderCard.createEl('div', { cls: 'analysis-data' })
		topFolders.forEach((folder) => {
			const folderItem = folderData.createEl('div', {
				cls: 'analysis-folder-item',
			})
			folderItem.createEl('div', {
				cls: 'analysis-folder-name',
				text: folder.folderPath === '/' ? 'Root' : folder.folderPath,
			})
			folderItem.createEl('div', {
				cls: 'analysis-folder-stats',
				text: `${this.formatDuration(folder.totalTime * 1000)} (${
					folder.fileCount
				} files)`,
			})
		})

		// Time distribution by hour
		if (this.currentPeriod === 'today' || this.currentPeriod === 'week') {
			const timeCard = analysisGrid.createEl('div', {
				cls: 'analysis-card analysis-card-wide',
			})
			timeCard.createEl('h4', { text: t('analysis.timeDistribution') })

			// Group sessions by hour
			const hourlyData: Record<number, number> = {}
			timeline.forEach((session) => {
				const hour = new Date(session.startTime).getHours()
				hourlyData[hour] = (hourlyData[hour] || 0) + session.duration
			})

			const timeData = timeCard.createEl('div', { cls: 'analysis-time-chart' })
			for (let hour = 0; hour < 24; hour++) {
				const timeSlot = timeData.createEl('div', { cls: 'time-slot' })
				const duration = hourlyData[hour] || 0
				const maxDuration = Math.max(...Object.values(hourlyData))
				const height = maxDuration > 0 ? (duration / maxDuration) * 100 : 0

				timeSlot.createEl('div', {
					cls: 'time-bar',
					attr: {
						style: `height: ${height}%`,
						title: `${hour}:00 - ${this.formatDuration(duration * 1000)}`,
					},
				})
				timeSlot.createEl('div', {
					cls: 'time-label',
					text: hour.toString().padStart(2, '0'),
				})
			}
		}
	}

	private createAnalysisItem(
		container: HTMLElement,
		label: string,
		value: string
	): void {
		const item = container.createEl('div', { cls: 'analysis-item' })
		item.createEl('span', { cls: 'analysis-label', text: label })
		item.createEl('span', { cls: 'analysis-value', text: value })
	}

	private showFullTimelineModal(): void {
		// TODO: Implement full timeline modal
		console.log('Show full timeline modal')
	}

	private renderDayComparison(container: HTMLElement, todayStats: any): void {
		// Get yesterday's date
		const yesterday = new Date()
		yesterday.setDate(yesterday.getDate() - 1)
		const yesterdayKey =
			yesterday.getFullYear() +
			'-' +
			String(yesterday.getMonth() + 1).padStart(2, '0') +
			'-' +
			String(yesterday.getDate()).padStart(2, '0')

		const yesterdayStats = this.fileTrackerManager.getStatsForDate(yesterdayKey)

		if (!yesterdayStats) return

		// Create comparison section
		const comparisonEl = container.createEl('div', { cls: 'day-comparison' })
		comparisonEl.createEl('h4', { text: t('comparison.yesterdayVsToday') })

		const comparisonGrid = comparisonEl.createEl('div', {
			cls: 'comparison-grid',
		})

		// Time comparison
		const timeChange = todayStats.totalTimeSpent - yesterdayStats.totalTimeSpent
		const timeChangePercent =
			yesterdayStats.totalTimeSpent > 0
				? (timeChange / yesterdayStats.totalTimeSpent) * 100
				: 0

		this.createComparisonItem(
			comparisonGrid,
			t('chart.totalTime'),
			this.formatDuration(timeChange * 1000),
			timeChangePercent,
			timeChange >= 0
		)

		// Files comparison
		const filesChange = todayStats.totalFiles - yesterdayStats.totalFiles
		const filesChangePercent =
			yesterdayStats.totalFiles > 0
				? (filesChange / yesterdayStats.totalFiles) * 100
				: 0

		this.createComparisonItem(
			comparisonGrid,
			t('stats.totalFiles'),
			filesChange.toString(),
			filesChangePercent,
			filesChange >= 0,
			true
		)

		// Folders comparison
		const foldersChange = todayStats.totalFolders - yesterdayStats.totalFolders
		const foldersChangePercent =
			yesterdayStats.totalFolders > 0
				? (foldersChange / yesterdayStats.totalFolders) * 100
				: 0

		this.createComparisonItem(
			comparisonGrid,
			t('stats.totalFolders'),
			foldersChange.toString(),
			foldersChangePercent,
			foldersChange >= 0,
			true
		)
	}

	private createComparisonItem(
		container: HTMLElement,
		label: string,
		change: string,
		percent: number,
		isPositive: boolean,
		isCount: boolean = false
	): void {
		const item = container.createEl('div', { cls: 'comparison-item' })

		item.createEl('div', {
			cls: 'comparison-label',
			text: label,
		})

		const valueEl = item.createEl('div', { cls: 'comparison-value' })

		const changeEl = valueEl.createEl('span', {
			cls: `comparison-change ${isPositive ? 'positive' : 'negative'}`,
			text: `${isPositive ? '+' : ''}${change}`,
		})

		if (Math.abs(percent) > 0.1) {
			valueEl.createEl('span', {
				cls: `comparison-percent ${isPositive ? 'positive' : 'negative'}`,
				text: ` (${isPositive ? '+' : ''}${percent.toFixed(1)}%)`,
			})
		}
	}

	private formatDuration(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) {
			return t('time.hoursMinutes', {
				hours: hours.toString(),
				minutes: (minutes % 60).toString(),
			})
		} else if (minutes > 0) {
			return t('time.minutesSeconds', {
				minutes: minutes.toString(),
				seconds: (seconds % 60).toString(),
			})
		} else {
			return t('time.seconds', { count: seconds.toString() })
		}
	}

	private showExportModal(): void {
		// This would show a modal for export options
		// For now, just show a notice
		new Notice(t('notification.dataExported'))
	}

	private startAutoRefresh(): void {
		// Refresh every 30 seconds
		this.refreshInterval = setInterval(() => {
			this.renderTodayOverview(
				this.containerEl.querySelector('.usage-stats-content') as HTMLElement
			)
		}, 30000)
	}

	private stopAutoRefresh(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval)
			this.refreshInterval = undefined
		}
	}

	// Public methods for external updates
	public refresh(): void {
		this.renderView()
	}

	public setPeriod(period: ViewPeriod): void {
		this.currentPeriod = period
		this.renderView()
	}

	public setChartType(type: ChartType): void {
		this.currentChartType = type
		this.renderChartsSection(
			this.containerEl.querySelector('.usage-stats-content') as HTMLElement
		)
	}
}
