import { Command, Notice } from "obsidian";
import { t } from "../i18n/i18n";
import UsageStatsPlugin from "../main";

export class UsageStatsCommandManager {
	private plugin: UsageStatsPlugin;

	constructor(plugin: UsageStatsPlugin) {
		this.plugin = plugin;
	}

	registerCommands(): void {
		// Start time tracking
		this.plugin.addCommand({
			id: "start-tracking",
			name: t("commands.startTracking"),
			callback: () => {
				this.startTracking();
			},
		});

		// Stop time tracking
		this.plugin.addCommand({
			id: "stop-tracking",
			name: t("commands.stopTracking"),
			callback: () => {
				this.stopTracking();
			},
		});

		// Pause time tracking
		this.plugin.addCommand({
			id: "pause-tracking",
			name: t("commands.pauseTracking"),
			callback: () => {
				this.pauseTracking();
			},
		});

		// Resume time tracking
		this.plugin.addCommand({
			id: "resume-tracking",
			name: t("commands.resumeTracking"),
			callback: () => {
				this.resumeTracking();
			},
		});

		// Toggle tracking (smart start/stop)
		this.plugin.addCommand({
			id: "toggle-tracking",
			name: t("commands.toggleTracking"),
			callback: () => {
				this.toggleTracking();
			},
		});

		// Open usage statistics view
		this.plugin.addCommand({
			id: "open-usage-stats",
			name: t("commands.openView"),
			callback: () => {
				this.openUsageStatsView();
			},
		});

		// Quick export data
		this.plugin.addCommand({
			id: "export-data",
			name: t("commands.exportData"),
			checkCallback: (checking: boolean) => {
				// Only show if export is enabled
				if (this.plugin.settings.enableDataExport) {
					if (!checking) {
						this.plugin.showExportModal();
					}
					return true;
				}
				return false;
			},
		});

		// Show today's statistics
		this.plugin.addCommand({
			id: "show-today-stats",
			name: t("commands.showTodayStats"),
			callback: () => {
				this.showTodayStats();
			},
		});

		// Quick view current session
		this.plugin.addCommand({
			id: "current-session-info",
			name: t("commands.showCurrentSession"),
			callback: () => {
				this.showCurrentSessionInfo();
			},
		});

		// Reset today's data (with confirmation)
		this.plugin.addCommand({
			id: "reset-today-data",
			name: t("commands.resetTodayData"),
			callback: () => {
				this.resetTodayData();
			},
		});

		// Hotkey for quick tracking toggle
		this.plugin.addCommand({
			id: "quick-toggle-tracking",
			name: t("commands.quickToggle"),
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "t",
				},
			],
			callback: () => {
				this.toggleTracking();
			},
		});

		// Switch to specific time period in view
		this.plugin.addCommand({
			id: "view-weekly-stats",
			name: t("commands.viewWeekly"),
			callback: () => {
				this.openUsageStatsView("week");
			},
		});

		this.plugin.addCommand({
			id: "view-monthly-stats",
			name: t("commands.viewMonthly"),
			callback: () => {
				this.openUsageStatsView("month");
			},
		});

		// Force save data
		this.plugin.addCommand({
			id: "force-save-data",
			name: t("commands.forceSave"),
			callback: () => {
				this.forceSaveData();
			},
		});

		// Debug command (only in development)
		if (process.env.NODE_ENV === "development") {
			this.plugin.addCommand({
				id: "debug-tracking-state",
				name: t("commands.debugState"),
				callback: () => {
					this.showDebugInfo();
				},
			});
		}
	}

	private startTracking(): void {
		if (this.plugin.isTrackingActive()) {
			new Notice(t("notification.trackingStarted") + " (already active)");
			return;
		}

		this.plugin.startTracking();
		new Notice(t("notification.trackingStarted"));
	}

	private stopTracking(): void {
		if (!this.plugin.isTrackingActive()) {
			new Notice(
				t("notification.trackingStopped") + " (already stopped)"
			);
			return;
		}

		this.plugin.stopTracking();
		new Notice(t("notification.trackingStopped"));
	}

	private pauseTracking(): void {
		if (!this.plugin.isTrackingActive()) {
			new Notice(t("message.cannotPause"));
			return;
		}

		if (this.plugin.isTrackingPaused()) {
			new Notice(t("notification.trackingPaused") + " (already paused)");
			return;
		}

		this.plugin.pauseTracking();
		new Notice(t("notification.trackingPaused"));
	}

	private resumeTracking(): void {
		if (!this.plugin.isTrackingActive()) {
			new Notice(t("message.cannotResume"));
			return;
		}

		if (!this.plugin.isTrackingPaused()) {
			new Notice(t("notification.trackingResumed") + " (not paused)");
			return;
		}

		this.plugin.resumeTracking();
		new Notice(t("notification.trackingResumed"));
	}

	private toggleTracking(): void {
		if (this.plugin.isTrackingActive()) {
			if (this.plugin.isTrackingPaused()) {
				this.resumeTracking();
			} else {
				this.pauseTracking();
			}
		} else {
			this.startTracking();
		}
	}

	private openUsageStatsView(period?: string): void {
		const { workspace } = this.plugin.app;

		// Check if view is already open
		const existingView = workspace.getLeavesOfType("usage-stats-view");
		if (existingView.length > 0) {
			workspace.revealLeaf(existingView[0]);

			// Set period if specified
			if (period) {
				const view = existingView[0].view as any;
				if (view.setPeriod) {
					view.setPeriod(period);
				}
			}
			return;
		}

		// Create new view
		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			leaf.setViewState({
				type: "usage-stats-view",
				active: true,
			});
			workspace.revealLeaf(leaf);

			// Set period after a short delay to ensure view is loaded
			if (period) {
				setTimeout(() => {
					const view = leaf.view as any;
					if (view.setPeriod) {
						view.setPeriod(period);
					}
				}, 100);
			}
		}
	}

	private showTodayStats(): void {
		const todayStats = this.plugin.getTodayStats();
		const totalTime = this.formatDuration(todayStats.totalTime);
		const activeTime = this.formatDuration(todayStats.activeTime);
		const sessions = todayStats.entries.length;

		const message = `Today's Statistics:
• Total Time: ${totalTime}
• Active Time: ${activeTime}
• Sessions: ${sessions}`;

		new Notice(message, 5000);
	}

	private showCurrentSessionInfo(): void {
		const currentSession = this.plugin.getCurrentSession();

		if (!currentSession) {
			new Notice(t("message.noActiveSession"));
			return;
		}

		const elapsed = Date.now() - currentSession.startTime;
		const elapsedTime = this.formatDuration(elapsed);
		const fileName = currentSession.fileName || t("label.unknown");
		const category =
			currentSession.tags.length > 0
				? currentSession.tags[0]
				: currentSession.folderPath?.split("/").pop() ||
				  t("label.uncategorized");

		const message = `${t("debug.currentSession")}:
• ${t("label.fileName")}: ${fileName}
• ${t("label.category")}: ${category}
• ${t("label.elapsed")}: ${elapsedTime}
• ${t("label.status")}: ${
			currentSession.isActive ? t("label.active") : t("label.inactive")
		}`;

		new Notice(message, 5000);
	}

	private resetTodayData(): void {
		const confirmed = confirm(t("message.resetTodayConfirm"));

		if (confirmed) {
			this.plugin.resetTodayData();
			new Notice(t("message.todayDataReset"));
		}
	}

	private async forceSaveData(): Promise<void> {
		try {
			await this.plugin.forceSaveData();
			new Notice("Data saved successfully");
		} catch (error) {
			console.error("Failed to save data:", error);
			new Notice("Failed to save data");
		}
	}

	private showDebugInfo(): void {
		const state = this.plugin.getTrackingState();
		const todayStats = this.plugin.getTodayStats();

		const debugInfo = `Debug Information:
• Tracking Active: ${state.isTracking}
• Paused: ${state.isPaused}
• Current Session: ${state.currentSession ? "Yes" : "No"}
• Today's Sessions: ${todayStats.entries.length}
• Today's Total Time: ${this.formatDuration(todayStats.totalTime)}
• Language: ${this.plugin.settings.language}
• View Enabled: ${this.plugin.settings.enableView}`;

		console.log("Usage Stats Debug Info:", state, todayStats);
		new Notice(debugInfo, 8000);
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

	// Public method to handle status bar actions
	public handleStatusBarAction(action: string): void {
		switch (action) {
			case "start":
				this.startTracking();
				break;
			case "stop":
				this.stopTracking();
				break;
			case "pause":
				this.pauseTracking();
				break;
			case "resume":
				this.resumeTracking();
				break;
			case "openView":
				this.openUsageStatsView();
				break;
			default:
				console.warn("Unknown status bar action:", action);
		}
	}
}
