import { ItemView, WorkspaceLeaf, Setting, Notice } from "obsidian";
import { ViewPeriod, ChartType, UsageStatsSettings } from "../core/types";
import { DataManager } from "../storage/DataManager";
import { ChartRenderer } from "../ui/ChartRenderer";
import { t } from "../i18n/i18n";

export const USAGE_STATS_VIEW_TYPE = "usage-stats-view";
export const USAGE_STATS_VIEW_ICON = "clock";

export class UsageStatsView extends ItemView {
	private dataManager: DataManager;
	private settings: UsageStatsSettings;
	private currentPeriod: ViewPeriod = "today";
	private currentChartType: ChartType = "pie";
	private refreshInterval?: NodeJS.Timeout;

	constructor(
		leaf: WorkspaceLeaf,
		dataManager: DataManager,
		settings: UsageStatsSettings
	) {
		super(leaf);
		this.dataManager = dataManager;
		this.settings = settings;
		this.currentChartType = settings.defaultChartType;
	}

	getViewType(): string {
		return USAGE_STATS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t("view.title");
	}

	getIcon(): string {
		return USAGE_STATS_VIEW_ICON;
	}

	async onOpen() {
		this.renderView();
		this.startAutoRefresh();
	}

	async onClose() {
		this.stopAutoRefresh();
	}

	public updateSettings(newSettings: UsageStatsSettings): void {
		this.settings = newSettings;
		this.renderView();
	}

	private renderView(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("usage-stats-view");

		// Header
		this.renderHeader(container);

		// Controls
		this.renderControls(container);

		// Main content area
		const contentEl = container.createEl("div", {
			cls: "usage-stats-content",
		});

		// Today's overview
		this.renderTodayOverview(contentEl);

		// Charts section
		this.renderChartsSection(contentEl);

		// Statistics section
		this.renderStatisticsSection(contentEl);
	}

