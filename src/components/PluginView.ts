import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { ViewData } from "../types";

export const PLUGIN_VIEW_TYPE = "my-plugin-view";
export const PLUGIN_VIEW_ICON = "dice";

export class PluginView extends ItemView {
	viewData: ViewData[] = [];
	activeViewId: string | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return PLUGIN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Plugin View";
	}

	getIcon(): string {
		return PLUGIN_VIEW_ICON;
	}

	async onOpen() {
		this.renderView();
	}

	async onClose() {
		// Cleanup if needed
	}

	renderView() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Plugin View" });

		// Create main content area
		const contentEl = container.createEl("div", {
			cls: "plugin-view-content",
		});

		// Add view controls
		this.renderControls(contentEl);

		// Add view list
		this.renderViewList(contentEl);

		// Add active view content
		this.renderActiveView(contentEl);
	}

	renderControls(container: HTMLElement) {
		const controlsEl = container.createEl("div", {
			cls: "plugin-view-controls",
		});

		// Add new view button
		const addButton = controlsEl.createEl("button", {
			text: "Add New View",
			cls: "mod-cta",
		});
		addButton.addEventListener("click", () => {
			this.addNewView();
		});

		// Add refresh button
		const refreshButton = controlsEl.createEl("button", {
			text: "Refresh",
			cls: "mod-warning",
		});
		refreshButton.addEventListener("click", () => {
			this.renderView();
		});
	}

	renderViewList(container: HTMLElement) {
		const listEl = container.createEl("div", { cls: "plugin-view-list" });
		listEl.createEl("h5", { text: "Views" });

		if (this.viewData.length === 0) {
			listEl.createEl("p", {
				text: "No views available. Click 'Add New View' to create one.",
				cls: "plugin-view-empty",
			});
			return;
		}

		this.viewData.forEach((view) => {
			const viewItem = listEl.createEl("div", {
				cls: `plugin-view-item ${
					view.id === this.activeViewId ? "is-active" : ""
				}`,
			});

			viewItem.createEl("span", {
				text: view.title,
				cls: "plugin-view-title",
			});

			viewItem.createEl("span", {
				text: new Date(view.timestamp).toLocaleString(),
				cls: "plugin-view-timestamp",
			});

			viewItem.addEventListener("click", () => {
				this.setActiveView(view.id);
			});

			// Add delete button
			const deleteBtn = viewItem.createEl("button", {
				text: "×",
				cls: "plugin-view-delete",
			});
			deleteBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.deleteView(view.id);
			});
		});
	}

	renderActiveView(container: HTMLElement) {
		const activeViewEl = container.createEl("div", {
			cls: "plugin-view-active",
		});
		activeViewEl.createEl("h5", { text: "Active View" });

		if (!this.activeViewId) {
			activeViewEl.createEl("p", {
				text: "No active view selected.",
				cls: "plugin-view-empty",
			});
			return;
		}

		const activeView = this.viewData.find(
			(v) => v.id === this.activeViewId
		);
		if (!activeView) return;

		// View title
		const titleEl = activeViewEl.createEl("div", {
			cls: "plugin-view-active-title",
		});
		titleEl.createEl("label", { text: "Title:" });
		const titleInput = titleEl.createEl("input", {
			value: activeView.title,
			cls: "plugin-view-input",
		});
		titleInput.addEventListener("change", (e) => {
			activeView.title = (e.target as HTMLInputElement).value;
		});

		// View content
		const contentEl = activeViewEl.createEl("div", {
			cls: "plugin-view-active-content",
		});
		contentEl.createEl("label", { text: "Content:" });
		const contentTextarea = contentEl.createEl("textarea", {
			value: activeView.content,
			cls: "plugin-view-textarea",
		});
		contentTextarea.addEventListener("change", (e) => {
			activeView.content = (e.target as HTMLTextAreaElement).value;
		});

		// Save button
		const saveBtn = activeViewEl.createEl("button", {
			text: "Save Changes",
			cls: "mod-cta",
		});
		saveBtn.addEventListener("click", () => {
			this.saveView(activeView);
		});
	}

	addNewView() {
		const newView: ViewData = {
			id: `view-${Date.now()}`,
			title: "New View",
			content: "Enter your content here...",
			timestamp: Date.now(),
		};

		this.viewData.push(newView);
		this.setActiveView(newView.id);
		this.renderView();
	}

	setActiveView(viewId: string) {
		this.activeViewId = viewId;
		this.renderView();
	}

	deleteView(viewId: string) {
		this.viewData = this.viewData.filter((v) => v.id !== viewId);
		if (this.activeViewId === viewId) {
			this.activeViewId =
				this.viewData.length > 0 ? this.viewData[0].id : null;
		}
		this.renderView();
	}

	saveView(view: ViewData) {
		view.timestamp = Date.now();
		// Here you could save to plugin settings or external storage
		new Notice("View saved successfully!");
	}

	getViewData(): ViewData[] {
		return this.viewData;
	}

	setViewData(data: ViewData[]) {
		this.viewData = data;
		if (this.viewData.length > 0 && !this.activeViewId) {
			this.activeViewId = this.viewData[0].id;
		}
	}
}
