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
	private lastDataUpdateTime: number = 0

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

		// 设置初始的更新时间
		const currentData = this.fileTrackerManager.getRawData()
		if (currentData) {
			this.lastDataUpdateTime = currentData.lastUpdated
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

		// 显示最后更新时间
		const lastUpdateEl = header.createEl('div', {
			cls: 'last-update-info',
		})
		this.updateLastUpdateInfo(lastUpdateEl)

		// Quick action buttons
		const actions = header.createEl('div', { cls: 'usage-stats-actions' })

		const refreshBtn = actions.createEl('button', {
			cls: 'clickable-icon',
			attr: { 'aria-label': t('action.refresh') },
		})
		refreshBtn.createEl('span', { cls: 'lucide-refresh-cw' })
		refreshBtn.addEventListener('click', async () => {
			// 显示刷新状态
			refreshBtn.addClass('is-loading')

			try {
				// 先修复最后更新时间
				await this.fileTrackerManager.fixLastUpdated()

				// 然后刷新数据
				await this.fileTrackerManager.refresh()

				// 更新最后更新时间
				const currentData = this.fileTrackerManager.getRawData()
				if (currentData) {
					this.lastDataUpdateTime = currentData.lastUpdated
				}
				this.renderView()
				new Notice(t('notification.dataRefreshed'))
			} catch (error) {
				console.error('PluginView: Error refreshing data:', error)
				new Notice(t('error.refreshFailed'))
			} finally {
				refreshBtn.removeClass('is-loading')
			}
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
		const periods: ViewPeriod[] = ['today', 'week', 'month']

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
			// 重新渲染所有图表以应用新的图表类型
			this.reRenderAllCharts()
		})
	}

	private renderTodayOverview(container: HTMLElement): void {
		// Remove existing today overview to prevent duplicates
		const existingOverview = container.querySelector('.today-overview')
		if (existingOverview) {
			existingOverview.remove()
		}

		// 确保 today-overview 添加到容器的开头，保持正确的顺序
		const overview = document.createElement('div')
		overview.className = 'today-overview'

		// 插入到容器的第一个位置
		if (container.firstChild) {
			container.insertBefore(overview, container.firstChild)
		} else {
			container.appendChild(overview)
		}

		// Header with date
		const headerEl = overview.createEl('div', { cls: 'today-header' })
		headerEl.createEl('h3', { text: t(`view.${this.currentPeriod}`) })

		// 根据当前时段显示相应的日期信息
		let dateText = ''
		switch (this.currentPeriod) {
			case 'today':
				dateText = new Date().toLocaleDateString('zh-CN', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				})
				break
			case 'week':
				const weekStart = new Date()
				weekStart.setDate(weekStart.getDate() - 7)
				const weekEnd = new Date()
				dateText = `${weekStart.toLocaleDateString('zh-CN', {
					month: 'long',
					day: 'numeric',
				})} - ${weekEnd.toLocaleDateString('zh-CN', {
					month: 'long',
					day: 'numeric',
				})}`
				break
			case 'month':
				const monthStart = new Date()
				monthStart.setDate(monthStart.getDate() - 30)
				const monthEnd = new Date()
				dateText = `${monthStart.toLocaleDateString('zh-CN', {
					month: 'long',
					day: 'numeric',
				})} - ${monthEnd.toLocaleDateString('zh-CN', {
					month: 'long',
					day: 'numeric',
				})}`
				break
		}

		headerEl.createEl('div', {
			cls: 'today-date',
			text: dateText,
		})

		// 根据当前时段获取相应的统计数据
		let periodStats: any
		if (this.currentPeriod === 'today') {
			periodStats = this.fileTrackerManager.getTodayStats()
		} else {
			const stats = this.fileTrackerManager.getAggregatedStats(
				this.currentPeriod
			)
			periodStats = {
				totalTimeSpent: stats.totalTime / 1000, // 转换回秒
				totalFiles: stats.fileStats.length,
				totalFolders: stats.categoryStats.length,
				lastActiveFile: stats.fileStats[0]?.fileName || '',
			}
		}

		const cards = overview.createEl('div', { cls: 'stats-cards' })

		// Total time card
		const totalCard = cards.createEl('div', {
			cls: 'stat-card stat-card-primary',
		})
		totalCard.createEl('div', {
			cls: 'stat-value',
			text: this.formatDuration(periodStats.totalTimeSpent * 1000), // Convert seconds to milliseconds
		})
		totalCard.createEl('div', {
			cls: 'stat-label',
			text: t('chart.totalTime'),
		})

		// Total files card
		const filesCard = cards.createEl('div', { cls: 'stat-card' })
		filesCard.createEl('div', {
			cls: 'stat-value',
			text: periodStats.totalFiles.toString(),
		})
		filesCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.totalFiles'),
		})

		// Total folders card
		const foldersCard = cards.createEl('div', { cls: 'stat-card' })
		foldersCard.createEl('div', {
			cls: 'stat-value',
			text: periodStats.totalFolders.toString(),
		})
		foldersCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.totalFolders'),
		})

		// Sessions count
		const timeline = this.fileTrackerManager.getTimelineForPeriod(
			this.currentPeriod
		)
		const periodSessions = timeline

		const sessionsCard = cards.createEl('div', { cls: 'stat-card' })
		sessionsCard.createEl('div', {
			cls: 'stat-value',
			text: periodSessions.length.toString(),
		})
		sessionsCard.createEl('div', {
			cls: 'stat-label',
			text: t('stats.totalSessions'),
		})

		// Average session time
		const avgSessionTime =
			periodSessions.length > 0
				? periodSessions.reduce((sum, s) => sum + s.duration, 0) /
				  periodSessions.length
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
		if (periodStats.lastActiveFile) {
			const fileCard = cards.createEl('div', {
				cls: 'stat-card stat-card-wide',
			})
			const fileInfo = fileCard.createEl('div', { cls: 'stat-file-info' })
			fileInfo.createEl('div', {
				cls: 'stat-value stat-value-small',
				text: periodStats.lastActiveFile,
			})
			fileInfo.createEl('div', {
				cls: 'stat-label',
				text: t('stats.lastActiveFile'),
			})
		}

		// Add comparison with yesterday if available (only for today view)
		if (this.currentPeriod === 'today') {
			this.renderDayComparison(overview, periodStats)
		}
	}

	private renderTimelineSection(container: HTMLElement): void {
		const timelineSection = container.createEl('div', {
			cls: 'timeline-section',
		})
		timelineSection.createEl('h3', { text: t('view.timeline') })

		const timeline = this.fileTrackerManager.getTimelineForPeriod(
			this.currentPeriod
		)

		if (timeline.length === 0) {
			timelineSection.createEl('div', {
				cls: 'no-data-message',
				text: t('view.noTimelineData'),
			})
			return
		}

		// Show only the most recent 10 sessions (timeline is already sorted with newest first)
		const recentSessions = timeline.slice(0, 10)

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

			// File info (clickable)
			const fileInfoEl = contentEl.createEl('div', {
				cls: 'timeline-file-info clickable',
			})
			const fileNameEl = fileInfoEl.createEl('div', {
				cls: 'timeline-filename',
				text: session.fileName,
			})
			fileInfoEl.createEl('div', {
				cls: 'timeline-filepath',
				text: session.folderPath === '/' ? 'Root' : session.folderPath,
			})

			// Session type badge (clickable)
			const badgeEl = contentEl.createEl('div', {
				cls: `timeline-badge timeline-badge-${session.sessionType} clickable`,
			})
			badgeEl.setText(
				session.sessionType === 'edit' ? t('timeline.edit') : t('timeline.view')
			)

			// Add click handlers to open the file
			const openFile = async () => {
				try {
					await this.app.workspace.openLinkText(session.filePath, '')
				} catch (error) {
					console.error('Failed to open file:', session.filePath, error)
					// 显示失败提示
					new Notice(`${t('error.cannotOpenFile')}: ${session.fileName}`)
				}
			}

			fileInfoEl.addEventListener('click', openFile)
			badgeEl.addEventListener('click', openFile)

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

		// Pre-render all charts
		const chartTabs = this.createAllChartTabs(tabButtons, tabContents, stats)

		// Set up tab switching
		this.setupTabSwitching(tabButtons, tabContents, chartTabs)
	}

	private createAllChartTabs(
		tabButtons: HTMLElement,
		tabContents: HTMLElement,
		stats: any
	): { [key: string]: HTMLElement } {
		const tabs: { [key: string]: HTMLElement } = {}

		// Categories tab
		tabs.categories = this.createPreRenderedChartTab(
			tabButtons,
			tabContents,
			'categories',
			t('chart.categories'),
			() => {
				const chartEl = document.createElement('div')
				chartEl.className = 'chart-container'
				const renderer = new ChartRenderer(chartEl, {
					width: 400,
					height: 300,
				})
				renderer.renderCategoryChart(this.currentChartType, stats.categoryStats)
				return chartEl
			},
			true
		)

		// Files tab
		tabs.files = this.createPreRenderedChartTab(
			tabButtons,
			tabContents,
			'files',
			t('chart.files'),
			() => {
				const chartEl = document.createElement('div')
				chartEl.className = 'chart-container'
				const renderer = new ChartRenderer(chartEl, {
					width: 400,
					height: 300,
				})
				renderer.renderFileChart(this.currentChartType, stats.fileStats)
				return chartEl
			}
		)

		// Tags tab
		if (
			this.settings.enableTagTracking &&
			stats.tagStats &&
			stats.tagStats.length > 0
		) {
			tabs.tags = this.createPreRenderedChartTab(
				tabButtons,
				tabContents,
				'tags',
				t('chart.tags'),
				() => {
					const chartEl = document.createElement('div')
					chartEl.className = 'chart-container'
					const renderer = new ChartRenderer(chartEl, {
						width: 400,
						height: 300,
					})
					renderer.renderTagChart(this.currentChartType, stats.tagStats)
					return chartEl
				}
			)
		}

		// Daily trend tab (for non-today periods)
		if (this.currentPeriod !== 'today') {
			tabs.daily = this.createPreRenderedChartTab(
				tabButtons,
				tabContents,
				'daily',
				t('chart.daily'),
				() => {
					const chartEl = document.createElement('div')
					chartEl.className = 'chart-container'
					chartEl.innerHTML = `<div class="no-data-message">${t(
						'view.chartNotAvailable'
					)}</div>`
					return chartEl
				}
			)
		}

		return tabs
	}

	private createPreRenderedChartTab(
		tabButtons: HTMLElement,
		tabContents: HTMLElement,
		id: string,
		label: string,
		renderFunction: () => HTMLElement,
		isActive: boolean = false
	): HTMLElement {
		// Create tab button
		const button = tabButtons.createEl('button', {
			cls: `tab-button ${isActive ? 'is-active' : ''}`,
			text: label,
			attr: { 'data-tab': id },
		})

		// Create tab content container
		const content = tabContents.createEl('div', {
			cls: `tab-content ${isActive ? 'is-active' : ''}`,
			attr: { 'data-tab': id },
		})

		// Pre-render the chart
		const chartElement = renderFunction()
		content.appendChild(chartElement)

		return content
	}

	private setupTabSwitching(
		tabButtons: HTMLElement,
		tabContents: HTMLElement,
		chartTabs: { [key: string]: HTMLElement }
	): void {
		tabButtons.addEventListener('click', (e) => {
			const target = e.target as HTMLElement
			if (target.classList.contains('tab-button')) {
				const tabId = target.getAttribute('data-tab')
				if (tabId && chartTabs[tabId]) {
					// Remove active class from all tabs
					tabButtons
						.querySelectorAll('.tab-button')
						.forEach((btn) => btn.removeClass('is-active'))
					tabContents
						.querySelectorAll('.tab-content')
						.forEach((content) => content.removeClass('is-active'))

					// Add active class to clicked tab
					target.addClass('is-active')
					chartTabs[tabId].addClass('is-active')
				}
			}
		})
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
					cls: 'stats-item stats-file-item clickable',
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
					text: this.formatDuration(file.totalTime), // totalTime is already in milliseconds from getAggregatedStats
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

				// Add click handler to open the file
				item.addEventListener('click', async () => {
					try {
						await this.app.workspace.openLinkText(file.filePath, '')
					} catch (error) {
						console.error('Failed to open file:', file.filePath, error)
						new Notice(`${t('error.cannotOpenFile')}: ${file.fileName}`)
					}
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
					text: this.formatDuration(tag.totalTime), // totalTime is already in milliseconds from getAggregatedStats
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
		const timeline = this.fileTrackerManager.getTimelineForPeriod(
			this.currentPeriod
		)

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

		const fileStats = stats.fileStats.map((f) => ({
			fileName: f.fileName,
			totalTime: f.totalTime / 1000, // 转换回秒
			sessionCount: f.accessCount,
		}))
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

		const folderStats = stats.categoryStats.map((c) => ({
			folderPath: c.category,
			totalTime: c.totalTime / 1000, // 转换回秒
			fileCount: c.count,
		}))
		const topFolders = folderStats.slice(0, 5)

		const folderData = folderCard.createEl('div', { cls: 'analysis-data' })
		topFolders.forEach((folder) => {
			const folderItem = folderData.createEl('div', {
				cls: 'analysis-folder-item',
			})
			folderItem.createEl('div', {
				cls: 'analysis-folder-name',
				text: folder.folderPath === 'Root' ? 'Root' : folder.folderPath,
			})
			folderItem.createEl('div', {
				cls: 'analysis-folder-stats',
				text: `${this.formatDuration(folder.totalTime * 1000)} (${
					folder.fileCount
				} files)`,
			})
		})

		// Time distribution by hour (only for today and week views)
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

	private renderDayComparison(container: HTMLElement, periodStats: any): void {
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
		const timeChange =
			periodStats.totalTimeSpent - yesterdayStats.totalTimeSpent
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
		const filesChange = periodStats.totalFiles - yesterdayStats.totalFiles
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
		const foldersChange = periodStats.totalFolders - yesterdayStats.totalFolders
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
		// Refresh every 10 seconds for more responsive updates
		this.refreshInterval = setInterval(async () => {
			// 检查数据是否有更新
			const hasDataChanged = await this.checkDataUpdates()

			if (hasDataChanged) {
				console.log('PluginView: Data updated, refreshing view...')
				// 数据有更新，重新渲染整个视图
				this.renderView()
			} else {
				// 数据没有更新，只更新今天概览部分
				const contentEl = this.containerEl.querySelector(
					'.usage-stats-content'
				) as HTMLElement
				if (contentEl) {
					this.renderTodayOverview(contentEl)
				}
			}
		}, 10000)
	}

	/**
	 * 检查数据是否有更新
	 */
	private async checkDataUpdates(): Promise<boolean> {
		try {
			// 先修复最后更新时间
			await this.fileTrackerManager.fixLastUpdated()

			// 重新加载数据
			await this.fileTrackerManager.refresh()

			// 获取当前数据的最后更新时间
			const currentData = this.fileTrackerManager.getRawData()
			if (!currentData) return false

			// 检查最后更新时间是否有变化
			if (currentData.lastUpdated > this.lastDataUpdateTime) {
				this.lastDataUpdateTime = currentData.lastUpdated
				console.log(
					'PluginView: Data update detected, lastUpdated:',
					new Date(currentData.lastUpdated).toLocaleString()
				)
				return true
			}

			return false
		} catch (error) {
			console.error('PluginView: Error checking data updates:', error)
			return false
		}
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

	/**
	 * 强制刷新数据并重新渲染视图
	 */
	public async forceRefresh(): Promise<void> {
		try {
			await this.fileTrackerManager.refresh()
			// 更新最后更新时间
			const currentData = this.fileTrackerManager.getRawData()
			if (currentData) {
				this.lastDataUpdateTime = currentData.lastUpdated
			}
			this.renderView()
			new Notice(t('notification.dataRefreshed'))
		} catch (error) {
			console.error('PluginView: Error force refreshing data:', error)
			new Notice(t('error.refreshFailed'))
		}
	}

	/**
	 * 修复最后更新时间
	 */
	public async fixLastUpdated(): Promise<void> {
		try {
			await this.fileTrackerManager.fixLastUpdated()
			// 更新最后更新时间
			const currentData = this.fileTrackerManager.getRawData()
			if (currentData) {
				this.lastDataUpdateTime = currentData.lastUpdated
			}
			this.renderView()
			new Notice(t('notification.lastUpdatedFixed'))
		} catch (error) {
			console.error('PluginView: Error fixing last updated time:', error)
			new Notice(t('error.fixFailed'))
		}
	}

	/**
	 * 更新最后更新时间信息
	 */
	private updateLastUpdateInfo(container: HTMLElement): void {
		const currentData = this.fileTrackerManager.getRawData()
		if (currentData) {
			const lastUpdate = new Date(currentData.lastUpdated)
			container.setText(
				`${t('view.lastUpdated')}: ${lastUpdate.toLocaleString('zh-CN')}`
			)
		} else {
			container.setText(t('view.lastUpdated') + ': ' + t('view.noData'))
		}
	}

	public setPeriod(period: ViewPeriod): void {
		this.currentPeriod = period
		this.renderView()
	}

	public setChartType(type: ChartType): void {
		this.currentChartType = type
		this.reRenderAllCharts()
	}

	/**
	 * 重新渲染所有图表内容，保持标签页结构但更新图表类型
	 */
	private reRenderAllCharts(): void {
		// 保存当前滚动位置
		const scrollTop = this.containerEl.scrollTop

		const chartsSection = this.containerEl.querySelector('.charts-section')
		if (!chartsSection) return

		const stats = this.fileTrackerManager.getAggregatedStats(this.currentPeriod)
		if (stats.totalTime === 0) return

		// 更新每个图表标签页的内容
		const tabContents = chartsSection.querySelector('.tab-contents')
		if (!tabContents) return

		// 清空并重新渲染所有标签页内容
		const chartTabs = this.updateAllChartTabs(tabContents as HTMLElement, stats)

		// 确保当前活跃的标签页保持活跃状态
		const activeTab = tabContents.querySelector('.tab-content.is-active')
		const activeTabId = activeTab?.getAttribute('data-tab')

		if (activeTabId && chartTabs[activeTabId]) {
			// 重新激活当前标签页
			tabContents
				.querySelectorAll('.tab-content')
				.forEach((content) => content.removeClass('is-active'))
			chartTabs[activeTabId].addClass('is-active')
		}

		// 恢复滚动位置
		this.containerEl.scrollTop = scrollTop
	}

	/**
	 * 更新所有图表标签页的内容
	 */
	private updateAllChartTabs(
		tabContents: HTMLElement,
		stats: any
	): { [key: string]: HTMLElement } {
		const tabs: { [key: string]: HTMLElement } = {}

		// Categories tab
		const categoriesTab = tabContents.querySelector(
			'[data-tab="categories"]'
		) as HTMLElement
		if (categoriesTab) {
			categoriesTab.empty()
			const chartEl = document.createElement('div')
			chartEl.className = 'chart-container'
			const renderer = new ChartRenderer(chartEl, { width: 400, height: 300 })
			renderer.renderCategoryChart(this.currentChartType, stats.categoryStats)
			categoriesTab.appendChild(chartEl)
			tabs.categories = categoriesTab
		}

		// Files tab
		const filesTab = tabContents.querySelector(
			'[data-tab="files"]'
		) as HTMLElement
		if (filesTab) {
			filesTab.empty()
			const chartEl = document.createElement('div')
			chartEl.className = 'chart-container'
			const renderer = new ChartRenderer(chartEl, { width: 400, height: 300 })
			renderer.renderFileChart(this.currentChartType, stats.fileStats)
			filesTab.appendChild(chartEl)
			tabs.files = filesTab
		}

		// Tags tab
		const tagsTab = tabContents.querySelector(
			'[data-tab="tags"]'
		) as HTMLElement
		if (
			tagsTab &&
			this.settings.enableTagTracking &&
			stats.tagStats &&
			stats.tagStats.length > 0
		) {
			tagsTab.empty()
			const chartEl = document.createElement('div')
			chartEl.className = 'chart-container'
			const renderer = new ChartRenderer(chartEl, { width: 400, height: 300 })
			renderer.renderTagChart(this.currentChartType, stats.tagStats)
			tagsTab.appendChild(chartEl)
			tabs.tags = tagsTab
		}

		// Daily trend tab
		const dailyTab = tabContents.querySelector(
			'[data-tab="daily"]'
		) as HTMLElement
		if (dailyTab && this.currentPeriod !== 'today') {
			dailyTab.empty()
			const chartEl = document.createElement('div')
			chartEl.className = 'chart-container'
			chartEl.innerHTML = `<div class="no-data-message">${t(
				'view.chartNotAvailable'
			)}</div>`
			dailyTab.appendChild(chartEl)
			tabs.daily = dailyTab
		}

		return tabs
	}
}
