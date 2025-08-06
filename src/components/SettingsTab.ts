import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "../main";

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// General Settings Section
		containerEl.createEl("h2", { text: "General Settings" });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);

		// View Settings Section
		containerEl.createEl("h2", { text: "View Settings" });

		new Setting(containerEl)
			.setName("Enable Plugin View")
			.setDesc("Show the plugin view in the sidebar")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableView)
					.onChange(async (value) => {
						this.plugin.settings.enableView = value;
						await this.plugin.saveSettings();
						this.plugin.updateViewVisibility();
					})
			);

		new Setting(containerEl)
			.setName("Default View Title")
			.setDesc("Default title for new views")
			.addText((text) =>
				text
					.setPlaceholder("Enter default title")
					.setValue(this.plugin.settings.viewTitle)
					.onChange(async (value) => {
						this.plugin.settings.viewTitle = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default View Content")
			.setDesc("Default content for new views")
			.addTextArea((text) =>
				text
					.setPlaceholder("Enter default content")
					.setValue(this.plugin.settings.viewContent)
					.onChange(async (value) => {
						this.plugin.settings.viewContent = value;
						await this.plugin.saveSettings();
					})
			);

		// Advanced Settings Section
		containerEl.createEl("h2", { text: "Advanced Settings" });

		new Setting(containerEl)
			.setName("Reset Settings")
			.setDesc("Reset all settings to default values")
			.addButton((button) =>
				button
					.setButtonText("Reset")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings = {
							...this.plugin.getDefaultSettings(),
						};
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}
