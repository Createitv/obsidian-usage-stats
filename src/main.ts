import "@style/styles";
import { Plugin } from "obsidian";
import { CommandManager } from "./commands/CommandManager";
import { PLUGIN_VIEW_TYPE, PluginView } from "./components/PluginView";
import { SampleSettingTab } from "./components/SettingsTab";
import { DEFAULT_SETTINGS, MyPluginSettings } from "./types";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private commandManager: CommandManager;

	async onload() {
		await this.loadSettings();

		// Initialize command manager
		this.commandManager = new CommandManager(this);
		this.commandManager.registerCommands();

		// Register view
		this.registerView(PLUGIN_VIEW_TYPE, (leaf) => new PluginView(leaf));

		// Add ribbon icon
		this.addRibbonIcon("dice", "Plugin View", (evt: MouseEvent) => {
			this.openPluginView();
		});

		// Add status bar item
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Plugin Active");

		// Add settings tab
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// Register DOM events
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// Register intervals
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		// Initialize view if enabled
		if (this.settings.enableView) {
			this.initializeView();
		}
	}

	onunload() {
		// Clean up view
		this.app.workspace.detachLeavesOfType(PLUGIN_VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getDefaultSettings(): MyPluginSettings {
		return { ...DEFAULT_SETTINGS };
	}

	updateViewVisibility(): void {
		if (this.settings.enableView) {
			this.initializeView();
		} else {
			this.app.workspace.detachLeavesOfType(PLUGIN_VIEW_TYPE);
		}
	}

	private initializeView(): void {
		// Create default view if none exists
		const existingView =
			this.app.workspace.getLeavesOfType(PLUGIN_VIEW_TYPE);
		if (existingView.length === 0) {
			const leaf = this.app.workspace.getRightLeaf(false);
			if (leaf) {
				leaf.setViewState({
					type: PLUGIN_VIEW_TYPE,
					active: true,
				});
			}
		}
	}

	private openPluginView(): void {
		const { workspace } = this.app;

		// Check if view is already open
		const existingView = workspace.getLeavesOfType(PLUGIN_VIEW_TYPE);
		if (existingView.length > 0) {
			workspace.revealLeaf(existingView[0]);
			return;
		}

		// Create new view
		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			leaf.setViewState({
				type: PLUGIN_VIEW_TYPE,
				active: true,
			});
			workspace.revealLeaf(leaf);
		}
	}
}
