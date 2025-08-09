/**
 * Core time tracking functionality
 */

import { Component, TFile, Workspace, debounce, App } from "obsidian";
import {
	TrackingSession,
	TrackingState,
	TimeEntry,
	TrackingEvent,
	UsageStatsSettings,
} from "./types";

export class TimeTracker extends Component {
	private workspace: Workspace;
	private app: App;
	private settings: UsageStatsSettings;
	private state: TrackingState;
	private idleTimer?: NodeJS.Timeout;
	private saveTimer?: NodeJS.Timeout;
	private eventListeners: Array<(event: TrackingEvent) => void> = [];

	constructor(app: App, workspace: Workspace, settings: UsageStatsSettings) {
		super();
		this.app = app;
		this.workspace = workspace;
		this.settings = settings;
		this.state = {
			isTracking: false,
			lastActiveTime: Date.now(),
			totalTodayTime: 0,
			isPaused: false,
		};
	}

	onload(): void {
		this.registerWorkspaceEvents();
		this.registerDocumentEvents();
		this.startIdleDetection();

		if (this.settings.enableTracking) {
			this.startTracking();
		}
	}

	onunload(): void {
		this.stopTracking();
		this.clearTimers();
	}

	// Event listener management
	public addEventListener(listener: (event: TrackingEvent) => void): void {
		this.eventListeners.push(listener);
	}

	public removeEventListener(listener: (event: TrackingEvent) => void): void {
		const index = this.eventListeners.indexOf(listener);
		if (index > -1) {
			this.eventListeners.splice(index, 1);
		}
	}

