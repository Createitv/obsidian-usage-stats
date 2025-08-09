/**
 * Status bar manager for displaying current tracking status
 */

import { Component } from "obsidian";
import { TrackingState, UsageStatsSettings } from "../core/types";
import { t } from "../i18n/i18n";

export class StatusBarManager extends Component {
	private statusBarEl: HTMLElement;
	private settings: UsageStatsSettings;
	private trackingState: TrackingState;
	private updateInterval?: NodeJS.Timeout;

	constructor(statusBarEl: HTMLElement, settings: UsageStatsSettings) {
		super();
		this.statusBarEl = statusBarEl;
		this.settings = settings;
		this.trackingState = {
			isTracking: false,
			lastActiveTime: Date.now(),
			totalTodayTime: 0,
			isPaused: false,
		};
	}

	onload(): void {
		this.startUpdateTimer();
		this.updateDisplay();
	}

	onunload(): void {
		this.stopUpdateTimer();
	}

	public updateTrackingState(state: TrackingState): void {
		this.trackingState = { ...state };
		this.updateDisplay();
	}

	public updateSettings(newSettings: UsageStatsSettings): void {
		const shouldUpdateVisibility =
			this.settings.showStatusBar !== newSettings.showStatusBar;
		this.settings = newSettings;

		if (shouldUpdateVisibility) {
			this.updateVisibility();
		} else {
			this.updateDisplay();
		}
	}

	private updateDisplay(): void {
		if (!this.settings.showStatusBar) {
			this.statusBarEl.style.display = "none";
			return;
		}

		this.statusBarEl.style.display = "block";
		this.statusBarEl.innerHTML = "";

		// Create container
		const container = this.statusBarEl.createEl("div", {
			cls: "usage-stats-status-bar",
		});

		// Add tracking indicator
		const indicator = container.createEl("span", {
			cls: `usage-stats-indicator ${this.getIndicatorClass()}`,
		});

		// Add main text
		const textEl = container.createEl("span", {
			cls: "usage-stats-text",
		});

		// Always show today's total time
		const todayTimeText = this.formatTodayTime(
			this.trackingState.totalTodayTime
		);
		textEl.textContent = t("time.todayTotal", { time: todayTimeText });

		// Set indicator color and style based on state
		if (!this.trackingState.isTracking) {
			indicator.style.backgroundColor = "#666";
		} else if (this.trackingState.isPaused) {
			const reason = this.trackingState.pauseReason;
			if (reason === "idle") {
				indicator.style.backgroundColor = "#ffa500";
			} else {
				indicator.style.backgroundColor = "#ff6b6b";
			}
		} else {
			// Active tracking
			indicator.style.backgroundColor = "#4caf50";
		}

		// Add click handler for quick actions
		// container.addEventListener("click", (e) => {
		// 	this.showQuickActions(e);
		// });

		// Add hover tooltip
		container.title = this.getTooltipText();
	}

	private updateVisibility(): void {
		if (this.settings.showStatusBar) {
			this.statusBarEl.style.display = "block";
			this.updateDisplay();
		} else {
			this.statusBarEl.style.display = "none";
		}
	}

	private getIndicatorClass(): string {
		if (!this.trackingState.isTracking) {
			return "inactive";
		} else if (this.trackingState.isPaused) {
			return this.trackingState.pauseReason === "idle"
				? "idle"
				: "paused";
		} else {
			return "active";
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

	private formatTodayTime(milliseconds: number): string {
		const minutes = Math.floor(milliseconds / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		if (hours > 0) {
			return t("time.hoursMinutes", {
				hours: hours.toString(),
				minutes: remainingMinutes.toString(),
			});
		} else {
			return t("time.minutes", { count: remainingMinutes.toString() });
		}
	}

	private getTooltipText(): string {
		let tooltip = t("view.title") + "\n";

		// Show current state
		if (!this.trackingState.isTracking) {
			tooltip += t("statusBar.inactive");
		} else if (this.trackingState.isPaused) {
			const reason = this.trackingState.pauseReason;
			if (reason === "idle") {
				tooltip += t("statusBar.idle");
			} else {
				tooltip += t("statusBar.paused");
			}
		} else {
			tooltip += t("statusBar.active");
		}

		// Show current file if available
		if (
			this.trackingState.currentSession &&
			this.trackingState.currentSession.fileName
		) {
			tooltip += `\n${t("chart.files")}: ${
				this.trackingState.currentSession.fileName
			}`;
		}

		tooltip += "\n\n" + t("statusBar.clickForActions");
		return tooltip;
	}

	private showQuickActions(event: MouseEvent): void {
		// Create a simple context menu
		const menu = document.createElement("div");
		menu.className = "usage-stats-quick-menu";
		menu.style.position = "absolute";
		menu.style.left = event.clientX + "px";
		menu.style.top = event.clientY - 100 + "px";
		menu.style.backgroundColor = "var(--background-secondary)";
		menu.style.border = "1px solid var(--background-modifier-border)";
		menu.style.borderRadius = "4px";
		menu.style.padding = "4px";
		menu.style.zIndex = "1000";
		menu.style.minWidth = "150px";

		// Always show view action
		this.addQuickAction(menu, t("commands.openView"), () => {
			this.emitAction("openView");
		});

		document.body.appendChild(menu);

		// Remove menu on click outside
		const removeMenu = (e: Event) => {
			if (!menu.contains(e.target as Node)) {
				menu.remove();
				document.removeEventListener("click", removeMenu);
			}
		};

		setTimeout(() => {
			document.addEventListener("click", removeMenu);
		}, 0);
	}

	private addQuickAction(
		menu: HTMLElement,
		text: string,
		action: () => void
	): void {
		const item = menu.createEl("div", {
			cls: "usage-stats-quick-action",
			text: text,
		});

		item.style.padding = "4px 8px";
		item.style.cursor = "pointer";
		item.style.borderRadius = "2px";

		item.addEventListener("mouseenter", () => {
			item.style.backgroundColor = "var(--background-modifier-hover)";
		});

		item.addEventListener("mouseleave", () => {
			item.style.backgroundColor = "transparent";
		});

		item.addEventListener("click", (e) => {
			e.stopPropagation();
			action();
			menu.remove();
		});
	}

	private emitAction(action: string): void {
		// Emit custom event that the main plugin can listen to
		const event = new CustomEvent("usage-stats-action", {
			detail: { action },
		});
		window.dispatchEvent(event);
	}

	private startUpdateTimer(): void {
		// Update every second when actively tracking
		this.updateInterval = setInterval(() => {
			if (this.trackingState.isTracking && !this.trackingState.isPaused) {
				this.updateDisplay();
			}
		}, 1000);
	}

	private stopUpdateTimer(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = undefined;
		}
	}

	// Public methods for manual updates
	public forceUpdate(): void {
		this.updateDisplay();
	}

	public hide(): void {
		this.statusBarEl.style.display = "none";
	}

	public show(): void {
		if (this.settings.showStatusBar) {
			this.statusBarEl.style.display = "block";
			this.updateDisplay();
		}
	}
}
