/**
 * Data storage and management for usage statistics
 */

import { Component, Vault } from "obsidian";
import {
	TimeEntry,
	DailyStats,
	CategoryStats,
	FileStats,
	TagStats,
	UsageStatsSettings,
	ViewPeriod,
} from "../core/types";

export interface StorageData {
	version: string;
	lastUpdated: number;
	dailyStats: Record<string, DailyStats>; // key: YYYY-MM-DD
	settings: UsageStatsSettings;
}

export class DataManager extends Component {
	private vault: Vault;
	private settings: UsageStatsSettings;
	private data: StorageData;
	private saveTimer?: NodeJS.Timeout;
	private readonly DATA_FILE_PATH =
		".obsidian/plugins/obsidian-usage-stats/data.json";

	constructor(vault: Vault, settings: UsageStatsSettings) {
		super();
		this.vault = vault;
		this.settings = settings;
		this.data = this.getDefaultData();
	}

	onload(): void {
		this.loadData();
		this.startAutoSave();
	}

	onunload(): void {
		this.stopAutoSave();
		this.saveData();
	}

	// Core data operations
	public async loadData(): Promise<void> {
		try {
			const content = await this.vault.adapter.read(this.DATA_FILE_PATH);
			const parsedData = JSON.parse(content) as StorageData;

			// Validate and migrate data if necessary
			this.data = this.validateAndMigrateData(parsedData);
		} catch (error) {
			console.log(
				"No existing data file found, starting with default data"
			);
			this.data = this.getDefaultData();
		}
	}

	public async saveData(): Promise<void> {
		try {
			this.data.lastUpdated = Date.now();
			const content = JSON.stringify(this.data, null, 2);

			// Ensure directory exists
			await this.ensureDataDirectory();

			// Save main data file
			await this.vault.adapter.write(this.DATA_FILE_PATH, content);
		} catch (error) {
			console.error("Failed to save usage statistics data:", error);
		}
	}

	public async addTimeEntry(entry: TimeEntry): Promise<void> {
		const dateKey = this.getDateKey(entry.startTime);

		// Initialize daily stats if not exists
		if (!this.data.dailyStats[dateKey]) {
			this.data.dailyStats[dateKey] = this.createEmptyDailyStats(dateKey);
		}

		const dailyStats = this.data.dailyStats[dateKey];

		// Add entry
		dailyStats.entries.push(entry);

		// Update totals
		dailyStats.totalTime += entry.duration;
		if (entry.isActive) {
			dailyStats.activeTime += entry.duration;
		} else {
			dailyStats.idleTime += entry.duration;
		}

		// Update category stats
		this.updateCategoryStats(dailyStats, entry);

		// Update file stats
		this.updateFileStats(dailyStats, entry);

		// Update tag stats
		this.updateTagStats(dailyStats, entry);

		// Schedule save
		this.scheduleSave();
	}

	public getDailyStats(date: string): DailyStats | undefined {
		return this.data.dailyStats[date];
	}

	public getTodayStats(): DailyStats {
		const today = this.getDateKey(Date.now());
		return this.data.dailyStats[today] || this.createEmptyDailyStats(today);
	}

	public getStatsForPeriod(
		period: ViewPeriod,
		startDate?: string,
		endDate?: string
	): DailyStats[] {
		const dates = this.getDateRangeForPeriod(period, startDate, endDate);
		return dates.map(
			(date) =>
				this.data.dailyStats[date] || this.createEmptyDailyStats(date)
		);
	}

	public getAggregatedStats(
		period: ViewPeriod,
		startDate?: string,
		endDate?: string
	): DailyStats {
		const dailyStats = this.getStatsForPeriod(period, startDate, endDate);
		return this.aggregateDailyStats(dailyStats);
	}

	// Category statistics
	public getCategoryStats(period: ViewPeriod = "today"): CategoryStats[] {
		const stats = this.getAggregatedStats(period);
		return stats.categoryStats.sort((a, b) => b.totalTime - a.totalTime);
	}

	// File statistics
	public getFileStats(period: ViewPeriod = "today"): FileStats[] {
		const stats = this.getAggregatedStats(period);
		return stats.fileStats.sort((a, b) => b.totalTime - a.totalTime);
	}

