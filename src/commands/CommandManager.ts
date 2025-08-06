import { App, Editor, MarkdownView, Notice } from "obsidian";
import { SampleModal } from "../components/Modal";
import { PLUGIN_VIEW_TYPE, PluginView } from "../components/PluginView";
import MyPlugin from "../main";

export class CommandManager {
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
	}

	registerCommands(): void {
		// Simple modal command
		this.plugin.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});

		// Editor command
		this.plugin.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// Complex modal command
		this.plugin.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						new SampleModal(this.app).open();
					}
					return true;
				}
			},
		});

		// Open plugin view command
		this.plugin.addCommand({
			id: "open-plugin-view",
			name: "Open Plugin View",
			callback: () => {
				this.openPluginView();
			},
		});

		// Toggle plugin view command
		this.plugin.addCommand({
			id: "toggle-plugin-view",
			name: "Toggle Plugin View",
			callback: () => {
				this.togglePluginView();
			},
		});

		// Add new view command
		this.plugin.addCommand({
			id: "add-new-view",
			name: "Add New View",
			callback: () => {
				this.addNewView();
			},
		});
	}

	private get app(): App {
		return this.plugin.app;
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

	private togglePluginView(): void {
		const { workspace } = this.app;
		const existingView = workspace.getLeavesOfType(PLUGIN_VIEW_TYPE);

		if (existingView.length > 0) {
			// Close the view
			existingView[0].detach();
		} else {
			// Open the view
			this.openPluginView();
		}
	}

	private addNewView(): void {
		const { workspace } = this.app;
		const existingView = workspace.getLeavesOfType(PLUGIN_VIEW_TYPE);

		if (existingView.length > 0) {
			const view = existingView[0].view as PluginView;
			view.addNewView();
			workspace.revealLeaf(existingView[0]);
		} else {
			new Notice("Please open the Plugin View first!");
		}
	}
}