	private emitEvent(event: TrackingEvent): void {
		this.eventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				console.error("Error in tracking event listener:", error);
			}
		});
	}

	// Core tracking methods
	public startTracking(): void {
		if (this.state.isTracking) return;

		this.state.isTracking = true;
		this.state.isPaused = false;
		this.state.lastActiveTime = Date.now();

		// Start tracking current file if available
		const activeFile = this.workspace.getActiveFile();
		if (activeFile) {
			this.startNewSession(activeFile);
		}

		this.emitEvent({
			type: "start",
			timestamp: Date.now(),
		});
	}

	public stopTracking(): void {
		if (!this.state.isTracking) return;

		this.endCurrentSession();
		this.state.isTracking = false;
		this.state.isPaused = false;

		this.emitEvent({
			type: "stop",
			timestamp: Date.now(),
		});
	}

	public pauseTracking(reason?: string): void {
		if (!this.state.isTracking || this.state.isPaused) return;

		this.state.isPaused = true;
		this.state.pauseReason = reason;

		if (this.state.currentSession) {
			this.state.currentSession.isActive = false;
		}

		this.emitEvent({
			type: "pause",
			timestamp: Date.now(),
			data: { reason },
		});
	}

	public resumeTracking(): void {
		if (!this.state.isTracking || !this.state.isPaused) return;

		this.state.isPaused = false;
		this.state.pauseReason = undefined;
		this.state.lastActiveTime = Date.now();

		if (this.state.currentSession) {
			this.state.currentSession.isActive = true;
			this.state.currentSession.lastActiveTime = Date.now();
		}

		this.emitEvent({
			type: "resume",
			timestamp: Date.now(),
		});
	}

	public isTracking(): boolean {
		return this.state.isTracking && !this.state.isPaused;
	}

	public getState(): TrackingState {
		return { ...this.state };
	}

	public getCurrentSession(): TrackingSession | undefined {
		return this.state.currentSession
			? { ...this.state.currentSession }
			: undefined;
	}

	// Session management
	private startNewSession(file: TFile): void {
		this.endCurrentSession();

		const tags = this.extractTagsFromFile(file);
		const folderPath = file.parent?.path || "";

		this.state.currentSession = {
			id: `session-${Date.now()}-${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			startTime: Date.now(),
			filePath: file.path,
			fileName: file.name,
			folderPath,
			tags,
			isActive: true,
			lastActiveTime: Date.now(),
		};

		this.emitEvent({
			type: "file_change",
			timestamp: Date.now(),
			data: {
				filePath: file.path,
				fileName: file.name,
				folderPath,
				tags,
			},
		});
	}

	private endCurrentSession(): void {
		if (!this.state.currentSession) return;

		const session = this.state.currentSession;
		session.endTime = Date.now();

		// Create time entry
		const entry: TimeEntry = {
			id: session.id,
			startTime: session.startTime,
			endTime: session.endTime,
			duration: session.endTime - session.startTime,
			filePath: session.filePath,
			fileName: session.fileName,
			folderPath: session.folderPath,
			tags: session.tags,
			category: this.determineCategory(session),
			isActive: session.isActive,
			metadata: {
				sessionId: session.id,
			},
		};

		// Save the entry (will be handled by data manager)
		this.saveTimeEntry(entry);

		this.state.currentSession = undefined;
	}

	private extractTagsFromFile(file: TFile): string[] {
		if (!this.settings.enableTagTracking) return [];

		try {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.tags) return [];

			return cache.tags.map((tag) => tag.tag.replace("#", ""));
		} catch (error) {
			console.error("Error extracting tags from file:", error);
			return [];
		}
	}

	private determineCategory(session: TrackingSession): string {
		// Priority: Tags > Folder > Default
		if (session.tags.length > 0) {
			return session.tags[0]; // Use first tag as primary category
		}

		if (session.folderPath) {
			const folderName =
				session.folderPath.split("/").pop() || session.folderPath;
			return folderName;
		}

		return "Uncategorized";
	}

	// Workspace event handlers
	private registerWorkspaceEvents(): void {
		this.registerEvent(
			this.workspace.on("active-leaf-change", () => {
				this.onActiveFileChange();
			})
		);

		this.registerEvent(
			this.workspace.on("file-open", (file) => {
				if (file) {
					this.onFileOpen(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile) {
					this.onFileModify(file);
				}
			})
		);
	}

	private registerDocumentEvents(): void {
		// Register focus and blur events to detect app activity
		this.registerDomEvent(window, "focus", () => {
			this.onAppFocus();
		});

		this.registerDomEvent(window, "blur", () => {
			this.onAppBlur();
		});

		// Register user activity events
		const debouncedActivity = debounce(
			() => {
				this.onUserActivity();
			},
			1000,
			true
		);

		this.registerDomEvent(document, "keydown", debouncedActivity);
		this.registerDomEvent(document, "mousedown", debouncedActivity);
		this.registerDomEvent(document, "scroll", debouncedActivity);
	}

	private onActiveFileChange(): void {
		if (!this.isTracking()) return;

		const activeFile = this.workspace.getActiveFile();
		if (
			activeFile &&
			activeFile.path !== this.state.currentSession?.filePath
		) {
			this.startNewSession(activeFile);
		}
	}

	private onFileOpen(file: TFile): void {
		if (!this.isTracking()) return;

		if (file.path !== this.state.currentSession?.filePath) {
			this.startNewSession(file);
		}
	}

	private onFileModify(file: TFile): void {
		if (!this.isTracking()) return;

		// Update session activity
		if (this.state.currentSession?.filePath === file.path) {
			this.state.currentSession.lastActiveTime = Date.now();
			this.state.lastActiveTime = Date.now();
		}

		this.onUserActivity();
	}

	private onAppFocus(): void {
		if (!this.state.isTracking) return;

		// Resume tracking if it was paused due to app losing focus
		if (this.state.isPaused && this.state.pauseReason === "app_blur") {
			this.resumeTracking();
		}
	}

	private onAppBlur(): void {
		if (!this.isTracking()) return;

		// Pause tracking when app loses focus (if configured)
		if (!this.settings.trackInactiveTime) {
			this.pauseTracking("app_blur");
		}
	}

	private onUserActivity(): void {
		if (!this.isTracking()) return;

		this.state.lastActiveTime = Date.now();

		if (this.state.currentSession) {
			this.state.currentSession.lastActiveTime = Date.now();
		}

		// Resume from idle if necessary
		if (this.state.isPaused && this.state.pauseReason === "idle") {
			this.resumeTracking();
		}

		this.emitEvent({
			type: "active",
			timestamp: Date.now(),
		});

		this.resetIdleTimer();
	}

	// Idle detection
	private startIdleDetection(): void {
		this.resetIdleTimer();
	}

	private resetIdleTimer(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
		}

		this.idleTimer = setTimeout(() => {
			this.onIdleDetected();
		}, this.settings.idleThreshold * 1000);
	}

	private onIdleDetected(): void {
		if (!this.isTracking()) return;

		this.pauseTracking("idle");

		this.emitEvent({
			type: "idle",
			timestamp: Date.now(),
		});
	}

	// Data management
	private saveTimeEntry(entry: TimeEntry): void {
		// This will be called by the data manager
		// For now, we just emit an event
		this.emitEvent({
			type: "file_change", // This will trigger data save
			timestamp: Date.now(),
			data: { entry },
		});
	}

	private clearTimers(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
		}

		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = undefined;
		}
	}

	// Settings updates
	public updateSettings(newSettings: UsageStatsSettings): void {
		const oldSettings = this.settings;
		this.settings = newSettings;

		// Handle tracking enable/disable
		if (oldSettings.enableTracking !== newSettings.enableTracking) {
			if (newSettings.enableTracking) {
				this.startTracking();
			} else {
				this.stopTracking();
			}
		}

		// Update idle threshold
		if (oldSettings.idleThreshold !== newSettings.idleThreshold) {
			this.resetIdleTimer();
		}
	}

	// Utility methods
	public getTodayTime(): number {
		return this.state.totalTodayTime;
	}

	public getActiveTime(): number {
		if (!this.state.currentSession) return 0;
		return Date.now() - this.state.currentSession.startTime;
	}

	public getFormattedTime(milliseconds: number): string {
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
}