	private renderHeader(container: HTMLElement): void {
		const header = container.createEl("div", { cls: "usage-stats-header" });

		const title = header.createEl("h2", {
			text: t("view.title"),
			cls: "usage-stats-title",
		});

		// Quick action buttons
		const actions = header.createEl("div", { cls: "usage-stats-actions" });

		const refreshBtn = actions.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": t("action.refresh") },
		});
		refreshBtn.createEl("span", { cls: "lucide-refresh-cw" });
		refreshBtn.addEventListener("click", () => this.renderView());

		const exportBtn = actions.createEl("button", {
			cls: "clickable-icon",
			attr: { "aria-label": t("action.export") },
		});
		exportBtn.createEl("span", { cls: "lucide-download" });
		exportBtn.addEventListener("click", () => this.showExportModal());
	}

	private renderControls(container: HTMLElement): void {
		const controls = container.createEl("div", {
			cls: "usage-stats-controls",
		});

		// Period selector
		const periodGroup = controls.createEl("div", { cls: "control-group" });
		periodGroup.createEl("label", { text: t("export.period") });

		const periodSelect = periodGroup.createEl("select", {
			cls: "dropdown",
		});
		const periods: ViewPeriod[] = ["today", "week", "month", "year", "all"];

		periods.forEach((period) => {
			const option = periodSelect.createEl("option", {
				text: t(`view.${period}`),
				value: period,
			});
			if (period === this.currentPeriod) {
				option.selected = true;
			}
		});

		periodSelect.addEventListener("change", (e) => {
			this.currentPeriod = (e.target as HTMLSelectElement)
				.value as ViewPeriod;
			this.renderView();
		});

		// Chart type selector
		const chartGroup = controls.createEl("div", { cls: "control-group" });
		chartGroup.createEl("label", { text: t("settings.defaultChartType") });

		const chartSelect = chartGroup.createEl("select", { cls: "dropdown" });
		const chartTypes: ChartType[] = ["pie", "doughnut", "bar", "line"];

		chartTypes.forEach((type) => {
			const option = chartSelect.createEl("option", {
				text: t(`chartType.${type}`),
				value: type,
			});
			if (type === this.currentChartType) {
				option.selected = true;
			}
		});

		chartSelect.addEventListener("change", (e) => {
			this.currentChartType = (e.target as HTMLSelectElement)
				.value as ChartType;
			this.renderChartsSection(
				this.containerEl.querySelector(
					".usage-stats-content"
				) as HTMLElement
			);
		});
	}

	private renderTodayOverview(container: HTMLElement): void {
		const overview = container.createEl("div", { cls: "today-overview" });
		overview.createEl("h3", { text: t("view.today") });

		const todayStats = this.dataManager.getTodayStats();
		const cards = overview.createEl("div", { cls: "stats-cards" });

		// Total time card
		const totalCard = cards.createEl("div", { cls: "stat-card" });
		totalCard.createEl("div", {
			cls: "stat-value",
			text: this.formatDuration(todayStats.totalTime),
		});
		totalCard.createEl("div", {
			cls: "stat-label",
			text: t("chart.totalTime"),
		});

		// Active time card
		const activeCard = cards.createEl("div", { cls: "stat-card" });
		activeCard.createEl("div", {
			cls: "stat-value",
			text: this.formatDuration(todayStats.activeTime),
		});
		activeCard.createEl("div", {
			cls: "stat-label",
			text: t("chart.activeTime"),
		});

		// Sessions card
		const sessionsCard = cards.createEl("div", { cls: "stat-card" });
		sessionsCard.createEl("div", {
			cls: "stat-value",
			text: todayStats.entries.length.toString(),
		});
		sessionsCard.createEl("div", {
			cls: "stat-label",
			text: t("stats.totalSessions"),
		});

		// Most active file card
		const topFile =
			todayStats.fileStats.length > 0 ? todayStats.fileStats[0] : null;
		const fileCard = cards.createEl("div", { cls: "stat-card" });
		fileCard.createEl("div", {
			cls: "stat-value",
			text: topFile ? topFile.fileName : "—",
		});
		fileCard.createEl("div", {
			cls: "stat-label",
			text: t("stats.mostActiveFile"),
		});
	}

	private renderChartsSection(container: HTMLElement): void {
		// Remove existing charts section
		const existingCharts = container.querySelector(".charts-section");
		if (existingCharts) {
			existingCharts.remove();
		}

		const chartsSection = container.createEl("div", {
			cls: "charts-section",
		});
		chartsSection.createEl("h3", { text: t("chart.categories") });

		const stats = this.dataManager.getAggregatedStats(this.currentPeriod);

		if (stats.totalTime === 0) {
			chartsSection.createEl("div", {
				cls: "no-data-message",
				text: t("view.noData"),
			});
			return;
		}

		// Create tabs for different chart views
		const tabs = chartsSection.createEl("div", { cls: "chart-tabs" });
		const tabButtons = tabs.createEl("div", { cls: "tab-buttons" });
		const tabContents = chartsSection.createEl("div", {
			cls: "tab-contents",
		});

		// Categories tab
		this.createChartTab(
			tabButtons,
			tabContents,
			"categories",
			t("chart.categories"),
			() => {
				const chartEl = tabContents.createEl("div", {
					cls: "chart-container",
				});
				const renderer = new ChartRenderer(chartEl, {
					width: 400,
					height: 300,
				});
				renderer.renderCategoryChart(
					this.currentChartType,
					stats.categoryStats
				);
			},
			true
		);

		// Files tab
		this.createChartTab(
			tabButtons,
			tabContents,
			"files",
			t("chart.files"),
			() => {
				const chartEl = tabContents.createEl("div", {
					cls: "chart-container",
				});
				const renderer = new ChartRenderer(chartEl, {
					width: 400,
					height: 300,
				});
				renderer.renderFileChart(
					this.currentChartType,
					stats.fileStats
				);
			}
		);

		// Tags tab
		if (this.settings.enableTagTracking && stats.tagStats.length > 0) {
			this.createChartTab(
				tabButtons,
				tabContents,
				"tags",
				t("chart.tags"),
				() => {
					const chartEl = tabContents.createEl("div", {
						cls: "chart-container",
					});
					const renderer = new ChartRenderer(chartEl, {
						width: 400,
						height: 300,
					});
					renderer.renderTagChart(
						this.currentChartType,
						stats.tagStats
					);
				}
			);
		}

		// Daily trend tab (for non-today periods)
		if (this.currentPeriod !== "today") {
			this.createChartTab(
				tabButtons,
				tabContents,
				"daily",
				t("chart.daily"),
				() => {
					const dailyStats = this.dataManager.getStatsForPeriod(
						this.currentPeriod
					);
					const chartEl = tabContents.createEl("div", {
						cls: "chart-container",
					});
					const renderer = new ChartRenderer(chartEl, {
						width: 400,
						height: 300,
					});
					renderer.renderDailyChart(dailyStats);
				}
			);
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
		const button = tabButtons.createEl("button", {
			cls: `tab-button ${isActive ? "is-active" : ""}`,
			text: label,
			attr: { "data-tab": id },
		});

		const content = tabContents.createEl("div", {
			cls: `tab-content ${isActive ? "is-active" : ""}`,
			attr: { "data-tab": id },
		});

		button.addEventListener("click", () => {
			// Remove active class from all tabs
			tabButtons
				.querySelectorAll(".tab-button")
				.forEach((btn) => btn.removeClass("is-active"));
			tabContents
				.querySelectorAll(".tab-content")
				.forEach((content) => content.removeClass("is-active"));

			// Add active class to clicked tab
			button.addClass("is-active");
			content.addClass("is-active");

			// Clear and render content
			content.empty();
			renderFunction();
		});

		// Render if active
		if (isActive) {
			renderFunction();
		}
	}

	private renderStatisticsSection(container: HTMLElement): void {
		const statsSection = container.createEl("div", {
			cls: "statistics-section",
		});
		statsSection.createEl("h3", { text: t("report.details") });

		const stats = this.dataManager.getAggregatedStats(this.currentPeriod);

		if (stats.totalTime === 0) {
			statsSection.createEl("div", {
				cls: "no-data-message",
				text: t("view.noData"),
			});
			return;
		}

		// Categories list
		if (stats.categoryStats.length > 0) {
			const categoriesEl = statsSection.createEl("div", {
				cls: "stats-list",
			});
			categoriesEl.createEl("h4", { text: t("chart.categories") });

			const categoryList = categoriesEl.createEl("div", {
				cls: "stats-items",
			});
			stats.categoryStats.slice(0, 10).forEach((category) => {
				const item = categoryList.createEl("div", {
					cls: "stats-item",
				});
				item.createEl("span", {
					cls: "stats-name",
					text: category.category,
				});
				item.createEl("span", {
					cls: "stats-time",
					text: this.formatDuration(category.totalTime),
				});
				item.createEl("span", {
					cls: "stats-percentage",
					text: `${category.percentage.toFixed(1)}%`,
				});
			});
		}

		// Files list
		if (stats.fileStats.length > 0) {
			const filesEl = statsSection.createEl("div", { cls: "stats-list" });
			filesEl.createEl("h4", { text: t("chart.files") });

			const fileList = filesEl.createEl("div", { cls: "stats-items" });
			stats.fileStats.slice(0, 10).forEach((file) => {
				const item = fileList.createEl("div", { cls: "stats-item" });
				item.createEl("span", {
					cls: "stats-name",
					text: file.fileName,
				});
				item.createEl("span", {
					cls: "stats-time",
					text: this.formatDuration(file.totalTime),
				});
				item.createEl("span", {
					cls: "stats-percentage",
					text: `${file.percentage.toFixed(1)}%`,
				});
			});
		}

		// Tags list (if enabled)
		if (this.settings.enableTagTracking && stats.tagStats.length > 0) {
			const tagsEl = statsSection.createEl("div", { cls: "stats-list" });
			tagsEl.createEl("h4", { text: t("chart.tags") });

			const tagList = tagsEl.createEl("div", { cls: "stats-items" });
			stats.tagStats.slice(0, 10).forEach((tag) => {
				const item = tagList.createEl("div", { cls: "stats-item" });
				item.createEl("span", {
					cls: "stats-name",
					text: `#${tag.tag}`,
				});
				item.createEl("span", {
					cls: "stats-time",
					text: this.formatDuration(tag.totalTime),
				});
				item.createEl("span", {
					cls: "stats-percentage",
					text: `${tag.percentage.toFixed(1)}%`,
				});
			});
		}
	}

	private formatDuration(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return t("time.hoursMinutes", {
				hours: hours.toString(),
				minutes: (minutes % 60).toString(),
			});
		} else if (minutes > 0) {
			return t("time.minutesSeconds", {
				minutes: minutes.toString(),
				seconds: (seconds % 60).toString(),
			});
		} else {
			return t("time.seconds", { count: seconds.toString() });
		}
	}

	private showExportModal(): void {
		// This would show a modal for export options
		// For now, just show a notice
		new Notice(t("notification.dataExported"));
	}

	private startAutoRefresh(): void {
		// Refresh every 30 seconds
		this.refreshInterval = setInterval(() => {
			this.renderTodayOverview(
				this.containerEl.querySelector(
					".usage-stats-content"
				) as HTMLElement
			);
		}, 30000);
	}

	private stopAutoRefresh(): void {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = undefined;
		}
	}

	// Public methods for external updates
	public refresh(): void {
		this.renderView();
	}

	public setPeriod(period: ViewPeriod): void {
		this.currentPeriod = period;
		this.renderView();
	}

	public setChartType(type: ChartType): void {
		this.currentChartType = type;
		this.renderChartsSection(
			this.containerEl.querySelector(
				".usage-stats-content"
			) as HTMLElement
		);
	}
}