	// Tag statistics
	public getTagStats(period: ViewPeriod = "today"): TagStats[] {
		const stats = this.getAggregatedStats(period);
		return stats.tagStats.sort((a, b) => b.totalTime - a.totalTime);
	}

	// Get all entries for sync
	public async getAllEntries(): Promise<TimeEntry[]> {
		const allEntries: TimeEntry[] = [];

		for (const dateKey in this.data.dailyStats) {
			const dailyStats = this.data.dailyStats[dateKey];
			if (dailyStats.entries) {
				allEntries.push(...dailyStats.entries);
			}
		}

		return allEntries.sort((a, b) => a.startTime - b.startTime);
	}

	// Data cleanup
	public async cleanupOldData(): Promise<void> {
		if (this.settings.dataRetentionDays <= 0) return;

		const cutoffDate = new Date();
		cutoffDate.setDate(
			cutoffDate.getDate() - this.settings.dataRetentionDays
		);
		const cutoffKey = this.getDateKey(cutoffDate.getTime());

		const keysToDelete = Object.keys(this.data.dailyStats).filter(
			(key) => key < cutoffKey
		);

		for (const key of keysToDelete) {
			delete this.data.dailyStats[key];
		}

		if (keysToDelete.length > 0) {
			console.log(`Cleaned up ${keysToDelete.length} days of old data`);
			await this.saveData();
		}
	}

	// Export functionality
	public async exportData(
		format: "json" | "csv" | "markdown",
		period: ViewPeriod,
		filePath?: string
	): Promise<string> {
		const stats = this.getStatsForPeriod(period);

		switch (format) {
			case "json":
				return this.exportAsJson(stats);
			case "csv":
				return this.exportAsCsv(stats);
			case "markdown":
				return this.exportAsMarkdown(stats);
			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	// Private helper methods
	private getDefaultData(): StorageData {
		return {
			version: "1.0.0",
			lastUpdated: Date.now(),
			dailyStats: {},
			settings: this.settings,
		};
	}

	private validateAndMigrateData(data: any): StorageData {
		// Basic validation
		if (!data || typeof data !== "object") {
			return this.getDefaultData();
		}

		// Ensure required properties exist
		if (!data.dailyStats) data.dailyStats = {};
		if (!data.version) data.version = "1.0.0";
		if (!data.lastUpdated) data.lastUpdated = Date.now();

		// Migrate data if necessary based on version
		// (Future versions can add migration logic here)

		return data as StorageData;
	}

	private createEmptyDailyStats(date: string): DailyStats {
		return {
			date,
			totalTime: 0,
			activeTime: 0,
			idleTime: 0,
			entries: [],
			categoryStats: [],
			fileStats: [],
			tagStats: [],
		};
	}

	private updateCategoryStats(
		dailyStats: DailyStats,
		entry: TimeEntry
	): void {
		let categoryStats = dailyStats.categoryStats.find(
			(stat) => stat.category === entry.category
		);

		if (!categoryStats) {
			categoryStats = {
				category: entry.category,
				totalTime: 0,
				percentage: 0,
				count: 0,
			};
			dailyStats.categoryStats.push(categoryStats);
		}

		categoryStats.totalTime += entry.duration;
		categoryStats.count += 1;
		categoryStats.percentage =
			(categoryStats.totalTime / dailyStats.totalTime) * 100;

		// Recalculate all percentages
		dailyStats.categoryStats.forEach((stat) => {
			stat.percentage = (stat.totalTime / dailyStats.totalTime) * 100;
		});
	}

	private updateFileStats(dailyStats: DailyStats, entry: TimeEntry): void {
		if (!entry.filePath || !entry.fileName) return;

		let fileStats = dailyStats.fileStats.find(
			(stat) => stat.filePath === entry.filePath
		);

		if (!fileStats) {
			fileStats = {
				filePath: entry.filePath,
				fileName: entry.fileName,
				totalTime: 0,
				percentage: 0,
				lastAccessed: entry.endTime,
				accessCount: 0,
			};
			dailyStats.fileStats.push(fileStats);
		}

		fileStats.totalTime += entry.duration;
		fileStats.lastAccessed = Math.max(
			fileStats.lastAccessed,
			entry.endTime
		);
		fileStats.accessCount += 1;
		fileStats.percentage =
			(fileStats.totalTime / dailyStats.totalTime) * 100;

		// Recalculate all percentages
		dailyStats.fileStats.forEach((stat) => {
			stat.percentage = (stat.totalTime / dailyStats.totalTime) * 100;
		});
	}

	private updateTagStats(dailyStats: DailyStats, entry: TimeEntry): void {
		if (!entry.tags || entry.tags.length === 0) return;

		entry.tags.forEach((tag) => {
			let tagStats = dailyStats.tagStats.find((stat) => stat.tag === tag);

			if (!tagStats) {
				tagStats = {
					tag,
					totalTime: 0,
					percentage: 0,
					fileCount: 0,
				};
				dailyStats.tagStats.push(tagStats);
			}

			tagStats.totalTime += entry.duration;
			tagStats.percentage =
				(tagStats.totalTime / dailyStats.totalTime) * 100;

			// Update file count
			const uniqueFiles = new Set();
			dailyStats.entries
				.filter((e) => e.tags.includes(tag))
				.forEach((e) => e.filePath && uniqueFiles.add(e.filePath));
			tagStats.fileCount = uniqueFiles.size;
		});

		// Recalculate all percentages
		dailyStats.tagStats.forEach((stat) => {
			stat.percentage = (stat.totalTime / dailyStats.totalTime) * 100;
		});
	}

	private aggregateDailyStats(dailyStatsList: DailyStats[]): DailyStats {
		const aggregated = this.createEmptyDailyStats("aggregated");
		const categoryMap = new Map<string, CategoryStats>();
		const fileMap = new Map<string, FileStats>();
		const tagMap = new Map<string, TagStats>();

		dailyStatsList.forEach((dailyStats) => {
			aggregated.totalTime += dailyStats.totalTime;
			aggregated.activeTime += dailyStats.activeTime;
			aggregated.idleTime += dailyStats.idleTime;
			aggregated.entries.push(...dailyStats.entries);

			// Aggregate category stats
			dailyStats.categoryStats.forEach((stat) => {
				const existing = categoryMap.get(stat.category);
				if (existing) {
					existing.totalTime += stat.totalTime;
					existing.count += stat.count;
				} else {
					categoryMap.set(stat.category, { ...stat });
				}
			});

			// Aggregate file stats
			dailyStats.fileStats.forEach((stat) => {
				const existing = fileMap.get(stat.filePath);
				if (existing) {
					existing.totalTime += stat.totalTime;
					existing.lastAccessed = Math.max(
						existing.lastAccessed,
						stat.lastAccessed
					);
					existing.accessCount += stat.accessCount;
				} else {
					fileMap.set(stat.filePath, { ...stat });
				}
			});

			// Aggregate tag stats
			dailyStats.tagStats.forEach((stat) => {
				const existing = tagMap.get(stat.tag);
				if (existing) {
					existing.totalTime += stat.totalTime;
				} else {
					tagMap.set(stat.tag, { ...stat });
				}
			});
		});

		// Convert maps back to arrays and recalculate percentages
		aggregated.categoryStats = Array.from(categoryMap.values());
		aggregated.fileStats = Array.from(fileMap.values());
		aggregated.tagStats = Array.from(tagMap.values());

		// Recalculate percentages
		aggregated.categoryStats.forEach((stat) => {
			stat.percentage =
				aggregated.totalTime > 0
					? (stat.totalTime / aggregated.totalTime) * 100
					: 0;
		});
		aggregated.fileStats.forEach((stat) => {
			stat.percentage =
				aggregated.totalTime > 0
					? (stat.totalTime / aggregated.totalTime) * 100
					: 0;
		});
		aggregated.tagStats.forEach((stat) => {
			stat.percentage =
				aggregated.totalTime > 0
					? (stat.totalTime / aggregated.totalTime) * 100
					: 0;
		});

		// Update tag file counts
		aggregated.tagStats.forEach((tagStat) => {
			const uniqueFiles = new Set();
			aggregated.entries
				.filter((e) => e.tags.includes(tagStat.tag))
				.forEach((e) => e.filePath && uniqueFiles.add(e.filePath));
			tagStat.fileCount = uniqueFiles.size;
		});

		return aggregated;
	}

	private getDateKey(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toISOString().split("T")[0]; // YYYY-MM-DD
	}

	private getDateRangeForPeriod(
		period: ViewPeriod,
		startDate?: string,
		endDate?: string
	): string[] {
		const dates: string[] = [];
		const today = new Date();
		let start: Date;
		let end: Date;

		switch (period) {
			case "today":
				return [this.getDateKey(today.getTime())];

			case "week":
				start = new Date(today);
				start.setDate(today.getDate() - 6);
				end = today;
				break;

			case "month":
				start = new Date(today.getFullYear(), today.getMonth(), 1);
				end = today;
				break;

			case "year":
				start = new Date(today.getFullYear(), 0, 1);
				end = today;
				break;

			case "all":
				return Object.keys(this.data.dailyStats).sort();

			default:
				if (startDate && endDate) {
					start = new Date(startDate);
					end = new Date(endDate);
				} else {
					return [this.getDateKey(today.getTime())];
				}
		}

		const current = new Date(start);
		while (current <= end) {
			dates.push(this.getDateKey(current.getTime()));
			current.setDate(current.getDate() + 1);
		}

		return dates;
	}

	// Auto-save functionality
	private startAutoSave(): void {
		if (this.settings.autoSaveInterval > 0) {
			this.saveTimer = setInterval(() => {
				this.saveData();
			}, this.settings.autoSaveInterval * 1000);
		}
	}

	private stopAutoSave(): void {
		if (this.saveTimer) {
			clearInterval(this.saveTimer);
			this.saveTimer = undefined;
		}
	}

	private scheduleSave(): void {
		// Debounced save - only save after a period of inactivity
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}

		this.saveTimer = setTimeout(() => {
			this.saveData();
		}, 5000); // Save after 5 seconds of inactivity
	}

	// Data directory management
	private async ensureDataDirectory(): Promise<void> {
		const dataDir = this.DATA_FILE_PATH.substring(
			0,
			this.DATA_FILE_PATH.lastIndexOf("/")
		);

		try {
			await this.vault.adapter.mkdir(dataDir);
		} catch (error) {
			// Directory might already exist, which is fine
		}
	}

	// Export methods
	private exportAsJson(stats: DailyStats[]): string {
		return JSON.stringify(stats, null, 2);
	}

	private exportAsCsv(stats: DailyStats[]): string {
		const headers = [
			"Date",
			"Total Time (ms)",
			"Active Time (ms)",
			"Idle Time (ms)",
			"Entry Count",
		];
		const rows = stats.map((stat) => [
			stat.date,
			stat.totalTime.toString(),
			stat.activeTime.toString(),
			stat.idleTime.toString(),
			stat.entries.length.toString(),
		]);

		return [headers, ...rows].map((row) => row.join(",")).join("\n");
	}

	private exportAsMarkdown(stats: DailyStats[]): string {
		let markdown = "# Usage Statistics Report\n\n";

		stats.forEach((stat) => {
			markdown += `## ${stat.date}\n\n`;
			markdown += `- **Total Time**: ${this.formatDuration(
				stat.totalTime
			)}\n`;
			markdown += `- **Active Time**: ${this.formatDuration(
				stat.activeTime
			)}\n`;
			markdown += `- **Idle Time**: ${this.formatDuration(
				stat.idleTime
			)}\n`;
			markdown += `- **Sessions**: ${stat.entries.length}\n\n`;

			if (stat.categoryStats.length > 0) {
				markdown += "### Categories\n\n";
				stat.categoryStats.forEach((category) => {
					markdown += `- **${
						category.category
					}**: ${this.formatDuration(
						category.totalTime
					)} (${category.percentage.toFixed(1)}%)\n`;
				});
				markdown += "\n";
			}
		});

		return markdown;
	}

	private formatDuration(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	// Settings updates
	public updateSettings(newSettings: UsageStatsSettings): void {
		this.settings = newSettings;
		this.data.settings = newSettings;

		// Update auto-save interval
		this.stopAutoSave();
		this.startAutoSave();
	}
}
